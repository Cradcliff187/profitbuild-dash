export interface BranchBid {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  address: string | null;
  project_type: 'construction_project' | 'work_order' | null;
  job_type: string | null;
  project_id: string | null; // Only set after converting to project
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
  projects?: {
    project_number: string;
    project_name: string;
    client_name: string;
  };
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
  project_id?: string;
}

export interface UpdateBranchBidParams {
  name?: string;
  description?: string;
  client_id?: string;
  address?: string;
  project_type?: 'construction_project' | 'work_order';
  job_type?: string;
  project_id?: string;
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
}

