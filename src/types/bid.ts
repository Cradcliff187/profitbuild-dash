// ============================================================================
// Lead vocabulary (CLAUDE.md Rule 42)
// Values are CHECK-constrained in the DB (branch_bids.source / stage /
// closed_reason). Labels are the only thing users ever read.
// ============================================================================

export const LEAD_SOURCES = [
  'website_form',
  'email',
  'phone_call',
  'referral',
  'outreach',
  'repeat_client',
  'bid_board',
  'social',
  'walk_in',
  'other',
  'unknown',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website_form: 'Website form',
  email: 'Email',
  phone_call: 'Phone call',
  referral: 'Referral',
  outreach: 'Outreach',
  repeat_client: 'Repeat client',
  bid_board: 'Bid board',
  social: 'Social',
  walk_in: 'Walk-in',
  other: 'Other',
  unknown: 'Unknown',
};

export const LEAD_STAGES = ['new', 'talking', 'site_walk', 'estimate_requested', 'closed'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  talking: 'Talking',
  site_walk: 'Site walk',
  estimate_requested: 'Estimate requested',
  closed: 'Closed',
};

export const LEAD_CLOSED_REASONS = [
  'linked_to_job',
  'we_passed',
  'no_fit',
  'went_cold',
  'lost_before_estimate',
] as const;
export type LeadClosedReason = (typeof LEAD_CLOSED_REASONS)[number];

export const LEAD_CLOSED_REASON_LABELS: Record<LeadClosedReason, string> = {
  linked_to_job: 'Linked to a job',
  we_passed: 'We passed',
  no_fit: 'Not a fit',
  went_cold: 'Went cold',
  lost_before_estimate: 'Lost before estimate',
};

/** One row of branch_bid_projects with its project embedded (lead → job link). */
export interface BranchBidProjectLink {
  id: string;
  branch_bid_id: string;
  project_id: string;
  created_at: string;
  created_by: string | null;
  projects?: {
    id: string;
    project_number: string;
    project_name: string;
    client_name: string | null;
    status: string;
  } | null;
}

export interface BranchBid {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  address: string | null;
  project_type: 'construction_project' | 'work_order' | null;
  job_type: string | null;
  /** Mirror of the FIRST linked job (branch_bid_projects, earliest link). Maintained by a DB trigger. */
  project_id: string | null;
  source: LeadSource;
  source_detail: string | null;
  stage: LeadStage;
  closed_reason: LeadClosedReason | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
  clients?: {
    id: string;
    client_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
  };
  /** First linked job (via project_id). Kept so older screens still render. */
  projects?: {
    project_number: string;
    project_name: string;
    client_name: string;
  };
  /** Every linked job. Loaded by the list + detail queries via branch_bid_projects. */
  branch_bid_projects?: BranchBidProjectLink[];
}

export interface BidNote {
  id: string;
  bid_id: string;
  user_id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
  // Relations
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface BidMedia {
  id: string;
  bid_id: string;
  file_url: string;
  thumbnail_url: string | null;
  file_name: string;
  mime_type: string;
  file_type: 'image' | 'video' | 'document';
  file_size: number;
  duration: number | null;
  caption: string | null;
  description: string | null;
  uploaded_by: string | null;
  // GPS and location metadata
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  location_name: string | null;
  // Capture metadata
  taken_at: string | null;
  device_model: string | null;
  upload_source: 'camera' | 'gallery' | 'web' | null;
  created_at: string;
  updated_at: string;
  // Relations
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface CreateBranchBidParams {
  name: string;
  description?: string;
  client_id?: string;
  address?: string;
  project_type?: 'construction_project' | 'work_order';
  job_type?: string;
  source: LeadSource;
  source_detail?: string;
}

export interface UpdateBranchBidParams {
  name?: string;
  description?: string;
  client_id?: string;
  address?: string;
  project_type?: 'construction_project' | 'work_order';
  job_type?: string;
  source?: LeadSource;
  source_detail?: string;
}

export interface CreateBidNoteParams {
  bid_id: string;
  note_text: string;
}

export interface UploadBidMediaParams {
  bid_id: string;
  file: File;
  caption?: string;
  description?: string;
  duration?: number;
  // GPS and location metadata
  latitude?: number;
  longitude?: number;
  altitude?: number;
  location_name?: string;
  // Capture metadata
  taken_at?: string;
  device_model?: string;
  upload_source?: 'camera' | 'gallery' | 'web';
}

