"use client";

import { useEffect, useState } from "react";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications";
import type { NotificationPreferenceRow } from "@/types/notifications";

type Channel = "in_app_enabled" | "email_enabled";

export default function NotificationPreferencesPage() {
  const [rows, setRows] = useState<NotificationPreferenceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getNotificationPreferences()
      .then((data) => {
        if (!ignore) setRows(data);
      })
      .catch(() => {
        if (!ignore) setError("Could not load notification preferences.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function toggle(eventType: string, channel: Channel, value: boolean) {
    const previous = rows;
    setRows((current) =>
      current.map((row) => (row.event_type === eventType ? { ...row, [channel]: value } : row)),
    );
    setIsSaving(true);
    setError(null);
    try {
      await updateNotificationPreferences([{ event_type: eventType, [channel]: value }]);
    } catch {
      setRows(previous);
      setError("Could not save that change. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Notification preferences</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Choose how you want to be notified for each type of event.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-600/20 bg-danger-600/10 px-4 py-2 text-sm text-danger-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="py-16 text-center text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="glass-panel overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200/70 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="w-28 px-4 py-3 text-center font-semibold">In-app</th>
                <th className="w-28 px-4 py-3 text-center font-semibold">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.event_type} className="border-b border-neutral-200/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-800">{row.label}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.in_app_enabled}
                      disabled={isSaving}
                      onChange={(event) =>
                        void toggle(row.event_type, "in_app_enabled", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-neutral-300"
                      aria-label={`In-app notifications for ${row.label}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.email_enabled}
                      disabled={isSaving}
                      onChange={(event) =>
                        void toggle(row.event_type, "email_enabled", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-neutral-300"
                      aria-label={`Email notifications for ${row.label}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
