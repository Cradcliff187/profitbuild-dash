import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { SMSComposer } from '@/components/sms/SMSComposer';
import { SMSHistory } from '@/components/sms/SMSHistory';
import { ScheduledSMSManager } from '@/components/sms/ScheduledSMSManager';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Clock, History } from 'lucide-react';

const tabOptions = [
  { value: "compose", label: "Compose", icon: Send },
  { value: "scheduled", label: "Scheduled", icon: Clock },
  { value: "history", label: "History", icon: History },
];

export default function SMS() {
  const { isAdmin, isManager, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("compose");

  useEffect(() => {
    if (!rolesLoading && !isAdmin && !isManager) {
      toast({
        title: 'Access Denied',
        description: 'Only administrators and managers can send SMS messages',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [isAdmin, isManager, rolesLoading, navigate, toast]);

  if (rolesLoading) {
    return (
      <div className="w-full overflow-x-hidden px-2 sm:px-4 py-2 space-y-2">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && !isManager) {
    return null;
  }

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 py-2 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="flex items-center space-x-3 min-w-0">
          <MessageSquare className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">SMS Messages</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Send text messages with app links to field workers
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-auto">
            {/* Mobile: Select dropdown */}
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: Pill tabs */}
            <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-2">
          <SMSComposer />
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-2">
          <ScheduledSMSManager />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-2">
          <SMSHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
