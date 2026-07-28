"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, useSocket } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Bell, CheckCheck, Loader2, Calendar, Star, Info, ArrowRight } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  // Real-time socket listener for incoming notifications
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("join-user", user.id);

    const handleNewNotification = () => {
      fetchNotifications();
      showToast("New notification received!", "info");
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [socket, user]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        showToast("All notifications marked as read", "success");
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand" /> Loading notifications...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-brand" /> Notifications
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Stay updated on new seat reservations, reviews, and platform activity.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold text-gray-700 hover:text-brand bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-lg mb-1">No notifications yet</h3>
            <p className="text-xs text-gray-500">
              When students book your study space or leave reviews, you'll see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const dateStr = new Date(n.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={n.id}
                  className={`bg-white border rounded-2xl p-5 transition flex items-start gap-4 shadow-sm ${
                    !n.isRead ? "border-brand/40 bg-brand/5" : "border-gray-200"
                  }`}
                >
                  {/* Type Icon */}
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      n.type === "BOOKING"
                        ? "bg-emerald-100 text-emerald-700"
                        : n.type === "REVIEW"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {n.type === "BOOKING" && <Calendar className="w-5 h-5" />}
                    {n.type === "REVIEW" && <Star className="w-5 h-5" />}
                    {n.type !== "BOOKING" && n.type !== "REVIEW" && <Info className="w-5 h-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                      <span className="text-[11px] font-medium text-gray-400 shrink-0">{dateStr}</span>
                    </div>
                    <p className="text-xs text-gray-650 leading-relaxed">{n.message}</p>

                    {n.link && (
                      <div className="pt-2">
                        <Link
                          href={n.link}
                          onClick={() => markAsRead(n.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                        >
                          View Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Mark Read button */}
                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1 text-gray-400 hover:text-brand transition cursor-pointer"
                      title="Mark as read"
                    >
                      <span className="w-2.5 h-2.5 bg-brand rounded-full block" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
