export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  note_text: string;
  attachment_url?: string | null;
  attachment_type?: 'image' | 'video' | 'file' | null;
  attachment_name?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}
