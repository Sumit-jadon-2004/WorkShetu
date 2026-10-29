import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  FileCheck,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Tractor,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function NotificationArea() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const fetchLiveAlerts = async () => {
    try {
      setLoading(true);
      const [dashRes, compRes] = await Promise.allSettled([
        axios.get("/api/admin/dashboard/stats", { withCredentials: true }),
        axios.get("/api/admin/complaints?limit=3", { withCredentials: true }),
      ]);

      const items = [];

      if (dashRes.status === "fulfilled" && dashRes.value.data.success) {
        const stats = dashRes.value.data.stats || {};
        if (stats.pendingDriverApplications > 0) {
          items.push({
            id: "notif-drivers",
            title: `${stats.pendingDriverApplications} Pending Driver Application${
              stats.pendingDriverApplications > 1 ? "s" : ""
            }`,
            description: "New driver credentials submitted for admin verification.",
            time: "Action Required",
            type: "application",
            unread: true,
            link: "/admin/drivers",
          });
        }

        if (stats.pendingBookings > 0) {
          items.push({
            id: "notif-bookings",
            title: `${stats.pendingBookings} Booking Reservation${
              stats.pendingBookings > 1 ? "s" : ""
            } Awaiting Confirmation`,
            description: "Farmer requests waiting for driver or platform dispatch.",
            time: "Action Required",
            type: "booking",
            unread: true,
            link: "/admin/bookings",
          });
        }
      }

      if (compRes.status === "fulfilled" && compRes.value.data.success) {
        const counts = compRes.value.data.counts || {};
        const openComplaints = counts.pending || counts.open || 0;
        if (openComplaints > 0) {
          items.push({
            id: "notif-complaints",
            title: `${openComplaints} Open Dispute Ticket${openComplaints > 1 ? "s" : ""}`,
            description: "Active grievances and booking disputes require review.",
            time: "Priority",
            type: "complaint",
            unread: true,
            link: "/admin/complaints",
          });
        }
      }

      if (items.length === 0) {
        items.push({
          id: "notif-clean",
          title: "All Clear",
          description: "No pending applications or urgent disputes at this time.",
          time: "Just now",
          type: "system",
          unread: false,
          link: "/admin",
        });
      }

      setNotifications(items);
    } catch (err) {
      console.error("Live alerts error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAlerts();
    const handleRefresh = () => fetchLiveAlerts();
    window.addEventListener("admin:refresh", handleRefresh);
    return () => window.removeEventListener("admin:refresh", handleRefresh);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getIcon = (type) => {
    switch (type) {
      case "application":
        return <FileCheck size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case "booking":
        return <Calendar size={16} className="text-blue-600 dark:text-blue-400" />;
      case "complaint":
        return <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />;
      default:
        return <Sparkles size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchLiveAlerts();
        }}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5 z-50 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-2 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Alerts & Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {unreadCount} actionable
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <CheckCheck size={14} />
                <span>Mark read</span>
              </button>
            )}
          </div>

          <div className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-600" />
                Checking alerts...
              </div>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  to={item.link}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    item.unread ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs dark:bg-slate-800">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 truncate dark:text-white">
                        {item.title}
                      </p>
                      <span className="flex-shrink-0 text-[10px] font-medium text-slate-400">
                        {item.time}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="mt-2 border-t border-slate-100 pt-2 text-center dark:border-slate-800">
            <Link
              to="/admin/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              View Full Dashboard &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
