import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  HardHat,
  Layers,
  Phone,
  RefreshCw,
  Shield,
  Star,
  Tractor,
  Truck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/admin/dashboard/stats", {
        withCredentials: true,
      });

      if (response.data.success) {
        setData(response.data);
        setLastUpdated(new Date());
      } else {
        setError(response.data.message || "Failed to load dashboard data.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Could not connect to dashboard service. Please check server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    const handleGlobalRefresh = () => fetchDashboardStats();
    window.addEventListener("admin:refresh", handleGlobalRefresh);
    return () => window.removeEventListener("admin:refresh", handleGlobalRefresh);
  }, []);

  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];
  const recentDriverApplications = data?.recentDriverApplications || [];
  const recentUsers = data?.recentUsers || [];
  const charts = data?.charts || {};

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 size={12} /> {status}
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock size={12} /> {status}
          </span>
        );
      case "Accepted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            <CheckCircle2 size={12} /> {status}
          </span>
        );
      case "Cancelled":
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
            <XCircle size={12} /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    const isDriver = role === "Driver";
    const isAdmin = role?.toLowerCase() === "admin";
    if (isAdmin) {
      return (
        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
          Admin
        </span>
      );
    }
    if (isDriver) {
      return (
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          Driver
        </span>
      );
    }
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        Farmer
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* ── Top Header / Hero ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Platform Dashboard
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Live
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user?.name || "Administrator"}</strong>. Here is your WorkShetu aggregation overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={fetchDashboardStats}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Error Notice ── */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardStats}
            className="rounded-lg bg-rose-600 px-3 py-1 font-bold text-white transition hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Metric Cards Grid ── */}
      <section aria-label="Key Performance Indicators">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Core Platform Metrics (Click to Manage)
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            Interactive Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-4">
          {/* Total Users */}
          <Link
            to="/admin/users"
            className="group relative block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-md cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
            title="Manage all platform users"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Users
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700">
                <Users size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "…" : stats.totalUsers ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">
                {stats.totalFarmers ?? 0} Farmers · {stats.totalDrivers ?? 0} Drivers
              </span>
              <ArrowUpRight size={13} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600" />
            </div>
          </Link>

          {/* Total Drivers */}
          <Link
            to="/admin/drivers?tab=approved"
            className="group relative block rounded-2xl border border-blue-200/80 bg-blue-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md cursor-pointer dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:border-blue-700"
            title="Manage verified drivers"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                Drivers
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
                <Truck size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
              {loading ? "…" : stats.totalDrivers ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-blue-700/80 dark:text-blue-300/80">
              <span>Verified drivers & fleet</span>
              <ArrowUpRight size={13} className="shrink-0 text-blue-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-700" />
            </div>
          </Link>

          {/* Pending Applications */}
          <Link
            to="/admin/drivers?tab=pending"
            className="group relative block rounded-2xl border border-amber-200/80 bg-amber-50/35 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50/60 hover:shadow-md cursor-pointer dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:border-amber-700"
            title="Review pending driver applications"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Driver Approvals
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 transition-colors group-hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200">
                <FileCheck size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
              {loading ? "…" : stats.pendingDriverApplications ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              <span>Pending Review</span>
              <ArrowUpRight size={13} className="shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Total Machines */}
          <Link
            to="/admin/listings?tab=machines"
            className="group relative block rounded-2xl border border-emerald-200/80 bg-emerald-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-md cursor-pointer dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:border-emerald-700"
            title="View machine and tractor listings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Machines
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">
                <Tractor size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : stats.totalMachines ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
              <span className="truncate">Tractors, Harvesters</span>
              <ArrowUpRight size={13} className="shrink-0 text-emerald-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Labour Listings */}
          <Link
            to="/admin/listings?tab=labour"
            className="group relative block rounded-2xl border border-cyan-200/80 bg-cyan-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400 hover:bg-cyan-50/50 hover:shadow-md cursor-pointer dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:hover:border-cyan-700"
            title="View labour workforce listings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400">
                Labour
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 transition-colors group-hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300">
                <UserCheck size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-cyan-700 dark:text-cyan-300">
              {loading ? "…" : stats.totalLabour ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-cyan-700/80 dark:text-cyan-300/80">
              <span className="truncate">Skilled farm hands</span>
              <ArrowUpRight size={13} className="shrink-0 text-cyan-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Transport Listings */}
          <Link
            to="/admin/listings?tab=transport"
            className="group relative block rounded-2xl border border-orange-200/80 bg-orange-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-orange-400 hover:bg-orange-50/50 hover:shadow-md cursor-pointer dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:border-orange-700"
            title="View transport vehicle listings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-400">
                Transport
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700 transition-colors group-hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300">
                <Truck size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-orange-700 dark:text-orange-400">
              {loading ? "…" : stats.totalTransport ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-orange-700/80 dark:text-orange-300/80">
              <span className="truncate">Trucks, Tempos</span>
              <ArrowUpRight size={13} className="shrink-0 text-orange-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Total Bookings */}
          <Link
            to="/admin/bookings"
            className="group relative block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-md cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
            title="Manage all bookings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bookings
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700">
                <Calendar size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "…" : stats.totalBookings ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>All reservations</span>
              <ArrowUpRight size={13} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600" />
            </div>
          </Link>

          {/* Pending Bookings */}
          <Link
            to="/admin/bookings?status=pending"
            className="group relative block rounded-2xl border border-amber-200/80 bg-amber-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-md cursor-pointer dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:border-amber-700"
            title="Filter pending bookings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Pending Bookings
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition-colors group-hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300">
                <Clock size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
              {loading ? "…" : stats.pendingBookings ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-amber-700/80 dark:text-amber-300/80">
              <span>Awaiting acceptance</span>
              <ArrowUpRight size={13} className="shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Completed Bookings */}
          <Link
            to="/admin/bookings?status=completed"
            className="group relative block rounded-2xl border border-emerald-200/80 bg-emerald-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-md cursor-pointer dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:border-emerald-700"
            title="Filter completed bookings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Completed
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? "…" : stats.completedBookings ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
              <span>Successfully fulfilled</span>
              <ArrowUpRight size={13} className="shrink-0 text-emerald-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Cancelled Bookings */}
          <Link
            to="/admin/bookings?status=cancelled"
            className="group relative block rounded-2xl border border-rose-200/80 bg-rose-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-rose-400 hover:bg-rose-50/50 hover:shadow-md cursor-pointer dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:border-rose-700"
            title="Filter cancelled bookings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400">
                Cancelled
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 transition-colors group-hover:bg-rose-200 dark:bg-rose-900 dark:text-rose-300">
                <XCircle size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
              {loading ? "…" : stats.cancelledBookings ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-rose-700/80 dark:text-rose-300/80">
              <span>Cancelled bookings</span>
              <ArrowUpRight size={13} className="shrink-0 text-rose-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Total Reviews */}
          <Link
            to="/admin/reviews"
            className="group relative block rounded-2xl border border-amber-200/80 bg-amber-50/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-md cursor-pointer dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:border-amber-700"
            title="Moderate community reviews"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Reviews
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition-colors group-hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300">
                <Star size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
              {loading ? "…" : stats.totalReviews ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-amber-700/80 dark:text-amber-300/80">
              <span>Farmer ratings</span>
              <ArrowUpRight size={13} className="shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Total Catalog Items */}
          <Link
            to="/admin/listings"
            className="group relative block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-md cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
            title="Manage all catalog listings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Listings
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700">
                <Layers size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "…" : stats.totalListings ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>All catalog supplies</span>
              <ArrowUpRight size={13} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Charts & Visual Distribution Row ── */}
      <section aria-label="Distribution Charts" className="grid gap-6 lg:grid-cols-3">
        {/* Booking Status Distribution */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Booking Status Breakdown
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click a status to view filtered bookings
              </p>
            </div>
            <BarChart3 size={16} className="text-slate-400" />
          </div>

          <div className="mt-4 space-y-2">
            {(charts.bookingStatus || []).map((item) => {
              const total = stats.totalBookings || 1;
              const percent = Math.round((item.count / total) * 100);
              const statusKey = (item.label || "").toLowerCase();
              return (
                <Link
                  key={item.label}
                  to={`/admin/bookings?status=${statusKey}`}
                  className="group block rounded-xl p-2.5 transition-all hover:bg-slate-50 hover:shadow-2xs dark:hover:bg-slate-800/60 cursor-pointer"
                  title={`View ${item.label} bookings`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700 transition-colors group-hover:text-emerald-700 dark:text-slate-300 dark:group-hover:text-emerald-400">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                      <ArrowUpRight size={12} className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {item.count} ({percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Listing Catalog Distribution */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Catalog by Category
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click a category to filter listings
              </p>
            </div>
            <Layers size={16} className="text-slate-400" />
          </div>

          <div className="mt-4 space-y-2">
            {(charts.listingCategories || []).map((item) => {
              const total = stats.totalListings || 1;
              const percent = Math.round((item.count / total) * 100);
              const getTab = (label) => {
                const l = (label || "").toLowerCase();
                if (l.includes("machine") || l.includes("tractor")) return "machines";
                if (l.includes("labour")) return "labour";
                if (l.includes("transport")) return "transport";
                return "all";
              };
              const tab = getTab(item.label);
              return (
                <Link
                  key={item.label}
                  to={`/admin/listings?tab=${tab}`}
                  className="group block rounded-xl p-2.5 transition-all hover:bg-slate-50 hover:shadow-2xs dark:hover:bg-slate-800/60 cursor-pointer"
                  title={`View ${item.label}`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700 transition-colors group-hover:text-emerald-700 dark:text-slate-300 dark:group-hover:text-emerald-400">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                      <ArrowUpRight size={12} className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {item.count} ({percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Role Distribution */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                User Community Ratio
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click a role to manage user segment
              </p>
            </div>
            <Users size={16} className="text-slate-400" />
          </div>

          <div className="mt-4 space-y-2">
            {(charts.userRoles || []).map((item) => {
              const total = stats.totalUsers || 1;
              const percent = Math.round((item.count / total) * 100);
              const getUserRoleUrl = (label) => {
                const l = (label || "").toLowerCase();
                if (l.includes("driver")) return "/admin/drivers?tab=approved";
                if (l.includes("farmer")) return "/admin/users?role=Farmer";
                if (l.includes("admin")) return "/admin/users?role=Admin";
                return "/admin/users";
              };
              return (
                <Link
                  key={item.label}
                  to={getUserRoleUrl(item.label)}
                  className="group block rounded-xl p-2.5 transition-all hover:bg-slate-50 hover:shadow-2xs dark:hover:bg-slate-800/60 cursor-pointer"
                  title={`View ${item.label}`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700 transition-colors group-hover:text-emerald-700 dark:text-slate-300 dark:group-hover:text-emerald-400">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                      <ArrowUpRight size={12} className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {item.count} ({percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Recent Tables Section ── */}
      <div className="space-y-8">
        {/* Recent Bookings Table */}
        <section aria-label="Recent Bookings" className="rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Bookings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest customer reservations across machines, labour, and transport
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <span>View all bookings</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Customer</th>
                  <th scope="col" className="px-5 py-3.5">Driver / Owner</th>
                  <th scope="col" className="px-5 py-3.5">Booking Type</th>
                  <th scope="col" className="px-5 py-3.5">Item</th>
                  <th scope="col" className="px-5 py-3.5">Date</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                      No bookings recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((b) => (
                    <tr
                      key={b._id}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/admin/bookings?search=${encodeURIComponent(b.customerPhone || b.customer)}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition-colors dark:text-white dark:hover:text-emerald-400 flex items-center gap-1"
                          title="Search customer bookings"
                        >
                          <span>{b.customer}</span>
                          <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-[11px] text-slate-400 font-mono">{b.customerPhone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/admin/drivers?search=${encodeURIComponent(b.driverPhone || b.driver)}`}
                          className="font-medium text-slate-800 hover:text-blue-600 transition-colors dark:text-slate-200 dark:hover:text-blue-400"
                          title="Search driver"
                        >
                          {b.driver}
                        </Link>
                        <p className="text-[11px] text-slate-400 font-mono">{b.driverPhone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/admin/bookings?type=${encodeURIComponent(b.item)}`}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {b.bookingType}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                        <Link
                          to={`/admin/bookings?type=${encodeURIComponent(b.item)}`}
                          className="hover:text-emerald-600 transition-colors"
                        >
                          {b.item}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {b.date ? new Date(b.date).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link to={`/admin/bookings?status=${encodeURIComponent((b.status || "").toLowerCase())}`}>
                          {getStatusBadge(b.status)}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                        ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Applications & Recent Users Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Driver Applications */}
          <section aria-label="Recent Driver Applications" className="rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Driver Applications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Applicants waiting for document and vehicle verification
                </p>
              </div>
              <Link
                to="/admin/drivers?tab=pending"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>Review all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentDriverApplications.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">
                  No driver applications submitted yet.
                </p>
              ) : (
                recentDriverApplications.map((app) => (
                  <div
                    key={app._id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <Link
                      to="/admin/drivers?tab=pending"
                      className="flex items-start gap-3 group flex-1 cursor-pointer"
                    >
                      {app.image ? (
                        <img
                          src={app.image}
                          alt={app.name}
                          className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          <Truck size={18} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400">
                          {app.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          <Phone size={10} className="mr-1 inline" />
                          {app.phone} · {app.experience}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {app.vehicleType} · {app.vehicleNumber}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link to="/admin/drivers?tab=pending">
                        {getStatusBadge(app.status)}
                      </Link>
                      <Link
                        to="/admin/drivers?tab=pending"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Users */}
          <section aria-label="Recent Users" className="rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Users
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Newly registered accounts on WorkShetu
                </p>
              </div>
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentUsers.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">
                  No users registered yet.
                </p>
              ) : (
                recentUsers.map((u) => (
                  <Link
                    key={u._id}
                    to={`/admin/users?search=${encodeURIComponent(u.phone || u.name)}`}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/60 group cursor-pointer dark:hover:bg-slate-800/40"
                    title={`View user ${u.name}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400">
                          {u.name}
                        </p>
                        {getRoleBadge(u.role)}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {u.phone} {u.email ? `· ${u.email}` : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {u.status}
                      </span>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {u.joinedDate ? new Date(u.joinedDate).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

