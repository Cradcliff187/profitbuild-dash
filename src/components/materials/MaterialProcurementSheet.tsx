import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ProjectMaterial,
  ProcurementStatus,
  MaterialProcurementPatch,
} from '@/hooks/useProjectMaterials';
import { PROCUREMENT_STATUS_META, PROCUREMENT_STATUS_ORDER } from './procurementMeta';

interface MaterialProcurementSheetProps {
  material: ProjectMaterial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, isChangeOrder: boolean, patch: MaterialProcurementPatch) => Promise<void>;
  isSaving?: boolean;
}

export function MaterialProcurementSheet({
  material,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: MaterialProcurementSheetProps) {
  const [status, setStatus] = useState<ProcurementStatus>('not_ordered');
  const [needBy, setNeedBy] = useState('');
  const [delivery, setDelivery] = useState('');
  const [longLead, setLongLead] = useState(false);

  // Re-seed local form state whenever a different material is opened.
  useEffect(() => {
    if (!material) return;
    setStatus(material.procurementStatus);
    setNeedBy(material.needByDate ?? '');
    setDelivery(material.expectedDeliveryDate ?? '');
    setLongLead(material.isLongLead);
  }, [material]);

  if (!material) return null;

  const handleSave = async () => {
    await onSave(material.id, material.isChangeOrder, {
      procurement_status: status,
      need_by_date: needBy || null,
      expected_delivery_date: delivery || null,
      is_long_lead: longLead,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{material.description}</SheetTitle>
          <SheetDescription className="text-xs">
            {material.quantity} × ${material.costPerUnit.toLocaleString()} ·{' '}
            <span className="font-medium text-foreground">
              ${material.totalCost.toLocaleString()}
            </span>
            {material.isChangeOrder && material.changeOrderNumber
              ? ` · CO ${material.changeOrderNumber}`
              : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-xs">Procurement status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProcurementStatus)}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCUREMENT_STATUS_ORDER.map((key) => (
                  <SelectItem key={key} value={key}>
                    {PROCUREMENT_STATUS_META[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-xs font-medium">Long-lead item</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Made-to-order / long delivery (casework, custom doors, fixtures).
                Surfaces first and as a delivery milestone on the schedule.
              </p>
            </div>
            <Switch checked={longLead} onCheckedChange={setLongLead} />
          </div>

          <div>
            <Label htmlFor="need-by" className="text-xs">
              Need on-site by
            </Label>
            <Input
              id="need-by"
              type="date"
              value={needBy}
              onChange={(e) => setNeedBy(e.target.value)}
              className="mt-1 h-9"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              When it must be on site so dependent work can start.
            </p>
          </div>

          <div>
            <Label htmlFor="delivery" className="text-xs">
              Expected delivery date
            </Label>
            <Input
              id="delivery"
              type="date"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
