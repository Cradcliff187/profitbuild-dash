import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Trash2, Loader2, User, Bot, FileText } from "lucide-react";
import { useAIReportAssistant, AIMessage } from '@/hooks/useAIReportAssistant';
import { ReportViewer } from './ReportViewer';
import { AIInsightsCard } from './AIInsightsCard';
import { ExportControls } from './ExportControls';
import { cn } from '@/lib/utils';

const EXAMPLE_PROMPTS = [
  "Show me projects that are over budget",
  "Which employees worked the most hours this week?",
  "Find expenses over $5,000 from this month",
  "List projects with margin below 15%",
  "Show pending quotes for all projects",
  "What are my highest revenue projects?",
];

export function AIReportChat() {
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, sendQuery, clearHistory } = useAIReportAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const query = inputValue.trim();
    setInputValue('');
    await sendQuery(query);
  };

  const handleExampleClick = async (prompt: string) => {
    if (isLoading) return;
    setInputValue('');
    await sendQuery(prompt);
  };

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-3 mb-4",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className={cn(
          "flex-1 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}>
          <div className={cn(
            "rounded-lg px-4 py-2",
            isUser 
              ? "bg-primary text-primary-foreground ml-auto" 
              : "bg-muted"
          )}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Report Data */}
          {message.reportData && message.reportData.length > 0 && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{message.reportData.length} rows found</span>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <ReportViewer
                    data={message.reportData}
                    fields={message.reportFields || []}
                    pageSize={10}
                  />
                </CardContent>
              </Card>

              {message.reportFields && message.reportData.length > 0 && (
                <ExportControls
                  data={message.reportData}
                  fields={message.reportFields}
                  reportName={`AI Report - ${new Date().toLocaleDateString()}`}
                />
              )}
            </div>
          )}

          {/* AI Insights */}
          {message.insights && (
            <div className="mt-3">
              <AIInsightsCard insights={message.insights} />
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Report Assistant
          </CardTitle>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearHistory}
              className="h-8 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="h-12 w-12 text-primary/40 mb-4" />
            <h3 className="text-lg font-medium mb-2">Ask me anything about your data</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Describe the report you need in plain English. I'll build it and provide insights.
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLE_PROMPTS.map((prompt, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5 text-xs"
                  onClick={() => handleExampleClick(prompt)}
                >
                  {prompt}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className="flex gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing your request...
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your projects, expenses, quotes..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
