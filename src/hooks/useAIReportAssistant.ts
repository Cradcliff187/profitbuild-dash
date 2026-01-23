import { useState, useCallback } from 'react';
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
}

export function useAIReportAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Build conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error: invokeError } = await supabase.functions.invoke('ai-report-assistant', {
        body: { 
          query,
          conversationHistory 
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      // If there's an error but also an answer, display the helpful answer instead of throwing
      if (data.error && data.answer) {
        const assistantMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          explanation: data.explanation || data.error,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setError(data.error);
        setIsLoading(false);
        return { success: false, error: data.error, answer: data.answer };
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
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process query';
      setError(errorMessage);

      // Add error message
      const errorAssistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try rephrasing your question.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorAssistantMessage]);

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
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendQuery,
    clearHistory,
  };
}
