import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReportField } from '@/utils/reportExporter';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  answer?: string;
  showDetailsByDefault?: boolean;
  reportData?: any[];
  reportFields?: ReportField[];
  insights?: string;
  explanation?: string;
  config?: any;
  sqlQuery?: string;
  dataSummary?: string;
  suggestedFollowUps?: string[];
}

export interface AIReportResult {
  success: boolean;
  answer?: string;
  showDetailsByDefault?: boolean;
  config?: any;
  data?: any[];
  fields?: ReportField[];
  rowCount?: number;
  insights?: string;
  explanation?: string;
  error?: string;
  suggestedFollowUps?: string[];
}

// Smart truncation: preserve beginning (70%) and end (30%) for long text
function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const headLen = Math.floor(maxLength * 0.7);
  const tailLen = maxLength - headLen - 20; // 20 chars for separator
  return text.substring(0, headLen) + '\n...[truncated]...\n' + text.substring(text.length - tailLen);
}

// Build compact data summary for conversation context
function buildDataSummary(data: any[], rowCount: number): string {
  if (!data || data.length === 0) return `0 rows returned`;

  const columns = Object.keys(data[0]);
  const parts: string[] = [`${rowCount} rows, columns: ${columns.join(', ')}`];

  // Add numeric column stats
  for (const col of columns) {
    const numericValues = data
      .map(row => row[col])
      .filter(v => typeof v === 'number');

    if (numericValues.length > 0) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      parts.push(`${col}: min=${min}, max=${max}, sum=${sum}`);
    }
  }

  return parts.join('; ');
}

export function useAIReportAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last error to prevent duplicates
  const lastErrorRef = useRef<{ message: string; timestamp: number } | null>(null);
  const ERROR_DEBOUNCE_MS = 2000; // Prevent same error within 2 seconds

  const sendQuery = useCallback(async (query: string): Promise<AIReportResult | null> => {
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build enriched conversation history (last 10 messages for context)
      // NOTE: Do NOT include the current userMessage - the edge function adds the query itself
      // Including it here would create duplicate user messages which Gemini rejects
      const conversationHistory = messages.slice(-10).map(msg => {
        if (msg.role === 'user') {
          return { role: msg.role, content: msg.content };
        }

        // For assistant messages, include answer text + SQL context + data summary
        const answerText = smartTruncate(msg.answer || msg.content, 800);
        const parts = [answerText];

        if (msg.sqlQuery) {
          parts.push(`[SQL used: ${msg.sqlQuery}]`);
        }

        if (msg.dataSummary) {
          parts.push(`[Data: ${msg.dataSummary}]`);
        }

        return { role: msg.role, content: parts.join('\n') };
      });

      console.log('[AI Debug] Sending to edge function:', {
        query,
        historyLength: conversationHistory.length,
        historyRoles: conversationHistory.map(m => m.role),
      });

      const { data, error: invokeError } = await supabase.functions.invoke('ai-report-assistant', {
        body: {
          query,
          conversationHistory
        }
      });

      if (invokeError) {
        console.error('[AI Hook] Edge function invoke error:', {
          message: invokeError.message,
          status: invokeError.status,
          context: invokeError.context,
          name: invokeError.name
        });
        throw new Error(invokeError.message || 'Failed to send a request to the Edge Function');
      }

      if (data.error && !data.answer) {
        throw new Error(data.error);
      }

      // Format fields properly
      const formattedFields: ReportField[] = (data.fields || []).map((f: any) => ({
        key: f.key,
        label: f.label,
        type: f.type || 'text'
      }));

      // Build data summary for future conversation context
      const dataSummary = buildDataSummary(data.data || [], data.rowCount || 0);

      // Add assistant message with conversational answer
      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer || data.explanation || 'Here are your results:',
        answer: data.answer,
        showDetailsByDefault: data.showDetailsByDefault ?? false,
        timestamp: new Date(),
        reportData: data.data,
        reportFields: formattedFields,
        insights: data.insights,
        explanation: data.explanation,
        config: data.config,
        sqlQuery: data.query,
        dataSummary,
        suggestedFollowUps: data.suggestedFollowUps,
      };
      setMessages(prev => [...prev, assistantMessage]);

      return {
        success: true,
        answer: data.answer,
        showDetailsByDefault: data.showDetailsByDefault,
        config: data.config,
        data: data.data,
        fields: formattedFields,
        rowCount: data.rowCount,
        insights: data.insights,
        explanation: data.explanation,
        suggestedFollowUps: data.suggestedFollowUps,
      };
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to process query';

      // Provide user-friendly messages for common errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (errorMessage.includes('CORS') || errorMessage.includes('preflight')) {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
      }

      // Always update error state so components know an error occurred
      setError(errorMessage);

      const now = Date.now();

      // Check if this is a duplicate error within the debounce window
      const isDuplicate = lastErrorRef.current
        && lastErrorRef.current.message === errorMessage
        && (now - lastErrorRef.current.timestamp) < ERROR_DEBOUNCE_MS;

      if (!isDuplicate) {
        // Update last error tracker
        lastErrorRef.current = { message: errorMessage, timestamp: now };

        // Add error message to chat (only for non-duplicates)
        const errorAssistantMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please try rephrasing your question.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorAssistantMessage]);
      } else {
        console.log('[AI Assistant] Duplicate error suppressed from chat:', errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    lastErrorRef.current = null; // Reset error tracking
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendQuery,
    clearHistory,
  };
}
