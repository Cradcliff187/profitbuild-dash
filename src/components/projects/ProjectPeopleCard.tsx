import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Mail, Pencil, Phone, Plus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoles } from '@/contexts/RoleContext';
import { useProjectPeople } from '@/hooks/useProjectPeople';
import { firstUsablePhone } from '@/components/today/todayData';
import { formatProjectSourceLine, hasProjectPeopleColumns } from '@/utils/projectSource';
import { ProjectPeopleSheet } from '@/components/projects/ProjectPeopleSheet';
import type { Project } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectPeopleCardProps {
  project: Pick<
    Project,
    'id' | 'client_id' | 'client_name' | 'source' | 'source_detail' | 'source_contact_id' | 'primary_contact_id'
  >;
  className?: string;
}

/**
 * Contact + Source on a project (Rule 45) — two quiet rows, one edit sheet.
 * Admin/manager only: `contacts` is admin/manager by RLS and source is office
 * information, so field-only crews render nothing here (they keep Call owner
 * on the assignment screen).
 */
export function ProjectPeopleCard({ project, className }: ProjectPeopleCardProps) {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useRoles();
  // Dormant until the migration adds the columns (see hasProjectPeopleColumns).
  const canManage = (isAdmin || isManager) && hasProjectPeopleColumns(project);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { personById, linkedLeads } = useProjectPeople(
    project.id,
    [project.primary_contact_id, project.source_contact_id],
    canManage,
  );

  if (!canManage) return null;

  const contact = personById(project.primary_contact_id);
  const sourcePerson = personById(project.source_contact_id);
  const sourceLine = formatProjectSourceLine({
    source: project.source,
    sourceDetail: project.source_detail,
    sourceContactName: sourcePerson?.name,
  });
  const phone = firstUsablePhone(contact?.phone);
  const hasAnything = !!project.primary_contact_id || !!sourceLine;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-2">
        <dl className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex items-start gap-2">
            <span className="flex h-8 shrink-0 items-center" aria-hidden>
              <UserRound className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="sr-only">Contact</dt>
              <dd className="flex min-h-[32px] flex-wrap items-center gap-x-2 gap-y-1">
                {contact ? (
                  <>
                    <span className="font-medium">{contact.name}</span>
                    {contact.title && <span className="text-muted-foreground">{contact.title}</span>}
                    {phone && (
                      <a
                        href={`tel:${phone.tel}`}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Call ${contact.name}`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{phone.display}</span>
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Email ${contact.name}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="max-w-[200px] truncate">{contact.email}</span>
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No contact on this job</span>
                )}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex h-8 shrink-0 items-center" aria-hidden>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="sr-only">Source</dt>
              <dd className="flex min-h-[32px] flex-wrap items-center gap-x-2 gap-y-1">
                {sourceLine ? (
                  <span className="break-words">{sourceLine}</span>
                ) : (
                  <span className="text-muted-foreground">Source not set</span>
                )}
                {linkedLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="inline-flex min-h-[32px] max-w-full items-center rounded-full border px-2.5 text-xs text-muted-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={`Open lead: ${lead.name}`}
                  >
                    <span className="truncate">Lead: {lead.name}</span>
                  </button>
                ))}
              </dd>
            </div>
          </div>
        </dl>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setSheetOpen(true)}
          aria-label={hasAnything ? 'Edit contact and source' : 'Add contact and source'}
        >
          {hasAnything ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="text-xs">{hasAnything ? 'Edit' : 'Add'}</span>
        </Button>
      </div>

      <ProjectPeopleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectIds={[project.id]}
        clientId={project.client_id}
        clientName={project.client_name}
        initial={{
          primary_contact_id: project.primary_contact_id ?? null,
          source: project.source ?? null,
          source_contact_id: project.source_contact_id ?? null,
          source_detail: project.source_detail ?? null,
        }}
      />
    </div>
  );
}
