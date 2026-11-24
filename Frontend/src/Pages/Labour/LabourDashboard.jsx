import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  HardHat,
  KeyRound,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

export default function LabourDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const formatMoney = (amount) =>
    new Intl.NumberFormat(
      i18n.language?.startsWith("hi") ? "hi-IN" : "en-IN",
      { style: "currency", currency: "INR", maximumFractionDigits: 0 }
    ).format(Number(amount || 0));

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/labour/provider/dashboard", {
        withCredentials: true,
      });
      if (res.data?.success) {
        setData(res.data);
      } else {
        setError(res.data?.message || "Failed to load dashboard data.");
      }
    } catch (err) {
      console.error("Labour Dashboard Fetch Error:", err);
      setError(
        err.response?.data?.message ||
          "Could not connect to dashboard. Make sure you are logged in as a Labour provider."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const [selectedBookingForOtp, setSelectedBookingForOtp] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const openOtpModal = (booking) => {
    setSelectedBookingForOtp(booking);
    setOtpInput("");
    setOtpError("");
    setOtpSuccess("");
  };

  const closeOtpModal = () => {
    setSelectedBookingForOtp(null);
    setOtpInput("");
    setOtpError("");
    setOtpSuccess("");
  };

  const handleRequestOtp = async () => {
    if (!selectedBookingForOtp?._id || cooldownSeconds > 0) return;
    try {
      setRequestingOtp(true);
      setOtpError("");
      const res = await axios.post(
        `/api/labour/provider/requests/${selectedBookingForOtp._id}/request-otp`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        setOtpSuccess(res.data?.message || "OTP generated and sent to customer.");
        setCooldownSeconds(60);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to request OTP.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!selectedBookingForOtp?._id) return;
    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }
    try {
      setVerifyingOtp(true);
      setOtpError("");
      const res = await axios.post(
        `/api/labour/provider/requests/${selectedBookingForOtp._id}/verify-otp`,
        { otp: otpInput.trim() },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setOtpSuccess("Work marked as Completed successfully!");
        setTimeout(() => {
          closeOtpModal();
          fetchDashboardData();
        }, 1200);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to verify OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleAction = async (bookingId, action) => {
    try {
      setActionLoading(`${action}-${bookingId}`);
      const res = await axios.put(
        `/api/labour/provider/requests/${bookingId}/${action}`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} request.`);
    } finally {
      setActionLoading("");
    }
  };

  const stats = data?.stats || {
    activeListings: 0,
    pendingListings: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    completedCount: 0,
    totalEarnings: 0,
  };

  const requests = data?.recentRequests || [];

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "pending") return r.status === "Pending";
    if (activeTab === "accepted") return r.status === "Accepted";
    if (activeTab === "completed") return r.status === "Completed";
    if (activeTab === "rejected") return r.status === "Rejected";
    return true;
  });

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f8fafc] pb-24 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        {/* ── Dashboard Header ── */}
        <div className="border-b border-slate-200/80 bg-white px-4 py-8 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    Labour Provider Portal
                  </span>
                  <span className="text-xs text-slate-400">
                    {user?.phone ? `+91 ${user.phone}` : ""}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  Welcome, {user?.fullName || "Worker"}!
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Manage incoming client bookings, worker availability, and track wages.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
                <Link
                  to="/labour/listings"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-green-700/20 transition hover:bg-green-800"
                >
                  <HardHat size={15} />
                  Manage Worker Profiles
                </Link>
                <Link
                  to="/Labour"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  View Marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Metric Cards ── */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {stats.pendingListings > 0 && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Your Labour profile is pending approval. It will remain hidden until approved.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {/* Active Listings */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Profiles
              </span>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {stats.activeListings}
              </p>
              <span className="mt-1 block text-[11px] font-semibold text-emerald-600">
                Available for hire
              </span>
            </div>

            {/* Pending Requests */}
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Pending Requests
              </span>
              <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
                {stats.pendingRequests}
              </p>
              <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                Awaiting your response
              </span>
            </div>

            {/* Accepted Work */}
            <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                Active Jobs
              </span>
              <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">
                {stats.acceptedRequests}
              </p>
              <span className="mt-1 block text-[11px] font-semibold text-blue-600">
                Ready for work
              </span>
            </div>

            {/* Completed Work */}
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Completed Jobs
              </span>
              <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {stats.completedCount}
              </p>
              <span className="mt-1 block text-[11px] font-semibold text-emerald-600">
                Successfully completed
              </span>
            </div>

            {/* Total Earnings */}
            <div className="col-span-2 sm:col-span-1 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-green-800 to-emerald-900 p-5 text-white shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                Total Wages Earned
              </span>
              <p className="mt-2 text-2xl font-black text-white">
                ₹{stats.totalEarnings}
              </p>
              <span className="mt-1 block text-[11px] font-semibold text-emerald-200">
                From completed jobs
              </span>
            </div>
          </div>

          {/* ── Requests Section ── */}
          <div className="mt-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Client Booking Requests
                </h2>
                <p className="text-xs text-slate-500">
                  Farmers who have booked your workers and services
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "pending"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Pending ({stats.pendingRequests})
                </button>
                <button
                  onClick={() => setActiveTab("accepted")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "accepted"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Accepted ({stats.acceptedRequests})
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "completed"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Completed ({stats.completedCount})
                </button>
                <button
                  onClick={() => setActiveTab("rejected")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "rejected"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Rejected ({stats.rejectedCount})
                </button>
                <button
                  onClick={() => setActiveTab("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === "all"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  All ({requests.length})
                </button>
              </div>
            </div>

            {/* List */}
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                No {activeTab !== "all" ? activeTab : ""} requests at the moment.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRequests.map((req) => {
                  const workerName = req.itemId?.name || "Worker";
                  const workerSkill = req.itemId?.labourType || "Labour";
                  return (
                    <div
                      key={req._id}
                      className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              req.status === "Pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : req.status === "Accepted"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : req.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Requested Worker: {workerName} ({workerSkill})
                          </span>
                        </div>

                        {/* Farmer info */}
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Farmer: {req.customerName || req.customer?.fullName || "Farmer"}
                          </span>
                          {req.customerLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin size={13} className="text-slate-400" />
                              {req.customerLocation}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-slate-400" />
                            {req.bookingDate
                              ? new Date(req.bookingDate).toLocaleDateString()
                              : "N/A"}{" "}
                            ({req.daysRequired || 1} Days)
                          </span>
                        </div>

                        {req.message && (
                          <p className="mt-1.5 text-xs italic text-slate-500">
                            "{req.message}"
                          </p>
                        )}
                      </div>

                      {/* Wage & Actions */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="text-right sm:mr-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            Total Wage
                          </span>
                          <p className="text-base font-black text-green-700 dark:text-lime-300">
                            ₹{req.finalPrice || req.totalPrice || 0}
                          </p>
                        </div>

                        {/* Contact Buttons (Customer Phone Only When Accepted or Completed) */}
                        {["Accepted", "Completed"].includes(req.status) && req.customerPhone && (
                          <a
                            href={`tel:${req.customerPhone}`}
                            className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Phone size={13} />
                            Call
                          </a>
                        )}

                        {/* Action buttons */}
                        {req.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAction(req._id, "reject")}
                              disabled={actionLoading === `reject-${req._id}`}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(req._id, "accept")}
                              disabled={actionLoading === `accept-${req._id}`}
                              className="rounded-xl bg-green-700 px-4 py-2 text-xs font-black text-white hover:bg-green-800"
                            >
                              Accept
                            </button>
                          </>
                        )}

                        {req.status === "Accepted" && (
                          <button
                            type="button"
                            onClick={() => openOtpModal(req)}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-2xs transition active:scale-95"
                          >
                            <KeyRound size={14} />
                            Complete Work (Verify OTP)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Secure OTP Verification Modal ── */}
        {selectedBookingForOtp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Work Completion OTP
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Verify client OTP to complete booking and finalize wage
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeOtpModal}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Booking Summary */}
              <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Client / Farmer:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedBookingForOtp.customerName || selectedBookingForOtp.customer?.fullName || "Client"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Days Required:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedBookingForOtp.daysRequired || 1} Day(s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Wage:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                    ₹{selectedBookingForOtp.finalPrice || selectedBookingForOtp.totalPrice || 0}
                  </span>
                </div>
              </div>

              {otpError && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {otpError}
                </div>
              )}

              {otpSuccess && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                  {otpSuccess}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="mt-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enter 6-Digit Completion OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-slate-900 shadow-2xs focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Ask the client to share the 6-digit OTP displayed on their WorkShetu booking details.
                </p>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={requestingOtp || cooldownSeconds > 0}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {requestingOtp
                      ? "Requesting..."
                      : cooldownSeconds > 0
                      ? `Resend in ${cooldownSeconds}s`
                      : "Request New OTP"}
                  </button>

                  <button
                    type="submit"
                    disabled={verifyingOtp || otpInput.trim().length !== 6}
                    className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50 transition"
                  >
                    {verifyingOtp ? "Verifying..." : "Verify & Complete"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

