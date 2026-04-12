export interface MentionableUser {
  user_id: string;
  display_name: string;
  email: string | null;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}
