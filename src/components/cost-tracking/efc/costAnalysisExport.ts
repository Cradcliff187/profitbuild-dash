import { EFCCategory } from '@/hooks/useProjectEFC';
import { Project } from '@/types/project';

const STATUS_LABEL: Record<string, string> = {
  plan: 'Plan',
  committed: 'Committed',
  in_progress: 'In Progress',
  overrun: 'Overrun',
};

function cell(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Flatten the Cost Analysis categories → line items to CSV and trigger a download.
 * Replaces the old Detail-tab CSV export; same Blob+anchor pattern.
 */
export function exportCostAnalysisCsv(project: Project, categories: EFCCategory[]): void {
  const headers = ['Category', 'Line Item', 'Source', 'Plan', 'Committed', 'Spent', 'EFC', 'Variance', 'Status', 'Final', 'Final Cost'];
  const rows: string[] = [headers.join(',')];

  for (const cat of categories) {
    for (const line of cat.lines) {
      rows.push([
        cell(cat.displayName),
        cell(line.description),
        cell(line.source === 'change_order' ? 'Change Order' : 'Estimate'),
        line.plan.toFixed(2),
        line.committed.toFixed(2),
        line.actual.toFixed(2),
        line.efc.toFixed(2),
        line.variance.toFixed(2),
        cell(STATUS_LABEL[line.status] ?? line.status),
        line.isFinal ? 'Yes' : '',
        line.isFinal ? Number(line.finalCostAmount).toFixed(2) : '',
      ].join(','));
    }
    if (cat.unallocated > 0) {
      rows.push([
        cell(cat.displayName),
        cell('(unassigned spend)'),
        '', '', '',
        cat.unallocated.toFixed(2),
        '', '',
        'Unallocated',
        '', '',
      ].join(','));
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const num = (project as { project_number?: string }).project_number ?? project.id;
  a.download = `cost-analysis-${num}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
