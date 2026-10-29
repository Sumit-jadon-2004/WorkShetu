import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  LayoutDashboard,
  Settings,
  Star,
  Truck,
  Users,
} from "lucide-react";

const placeholderMeta = {
  dashboard: {
    title: "Admin Dashboard",
    phase: "Phase 3",
    description: "High-level platform KPI cards, real-time metrics, growth charts, and quick-action summaries.",
    icon: LayoutDashboard,
    plannedFeatures: [
      "Key KPI Cards (Users, Drivers, Machinery, Bookings, Applications, Reviews)",
      "Recent Bookings & Transactions Table",
      "Recent Driver Applications Quick Review",
      "Interactive Analytics Charts (Booking statistics & growth)",
    ],
  },
  users: {
    title: "User Management",
    phase: "Phase 4",
    description: "Farmer and driver directory, status moderation, account controls, and role-based permissions.",
    icon: Users,
    plannedFeatures: [
      "User Search & Role Filtering (Farmer, Driver, Admin)",
      "Account Status Controls (Active, Suspended, Blocked)",
      "User Profile Details & Linked Bookings / Listings",
      "Safety guard: Prevent accidental removal of last Admin",
    ],
  },
  drivers: {
    title: "Driver Management",
    phase: "Phase 5",
    description: "Driver verification workflow, Aadhaar/license documents, and vehicle status control.",
    icon: Truck,
    plannedFeatures: [
      "Driver application review (Pending, Approved, Rejected, Suspended)",
      "Document inspection (Driving License, Aadhaar, Vehicle Reg)",
      "Application approval & structured rejection reasons",
      "Driver status management & performance tracking",
    ],
  },
  listings: {
    title: "Listing Management",
    phase: "Phase 6",
    description: "Agricultural machinery, tractor implements, labour, and transport catalog moderation.",
    icon: Layers,
    plannedFeatures: [
      "Categorized catalog tabs (Tractor, Cultivator, Rotavator, Harrow, Harvester, Labour)",
      "Listing inspection, edit, delete, and visibility toggle",
      "Pricing, specs, and availability audit",
    ],
  },
  bookings: {
    title: "Booking Management",
    phase: "Phase 7",
    description: "Monitor and manage farm reservations, dispatch, completions, and disputes.",
    icon: Calendar,
    plannedFeatures: [
      "Booking status lifecycle (Pending, Accepted, In Progress, Completed, Cancelled)",
      "Filtering by date, status, farmer, and driver",
      "Dispute intervention & booking detail audits",
    ],
  },
  reviews: {
    title: "Review Moderation",
    phase: "Phase 8",
    description: "Farmer reviews, driver ratings, and automated sentiment moderation.",
    icon: Star,
    plannedFeatures: [
      "Review moderation and content filtering",
      "Rating statistics across drivers and equipment",
      "Actionable moderation (Hide, Delete, Verify)",
    ],
  },
  complaints: {
    title: "Complaints & Support",
    phase: "Phase 8",
    description: "Escalated grievances, support tickets, and resolution management.",
    icon: AlertTriangle,
    plannedFeatures: [
      "Complaint ticketing system with priority tags",
      "Investigate farmer vs. driver booking disputes",
      "Direct resolution status & refund coordination",
    ],
  },
  analytics: {
    title: "Platform Analytics",
    phase: "Phase 9",
    description: "In-depth growth metrics, service utilization, and geographical demand analysis.",
    icon: BarChart3,
    plannedFeatures: [
      "Platform GMV and booking volume metrics",
      "Regional machinery utilization heatmaps",
      "User acquisition and driver retention rates",
    ],
  },
  settings: {
    title: "Admin Settings",
    phase: "Phase 10",
    description: "System configurations, platform commission rules, notification templates, and security.",
    icon: Settings,
    plannedFeatures: [
      "Platform configuration & service fee parameters",
      "Security audit logs & session monitoring",
      "Notification settings & broadcast announcements",
    ],
  },
};

export default function AdminPlaceholder({ moduleKey = "dashboard" }) {
  const meta = placeholderMeta[moduleKey] || placeholderMeta.dashboard;
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Icon size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  {meta.title}
                </h2>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  {meta.phase}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Ready for Approval
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {meta.description}
              </p>
            </div>
          </div>
        </div>

        {/* Planned Features */}
        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Planned Features for this Module
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {meta.plannedFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/30"
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase Workflow Notice */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <Clock size={18} className="shrink-0 text-amber-700 dark:text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            <strong>Phase Strict Execution:</strong> The Admin Shell & Layout (Phase 2) is active. Full API integration and features for this module will be implemented in <strong>{meta.phase}</strong> following user approval.
          </p>
        </div>
      </div>
    </div>
  );
}
