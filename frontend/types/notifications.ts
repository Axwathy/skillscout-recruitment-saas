export type NotificationEventType =
  | "new_application"
  | "candidate_moved"
  | "note_added"
  | "interview_ready"
  | "system_alert";

export interface AppNotification {
  id: string;
  event_type: NotificationEventType;
  title: string;
  body: string;
  data: { url?: string; [key: string]: unknown };
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferenceRow {
  event_type: NotificationEventType;
  label: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

export interface NotificationPreferenceUpdate {
  event_type: string;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
}
