import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  Tractor,
  ClipboardList,
  MessageCircle,
  LayoutDashboard,
  ShieldCheck,
  Bot,
  ListPlus
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function BottomNav() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Hide bottom nav on admin panel inner routes where dedicated sidebar is present
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = user?.isAdmin === true || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";
  const isEligibleDriver = isDriver && user?.driverApplicationStatus === "Approved" && user?.isActive !== false;

  const navItemClass = ({ isActive }) =>
    `flex flex-col items-center justify-center flex-1 py-2 px-1 text-[10px] font-bold transition-all ${
      isActive
        ? "text-green-700 dark:text-lime-400 scale-105"
        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
    }`;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {/* Home */}
        <NavLink to="/" end className={navItemClass}>
          <Home size={20} className="mb-0.5" />
          <span>{t("navbar.home", "Home")}</span>
        </NavLink>

        {/* Find Machines */}
        <NavLink to="/machine" className={navItemClass}>
          <Tractor size={20} className="mb-0.5" />
          <span>{t("navbar.machines", "Machines")}</span>
        </NavLink>

        {/* Role-specific Dashboard / Bookings */}
        {isAdmin ? (
          <NavLink to="/admin/dashboard" className={navItemClass}>
            <ShieldCheck size={20} className="mb-0.5" />
            <span>Admin</span>
          </NavLink>
        ) : isEligibleDriver ? (
          <NavLink to="/Drivers" className={navItemClass}>
            <LayoutDashboard size={20} className="mb-0.5" />
            <span>{t("driver.requests", "Requests")}</span>
          </NavLink>
        ) : isAuthenticated ? (
          <NavLink to="/bookings" className={navItemClass}>
            <ClipboardList size={20} className="mb-0.5" />
            <span>{t("navbar.myBookings", "Bookings")}</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={navItemClass}>
            <ClipboardList size={20} className="mb-0.5" />
            <span>{t("navbar.myBookings", "Bookings")}</span>
          </NavLink>
        )}

        {/* Driver Listings or Chats */}
        {isEligibleDriver ? (
          <NavLink to="/driver/listings" className={navItemClass}>
            <ListPlus size={20} className="mb-0.5" />
            <span>{t("driver.myListings", "Listings")}</span>
          </NavLink>
        ) : (
          <NavLink to="/chat" className={navItemClass}>
            <MessageCircle size={20} className="mb-0.5" />
            <span>{t("navbar.chats", "Chats")}</span>
          </NavLink>
        )}

        {/* AI Co-Pilot / Assistant */}
        <NavLink to="/assistant" className={navItemClass}>
          <Bot size={20} className="mb-0.5" />
          <span>AI Assist</span>
        </NavLink>
      </div>
    </nav>
  );
}

