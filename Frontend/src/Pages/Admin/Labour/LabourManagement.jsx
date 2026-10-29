import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Filter,
  HardHat,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  XCircle,
} from "lucide-react";

export default function LabourManagement() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, listings, providers, bookings
  const [stats, setStats] = useState({
    totalProviders: 0,
    totalListings: 0,
    activeListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    acceptedBookings: 0,
    completedBookings: 0,
    totalWagesCompleted: 0,
  });

  // Listings State
  const [listings, setListings] = useState([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsSearch, setListingsSearch] = useState("");
  const [listingsCategory, setListingsCategory] = useState("all");
  const [listingsStatus, setListingsStatus] = useState("all");

  // Providers State
  const [providers, setProviders] = useState([]);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [providersSearch, setProvidersSearch] = useState("");

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsSearch, setBookingsSearch] = useState("");
  const [bookingsStatus, setBookingsStatus] = useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/labour/stats", { withCredentials: true });
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Fetch Admin Labour Stats Error:", err);
    }
  }, []);

  // Fetch Listings
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (listingsSearch.trim()) params.search = listingsSearch.trim();
      if (listingsCategory !== "all") params.category = listingsCategory;
      if (listingsStatus !== "all") params.status = listingsStatus;

      const res = await axios.get("/api/admin/labour/listings", {
        params,
        withCredentials: true,
      });
      if (res.data?.success) {
        setListings(res.data.listings || []);
        setListingsTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Fetch Admin Labour Listings Error:", err);
      setError("Failed to load labour listings.");
    } finally {
      setLoading(false);
    }
  }, [listingsSearch, listingsCategory, listingsStatus]);

  // Fetch Providers
  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (providersSearch.trim()) params.search = providersSearch.trim();

      const res = await axios.get("/api/admin/labour/providers", {
        params,
        withCredentials: true,
      });
      if (res.data?.success) {
        setProviders(res.data.providers || []);
        setProvidersTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Fetch Admin Labour Providers Error:", err);
      setError("Failed to load labour providers.");
    } finally {
      setLoading(false);
    }
  }, [providersSearch]);

  // Fetch Bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (bookingsSearch.trim()) params.search = bookingsSearch.trim();
      if (bookingsStatus !== "all") params.status = bookingsStatus;

      const res = await axios.get("/api/admin/labour/bookings", {
        params,
        withCredentials: true,
      });
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
        setBookingsTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Fetch Admin Labour Bookings Error:", err);
      setError("Failed to load labour bookings.");
    } finally {
      setLoading(false);
    }
  }, [bookingsSearch, bookingsStatus]);

  useEffect(() => {
    fetchStats();
    if (activeTab === "overview" || activeTab === "listings") fetchListings();
    if (activeTab === "providers") fetchProviders();
    if (activeTab === "bookings") fetchBookings();
  }, [activeTab, fetchStats, fetchListings, fetchProviders, fetchBookings]);

  // Moderate Listing (Approve / Reject / Toggle Availability)
  const handleModerateListing = async (listingId, updates) => {
    try {
      setActionLoading(`mod-${listingId}`);
      const res = await axios.put(
        `/api/admin/labour/listings/${listingId}/status`,
        updates,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setMessage("Listing updated successfully.");
        fetchListings();
        fetchStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update listing.");
    } finally {
      setActionLoading("");
    }
  };

  // Delete Listing
  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing permanently?")) return;
    try {
      setActionLoading(`del-${listingId}`);
      const res = await axios.delete(`/api/admin/labour/listings/${listingId}`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        setMessage("Listing deleted successfully.");
        fetchListings();
        fetchStats();
      }
    } catch (err) {
      alert("Failed to delete listing.");
    } finally {
      setActionLoading("");
    }
  };

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to change booking status to ${newStatus}?`)) return;
    try {
      setActionLoading(`book-${bookingId}`);
      const res = await axios.put(
        `/api/admin/labour/bookings/${bookingId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setMessage(`Booking status updated to ${newStatus}.`);
        fetchBookings();
        fetchStats();
      }
    } catch (err) {
      alert("Failed to update booking status.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Admin Console
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Labour Workforce Management
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Supervise registered labour providers, moderate worker profiles, track bookings and wage metrics.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          {[
            { id: "overview", label: "Overview" },
            { id: "listings", label: `Listings (${stats.totalListings})` },
            { id: "providers", label: `Providers (${stats.totalProviders})` },
            { id: "bookings", label: `Bookings (${stats.totalBookings})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Success / Error Notifications ── */}
      {message && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
          <button type="button" onClick={() => setMessage("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Registered Providers
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalProviders}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600">Active workforce</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Marketplace Listings
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalListings}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600">
            {stats.activeListings} available for hire
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Labour Bookings
          </span>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
            {stats.totalBookings}
          </p>
          <span className="text-[11px] font-semibold text-blue-600">
            {stats.pendingBookings} pending · {stats.completedBookings} completed
          </span>
        </div>

        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-green-800 to-emerald-950 p-5 text-white shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
            Total Wages Completed
          </span>
          <p className="mt-2 text-2xl font-black text-white">
            ₹{stats.totalWagesCompleted.toLocaleString()}
          </p>
          <span className="text-[11px] font-semibold text-emerald-300">Paid to workers</span>
        </div>
      </div>

      {/* ── TAB 1: LISTINGS MANAGEMENT ── */}
      {(activeTab === "overview" || activeTab === "listings") && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Labour Profiles & Listings Moderation
              </h2>
              <p className="text-xs text-slate-500">
                Approve, reject, hide or delete labour listings across all categories
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={listingsSearch}
                  onChange={(e) => setListingsSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={listingsStatus}
                onChange={(e) => setListingsStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                type="button"
                onClick={fetchListings}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Listings Table */}
          <div className="mt-4 overflow-x-auto">
            {listings.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No listings found matching criteria.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="py-3 px-3">Worker & Category</th>
                    <th className="py-3 px-3">Provider (Owner)</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Wage Rate</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Availability</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {listings.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.image?.url || "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80"}
                            alt={item.name}
                            className="h-9 w-9 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white">{item.name}</p>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                              {item.labourType}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {item.owner?.fullName || "Provider"}
                        </p>
                        <p className="text-[10px] text-slate-400">{item.owner?.phone || item.phone}</p>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">{item.location}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-extrabold text-green-700 dark:text-lime-300">
                          ₹{item.price} / {item.pricingUnit || "day"}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          item.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : item.status === "Pending"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {item.status || "Approved"}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          item.availability === "Available"
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}>
                          {item.availability === "Available" ? <Eye size={12} /> : <EyeOff size={12} />}
                          {item.availability}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== "Approved" && (
                            <button
                              type="button"
                              onClick={() => handleModerateListing(item._id, { status: "Approved" })}
                              className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                              title="Approve Listing"
                            >
                              Approve
                            </button>
                          )}
                          {item.status !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => handleModerateListing(item._id, { status: "Rejected" })}
                              className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                              title="Reject / Moderate"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteListing(item._id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                            title="Delete Listing"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: PROVIDERS MANAGEMENT ── */}
      {activeTab === "providers" && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Registered Labour Providers
              </h2>
              <p className="text-xs text-slate-500">
                User accounts registered as agricultural labour providers
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={providersSearch}
                  onChange={(e) => setProvidersSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={fetchProviders}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {providers.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No labour providers registered yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="py-3 px-3">Provider Name</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Active Listings</th>
                    <th className="py-3 px-3">Completed Jobs</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {providers.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                        {p.fullName}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">
                        {p.phone}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.location || "N/A"}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                        {p.listingsCount || 0}
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700 dark:text-blue-400">
                        {p.completedJobs || 0}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.isActive !== false
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {p.isActive !== false ? "Active" : "Disabled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: BOOKINGS VISIBILITY & STATUS ── */}
      {activeTab === "bookings" && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Labour Service Bookings
              </h2>
              <p className="text-xs text-slate-500">
                Track all farmer booking requests for labour services
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={bookingsSearch}
                  onChange={(e) => setBookingsSearch(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={bookingsStatus}
                onChange={(e) => setBookingsStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Bookings</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                type="button"
                onClick={fetchBookings}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {bookings.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No labour bookings found.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="py-3 px-3">Service & Worker</th>
                    <th className="py-3 px-3">Farmer</th>
                    <th className="py-3 px-3">Provider</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <p className="font-extrabold text-slate-900 dark:text-white">
                          {b.itemId?.name || "Worker"}
                        </p>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                          {b.taskCategory || b.itemId?.labourType || "Labour"}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {b.customerName || b.customer?.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400">{b.customerPhone}</p>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {b.owner?.fullName || "Provider"}
                        </p>
                        <p className="text-[10px] text-slate-400">{b.owner?.phone}</p>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {new Date(b.bookingDate).toLocaleDateString()}
                        {b.preferredTime && <p className="text-[10px] text-slate-400">{b.preferredTime}</p>}
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-semibold">
                        {b.daysRequired || 1} day(s) · {b.workerCount || 1} worker(s)
                      </td>

                      <td className="py-3 px-3 font-extrabold text-green-700 dark:text-lime-300">
                        ₹{b.finalPrice || b.totalPrice}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          b.status === "Accepted"
                            ? "bg-blue-100 text-blue-800"
                            : b.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "Pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {b.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === "Pending" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(b._id, "Accepted")}
                              className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              Accept
                            </button>
                          )}
                          {b.status === "Accepted" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(b._id, "Completed")}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                            >
                              Complete
                            </button>
                          )}
                          {["Pending", "Accepted"].includes(b.status) && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(b._id, "Cancelled")}
                              className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

