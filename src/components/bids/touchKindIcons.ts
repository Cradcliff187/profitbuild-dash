import { Footprints, Mail, MailOpen, MessageSquare, Phone, StickyNote, Users } from 'lucide-react';
import type { TouchKind } from '@/types/bid';

export const TOUCH_KIND_ICONS: Record<TouchKind, typeof Phone> = {
  note: StickyNote,
  call: Phone,
  text: MessageSquare,
  email_out: Mail,
  email_in: MailOpen,
  meeting: Users,
  site_walk: Footprints,
};
