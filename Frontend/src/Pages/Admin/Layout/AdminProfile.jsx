import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ExternalLink, LogOut, Settings, Shield, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const displayName = user?.name || "Admin User";
  const displayPhone = user?.phone || user?.email || "System Administrator";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="User menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 text-left shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 text-xs font-bold text-white shadow-xs">
          {initials}
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <p className="truncate max-w-[120px] text-xs font-bold text-slate-900 dark:text-white">
            {displayName}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Shield size={10} /> Admin
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10">
          <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{displayName}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{displayPhone}</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Shield size={11} /> Super Admin Role
            </div>
          </div>

          <div className="mt-1 space-y-0.5">
            <Link
              to="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings size={15} className="text-slate-500 dark:text-slate-400" />
              Admin Settings
            </Link>

            <Link
              to="/bookings"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Calendar size={15} className="text-slate-500 dark:text-slate-400" />
              My Bookings (Personal)
            </Link>

            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ExternalLink size={15} className="text-slate-500 dark:text-slate-400" />
              Switch to Public Site
            </Link>
          </div>

          <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

