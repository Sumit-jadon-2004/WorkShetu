import { Bot, ClipboardList, History, ListPlus, MessageCircle, Sprout, Tractor, Wheat } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext.jsx";

const farmerLinks = [
  { to: "/machine", label: "footer.findMachines", icon: Tractor },
  { to: "/Labour", label: "footer.farmServices", icon: Sprout },
  { to: "/bookings", label: "footer.myBookings", icon: ClipboardList },
  { to: "/chat", label: "footer.messages", icon: MessageCircle },
  { to: "/assistant", label: "footer.aiAssistant", icon: Bot },
];

const driverLinks = [
  { to: "/Drivers", label: "footer.driverDashboard", icon: Tractor },
  { to: "/driver/listings", label: "footer.manageListings", icon: ListPlus },
  { to: "/driver/listings/new", label: "footer.addListing", icon: Sprout },
  { to: "/driver/completed", label: "footer.completedWork", icon: History },
  { to: "/chat", label: "footer.messages", icon: MessageCircle },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Admin Dashboard", icon: Tractor },
  { to: "/admin/bookings", label: "navbar.platformBookings", icon: ClipboardList },
  { to: "/admin/complaints", label: "navbar.complaintsSupport", icon: MessageCircle },
  { to: "/machine", label: "footer.findMachines", icon: Tractor },
  { to: "/Labour", label: "footer.farmServices", icon: Sprout },
];

function Footer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  if (location.pathname.startsWith("/admin")) return null;

  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = Boolean(user?.isAdmin) || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";

  const links = isAdmin ? adminLinks : isDriver ? driverLinks : farmerLinks;
  const sectionTitle = isAdmin
    ? "Admin Management"
    : t(isDriver ? "footer.driverSection" : "footer.farmerSection");
  const actionPath = isAdmin
    ? "/admin/dashboard"
    : isDriver
      ? "/Drivers"
      : user
        ? "/bookings"
        : "/register";
  const actionLabel = isAdmin
    ? "Admin Dashboard"
    : t(isDriver ? "footer.driverAction" : user ? "footer.farmerAction" : "footer.joinAction");

  return (
    <footer className="mt-16 border-t border-green-900/10 bg-[#0d2c1d] text-white dark:border-white/10 dark:bg-[#081c14]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-16">
          <section>
            <Link to="/" className="inline-flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-300 text-green-950"><Wheat size={23} /></span>
              <span><span className="block text-xl font-black tracking-tight">WorkShetu</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200">{t("navbar.tagline", "Smart Farming")}</span></span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-6 text-green-100/75">
              {isAdmin
                ? "Platform administration, booking oversight, driver approvals and service governance."
                : t(isDriver ? "footer.driverDescription" : "footer.farmerDescription")}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-green-100/80"><Sprout size={15} className="text-lime-300" />{t(isDriver ? "footer.driverTagline" : "footer.farmerTagline")}</div>
          </section>

          <nav aria-label={sectionTitle}>
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-lime-200">{sectionTitle}</h2>
            <ul className="mt-5 space-y-3">
              {links.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="group inline-flex items-center gap-2.5 text-sm text-green-50/75 transition hover:text-white focus:outline-none focus-visible:text-white">
                    <Icon size={16} className="text-lime-300/80 transition group-hover:text-lime-200" />{t(label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section>
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-lime-200">{t("footer.communityTitle")}</h2>
            <p className="mt-5 text-sm leading-6 text-green-100/75">{t("footer.communityDescription")}</p>
            <Link to={actionPath} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-black text-green-950 shadow-lg shadow-black/10 transition hover:bg-lime-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {actionLabel}<span aria-hidden="true">↗</span>
            </Link>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-green-100/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WorkShetu. {t("footer.rights")}</p>
          <p>{t(isDriver ? "footer.driverBottomLine" : "footer.farmerBottomLine")}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
