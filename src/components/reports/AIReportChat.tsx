import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Trash2, Loader2, User, Bot, FileText, ChevronDown, ChevronUp, Mic, MicOff } from "lucide-react";
import { useAIReportAssistant, AIMessage } from '@/hooks/useAIReportAssistant';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { ReportViewer } from './ReportViewer';
import { AIInsightsCard } from './AIInsightsCard';
import { ExportControls } from './ExportControls';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Suggestion cards on first load — paired (icon + prompt) so users
// understand what KIND of question to ask, not just example phrasing.
// Grouping echoes the report categories admins/managers use most:
// pipeline, time, money, customers.
const SUGGESTION_GROUPS: { label: string; prompts: string[] }[] = [
  {
    label: "Pipeline",
    prompts: [
      "How many projects are over budget?",
      "What's the average project margin?",
    ],
  },
  {
    label: "Time",
    prompts: [
      "Who worked the most hours this week?",
      "Show me all entries pending approval",
    ],
  },
  {
    label: "Money",
    prompts: [
      "What's our total revenue this month?",
      "Show me all expenses over $5,000",
    ],
  },
  {
    label: "Customers",
    prompts: [
      "Which client owes us the most?",
      "List clients with no active projects",
    ],
  },
];

const EXAMPLE_PROMPTS = SUGGESTION_GROUPS.flatMap(g => g.prompts);

export function AIReportChat() {
  const [inputValue, setInputValue] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const { messages, isLoading, sendQuery, clearHistory } = useAIReportAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio recording
  const {
    startRecording,
    stopRecording,
    isRecording,
    audioData,
    audioFormat,
    duration,  // Hook returns 'duration', not 'recordingDuration'
    reset: resetRecording  // Hook returns 'reset', aliased as 'resetRecording'
  } = useAudioRecording();

  // Transcription
  const {
    transcribe,
    isTranscribing,
    transcription,
    error: transcriptionError,
    reset: resetTranscription  // Hook returns 'reset', aliased as 'resetTranscription'
  } = useAudioTranscription();

  // Microphone permission state
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  // Recording duration (local state for UI display, hook provides 'duration' but we need our own counter for 30s limit)
  const [recordingDuration, setRecordingDuration] = useState(0);
  const MAX_RECORDING_SECONDS = 30;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-expand messages that should show details by default
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.showDetailsByDefault && msg.reportData?.length) {
        setExpandedMessages(prev => new Set(prev).add(msg.id));
      }
    });
  }, [messages]);

  // Check microphone permission on mount
  useEffect(() => {
    // Check if microphone permission is available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(result => {
          setHasMicPermission(result.state !== 'denied');
          // Listen for permission changes
          result.addEventListener('change', () => {
            setHasMicPermission(result.state !== 'denied');
          });
        })
        .catch(() => {
          // Permissions API not supported, show button anyway
          setHasMicPermission(true);
        });
    } else {
      // Permissions API not supported, show button anyway
      setHasMicPermission(true);
    }
  }, []);

  // Recording duration timer and auto-stop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (isRecording) {
      // Start duration counter
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Auto-stop at max duration
      timeout = setTimeout(() => {
        stopRecording();
        toast.info(`Recording stopped - ${MAX_RECORDING_SECONDS} second limit`);
      }, MAX_RECORDING_SECONDS * 1000);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRecording, stopRecording]);

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (audioData && audioFormat && !isRecording) {
      transcribe(audioData, audioFormat);
    }
  }, [audioData, audioFormat, isRecording, transcribe]);

  // Put transcription in input field (NOT auto-send)
  useEffect(() => {
    if (transcription) {
      // Put transcription in input field for user review
      setInputValue(transcription);

      // Focus input so user can edit or press Enter
      inputRef.current?.focus();

      // Show success feedback
      toast.success('Transcription complete - review and press Enter to send');

      // Reset for next recording
      resetTranscription();
      resetRecording();
    }
  }, [transcription, resetTranscription, resetRecording]);

  // Handle transcription errors
  useEffect(() => {
    if (transcriptionError) {
      toast.error('Failed to transcribe audio. Please try again or type your question.');
      resetRecording();
      resetTranscription();
    }
  }, [transcriptionError, resetRecording, resetTranscription]);

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      stopRecording();
    } else {
      // Start recording
      try {
        await startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);

        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          toast.error('Microphone access denied. Please enable microphone permissions in your browser settings.');
          setHasMicPermission(false);
        } else {
          toast.error('Failed to start recording. Please try again.');
        }
      }
    }
  };

  const handleCancelRecording = () => {
    stopRecording();
    resetRecording();
    toast.info('Recording cancelled');
  };

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

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Find the last assistant message ID for showing follow-up chips
  const lastAssistantMessageId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user';
    const hasData = message.reportData && message.reportData.length > 0;
    const isExpanded = expandedMessages.has(message.id);
    const isLastAssistant = message.id === lastAssistantMessageId;
    const hasFollowUps = isLastAssistant && message.suggestedFollowUps && message.suggestedFollowUps.length > 0;

    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-2 mb-3",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
        </div>

        <div className={cn(
          "flex-1 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}>
          {/* Message bubble */}
          <div className={cn(
            "rounded-lg px-3 py-2",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted"
          )}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* View Details toggle for data */}
          {hasData && !isUser && (
            <div className="mt-2 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleExpanded(message.id)}
                className="h-7 text-xs gap-1"
              >
                <FileText className="h-3 w-3" />
                {isExpanded ? 'Hide' : 'View'} details ({message.reportData!.length} rows)
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>

              {/* Expanded data view */}
              {isExpanded && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <ReportViewer
                        data={message.reportData!}
                        fields={message.reportFields || []}
                        pageSize={10}
                      />
                    </CardContent>
                  </Card>

                  {message.reportFields && (
                    <ExportControls
                      data={message.reportData!}
                      fields={message.reportFields}
                      reportName={`AI Report - ${new Date().toLocaleDateString()}`}
                    />
                  )}

                  {/* AI Insights */}
                  {message.insights && (
                    <AIInsightsCard insights={message.insights} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Suggested follow-up questions (only on last assistant message) */}
          {hasFollowUps && !isLoading && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.suggestedFollowUps!.map((followUp, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-2 py-1 text-xs"
                  onClick={() => handleExampleClick(followUp)}
                >
                  {followUp}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      <CardHeader className="py-2 px-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Assistant
          </CardTitle>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearHistory}
              className="h-7 text-xs px-2"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          // First-load suggestion view (R13). Grouped suggestion cards in a
          // 1-col mobile / 2-col desktop grid replace the previous tiny
          // Badge pills. Matches modern LLM-first UI patterns (Notion AI,
          // Linear Ask, ChatGPT) — users see WHAT KIND of question they
          // can ask, not just one-off example phrasing.
          <div className="flex flex-col items-center justify-center h-full px-3 sm:px-6 py-6">
            <div className="text-center mb-6 max-w-md">
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Ask me anything</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions in plain English. I'll find the answer in your data.
              </p>
            </div>

            <div className="w-full max-w-2xl space-y-4">
              {SUGGESTION_GROUPS.map((group) => (
                <div key={group.label}>
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    {group.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleExampleClick(prompt)}
                        className={cn(
                          "text-left bg-card border border-border rounded-lg p-3",
                          "text-sm text-foreground",
                          "hover:border-primary hover:bg-primary/5 active:bg-primary/10",
                          "transition-colors min-h-[44px] flex items-center gap-2"
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className="flex gap-2 mb-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isRecording ? "Recording..." : "Ask about projects, expenses, quotes..."}
            disabled={isLoading || isRecording || isTranscribing}
            className="flex-1 h-8 text-sm"
          />

          {/* Microphone Button */}
          {hasMicPermission !== false && (
            <div className="relative">
              {isRecording ? (
                <div className="flex items-center gap-1">
                  {/* Recording duration indicator */}
                  <span className="text-xs text-red-500 font-mono min-w-[32px]">
                    {recordingDuration}s
                  </span>

                  {/* Stop button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleMicClick}
                    className="h-12 w-12 min-h-[48px] min-w-[48px] animate-pulse"
                    title="Stop recording"
                  >
                    <MicOff className="h-5 w-5" />
                  </Button>

                  {/* Cancel button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelRecording}
                    className="h-12 min-h-[48px]"
                  >
                    Cancel
                  </Button>
                </div>
              ) : isTranscribing ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  disabled
                  className="h-12 w-12 min-h-[48px] min-w-[48px]"
                  title="Transcribing..."
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleMicClick}
                  disabled={isLoading}
                  className="h-12 w-12 min-h-[48px] min-w-[48px]"
                  title="Record voice query"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim() || isRecording || isTranscribing}
            className="h-12 min-h-[48px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Recording state visual feedback */}
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-red-500 animate-pulse mt-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>Recording... Tap mic to stop ({MAX_RECORDING_SECONDS - recordingDuration}s remaining)</span>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Transcribing your question...</span>
          </div>
        )}
      </div>
    </Card>
  );
}
