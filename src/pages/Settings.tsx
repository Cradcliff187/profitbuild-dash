import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Bell, Shield, Database, Hash, RefreshCw, Code2, Building2, Palette, DollarSign, Wallet, AlertTriangle, CheckCircle2, GitCommit, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";
import { AccountMappingsManager } from "@/components/AccountMappingsManager";
import { CompanyBrandingSettings } from "@/components/CompanyBrandingSettings";
import { LaborRateSettings } from "@/components/admin/LaborRateSettings";
import { QuickBooksSettings } from "@/components/QuickBooksSettings";
import { getBudgetAlertThreshold, setBudgetAlertThreshold } from "@/utils/budgetUtils";
import { getCaptionPreferences, setCaptionPreferences } from "@/utils/userPreferences";
import { getShowSandboxProject, setShowSandboxProject, SANDBOX_PROJECT_NUMBER } from "@/utils/sandboxPreferences";
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
  const [showSandbox, setShowSandboxState] = useState<boolean>(getShowSandboxProject());
  
  // Project counter state (admin only)
  const [projectCounter, setProjectCounter] = useState<number>(225000);
  const [projectCounterInput, setProjectCounterInput] = useState<string>("");
  const [loadingCounter, setLoadingCounter] = useState(false);

  // App updates state
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<Date | null>(null);
  // Deploy-status indicator. The version chain is: vite.config.ts emits a
  // string into both __APP_VERSION__ (baked into JS) and /version.json (file
  // on disk). The deployedBuildTime here comes from /version.json — when it's
  // significantly older than the latest commit on main, a publish is pending
  // (Lovable does NOT auto-deploy on push for this project — every release
  // requires a manual Publish click in the Lovable editor).
  const [deployedBuildTime, setDeployedBuildTime] = useState<string | null>(null);
  const [deployedVersion, setDeployedVersion] = useState<string | null>(null);
  const [latestCommit, setLatestCommit] = useState<{
    sha: string;
    date: string;
    message: string;
  } | null>(null);

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
    // Surface deploy state so users can see at a glance whether the latest
    // merge has actually been published. Failures degrade silently — the
    // indicator just doesn't render. No blocking toasts; the existing
    // "Check for Updates" button is still the explicit user-driven path.
    fetchDeployStatus();
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

  // Pulls the deploy-status info shown in the App Updates card:
  //   - /version.json from production (what's deployed right now)
  //   - latest commit on main from GitHub's public commits API (what should be deployed)
  // No auth needed — repo is public. CORS is allowed by GitHub for this endpoint.
  // Both fetches degrade silently on failure; the indicator just doesn't render.
  const fetchDeployStatus = async () => {
    try {
      const versionRes = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (versionRes.ok) {
        const { version, buildTime } = await versionRes.json();
        setDeployedVersion(version ?? null);
        setDeployedBuildTime(buildTime ?? null);
      }
    } catch {
      // Network or parse error — leave indicator hidden
    }
    try {
      const commitRes = await fetch(
        "https://api.github.com/repos/Cradcliff187/profitbuild-dash/commits/main",
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (commitRes.ok) {
        const data = await commitRes.json();
        setLatestCommit({
          sha: data.sha?.slice(0, 7) ?? "",
          date: data.commit?.committer?.date ?? data.commit?.author?.date ?? "",
          message: (data.commit?.message ?? "").split("\n")[0],
        });
      }
    } catch {
      // GitHub API rate-limited or offline — leave indicator partial
    }
  };

  // Format an ISO timestamp as "5 minutes ago" / "2 hours ago" / "3 days ago"
  // — falls back to a locale string for anything older than a week.
  const formatRelativeTime = (iso: string | null): string => {
    if (!iso) return "unknown";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "unknown";
    const diffMs = Date.now() - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} days ago`;
    return new Date(iso).toLocaleDateString();
  };

  // Publish-pending heuristic: latest commit on main is newer than the
  // deployed buildTime by more than 5 minutes. The 5-min buffer absorbs
  // the natural lag between merge and Lovable build completion (~2 min in
  // practice) without flagging healthy deploys as stale.
  //
  // Returns one of:
  //   'pending'  — main has a commit newer than deploy + 5min buffer
  //   'in-sync'  — both timestamps known and aligned
  //   'unknown'  — at least one fetch failed (dev mode, network blip, etc.)
  // We render different copy for each so the user never sees a misleading
  // "In sync" when we couldn't actually verify it.
  const getDeployStatus = (): "pending" | "in-sync" | "unknown" => {
    if (!deployedBuildTime || !latestCommit?.date) return "unknown";
    const deployTs = new Date(deployedBuildTime).getTime();
    const commitTs = new Date(latestCommit.date).getTime();
    if (Number.isNaN(deployTs) || Number.isNaN(commitTs)) return "unknown";
    return commitTs - deployTs > 5 * 60 * 1000 ? "pending" : "in-sync";
  };

  // Bypasses the SW byte-comparison heuristic by fetching /version.json with
  // cache: 'no-store' and string-comparing to the version baked into the
  // running JS. When versions differ the user gets a Force Update CTA that
  // unregisters every SW, deletes every cache, and hard-reloads — guaranteed
  // to land on the new version even if iOS has the old SW stuck in waiting
  // or the SW lifecycle is otherwise unhealthy.
  const forceUpdate = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (error) {
      console.error('Force update cleanup failed:', error);
    }
    // Hard reload — bypasses any remaining in-memory caches.
    window.location.reload();
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      setLastUpdateCheck(new Date());

      if (!response.ok) {
        toast.error('Could not check for updates', {
          description: `Server returned ${response.status}.`,
        });
        return;
      }

      const { version: deployedVersion, buildTime } = await response.json();
      const currentVersion = __APP_VERSION__;
      setDeployedVersion(deployedVersion ?? null);
      setDeployedBuildTime(buildTime ?? null);
      // Also refresh the latest-commit pointer so the publish-pending dot is
      // accurate after a manual check.
      fetchDeployStatus();

      if (deployedVersion && deployedVersion !== currentVersion) {
        toast('Update Available', {
          description: `${currentVersion} → ${deployedVersion}`,
          action: { label: 'Update Now', onClick: forceUpdate },
          duration: Infinity,
          dismissible: true,
        });

        // Also kick the normal SW flow so the in-app "Update Available" toast
        // from main.tsx can fire on its own once the new SW finishes installing.
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          registration?.update().catch(() => {});
        }
      } else {
        toast.success("You're up to date", {
          description: `Running ${currentVersion}`,
        });
      }
    } catch (error) {
      console.error('Update check failed:', error);
      toast.error('Failed to check for updates', {
        description: 'Network error. Check your connection and try again.',
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  // R4 — Section nav. Settings is 11 cards on a single scroll; this lets
  // admins jump directly to the section they came for instead of scrolling
  // through a 4-screen-tall page. Pill-strip pattern (matches R2 across the
  // app), sticky under the page header, horizontal scroll on overflow.
  type SettingsSection = { id: string; label: string; icon: LucideIcon; show: boolean };
  const sections: SettingsSection[] = [
    { id: 'profile', label: 'Profile', icon: User, show: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, show: true },
    { id: 'data-sync', label: 'Data & Sync', icon: Database, show: true },
    { id: 'project-numbers', label: 'Project Numbers', icon: Hash, show: isAdmin },
    { id: 'quickbooks', label: 'QuickBooks', icon: Wallet, show: true },
    { id: 'account-mappings', label: 'Account Mappings', icon: DollarSign, show: true },
    { id: 'branding', label: 'Branding', icon: Palette, show: true },
    { id: 'labor-rates', label: 'Labor Rates', icon: Building2, show: isAdmin },
    { id: 'developer', label: 'Developer', icon: Code2, show: isAdmin },
    { id: 'app-updates', label: 'Updates', icon: RefreshCw, show: true },
    { id: 'security', label: 'Security', icon: Shield, show: true },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your account and application preferences"
      />

      {/* Section nav — sticky pill strip. Horizontal scroll on overflow so
          all 8-11 sections (depending on role) stay reachable on a phone. */}
      <nav
        aria-label="Settings sections"
        className="sticky top-0 z-20 -mx-3 sm:mx-0 mb-4 px-3 sm:px-0 py-2 bg-background/95 backdrop-blur-sm border-b border-border"
      >
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {sections.filter(s => s.show).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "text-xs font-medium whitespace-nowrap",
                  "border border-border bg-card text-muted-foreground",
                  "hover:border-primary hover:text-foreground hover:bg-primary/5",
                  "active:bg-primary/10 transition-colors min-h-[36px]"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grid gap-6">
        <section id="profile" className="scroll-mt-24">
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
        </section>

        <section id="notifications" className="scroll-mt-24">
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
        </section>

        <section id="data-sync" className="scroll-mt-24">
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
        </section>

        {isAdmin && (
          <section id="project-numbers" className="scroll-mt-24">
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

              <div className="p-3 bg-warning-bg border border-warning-border rounded-md">
                <p className="text-xs text-warning-fg">
                  <strong>Warning:</strong> Changing the counter manually may result in duplicate project numbers
                  if set to a value already used. The auto-sync feature is recommended for safety.
                </p>
              </div>
            </CardContent>
          </Card>
          </section>
        )}

        <section id="quickbooks" className="scroll-mt-24">
          <QuickBooksSettings />
        </section>

        <section id="account-mappings" className="scroll-mt-24">
          <AccountMappingsManager />
        </section>

        <section id="branding" className="scroll-mt-24">
          <CompanyBrandingSettings />
        </section>

        {isAdmin && (
          <section id="labor-rates" className="scroll-mt-24">
            <LaborRateSettings />
          </section>
        )}

        {isAdmin && (
          <section id="developer" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code2 className="h-5 w-5" />
                <span>Developer</span>
              </CardTitle>
              <CardDescription>Admin-only toggles for verification work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <Label>Show sandbox test project</Label>
                  <p className="text-sm text-muted-foreground">
                    Surfaces the <code className="text-xs">{SANDBOX_PROJECT_NUMBER}</code> project on the Projects list so it can be used for verifying reactive UI flows (approve, save, delete) without touching real data. Hidden by default.
                  </p>
                </div>
                <Switch
                  checked={showSandbox}
                  onCheckedChange={(checked) => {
                    setShowSandboxProject(checked);
                    setShowSandboxState(checked);
                    toast.success(checked ? 'Sandbox project visible' : 'Sandbox project hidden', {
                      description: 'Refresh the Projects page to see the change.',
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
          </section>
        )}

        <section id="app-updates" className="scroll-mt-24">
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
                  v{__APP_VERSION__}
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

            {/*
              Deploy status: shows what's deployed vs what's on main. Lovable
              does NOT auto-deploy on push for this project — every release
              requires a manual Publish click. The amber indicator makes the
              "merged but not published" state visible instead of invisible.
              In dev (no /version.json) or on network failure, status falls
              back to "Unknown" rather than misleading "In sync".
            */}
            {(deployedBuildTime || latestCommit) && (() => {
              const status = getDeployStatus();
              return (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Deploy status
                      </p>
                      <div className="flex items-center gap-2">
                        {status === "pending" && (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              Publish pending
                            </span>
                          </>
                        )}
                        {status === "in-sync" && (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              In sync
                            </span>
                          </>
                        )}
                        {status === "unknown" && (
                          <span className="text-sm font-medium text-muted-foreground">
                            Status unknown
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    {deployedVersion && deployedBuildTime && (
                      <p>
                        <span className="font-medium text-foreground">Deployed:</span>{" "}
                        {deployedVersion} · {formatRelativeTime(deployedBuildTime)}
                      </p>
                    )}
                    {latestCommit && (
                      <p className="flex items-start gap-1.5">
                        <GitCommit className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">main:</span>{" "}
                          <span className="font-mono">{latestCommit.sha}</span> ·{" "}
                          {formatRelativeTime(latestCommit.date)}
                          <br />
                          <span className="text-muted-foreground/80 italic">
                            {latestCommit.message}
                          </span>
                        </span>
                      </p>
                    )}
                    {status === "pending" && (
                      <p className="text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-500/20">
                        Code is on <code className="text-xs">main</code> but not yet live.
                        Open Lovable and click <strong>Publish</strong> to deploy.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {lastUpdateCheck && (
              <p className="text-xs text-muted-foreground">
                Last checked: {lastUpdateCheck.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
        </section>

        <section id="security" className="scroll-mt-24">
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
        </section>

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
      </div>
    </MobilePageWrapper>
  );
};

export default Settings;