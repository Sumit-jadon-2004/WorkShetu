import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  HardHat,
  Layers,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Tractor,
  Trash2,
  Truck,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

export default function BookingManagement() {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  });
  const [activeTab, setActiveTab] = useState(() => {
    const s = searchParams.get("status")?.toLowerCase();
    return ["all", "pending", "accepted", "completed", "cancelled", "rejected"].includes(s) ? s : "all";
  });
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") || "all");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      const s = statusParam.toLowerCase();
      if (["all", "pending", "accepted", "completed", "cancelled", "rejected"].includes(s)) {
        setActiveTab(s);
      }
    }
    const typeParam = searchParams.get("type");
    if (typeParam) {
      setTypeFilter(typeParam);
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
  const [viewingBooking, setViewingBooking] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const [statusModalBooking, setStatusModalBooking] = useState(null);
  const [newStatus, setNewStatus] = useState("Accepted");
  const [adminNote, setAdminNote] = useState("");

  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const fetchBookings = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: targetPage,
        limit: 10,
        status: activeTab !== "all" ? activeTab : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: search.trim() || undefined,
      };

      const response = await axios.get("/api/admin/bookings", {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setBookings(response.data.bookings || []);
        if (response.data.counts) {
          setCounts(response.data.counts);
        }
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        setPage(targetPage);
      } else {
        setError(response.data.message || "Failed to load bookings.");
      }
    } catch (err) {
      console.error("Fetch bookings error:", err);
      setError(err.response?.data?.message || "Failed to connect to bookings service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, [activeTab, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings(1);
  };

  // View Detailed Audit
  const handleOpenAudit = async (booking) => {
    setViewingBooking(booking);
    setAuditLoading(true);
    try {
      const response = await axios.get(`/api/admin/bookings/${booking._id}`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setAuditData(response.data);
      }
    } catch (err) {
      console.error("Fetch booking audit error:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Update Status / Intervene
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusModalBooking) return;
    try {
      setActionLoading(statusModalBooking._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/bookings/${statusModalBooking._id}/status`,
        { status: newStatus, note: adminNote.trim() || undefined },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setStatusModalBooking(null);
        setAdminNote("");
        fetchBookings(page);
      } else {
        setError(response.data.message || "Failed to update booking status.");
      }
    } catch (err) {
      console.error("Update status error:", err);
      setError(err.response?.data?.message || "Failed to update booking status.");
    } finally {
      setActionLoading("");
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (e) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    try {
      setActionLoading(cancelModalBooking._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/bookings/${cancelModalBooking._id}/status`,
        { status: "Cancelled", note: cancelReason.trim() || "Administrative cancellation" },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setCancelModalBooking(null);
        setCancelReason("");
        fetchBookings(page);
      } else {
        setError(response.data.message || "Failed to cancel booking.");
      }
    } catch (err) {
      console.error("Cancel booking error:", err);
      setError(err.response?.data?.message || "Failed to cancel booking.");
    } finally {
      setActionLoading("");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 size={11} /> Completed
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock size={11} /> Pending
          </span>
        );
      case "Accepted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            <CheckCircle2 size={11} /> Accepted
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
            <XCircle size={11} /> Cancelled
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <XCircle size={11} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Machine":
        return <Tractor size={14} className="text-emerald-600 dark:text-emerald-400" />;
      case "Labour":
        return <UserCheck size={14} className="text-cyan-600 dark:text-cyan-400" />;
      case "Transport":
        return <Truck size={14} className="text-orange-600 dark:text-orange-400" />;
      default:
        return <Calendar size={14} className="text-slate-500" />;
    }
  };

  const tabs = [
    { id: "all", label: "All Bookings", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "accepted", label: "Accepted", count: counts.accepted },
    { id: "completed", label: "Completed", count: counts.completed },
    { id: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Booking Management
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {counts.all} Total Orders
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Monitor farm reservations, resolve customer/driver disputes, audit financial breakdowns, and intervene in booking lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-100 focus:outline-hidden dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          >
            <User size={14} />
            <span>My Personal Bookings</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchBookings(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>
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

      {/* ── Status Tabs ── */}
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

      {/* ── Search & Service Type Filters ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, driver, phone, location, or ID…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[11px] font-bold text-slate-500">Service:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All Services</option>
            <option value="Machine">Machines</option>
            <option value="Labour">Labour</option>
            <option value="Transport">Transport</option>
          </select>
        </div>
      </div>

      {/* ── Bookings Table ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">Booking ID</th>
                <th scope="col" className="px-5 py-3.5">Customer</th>
                <th scope="col" className="px-5 py-3.5">Driver / Owner</th>
                <th scope="col" className="px-5 py-3.5">Service & Item</th>
                <th scope="col" className="px-5 py-3.5">Date & Scope</th>
                <th scope="col" className="px-5 py-3.5">Amount</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                    Loading booking reservations…
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-xs text-slate-400">
                    No bookings found in this view.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b._id}
                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    {/* Booking ID */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        #{b._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {b.bookingType} Order
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {b.customer.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <Phone size={9} className="mr-1 inline" />
                        {b.customer.phone}
                      </p>
                    </td>

                    {/* Driver */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {b.driver.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <Phone size={9} className="mr-1 inline" />
                        {b.driver.phone}
                      </p>
                    </td>

                    {/* Service & Item */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(b.requestType)}
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {b.itemName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{b.requestType}</span>
                    </td>

                    {/* Date & Scope */}
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {b.details.requiredDate
                          ? new Date(b.details.requiredDate).toLocaleDateString()
                          : "Immediate"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {b.details.landArea ||
                          b.details.weight ||
                          b.details.daysRequired ||
                          b.details.workType ||
                          "Standard Scope"}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(b.pricing.finalPrice || 0).toLocaleString("en-IN")}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">{getStatusBadge(b.status)}</td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Audit Details */}
                        <button
                          type="button"
                          onClick={() => handleOpenAudit(b)}
                          title="Audit Details"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Intervene / Status Update */}
                        <button
                          type="button"
                          onClick={() => {
                            setStatusModalBooking(b);
                            setNewStatus(b.status === "Pending" ? "Accepted" : b.status);
                            setAdminNote("");
                          }}
                          title="Intervene / Update Status"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Cancel Booking */}
                        {b.status !== "Cancelled" && b.status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalBooking(b);
                              setCancelReason("");
                            }}
                            title="Cancel Booking"
                            className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-white">{bookings.length}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> orders
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchBookings(page - 1)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              Page {page} of {pagination.pages}
            </span>

            <button
              type="button"
              onClick={() => fetchBookings(page + 1)}
              disabled={page >= pagination.pages || loading}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. AUDIT DETAILS MODAL ── */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  {getTypeIcon(viewingBooking.requestType)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Booking Audit #{viewingBooking._id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewingBooking.bookingType} · {viewingBooking.requestType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingBooking(null);
                  setAuditData(null);
                }}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {auditLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                Auditing transaction details…
              </div>
            ) : (
              <div className="mt-4 space-y-5 text-xs">
                {/* Financial Summary */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Price Breakdown
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <span className="text-[10px] text-slate-400">Base Price</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{viewingBooking.pricing.basePrice}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Extra Charge</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{viewingBooking.pricing.extraCharge}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Discount</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{viewingBooking.pricing.discountAmount}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Final Total</span>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₹{viewingBooking.pricing.finalPrice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parties Involved */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">
                      {viewingBooking.customer.name}
                    </p>
                    <p className="text-slate-500">
                      <Phone size={10} className="mr-1 inline" />
                      {viewingBooking.customer.phone}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      <MapPin size={10} className="mr-1 inline" />
                      {viewingBooking.customer.location}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Driver</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">
                      {viewingBooking.driver.name}
                    </p>
                    <p className="text-slate-500">
                      <Phone size={10} className="mr-1 inline" />
                      {viewingBooking.driver.phone}
                    </p>
                    {auditData?.booking?.owner?.driverVehicleNumber && (
                      <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                        Plate: {auditData.booking.owner.driverVehicleNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Work Scope & Timestamp */}
                <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Order Scope</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Service:</strong> {viewingBooking.itemName} ({viewingBooking.requestType})
                  </p>
                  {viewingBooking.details.landArea && (
                    <p className="text-slate-600 dark:text-slate-400">
                      <strong>Land Size:</strong> {viewingBooking.details.landArea}
                    </p>
                  )}
                  {viewingBooking.details.workType && (
                    <p className="text-slate-600 dark:text-slate-400">
                      <strong>Work Category:</strong> {viewingBooking.details.workType}
                    </p>
                  )}
                  <p className="text-slate-500 text-[11px]">
                    Created: {new Date(viewingBooking.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingBooking(null);
                      setAuditData(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. INTERVENE / UPDATE STATUS MODAL ── */}
      {statusModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Intervene / Update Status
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalBooking(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Select Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Pending">Pending (Awaiting Acceptance)</option>
                  <option value="Accepted">Accepted (Driver Confirmed)</option>
                  <option value="Completed">Completed (Work Done)</option>
                  <option value="Cancelled">Cancelled (Order Voided)</option>
                  <option value="Rejected">Rejected (Declined)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Administrative Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Reason for intervention or resolution summary…"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalBooking(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === statusModalBooking._id}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading === statusModalBooking._id ? "Saving…" : "Apply Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. CANCEL BOOKING MODAL ── */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/40 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cancel Booking #{cancelModalBooking._id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">Void reservation and notify parties</p>
              </div>
            </div>

            <form onSubmit={handleCancelBooking} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Cancellation Reason / Dispute Note *
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Machinery breakdown, customer requested emergency cancellation, or schedule conflict."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-rose-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === cancelModalBooking._id || !cancelReason.trim()}
                  className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading === cancelModalBooking._id ? "Cancelling…" : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

