import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';

export function CompanyBrandingSettings() {
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_branding_settings')
      .select('*')
      .single();
    
    if (error) {
      toast.error("Error loading branding", { description: error.message });
    } else {
      setBranding(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('company_branding_settings')
      .update({
        company_name: branding.company_name,
        company_legal_name: branding.company_legal_name,
        company_abbreviation: branding.company_abbreviation,
        company_address: branding.company_address,
        company_phone: branding.company_phone,
        company_license: branding.company_license,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        light_bg_color: branding.light_bg_color
      })
      .eq('id', branding.id);

    if (error) {
      toast.error("Error saving settings", { description: error.message });
    } else {
      toast.success("Settings saved", { description: "Company branding updated successfully" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="hidden md:block">
        <CardContent className="pt-6 flex justify-center">
          <BrandedLoader size="sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hidden md:block">
      <CardHeader>
        <CardTitle className="text-base">Company Branding</CardTitle>
        <CardDescription className="text-xs">
          Manage your company logo, colors, and information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Preview Section */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Current Logos</Label>
          <div className="flex flex-wrap gap-6 p-4 bg-muted rounded-md">
            {branding?.logo_full_url && (
              <div className="text-center">
                <img 
                  src={branding.logo_full_url} 
                  alt="Full Horizontal Logo" 
                  className="h-20 mb-2"
                  style={{ maxWidth: '240px' }}
                />
                <p className="text-xs text-muted-foreground font-medium">Full Horizontal</p>
                <p className="text-[10px] text-muted-foreground">200×48px</p>
              </div>
            )}
            {branding?.logo_icon_url && (
              <div className="text-center">
                <img 
                  src={branding.logo_icon_url} 
                  alt="Icon Only" 
                  className="h-20 w-20 mb-2"
                />
                <p className="text-xs text-muted-foreground font-medium">Icon Only</p>
                <p className="text-[10px] text-muted-foreground">48×48px</p>
              </div>
            )}
            {branding?.logo_stacked_url && (
              <div className="text-center">
                <img 
                  src={branding.logo_stacked_url} 
                  alt="Stacked Logo" 
                  className="h-20 mb-2"
                  style={{ maxWidth: '200px' }}
                />
                <p className="text-xs text-muted-foreground font-medium">Stacked</p>
                <p className="text-[10px] text-muted-foreground">200×80px</p>
              </div>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Company Information</Label>
          
          <div className="space-y-2">
            <Label className="text-xs">Company Name</Label>
            <Input
              value={branding?.company_name || ''}
              onChange={(e) => setBranding({...branding, company_name: e.target.value})}
              placeholder="Radcliff Construction Group"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Legal Name (with LLC/Inc)</Label>
            <Input
              value={branding?.company_legal_name || ''}
              onChange={(e) => setBranding({...branding, company_legal_name: e.target.value})}
              placeholder="Radcliff Construction Group, LLC"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Abbreviation</Label>
            <Input
              value={branding?.company_abbreviation || ''}
              onChange={(e) => setBranding({...branding, company_abbreviation: e.target.value})}
              placeholder="RCG"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Address</Label>
            <Input
              value={branding?.company_address || ''}
              onChange={(e) => setBranding({...branding, company_address: e.target.value})}
              placeholder="123 Main St, City, ST 12345"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Phone</Label>
            <Input
              value={branding?.company_phone || ''}
              onChange={(e) => setBranding({...branding, company_phone: e.target.value})}
              placeholder="(555) 123-4567"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">License/Contractor Number</Label>
            <Input
              value={branding?.company_license || ''}
              onChange={(e) => setBranding({...branding, company_license: e.target.value})}
              placeholder="License #12345"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Color Settings */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Brand Colors</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Primary (Navy)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={branding?.primary_color || '#1b2b43'}
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                  className="h-8 w-12 p-1"
                />
                <Input
                  type="text"
                  value={branding?.primary_color || '#1b2b43'}
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Accent (Orange)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={branding?.accent_color || '#cf791d'}
                  onChange={(e) => setBranding({...branding, accent_color: e.target.value})}
                  className="h-8 w-12 p-1"
                />
                <Input
                  type="text"
                  value={branding?.accent_color || '#cf791d'}
                  onChange={(e) => setBranding({...branding, accent_color: e.target.value})}
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Secondary (Dark Gray)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={branding?.secondary_color || '#2b2b2b'}
                  onChange={(e) => setBranding({...branding, secondary_color: e.target.value})}
                  className="h-8 w-12 p-1"
                />
                <Input
                  type="text"
                  value={branding?.secondary_color || '#2b2b2b'}
                  onChange={(e) => setBranding({...branding, secondary_color: e.target.value})}
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Light Background</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={branding?.light_bg_color || '#f4f7f9'}
                  onChange={(e) => setBranding({...branding, light_bg_color: e.target.value})}
                  className="h-8 w-12 p-1"
                />
                <Input
                  type="text"
                  value={branding?.light_bg_color || '#f4f7f9'}
                  onChange={(e) => setBranding({...branding, light_bg_color: e.target.value})}
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full h-8 text-xs"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
