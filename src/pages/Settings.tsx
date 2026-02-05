import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Bell, Shield, Database, Hash, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { AccountMappingsManager } from "@/components/AccountMappingsManager";
import { CompanyBrandingSettings } from "@/components/CompanyBrandingSettings";
import { LaborRateSettings } from "@/components/admin/LaborRateSettings";
import { QuickBooksSettings } from "@/components/QuickBooksSettings";
import { getBudgetAlertThreshold, setBudgetAlertThreshold } from "@/utils/budgetUtils";
import { getCaptionPreferences, setCaptionPreferences } from "@/utils/userPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  
  // Profile state
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [originalFirstName, setOriginalFirstName] = useState("");
  const [originalLastName, setOriginalLastName] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalSmsEnabled, setOriginalSmsEnabled] = useState(true);
  
  // Preferences state
  const [budgetThreshold, setBudgetThresholdState] = useState<number>(10);
  const [captionPromptsEnabled, setCaptionPromptsEnabled] = useState<boolean>(true);
  
  // Project counter state (admin only)
  const [projectCounter, setProjectCounter] = useState<number>(225000);
  const [projectCounterInput, setProjectCounterInput] = useState<string>("");
  const [loadingCounter, setLoadingCounter] = useState(false);

  // App updates state
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<Date | null>(null);

  // Track if profile has changes
  const hasProfileChanges = 
    firstName !== originalFirstName || 
    lastName !== originalLastName ||
    phone !== originalPhone ||
    smsEnabled !== originalSmsEnabled;

  useEffect(() => {
    fetchProfileData();
    setBudgetThresholdState(getBudgetAlertThreshold());
    getCaptionPreferences().then(prefs => setCaptionPromptsEnabled(prefs.showCaptionPrompts));
    if (isAdmin) {
      fetchProjectCounter();
    }
  }, [user, isAdmin]);

  const fetchProfileData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, sms_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Split full_name into firstName and lastName
      const nameParts = (data?.full_name || '').split(' ');
      const first = nameParts[0] || '';
      const last = nameParts.slice(1).join(' ') || '';
      
      setFirstName(first);
      setLastName(last);
      setOriginalFirstName(first);
      setOriginalLastName(last);
      setEmail(data?.email || user.email || '');
      setPhone(data?.phone || '');
      setSmsEnabled(data?.sms_notifications_enabled ?? true);
      setOriginalPhone(data?.phone || '');
      setOriginalSmsEnabled(data?.sms_notifications_enabled ?? true);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          phone: phone.trim() || null,
          sms_notifications_enabled: smsEnabled,
        })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalFirstName(firstName);
      setOriginalLastName(lastName);
      setOriginalPhone(phone);
      setOriginalSmsEnabled(smsEnabled);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFirstName(originalFirstName);
    setLastName(originalLastName);
    toast.info('Changes discarded');
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 100) {
      setBudgetThresholdState(value);
      setBudgetAlertThreshold(value);
    }
  };

  // Project counter management functions (admin only)
  const fetchProjectCounter = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'project_counter')
        .single();

      if (error) {
        console.error('Error fetching project counter:', error);
        return;
      }

      const counter = parseInt(data?.setting_value || '225000');
      setProjectCounter(counter);
      setProjectCounterInput(counter.toString());
    } catch (error) {
      console.error('Error fetching project counter:', error);
    }
  };

  const handleUpdateProjectCounter = async () => {
    const newCounter = parseInt(projectCounterInput);
    
    if (isNaN(newCounter) || newCounter < 225000) {
      toast.error('Please enter a valid counter value (minimum 225000)');
      return;
    }

    setLoadingCounter(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: newCounter.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'project_counter');

      if (error) throw error;

      setProjectCounter(newCounter);
      toast.success('Project counter updated successfully');
    } catch (error) {
      console.error('Error updating project counter:', error);
      toast.error('Failed to update project counter');
    } finally {
      setLoadingCounter(false);
    }
  };

  const handleAutoSyncCounter = async () => {
    setLoadingCounter(true);
    try {
      // Get the highest project number from existing projects
      const { data, error } = await supabase
        .from('projects')
        .select('project_number')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No projects found. Counter remains at current value.');
        setLoadingCounter(false);
        return;
      }

      // Extract numeric portion from project numbers (e.g., "225-123" -> 225123)
      const numbers = data
        .map(p => {
          const match = p.project_number?.match(/225-(\d+)/);
          return match ? 225000 + parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);

      if (numbers.length === 0) {
        toast.info('No valid project numbers found. Counter remains at current value.');
        setLoadingCounter(false);
        return;
      }

      const maxNumber = Math.max(...numbers);
      
      // Update to the highest number found
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: maxNumber.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'project_counter');

      if (updateError) throw updateError;

      setProjectCounter(maxNumber);
      setProjectCounterInput(maxNumber.toString());
      toast.success(`Counter synced to highest project number (${maxNumber})`);
    } catch (error) {
      console.error('Error syncing project counter:', error);
      toast.error('Failed to sync project counter');
    } finally {
      setLoadingCounter(false);
    }
  };

  const formatProjectNumber = (counter: number) => {
    const lastThreeDigits = counter % 1000;
    return `225-${lastThreeDigits.toString().padStart(3, '0')}`;
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          setLastUpdateCheck(new Date());
          toast.success('Update check complete', {
            description: 'You are running the latest version.'
          });
        } else {
          toast.info('Service worker not registered', {
            description: 'Updates will be applied on next app refresh.'
          });
        }
      } else {
        toast.error('Service workers not supported in this browser');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      toast.error('Failed to check for updates');
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your account and application preferences"
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Settings</span>
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Phone (for SMS)</Label>
              <Input 
                id="phone" 
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Used for clock-in reminders and team notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="sms-enabled"
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
                disabled={loading}
              />
              <Label htmlFor="sms-enabled" className="cursor-pointer">
                Receive SMS notifications
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Caption Prompts</Label>
                <p className="text-sm text-muted-foreground">Show prompts to add captions when capturing media</p>
              </div>
              <Switch
                checked={captionPromptsEnabled}
                onCheckedChange={async (checked) => {
                  await setCaptionPreferences({
                    showCaptionPrompts: checked,
                    dismissedAt: checked ? null : Date.now()
                  });
                  setCaptionPromptsEnabled(checked);
                  toast.success(checked ? 'Caption prompts enabled' : 'Caption prompts disabled');
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Data & Sync</span>
            </CardTitle>
            <CardDescription>Manage data imports and synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetThreshold">Budget Alert Threshold (%)</Label>
              <Input 
                id="budgetThreshold"
                type="number" 
                min="1"
                max="100"
                step="0.1"
                value={budgetThreshold}
                onChange={handleThresholdChange}
                placeholder="10"
              />
              <p className="text-sm text-muted-foreground">
                Alert when actual expenses exceed estimates or quotes by this percentage
              </p>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Project Number Management</span>
              </CardTitle>
              <CardDescription>
                Adjust the project numbering sequence (Admin Only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Current Counter</Label>
                    <p className="text-xs text-muted-foreground">Internal counter value</p>
                  </div>
                  <span className="text-lg font-mono font-bold">{projectCounter}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Next Project Number</Label>
                    <p className="text-xs text-muted-foreground">Will be assigned to the next project</p>
                  </div>
                  <span className="text-lg font-mono font-bold text-primary">
                    {formatProjectNumber(projectCounter + 1)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="counterInput">Adjust Counter Manually</Label>
                <div className="flex gap-2">
                  <Input
                    id="counterInput"
                    type="number"
                    min="225000"
                    value={projectCounterInput}
                    onChange={(e) => setProjectCounterInput(e.target.value)}
                    placeholder="225000"
                    disabled={loadingCounter}
                  />
                  <Button
                    onClick={handleUpdateProjectCounter}
                    disabled={loadingCounter || projectCounterInput === projectCounter.toString()}
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a counter value (minimum 225000). The next project will be 225-XXX where XXX is the last 3 digits.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Auto-Sync to Highest Project</Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAutoSyncCounter}
                  disabled={loadingCounter}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingCounter ? 'animate-spin' : ''}`} />
                  Sync to Highest Existing Project Number
                </Button>
                <p className="text-xs text-muted-foreground">
                  Automatically adjusts the counter to match the highest project number in the database. 
                  Use this after deleting projects to prevent number gaps.
                </p>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> Changing the counter manually may result in duplicate project numbers 
                  if set to a value already used. The auto-sync feature is recommended for safety.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <QuickBooksSettings />

        <AccountMappingsManager />

        <CompanyBrandingSettings />

        {isAdmin && <LaborRateSettings />}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>App Updates</span>
            </CardTitle>
            <CardDescription>Check for and install application updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current Version</p>
                <p className="text-xs text-muted-foreground">
                  v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleCheckForUpdates}
                disabled={checkingUpdates}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
                {checkingUpdates ? 'Checking...' : 'Check for Updates'}
              </Button>
            </div>
            {lastUpdateCheck && (
              <p className="text-xs text-muted-foreground">
                Last checked: {lastUpdateCheck.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security</span>
            </CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/change-password')}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline"
            onClick={handleCancel}
            disabled={!hasProfileChanges || loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveProfile}
            disabled={!hasProfileChanges || loading}
          >
            Save Changes
          </Button>
        </div>

        {/* App Version - Subtle footer */}
        <div className="flex items-center justify-center pt-6 pb-2 border-t mt-6">
          <p className="text-xs text-muted-foreground/60">
            App Version: v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
          </p>
        </div>
      </div>
    </MobilePageWrapper>
  );
};

export default Settings;