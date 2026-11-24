import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClientSelector } from '@/components/ClientSelector';
import type { BranchBid } from '@/types/bid';

export interface CreateJobInput {
  jobName: string;
  clientId: string;
  address: string | null;
  projectType: 'construction_project' | 'work_order';
}

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bid: BranchBid;
  onCreate: (input: CreateJobInput) => Promise<unknown>;
  isCreating?: boolean;
}

/**
 * The hand-off (Rule 42, amended Nov 24 2026): a lead asks for a number, the
 * app mints the next one and links the job to the lead. One DB call,
 * `sales_create_job`, shared with the sales chat. Matt's tracker stays the
 * source of truth for the number: if the sheet says something else, the job is
 * renumbered to match. A job needs a client (projects.client_name is NOT NULL),
 * so a prospect's client is picked or added here through the existing
 * ClientSelector "+" flow.
 */
export function CreateJobDialog({ open, onOpenChange, bid, onCreate, isCreating = false }: CreateJobDialogProps) {
  const [jobName, setJobName] = useState('');
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [projectType, setProjectType] = useState<'construction_project' | 'work_order'>('construction_project');
  const [attempted, setAttempted] = useState(false);

  // Seed from the lead each time the dialog opens, never from the query fn (Rule 42).
  useEffect(() => {
    if (!open) return;
    setJobName(bid.name ?? '');
    setClientId(bid.client_id ?? '');
    setAddress(bid.address ?? '');
    setProjectType(bid.project_type ?? 'construction_project');
    setAttempted(false);
  }, [open, bid.id, bid.name, bid.client_id, bid.address, bid.project_type]);

  const nameOk = jobName.trim().length > 0;
  const clientOk = clientId.length > 0;

  const submit = async () => {
    setAttempted(true);
    if (!nameOk || !clientOk) return;
    await onCreate({
      jobName: jobName.trim(),
      clientId,
      address: address.trim() || null,
      projectType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" aria-hidden />
            Create job from this lead
          </DialogTitle>
          <DialogDescription>
            Takes the next job number and links the job here. Matt&apos;s tracker is the source of truth for the
            number: if the sheet shows a different one, the job gets renumbered to match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-job-name">Job name</Label>
            <Input
              id="create-job-name"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="What the folder will be called"
              autoComplete="off"
            />
            {attempted && !nameOk && <p className="text-xs text-destructive">A job needs a name.</p>}
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <ClientSelector
              value={clientId || undefined}
              onValueChange={(id) => setClientId(id)}
              placeholder="Pick the client, or add one with +"
              showLabel={false}
              required
              error={attempted && !clientOk ? 'A job needs a client. Add one with the + button.' : ''}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-job-type">Type</Label>
              <NativeSelect
                id="create-job-type"
                value={projectType}
                onValueChange={(v) => setProjectType(v as 'construction_project' | 'work_order')}
                className="h-10 text-sm"
              >
                <option value="construction_project">Construction project</option>
                <option value="work_order">Work order</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-job-address">Job site address</Label>
              <Input
                id="create-job-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state"
                autoComplete="off"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The job starts at Estimating with no estimate attached. Pricing lives in the bid package; the
            job&apos;s status follows Matt&apos;s sheet.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
