import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Link as LinkIcon, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { cn } from '@/lib/utils';

interface LinkableProject {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string | null;
  status: string;
  category: string | null;
  project_type: string | null;
}

interface LinkProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Project ids already linked — rendered as "Linked" and not selectable. */
  linkedProjectIds: string[];
  onLink: (projectIds: string[]) => Promise<unknown>;
  isLinking?: boolean;
  leadName?: string;
}

const RENDER_CAP = 60;

/**
 * "Link to job": search EXISTING projects by number or name and link one or
 * more to this lead. There is deliberately no create path here — a lead never
 * gets a project number; Matt mints numbers when the job folder is created
 * (CLAUDE.md Rule 42). Candidates are construction jobs + work orders only
 * (overhead/system projects are filtered by isProjectVisibleByCategory).
 */
export function LinkProjectDialog({
  open,
  onOpenChange,
  linkedProjectIds,
  onLink,
  isLinking = false,
  leadName,
}: LinkProjectDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['link-project-candidates'],
    enabled: open,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<LinkableProject[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, status, category, project_type')
        .order('project_number', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as LinkableProject[]).filter((p) => isProjectVisibleByCategory(p));
    },
  });

  const linkedSet = useMemo(() => new Set(linkedProjectIds), [linkedProjectIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    const tokens = q.split(/\s+/);
    return projects.filter((p) => {
      const hay = `${p.project_number} ${p.project_name} ${p.client_name ?? ''}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [projects, search]);

  const visible = filtered.slice(0, RENDER_CAP);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setSearch('');
    setSelected([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleLink = async () => {
    if (selected.length === 0) return;
    await onLink(selected);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            Link to job
          </DialogTitle>
          <DialogDescription>
            {leadName ? <>Pick the existing job(s) <strong>{leadName}</strong> became. </> : null}
            Search by project number or name. Linking never creates a project or a number.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={!window.matchMedia?.('(pointer: coarse)').matches}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="225-193, Body Alive, UC Health…"
            className="pl-8"
            inputMode="search"
          />
        </div>

        <div className="-mx-1 flex-1 overflow-y-auto px-1" role="listbox" aria-multiselectable>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading jobs…</p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No jobs match. Numbers are created when the job folder is made — if the job
              isn't in RCG Work yet, it can't be linked yet.
            </p>
          ) : (
            <ul className="divide-y">
              {visible.map((p) => {
                const already = linkedSet.has(p.id);
                const checked = selected.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      disabled={already}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors min-h-[44px]',
                        already ? 'cursor-default opacity-60' : 'hover:bg-muted/60',
                        checked && 'bg-primary/5',
                      )}
                    >
                      {already ? (
                        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                      ) : (
                        <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{p.project_number}</span>
                          <span className="truncate text-sm">{p.project_name}</span>
                        </div>
                        {p.client_name && (
                          <div className="truncate text-xs text-muted-foreground">{p.client_name}</div>
                        )}
                      </div>
                      {already ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">Linked</Badge>
                      ) : (
                        <ProjectStatusBadge status={p.status} size="sm" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {filtered.length > RENDER_CAP && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Showing {RENDER_CAP} of {filtered.length} — keep typing to narrow it down.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLinking}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={selected.length === 0 || isLinking}>
            {isLinking
              ? 'Linking…'
              : selected.length <= 1
                ? 'Link job'
                : `Link ${selected.length} jobs`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
