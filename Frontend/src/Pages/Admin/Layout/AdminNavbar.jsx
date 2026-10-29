import { useState } from "react";
import { ExternalLink, Menu, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import NotificationArea from "./NotificationArea.jsx";
import AdminProfile from "./AdminProfile.jsx";

const routeTitles = {
  "/admin": { title: "Dashboard Overview", subtitle: "Live platform metrics & activity" },
  "/admin/dashboard": { title: "Dashboard Overview", subtitle: "Live platform metrics & activity" },
  "/admin/users": { title: "User Management", subtitle: "Manage farmers, drivers, and administrators" },
  "/admin/drivers": { title: "Driver Management", subtitle: "Driver verification & applications" },
  "/admin/driver-applications": { title: "Driver Applications", subtitle: "Review and approve driver submissions" },
  "/admin/listings": { title: "Listing Management", subtitle: "Tractors, machinery, and services" },
  "/admin/bookings": { title: "Booking Management", subtitle: "Monitor and manage farm reservations" },
  "/admin/offers": { title: "Offers & Promotions", subtitle: "Configure discount coupons and automatic promotional incentives" },
  "/admin/reviews": { title: "Review Moderation", subtitle: "Ratings and feedback from farmers" },
  "/admin/complaints": { title: "Complaints & Reports", subtitle: "Resolve customer and driver grievances" },
  "/admin/analytics": { title: "System Analytics", subtitle: "Growth, usage, and revenue metrics" },
  "/admin/settings": { title: "Admin Settings", subtitle: "System configurations and security parameters" },
};

export default function AdminNavbar({ onToggleMobile }) {
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentRoute = routeTitles[location.pathname] || {
    title: "Admin Panel",
    subtitle: "WorkShetu Platform Operations",
  };

  const handleGlobalRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("admin:refresh"));
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 lg:px-8">
      {/* Left side: Hamburger button + Page Title / Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label="Open mobile navigation sidebar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden md:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col">
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
            {currentRoute.title}
          </h1>
          <p className="hidden text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:block">
            {currentRoute.subtitle}
          </p>
        </div>
      </div>

      {/* Right side: Refresh + Public Site Link + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Refresh Button */}
        <button
          type="button"
          onClick={handleGlobalRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          title="Refresh platform metrics"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
        >
          <RefreshCw
            size={16}
            className={`transition-transform duration-500 ${
              isRefreshing ? "animate-spin text-emerald-600" : ""
            }`}
          />
        </button>

        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ExternalLink size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>View Site</span>
        </Link>

        {/* Notifications Dropdown */}
        <NotificationArea />

        {/* Admin Profile Dropdown */}
        <AdminProfile />
      </div>
    </header>
  );
}

