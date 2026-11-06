import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ClientSelector } from '@/components/ClientSelector';
import { LeadSourceFields } from '@/components/bids/LeadSourceFields';
import type { BranchBid, LeadSource } from '@/types/bid';

interface LeadEditSheetProps {
  bid: BranchBid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProjectType = 'construction_project' | 'work_order';

/**
 * Edit the lead's facts (name, client, address, type, source, description).
 * Form state is seeded ONLY when the sheet opens — never inside the query fn —
 * so a focus refetch can't wipe half-typed edits (the old page did exactly that).
 * Stage changes live in LeadStageControl; job links live in LinkProjectDialog.
 */
export function LeadEditSheet({ bid, open, onOpenChange }: LeadEditSheetProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('construction_project');
  const [jobType, setJobType] = useState('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [sourceDetail, setSourceDetail] = useState('');

  useEffect(() => {
    if (!open || !bid) return;
    setName(bid.name ?? '');
    setDescription(bid.description ?? '');
    setClientId(bid.client_id ?? '');
    setAddress(bid.address ?? '');
    setProjectType((bid.project_type as ProjectType) ?? 'construction_project');
    setJobType(bid.job_type ?? '');
    setSource(bid.source ?? 'unknown');
    setSourceDetail(bid.source_detail ?? '');
  }, [open, bid]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!bid) throw new Error('No lead');
      const { error } = await supabase
        .from('branch_bids')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          client_id: clientId || null,
          address: address.trim() || null,
          project_type: projectType,
          job_type: jobType.trim() || null,
          source: source || 'unknown',
          source_detail: sourceDetail.trim() || null,
        })
        .eq('id', bid.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-bid', bid?.id] });
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
      toast.success('Lead updated');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Could not save the lead', { description: error.message });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Give the lead a name');
      return;
    }
    mutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[520px]">
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6">
          <SheetTitle>Edit lead</SheetTitle>
          <SheetDescription>Who it is, where it is, and how it came in.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="lead-edit-name">Lead name *</Label>
            <Input
              id="lead-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Body Alive — studio buildouts"
            />
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <ClientSelector
              value={clientId}
              onValueChange={(id) => setClientId(id)}
              placeholder="Select a client (optional)"
              showLabel={false}
            />
          </div>

          <LeadSourceFields
            idPrefix="lead-edit"
            source={source}
            sourceDetail={sourceDetail}
            onSourceChange={setSource}
            onSourceDetailChange={setSourceDetail}
          />

          <div className="space-y-2">
            <Label htmlFor="lead-edit-address">Address</Label>
            <Input
              id="lead-edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Cincinnati, OH 45202"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-edit-type">Project type</Label>
              <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
                <SelectTrigger id="lead-edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="construction_project">Construction project</SelectItem>
                  <SelectItem value="work_order">Work order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-edit-job-type">Job type</Label>
              <Input
                id="lead-edit-job-type"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="e.g. Renovation"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-edit-description">Description</Label>
            <Textarea
              id="lead-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Scope in a line or two, who decides, timing…"
            />
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
