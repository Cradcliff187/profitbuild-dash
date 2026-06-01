import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { Package, Pencil, Truck, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/contexts/RoleContext';
import { useProjectMaterials, ProjectMaterial } from '@/hooks/useProjectMaterials';
import { parseDateOnly } from '@/utils/scheduleNotes';
import { PROCUREMENT_STATUS_META } from './procurementMeta';
import { MaterialProcurementSheet } from './MaterialProcurementSheet';

interface ProjectMaterialsListProps {
  projectId: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return parseDateOnly(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Days from today (local) until the given date. Negative = in the past.
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateOnly(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function sortMaterials(materials: ProjectMaterial[]): ProjectMaterial[] {
  return [...materials].sort((a, b) => {
    // Long-lead first
    if (a.isLongLead !== b.isLongLead) return a.isLongLead ? -1 : 1;
    // Then by need-by date (nulls last)
    const aTime = a.needByDate ? new Date(a.needByDate).getTime() : Infinity;
    const bTime = b.needByDate ? new Date(b.needByDate).getTime() : Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return a.description.localeCompare(b.description);
  });
}

function MaterialRow({
  material,
  canEdit,
  onEdit,
}: {
  material: ProjectMaterial;
  canEdit: boolean;
  onEdit: (m: ProjectMaterial) => void;
}) {
  const statusMeta = PROCUREMENT_STATUS_META[material.procurementStatus];
  const isDelivered = material.procurementStatus === 'delivered';
  const days = daysUntil(material.needByDate);
  const overdue = !isDelivered && days !== null && days < 0;
  const urgent = !isDelivered && days !== null && days >= 0 && days <= 7;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {material.isLongLead && (
            <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" aria-label="Long-lead item" />
          )}
          <span className="text-sm font-medium truncate">{material.description}</span>
          {material.isChangeOrder && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1 bg-pink-50 text-pink-700 border-pink-200 flex-shrink-0"
            >
              CO
            </Badge>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>
            {material.quantity} × {formatCurrency(material.costPerUnit)}
          </span>
          <span>•</span>
          <span className="font-medium text-foreground">{formatCurrency(material.totalCost)}</span>
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-5', statusMeta.badgeClasses)}
          >
            {statusMeta.label}
          </Badge>

          {material.needByDate && (
            <span
              className={cn(
                'text-[11px] inline-flex items-center gap-1',
                overdue ? 'text-destructive font-medium' : urgent ? 'text-amber-600 font-medium' : 'text-muted-foreground'
              )}
            >
              {overdue && <AlertTriangle className="h-3 w-3" />}
              Need by {formatDate(material.needByDate)}
              {!isDelivered && days !== null && (
                <span>
                  {overdue ? ` · ${Math.abs(days)}d overdue` : urgent ? ` · ${days}d` : ''}
                </span>
              )}
            </span>
          )}

          {material.expectedDeliveryDate && (
            <span className="text-[11px] inline-flex items-center gap-1 text-muted-foreground">
              <Truck className="h-3 w-3" />
              {formatDate(material.expectedDeliveryDate)}
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={() => onEdit(material)}
          aria-label="Edit procurement details"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function ProjectMaterialsList({ projectId }: ProjectMaterialsListProps) {
  const { isAdmin, isManager } = useRoles();
  const canEdit = isAdmin || isManager;
  const { materials, isLoading, error, updateMaterial, isUpdating } = useProjectMaterials(projectId);

  const [editing, setEditing] = useState<ProjectMaterial | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sorted = useMemo(() => sortMaterials(materials), [materials]);

  const summary = useMemo(() => {
    const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
    const longLead = materials.filter((m) => m.isLongLead).length;
    const awaiting = materials.filter((m) => m.procurementStatus !== 'delivered').length;
    const upcomingDeliveries = materials
      .filter((m) => m.procurementStatus !== 'delivered' && m.expectedDeliveryDate)
      .map((m) => m.expectedDeliveryDate as string)
      .sort();
    return {
      totalCost,
      count: materials.length,
      longLead,
      awaiting,
      nextDelivery: upcomingDeliveries[0] ?? null,
    };
  }, [materials]);

  const openEdit = (m: ProjectMaterial) => {
    setEditing(m);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <BrandedLoader size="md" message="Loading materials…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive">
        <p className="text-sm text-destructive">{error.message || 'Failed to load materials'}</p>
      </Card>
    );
  }

  if (materials.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">No materials yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Materials from the approved estimate (and approved change orders) show up here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <Card className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(summary.totalCost)}</div>
            <div className="text-[11px] text-muted-foreground">{summary.count} materials</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-amber-600">{summary.longLead}</div>
            <div className="text-[11px] text-muted-foreground">Long-lead</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums">{summary.awaiting}</div>
            <div className="text-[11px] text-muted-foreground">Not delivered</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums">{formatDate(summary.nextDelivery)}</div>
            <div className="text-[11px] text-muted-foreground">Next delivery</div>
          </div>
        </div>
      </Card>

      {!canEdit && (
        <p className="text-[11px] text-muted-foreground px-1">
          Procurement dates &amp; status are managed by admins and project managers.
        </p>
      )}

      <div className="space-y-2">
        {sorted.map((m) => (
          <MaterialRow key={m.id} material={m} canEdit={canEdit} onEdit={openEdit} />
        ))}
      </div>

      <MaterialProcurementSheet
        material={editing}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={(id, isChangeOrder, patch) => updateMaterial({ id, isChangeOrder, patch })}
        isSaving={isUpdating}
      />
    </div>
  );
}
