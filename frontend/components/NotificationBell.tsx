"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import type { AppNotification } from "@/types/notifications";

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await getUnreadCount());
    } catch {
      // ignore transient poll failures
    }
  }, []);

  // Poll the unread count (no WebSocket in 13A) and refresh on tab focus.
  useEffect(() => {
    // refreshCount awaits the API before calling setState, so this is an async
    // fetch — not the synchronous cascading render the lint rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        setItems(await listNotifications());
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleClick(notification: AppNotification) {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
      } catch {
        // ignore — optimistic update below still helps the user
      }
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
    }
    setOpen(false);
    const url = notification.data?.url;
    if (typeof url === "string" && url) router.push(url);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
    } catch {
      return;
    }
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 animate-fade-in rounded-xl border border-neutral-200 bg-white shadow-glass-lg">
          <div className="flex items-center justify-between border-b border-neutral-200/70 px-4 py-2.5">
            <span className="text-sm font-semibold text-neutral-900">Notifications</span>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-xs text-neutral-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-neutral-400">No notifications yet.</p>
            ) : (
              items.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => void handleClick(notification)}
                  className={`flex w-full flex-col gap-0.5 border-b border-neutral-200/60 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${
                    notification.is_read ? "" : "bg-primary-50/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    )}
                    <span className="truncate text-sm font-semibold text-neutral-900">
                      {notification.title}
                    </span>
                  </div>
                  {notification.body && (
                    <span className="line-clamp-2 text-xs text-neutral-500">{notification.body}</span>
                  )}
                  <span className="text-[11px] text-neutral-400">
                    {timeAgo(notification.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
