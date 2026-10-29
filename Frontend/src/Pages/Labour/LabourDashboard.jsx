import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  HardHat,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
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

                        {/* Contact Buttons */}
                        {req.customerPhone && (
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
                            onClick={() => handleAction(req._id, "complete")}
                            disabled={actionLoading === `complete-${req._id}`}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
                          >
                            Mark Completed
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
      </main>
    </>
  );
}

