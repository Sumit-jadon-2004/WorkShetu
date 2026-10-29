import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Flag,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  X,
  XCircle,
} from "lucide-react";

export default function DriverManagement() {
  const [searchParams] = useSearchParams();
  const [drivers, setDrivers] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    suspected: 0,
    suspended: 0,
    rejected: 0,
    total: 0,
  });
  const [activeTab, setActiveTab] = useState(() => {
    const t = (searchParams.get("tab") || searchParams.get("status") || "").toLowerCase();
    return ["pending", "approved", "suspected", "suspended", "rejected", "all"].includes(t) ? t : "pending";
  });
  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  useEffect(() => {
    const tabParam = (searchParams.get("tab") || searchParams.get("status") || "").toLowerCase();
    if (["pending", "approved", "suspected", "suspended", "rejected", "all"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals state
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [viewDossier, setViewDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  const [approveModalDriver, setApproveModalDriver] = useState(null);

  const [rejectModalDriver, setRejectModalDriver] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [suspendModalDriver, setSuspendModalDriver] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");

  const [reviewModalDriver, setReviewModalDriver] = useState(null);
  const [reviewReason, setReviewReason] = useState("");

  const [reactivateModalDriver, setReactivateModalDriver] = useState(null);

  // Fetch drivers list
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get("/api/admin/drivers", {
        params: {
          status: activeTab,
          search: search.trim() || undefined,
        },
        withCredentials: true,
      });

      if (response.data.success) {
        setDrivers(response.data.drivers || []);
        if (response.data.counts) {
          setCounts(response.data.counts);
        }
      } else {
        setError(response.data.message || "Failed to load drivers.");
      }
    } catch (err) {
      console.error("Fetch drivers error:", err);
      setError(err.response?.data?.message || "Failed to connect to drivers service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDrivers();
  };

  // View Driver Dossier
  const handleOpenView = async (driver) => {
    setSelectedDriver(driver);
    setDossierLoading(true);
    try {
      const response = await axios.get(`/api/admin/drivers/${driver._id}`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setViewDossier(response.data);
      }
    } catch (err) {
      console.error("View dossier error:", err);
    } finally {
      setDossierLoading(false);
    }
  };

  // 1. Approve Driver
  const handleApprove = async () => {
    if (!approveModalDriver) return;
    try {
      setActionLoading(approveModalDriver._id);
      setError("");
      setSuccess("");

      const response = await axios.put(
        `/api/admin/drivers/${approveModalDriver._id}/approve`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Driver application approved successfully!");
        setApproveModalDriver(null);
        fetchDrivers();
      } else {
        setError(response.data.message || "Failed to approve driver.");
      }
    } catch (err) {
      console.error("Approve driver error:", err);
      setError(err.response?.data?.message || "Failed to approve driver application.");
    } finally {
      setActionLoading("");
    }
  };

  // 2. Reject Driver
  const handleReject = async () => {
    if (!rejectModalDriver) return;
    if (!rejectReason.trim()) {
      setError("Please specify a rejection reason for the applicant.");
      return;
    }
    try {
      setActionLoading(rejectModalDriver._id);
      setError("");
      setSuccess("");

      const response = await axios.put(
        `/api/admin/drivers/${rejectModalDriver._id}/reject`,
        { reason: rejectReason.trim() },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Driver application rejected.");
        setRejectModalDriver(null);
        setRejectReason("");
        fetchDrivers();
      } else {
        setError(response.data.message || "Failed to reject application.");
      }
    } catch (err) {
      console.error("Reject driver error:", err);
      setError(err.response?.data?.message || "Failed to reject driver application.");
    } finally {
      setActionLoading("");
    }
  };

  // 3. Suspend Driver
  const handleSuspend = async () => {
    if (!suspendModalDriver) return;
    if (!suspendReason.trim()) {
      setError("Please state the reason for suspending this driver.");
      return;
    }
    try {
      setActionLoading(suspendModalDriver._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/drivers/${suspendModalDriver._id}/suspend`,
        { isActive: false, reason: suspendReason.trim() },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Driver suspended and listings hidden.");
        setSuspendModalDriver(null);
        setSuspendReason("");
        fetchDrivers();
      } else {
        setError(response.data.message || "Failed to suspend driver.");
      }
    } catch (err) {
      console.error("Suspend driver error:", err);
      setError(err.response?.data?.message || "Failed to update driver status.");
    } finally {
      setActionLoading("");
    }
  };

  // 4. Flag Driver for Review / Suspected
  const handleFlagReview = async () => {
    if (!reviewModalDriver) return;
    if (!reviewReason.trim()) {
      setError("Please provide a reason or investigation note for flagging this driver.");
      return;
    }
    try {
      setActionLoading(reviewModalDriver._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/drivers/${reviewModalDriver._id}/review`,
        { reason: reviewReason.trim() },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Driver flagged for review. Equipment listings temporarily hidden.");
        setReviewModalDriver(null);
        setReviewReason("");
        fetchDrivers();
      } else {
        setError(response.data.message || "Failed to flag driver for review.");
      }
    } catch (err) {
      console.error("Flag driver error:", err);
      setError(err.response?.data?.message || "Failed to flag driver for review.");
    } finally {
      setActionLoading("");
    }
  };

  // 5. Reactivate Driver
  const handleReactivate = async () => {
    if (!reactivateModalDriver) return;
    try {
      setActionLoading(reactivateModalDriver._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/drivers/${reactivateModalDriver._id}/reactivate`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Driver reactivated and listings restored.");
        setReactivateModalDriver(null);
        fetchDrivers();
      } else {
        setError(response.data.message || "Failed to reactivate driver.");
      }
    } catch (err) {
      console.error("Reactivate driver error:", err);
      setError(err.response?.data?.message || "Failed to reactivate driver.");
    } finally {
      setActionLoading("");
    }
  };

  // Compute status badge
  const getStatusBadge = (driver) => {
    if (driver.isActive === false && (driver.role === "Driver" || driver.driverApplicationStatus === "Approved")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200/50 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-900/40">
          <Ban size={11} /> Suspended
        </span>
      );
    }
    if (driver.driverApplicationStatus === "Suspected") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200/50 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-900/40">
          <AlertTriangle size={11} /> Under Review
        </span>
      );
    }
    switch (driver.driverApplicationStatus) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200/50 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-900/40">
            <CheckCircle2 size={11} /> Approved & Active
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200/50 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-900/40">
            <Clock size={11} /> Pending Review
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            <XCircle size={11} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {driver.driverApplicationStatus || "None"}
          </span>
        );
    }
  };

  const tabs = [
    { id: "pending", label: "Pending Applications", count: counts.pending, color: "text-blue-600" },
    { id: "approved", label: "Approved & Active", count: counts.approved, color: "text-emerald-600" },
    { id: "suspected", label: "Under Review", count: counts.suspected, color: "text-amber-600" },
    { id: "suspended", label: "Suspended", count: counts.suspended, color: "text-rose-600" },
    { id: "rejected", label: "Rejected", count: counts.rejected, color: "text-slate-500" },
    { id: "all", label: "All Records", count: counts.total, color: "text-slate-700" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Driver Management
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {counts.approved} Active Operators
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Control driver approval lifecycle, investigate accounts, suspend violators, and restore machinery visibility.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDrivers}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-600 hover:text-rose-800">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 gap-2 pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by driver name, phone, vehicle number…"
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </form>

      {/* ── Drivers Cards / Table Grid ── */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-emerald-600" />
          Loading driver records…
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Truck size={32} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No driver records in this section
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try switching tabs or adjusting your search keywords.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => {
            const isSuspended = d.isActive === false && (d.role === "Driver" || d.driverApplicationStatus === "Approved");
            const isSuspected = d.driverApplicationStatus === "Suspected";
            const isPending = d.driverApplicationStatus === "Pending";
            const isRejected = d.driverApplicationStatus === "Rejected";
            const isApprovedActive = d.driverApplicationStatus === "Approved" && d.isActive !== false;

            return (
              <div
                key={d._id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  {/* Driver Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {d.driverEquipmentImage?.url ? (
                        <img
                          src={d.driverEquipmentImage.url}
                          alt={d.fullName}
                          className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-base font-extrabold text-white shadow-xs">
                          {d.fullName?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {d.fullName}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          <Phone size={10} className="mr-1 inline text-slate-400" />
                          {d.phone}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(d)}
                  </div>

                  {/* Vehicle & Experience Badges */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {d.driverVehicleType || "Tractor"}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {d.driverVehicleNumber || "N/A"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Experience</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {d.driverExperience != null ? `${d.driverExperience} Years` : "N/A"}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {d.driverAddress || d.location || "Local"}
                      </p>
                    </div>
                  </div>

                  {/* License & Aadhaar verification info */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <CreditCard size={12} className="text-slate-400" />
                      DL: {d.driverLicenseNumber ? `****${d.driverLicenseNumber.slice(-4)}` : "Provided"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Applied: {d.driverApplicationDate ? new Date(d.driverApplicationDate).toLocaleDateString() : "Recent"}
                    </span>
                  </div>

                  {/* Suspension Reason display if suspended */}
                  {isSuspended && d.driverSuspensionReason && (
                    <div className="mt-3 rounded-xl bg-rose-50/80 p-2.5 text-[11px] text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                      <p className="font-bold flex items-center gap-1">
                        <Ban size={12} /> Suspension Reason:
                      </p>
                      <p className="text-[10px] leading-relaxed mt-0.5">{d.driverSuspensionReason}</p>
                    </div>
                  )}

                  {/* Review Reason display if under review */}
                  {isSuspected && d.driverReviewReason && (
                    <div className="mt-3 rounded-xl bg-amber-50/80 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <p className="font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> Review Note:
                      </p>
                      <p className="text-[10px] leading-relaxed mt-0.5">{d.driverReviewReason}</p>
                    </div>
                  )}

                  {/* Rejection Reason display if rejected */}
                  {isRejected && d.driverRejectionReason && (
                    <div className="mt-3 rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                      <p className="font-bold flex items-center gap-1">
                        <XCircle size={12} /> Rejection Reason:
                      </p>
                      <p className="text-[10px] leading-relaxed mt-0.5">{d.driverRejectionReason}</p>
                    </div>
                  )}

                  {/* Driver Note/Message */}
                  {d.driverMessage && (
                    <p className="mt-2.5 line-clamp-2 text-[11px] italic text-slate-500 dark:text-slate-400">
                      "{d.driverMessage}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenView(d)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <Eye size={13} />
                    <span>View Dossier</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Approve button for Pending */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => setApproveModalDriver(d)}
                        disabled={actionLoading === d._id}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}

                    {/* Flag for Review button for Pending or Approved */}
                    {(isPending || isApprovedActive) && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalDriver(d);
                          setReviewReason("");
                        }}
                        disabled={actionLoading === d._id}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                        title="Flag for administrative review"
                      >
                        Review
                      </button>
                    )}

                    {/* Reject button for Pending or Under Review */}
                    {(isPending || isSuspected) && (
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalDriver(d);
                          setRejectReason("");
                        }}
                        disabled={actionLoading === d._id}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                      >
                        Reject
                      </button>
                    )}

                    {/* Approve / Clear Review for Suspected */}
                    {isSuspected && (
                      <button
                        type="button"
                        onClick={() => setApproveModalDriver(d)}
                        disabled={actionLoading === d._id}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Clear Review
                      </button>
                    )}

                    {/* Suspend button for Approved or Suspected */}
                    {(isApprovedActive || isSuspected) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSuspendModalDriver(d);
                          setSuspendReason("");
                        }}
                        disabled={actionLoading === d._id}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                      >
                        Suspend
                      </button>
                    )}

                    {/* Reactivate button for Suspended */}
                    {isSuspended && (
                      <button
                        type="button"
                        onClick={() => setReactivateModalDriver(d)}
                        disabled={actionLoading === d._id}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Reactivate
                      </button>
                    )}

                    {/* Re-evaluate / Approve for Rejected */}
                    {isRejected && (
                      <button
                        type="button"
                        onClick={() => setApproveModalDriver(d)}
                        disabled={actionLoading === d._id}
                        className="rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Re-evaluate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 1. VIEW DOSSIER MODAL ── */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">
                  {selectedDriver.fullName?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedDriver.fullName}
                  </h3>
                  <p className="text-xs text-slate-400">Driver Dossier & Verification Details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDriver(null);
                  setViewDossier(null);
                }}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {dossierLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                Loading driver credentials…
              </div>
            ) : (
              <div className="mt-5 space-y-6 text-xs">
                {/* Account Status Badge Banner */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Account Status:</span>
                    {getStatusBadge(viewDossier?.driver || selectedDriver)}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    ID: {(viewDossier?.driver?._id || selectedDriver._id).slice(-6)}
                  </span>
                </div>

                {/* Suspension Details in Dossier */}
                {(viewDossier?.driver?.isActive === false || selectedDriver.isActive === false) && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                    <div className="flex items-center gap-2 font-bold text-xs text-rose-700 dark:text-rose-400">
                      <Ban size={15} />
                      <span>Account Suspended</span>
                      {viewDossier?.driver?.driverSuspendedAt && (
                        <span className="text-[10px] font-normal text-rose-500">
                          ({new Date(viewDossier.driver.driverSuspendedAt).toLocaleString()})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">
                      {viewDossier?.driver?.driverSuspensionReason || selectedDriver.driverSuspensionReason || "Suspended by administrator."}
                    </p>
                  </div>
                )}

                {/* Review Details in Dossier */}
                {(viewDossier?.driver?.driverApplicationStatus === "Suspected" || selectedDriver.driverApplicationStatus === "Suspected") && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle size={15} />
                      <span>Flagged For Administrative Review</span>
                      {viewDossier?.driver?.driverReviewedAt && (
                        <span className="text-[10px] font-normal text-amber-500">
                          ({new Date(viewDossier.driver.driverReviewedAt).toLocaleString()})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">
                      {viewDossier?.driver?.driverReviewReason || selectedDriver.driverReviewReason || "Under review by admin."}
                    </p>
                  </div>
                )}

                {/* Rejection Details in Dossier */}
                {(viewDossier?.driver?.driverApplicationStatus === "Rejected" || selectedDriver.driverApplicationStatus === "Rejected") && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-700 dark:text-slate-300">
                      <XCircle size={15} />
                      <span>Application Rejected</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">
                      {viewDossier?.driver?.driverRejectionReason || selectedDriver.driverRejectionReason || "Application rejected by admin."}
                    </p>
                  </div>
                )}

                {/* Equipment Photo */}
                {selectedDriver.driverEquipmentImage?.url && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Equipment Photo
                    </h4>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <img
                        src={selectedDriver.driverEquipmentImage.url}
                        alt="Equipment"
                        className="max-h-60 w-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Identity & Vehicle Credentials */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {selectedDriver.phone}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Driving License</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {selectedDriver.driverLicenseNumber || "Provided"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar Number</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {selectedDriver.driverAadhaarNumber || "Provided"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Type</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {selectedDriver.driverVehicleType}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Reg. No.</span>
                    <p className="mt-0.5 font-bold font-mono text-slate-800 dark:text-slate-200">
                      {selectedDriver.driverVehicleNumber}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Experience</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {selectedDriver.driverExperience} Years
                    </p>
                  </div>
                </div>

                {/* Driver Message */}
                {selectedDriver.driverMessage && (
                  <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <h5 className="font-bold text-slate-900 dark:text-white mb-1">
                      Applicant Statement
                    </h5>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedDriver.driverMessage}
                    </p>
                  </div>
                )}

                {/* Active Listings Preview */}
                {viewDossier?.listings && viewDossier.listings.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Equipment Listings ({viewDossier.listings.length})
                    </h4>
                    <div className="space-y-2">
                      {viewDossier.listings.map((l) => (
                        <div
                          key={l._id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{l.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {l.category} · {l.location} · {l.availability || "Available"}
                            </p>
                          </div>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            ₹{l.price}/{l.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriver(null);
                      setViewDossier(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. APPROVE CONFIRMATION MODAL ── */}
      {approveModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Approve Driver Application
                </h3>
                <p className="text-xs text-slate-500">{approveModalDriver.fullName}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Approving <strong className="text-slate-900 dark:text-white">{approveModalDriver.fullName}</strong> will grant them active Driver status and immediately publish their verified machinery listings to public farmers.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveModalDriver(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading === approveModalDriver._id}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === approveModalDriver._id ? "Approving…" : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. REJECT WITH REASON MODAL ── */}
      {rejectModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <XCircle size={20} className="text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reject Driver Application
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalDriver(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Provide a clear reason for rejecting <strong className="text-slate-900 dark:text-white">{rejectModalDriver.fullName}</strong>. Their machinery listings will be hidden from public farmers.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReject();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete driving license verification photo, or vehicle registration documents unclear."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-rose-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectModalDriver(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectModalDriver._id || !rejectReason.trim()}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading === rejectModalDriver._id ? "Rejecting…" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. SUSPEND DRIVER WITH REASON MODAL ── */}
      {suspendModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Ban size={20} className="text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Suspend Driver Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSuspendModalDriver(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Suspending <strong className="text-slate-900 dark:text-white">{suspendModalDriver.fullName}</strong> will immediately hide all their machinery listings from farmers and block any new bookings.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSuspend();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Suspension *
                </label>
                <textarea
                  rows={3}
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Safety policy breach, recurring unfulfilled bookings, or expired insurance documentation."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-rose-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuspendModalDriver(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === suspendModalDriver._id || !suspendReason.trim()}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading === suspendModalDriver._id ? "Suspending…" : "Confirm Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. FLAG FOR REVIEW MODAL ── */}
      {reviewModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={20} className="text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Flag Driver for Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalDriver(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Flagging <strong className="text-slate-900 dark:text-white">{reviewModalDriver.fullName}</strong> will place their account Under Review / Suspected status and temporarily hide their machinery from public search while under investigation.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFlagReview();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Investigation / Review Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="e.g. Discrepancy detected in vehicle registration documents or suspicious pricing report."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-amber-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModalDriver(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === reviewModalDriver._id || !reviewReason.trim()}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {actionLoading === reviewModalDriver._id ? "Flagging…" : "Flag for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. REACTIVATE CONFIRMATION MODAL ── */}
      {reactivateModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reactivate Driver Account
                </h3>
                <p className="text-xs text-slate-500">{reactivateModalDriver.fullName}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Reactivating <strong className="text-slate-900 dark:text-white">{reactivateModalDriver.fullName}</strong> will automatically restore public visibility of all their machinery listings and enable farmers to make bookings.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReactivateModalDriver(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReactivate}
                disabled={actionLoading === reactivateModalDriver._id}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === reactivateModalDriver._id ? "Reactivating…" : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
