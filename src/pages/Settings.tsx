import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Bell, Shield, Database } from "lucide-react";
import { AccountMappingsManager } from "@/components/AccountMappingsManager";
import { getBudgetAlertThreshold, setBudgetAlertThreshold } from "@/utils/budgetUtils";
import { getCaptionPreferences, setCaptionPreferences } from "@/utils/userPreferences";
import { toast } from "sonner";

const Settings = () => {
  const [budgetThreshold, setBudgetThresholdState] = useState<number>(10);
  const [captionPromptsEnabled, setCaptionPromptsEnabled] = useState<boolean>(true);

  useEffect(() => {
    setBudgetThresholdState(getBudgetAlertThreshold());
    getCaptionPreferences().then(prefs => setCaptionPromptsEnabled(prefs.showCaptionPrompts));
  }, []);

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
                <Input id="firstName" placeholder="Enter first name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Enter last name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="Enter company name" />
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
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates about your projects</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Project Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified about project milestones</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Budget Warnings</Label>
                <p className="text-sm text-muted-foreground">Alert when expenses approach budget limits</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-sync QuickBooks</Label>
                <p className="text-sm text-muted-foreground">Automatically import transactions from QuickBooks</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Default Project Category</Label>
              <Input placeholder="e.g., Construction, Renovation" />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Input placeholder="USD" defaultValue="USD" />
            </div>
            <Separator />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security</span>
            </CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
            <Button variant="outline" className="w-full">
              Enable Two-Factor Authentication
            </Button>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;