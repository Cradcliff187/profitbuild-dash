import {
  LEAD_CLOSED_REASON_LABELS,
  LEAD_SIZE_BAND_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  TIMELINE_KIND_LABELS,
  type LeadClosedReason,
  type LeadSizeBand,
  type LeadSource,
  type LeadStage,
  type TimelineKind,
} from '@/types/bid';

/** "Website form", never "website_form". Unknown DB values fall back to a readable form. */
export const formatLeadSource = (source: string | null | undefined): string => {
  if (!source) return LEAD_SOURCE_LABELS.unknown;
  return LEAD_SOURCE_LABELS[source as LeadSource] ?? humanize(source);
};

export const formatLeadStage = (stage: string | null | undefined): string => {
  if (!stage) return LEAD_STAGE_LABELS.new;
  return LEAD_STAGE_LABELS[stage as LeadStage] ?? humanize(stage);
};

export const formatLeadClosedReason = (reason: string | null | undefined): string | null => {
  if (!reason) return null;
  return LEAD_CLOSED_REASON_LABELS[reason as LeadClosedReason] ?? humanize(reason);
};

/** Source + detail on one line: "Website form · teamradcliff.com contact form, …". */
export const formatLeadSourceLine = (
  source: string | null | undefined,
  detail: string | null | undefined,
): string => {
  const base = formatLeadSource(source);
  const d = detail?.trim();
  return d ? `${base} · ${d}` : base;
};

export const isLeadClosed = (stage: string | null | undefined): boolean => stage === 'closed';

/**
 * The write payload for a stage change. Mirrors the DB CHECK
 * `(stage = 'closed') = (closed_reason IS NOT NULL)`: closing requires a reason
 * and stamps closed_at/closed_by; any open stage clears all three.
 */
export const buildStageUpdate = (
  stage: LeadStage,
  opts: { closedReason?: LeadClosedReason | null; userId: string | null; now?: Date } = { userId: null },
): {
  stage: LeadStage;
  closed_reason: LeadClosedReason | null;
  closed_at: string | null;
  closed_by: string | null;
} => {
  if (stage === 'closed') {
    if (!opts.closedReason) {
      throw new Error('Closing a lead requires a reason.');
    }
    return {
      stage,
      closed_reason: opts.closedReason,
      closed_at: (opts.now ?? new Date()).toISOString(),
      closed_by: opts.userId,
    };
  }
  return { stage, closed_reason: null, closed_at: null, closed_by: null };
};

/** Tailwind classes for the stage pill. Semantic tokens only (dark-mode safe). */
export const leadStageBadgeClass = (stage: string | null | undefined): string => {
  switch (stage) {
    case 'talking':
      return 'bg-info/15 text-info border-info/30';
    case 'site_walk':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'estimate_requested':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'closed':
      return 'bg-muted text-muted-foreground border-border';
    case 'new':
    default:
      return 'bg-success/15 text-success border-success/30';
  }
};

const humanize = (value: string): string =>
  value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** "$25K – $100K", never "25k_100k". */
export const formatLeadSizeBand = (band: string | null | undefined): string | null => {
  if (!band) return null;
  return LEAD_SIZE_BAND_LABELS[band as LeadSizeBand] ?? humanize(band);
};

export const formatTimelineKind = (kind: string | null | undefined): string => {
  if (!kind) return TIMELINE_KIND_LABELS.note;
  return TIMELINE_KIND_LABELS[kind as TimelineKind] ?? humanize(kind);
};
