import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Bell, Shield, Database } from "lucide-react";
import { AccountMappingsManager } from "@/components/AccountMappingsManager";
import { CompanyBrandingSettings } from "@/components/CompanyBrandingSettings";
import { getBudgetAlertThreshold, setBudgetAlertThreshold } from "@/utils/budgetUtils";
import { getCaptionPreferences, setCaptionPreferences } from "@/utils/userPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Profile state
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [originalFirstName, setOriginalFirstName] = useState("");
  const [originalLastName, setOriginalLastName] = useState("");
  
  // Preferences state
  const [budgetThreshold, setBudgetThresholdState] = useState<number>(10);
  const [captionPromptsEnabled, setCaptionPromptsEnabled] = useState<boolean>(true);

  // Track if profile has changes
  const hasProfileChanges = firstName !== originalFirstName || lastName !== originalLastName;

  useEffect(() => {
    fetchProfileData();
    setBudgetThresholdState(getBudgetAlertThreshold());
    getCaptionPreferences().then(prefs => setCaptionPromptsEnabled(prefs.showCaptionPrompts));
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
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
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalFirstName(firstName);
      setOriginalLastName(lastName);
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

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </header>

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
            <div className="grid grid-cols-2 gap-4">
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

        <AccountMappingsManager />

        <CompanyBrandingSettings />

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
    </div>
  );
};

export default Settings;