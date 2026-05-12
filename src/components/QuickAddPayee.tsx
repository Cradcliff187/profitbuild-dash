import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PayeeType, Payee } from '@/types/payee';
import { cn } from '@/lib/utils';

interface QuickAddPayeeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (payee: Payee) => void;
  defaultPayeeType?: PayeeType;
  defaultProvidesLabor?: boolean;
  defaultIsInternal?: boolean;
  isMobile?: boolean;
}

const PAYEE_TYPE_LABELS: Record<PayeeType, string> = {
  [PayeeType.SUBCONTRACTOR]: 'Subcontractor',
  [PayeeType.MATERIAL_SUPPLIER]: 'Material Supplier',
  [PayeeType.EQUIPMENT_RENTAL]: 'Equipment Rental',
  [PayeeType.INTERNAL_LABOR]: 'Internal Labor',
  [PayeeType.MANAGEMENT]: 'Management',
  [PayeeType.PERMIT_AUTHORITY]: 'Permit Authority',
  [PayeeType.OTHER]: 'Other',
};

/**
 * Minimal payee creation form for inline use inside selectors (receipts, expenses, time entries).
 * Captures only name + type + optional contact info. The full PayeeForm (1099, insurance,
 * contract terms, billing address, etc.) lives on the /payees page for back-office editing.
 */
export function QuickAddPayee({
  open,
  onOpenChange,
  onCreated,
  defaultPayeeType = PayeeType.MATERIAL_SUPPLIER,
  defaultProvidesLabor,
  defaultIsInternal = false,
  isMobile = false,
}: QuickAddPayeeProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [payeeType, setPayeeType] = useState<PayeeType>(defaultPayeeType);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setPayeeType(defaultPayeeType);
    setPhone('');
    setEmail('');
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Payee name is required');
      return;
    }

    setSaving(true);
    try {
      const providesLabor =
        defaultProvidesLabor ?? (payeeType === PayeeType.SUBCONTRACTOR || payeeType === PayeeType.INTERNAL_LABOR);

      const { data, error } = await supabase
        .from('payees')
        .insert({
          payee_name: trimmed,
          payee_type: payeeType,
          phone_numbers: phone.trim() || null,
          email: email.trim() || null,
          provides_labor: providesLabor,
          is_internal: defaultIsInternal,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error(`A payee named "${trimmed}" already exists`);
          return;
        }
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['payees'] });
      toast.success(`Added ${trimmed}`);
      onCreated(data as Payee);
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create payee:', err);
      toast.error('Failed to create payee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('flex flex-col p-0', isMobile ? 'rounded-t-2xl' : 'w-full sm:max-w-[420px]')}
      >
        <SheetHeader className="space-y-1 px-6 pt-5 pb-3 border-b">
          <SheetTitle>Add Payee</SheetTitle>
          <SheetDescription>Quick add a vendor or supplier. Full details can be edited later under Payees.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-payee-name" className={cn(isMobile && 'text-base')}>
              Name *
            </Label>
            <Input
              id="quick-payee-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Depot"
              autoFocus
              className={cn(isMobile && 'h-12 text-base')}
              style={{ fontSize: isMobile ? '16px' : undefined }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-payee-type" className={cn(isMobile && 'text-base')}>
              Type
            </Label>
            <NativeSelect
              id="quick-payee-type"
              value={payeeType}
              onValueChange={(v) => setPayeeType(v as PayeeType)}
              className={cn('w-full', isMobile && 'h-12 text-base')}
            >
              {Object.values(PayeeType).map((t) => (
                <option key={t} value={t}>
                  {PAYEE_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-payee-phone" className={cn('text-muted-foreground', isMobile && 'text-base')}>
              Phone (optional)
            </Label>
            <Input
              id="quick-payee-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className={cn(isMobile && 'h-12 text-base')}
              style={{ fontSize: isMobile ? '16px' : undefined }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-payee-email" className={cn('text-muted-foreground', isMobile && 'text-base')}>
              Email (optional)
            </Label>
            <Input
              id="quick-payee-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
              className={cn(isMobile && 'h-12 text-base')}
              style={{ fontSize: isMobile ? '16px' : undefined }}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving} className={cn('flex-1', isMobile && 'h-12 text-base')}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !name.trim()} className={cn('flex-1', isMobile && 'h-12 text-base')}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Payee'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
