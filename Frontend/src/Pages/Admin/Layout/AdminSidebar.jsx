import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronRight,
  Gift,
  HardHat,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Star,
  Tractor,
  Truck,
  Users,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";

const navSections = [
  {
    title: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Management",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/drivers", label: "Drivers", icon: Truck },
      { to: "/admin/labour", label: "Labour", icon: HardHat },
      { to: "/admin/listings", label: "Listings", icon: Tractor },
      { to: "/admin/bookings", label: "Bookings", icon: Calendar },
      { to: "/admin/offers", label: "Offers & Promotions", icon: Gift },
      { to: "/admin/reviews", label: "Reviews", icon: Star },
      { to: "/admin/complaints", label: "Complaints", icon: AlertTriangle },
    ],
  },
  {
    title: "System & Insights",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar({ isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto">
      <div>
        {/* Brand / Logo */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
          <NavLink
            to="/admin"
            onClick={onCloseMobile}
            className="flex items-center gap-3 focus:outline-hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md shadow-emerald-700/20">
              <Tractor size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  WorkShetu
                </span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase dark:bg-emerald-950 dark:text-emerald-300">
                  Admin
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Management Console
              </p>
            </div>
          </NavLink>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation sidebar"
              className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="space-y-6 px-4 py-5" aria-label="Admin Navigation">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              size={17}
                              className={`transition-colors ${
                                isActive
                                  ? "text-white"
                                  : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200"
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>
                          {isActive && (
                            <ChevronRight size={14} className="text-white/80" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / User & Logout */}
      <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
            <Shield size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {user?.name || "System Admin"}
            </p>
            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {user?.phone || user?.role || "Admin Account"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/50"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:h-screen md:sticky md:top-0 border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Slide-over) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Off-canvas panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl dark:bg-slate-900 transition-transform duration-300 ease-in-out">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}

