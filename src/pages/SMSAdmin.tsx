// src/pages/SMSAdmin.tsx

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileTabSelector } from '@/components/ui/mobile-tab-selector';
import { SMSComposer } from '@/components/sms/SMSComposer';
import { SMSHistory } from '@/components/sms/SMSHistory';
import { ScheduledSMSManager } from '@/components/sms/ScheduledSMSManager';
import { SMSSettings } from '@/components/sms/SMSSettings';
import { MessageSquare, History, Clock, Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { useState } from 'react';

export default function SMSAdmin() {
  const { isAdmin, isManager, loading: rolesLoading, roles } = useRoles();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasCheckedAccess = useRef(false);
  const [activeTab, setActiveTab] = useState('compose');

  const tabOptions = [
    { value: 'compose', label: 'Compose', icon: MessageSquare },
    { value: 'history', label: 'History', icon: History },
    { value: 'scheduled', label: 'Scheduled', icon: Clock },
    { value: 'settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    console.log('📱 SMSAdmin: Roles check:', { isAdmin, isManager, rolesLoading, rolesLength: roles.length, roles, hasChecked: hasCheckedAccess.current });
    
    // Don't check until roles have finished loading
    if (rolesLoading) {
      console.log('📱 SMSAdmin: Still loading...');
      return;
    }
    
    // Wait for roles to actually be populated (handles race condition between setRoles and setLoading)
    // If roles is empty but loading is false, we need to wait for the next render
    if (roles.length === 0 && !hasCheckedAccess.current) {
      console.log('📱 SMSAdmin: Roles array empty, waiting for next render...');
      return;
    }
    
    // Only check access once, after roles have loaded
    if (hasCheckedAccess.current) {
      console.log('📱 SMSAdmin: Already checked access, skipping');
      return;
    }
    
    hasCheckedAccess.current = true;
    console.log('📱 SMSAdmin: Checking access for the first time after roles populated');
    
    // Check roles array directly to avoid timing issues with derived state
    const hasAdminAccess = roles.includes('admin') || roles.includes('manager');
    
    // After loading is complete, check if user has required permissions
    if (!hasAdminAccess) {
      console.log('📱 SMSAdmin: Access denied (roles:', roles, '), redirecting');
      toast({
        title: 'Access Denied',
        description: 'Only administrators and managers can send SMS messages',
        variant: 'destructive',
      });
      navigate('/');
    } else {
      console.log('📱 SMSAdmin: Access granted! (roles:', roles, ')');
    }
  }, [isAdmin, isManager, rolesLoading, roles, navigate, toast]);

  if (rolesLoading) {
    return (
      <MobilePageWrapper>
        <div className="text-center">Loading roles...</div>
      </MobilePageWrapper>
    );
  }

  if (!isAdmin && !isManager) {
    return null;
  }

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={MessageSquare}
        title="Send SMS"
        description="Send SMS notifications to team members"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile Dropdown */}
        <div className="sm:hidden mb-4">
          <MobileTabSelector
            value={activeTab}
            onValueChange={setActiveTab}
            options={tabOptions}
          />
        </div>

        {/* Desktop Tabs - Styled like Time Management */}
        <div className="hidden sm:block mb-4">
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="inline-flex w-auto flex-nowrap justify-start gap-2 rounded-full bg-muted/40 p-1 min-w-full">
              <TabsTrigger
                value="compose"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Compose</span>
              </TabsTrigger>
              <TabsTrigger
                value="scheduled"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0"
              >
                <Clock className="h-4 w-4" />
                <span>Scheduled</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0"
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="compose" className="mt-0 sm:mt-4">
          <SMSComposer />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-0 sm:mt-4">
          <ScheduledSMSManager />
        </TabsContent>

        <TabsContent value="history" className="mt-0 sm:mt-4">
          <SMSHistory />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 sm:mt-4">
          <SMSSettings />
        </TabsContent>
      </Tabs>
    </MobilePageWrapper>
  );
}

