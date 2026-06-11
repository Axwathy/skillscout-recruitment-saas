import { apiFetch } from "@/lib/api";
import type {
  AppNotification,
  NotificationPreferenceRow,
  NotificationPreferenceUpdate,
} from "@/types/notifications";

export async function listNotifications(unreadOnly = false): Promise<AppNotification[]> {
  const query = unreadOnly ? "?unread=true" : "";
  return apiFetch<AppNotification[]>(`/api/v1/notifications/${query}`, { method: "GET" });
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch<{ unread: number }>("/api/v1/notifications/unread-count/", {
    method: "GET",
  });
  return res.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${id}/read/`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/v1/notifications/mark-all-read/", { method: "POST" });
}

export async function getNotificationPreferences(): Promise<NotificationPreferenceRow[]> {
  const res = await apiFetch<{ preferences: NotificationPreferenceRow[] }>(
    "/api/v1/notifications/preferences/",
    { method: "GET" },
  );
  return res.preferences;
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferenceUpdate[],
): Promise<NotificationPreferenceRow[]> {
  const res = await apiFetch<{ preferences: NotificationPreferenceRow[] }>(
    "/api/v1/notifications/preferences/",
    { method: "PATCH", body: JSON.stringify({ preferences }) },
  );
  return res.preferences;
}
