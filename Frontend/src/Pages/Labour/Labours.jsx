import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  HardHat,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

const DEFAULT_CATEGORIES = [
  "All",
  "General Agricultural Labour",
  "Sowing & Planting",
  "Harvesting",
  "Irrigation Assistance",
  "Weeding & Field Preparation",
  "Fruit & Vegetable Picking",
  "Loading & Unloading",
  "Tractor Driver",
  "Harvester Operator",
  "Spray Machine Operator",
  "Farm Worker",
  "Electrician",
  "Mechanical",
  "Welder",
  "Plumber",
  "Helper",
];

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80";

export default function LabourSPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Advanced Filters
  const [maxWage, setMaxWage] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Booking Modal State
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    taskCategory: "",
    taskDescription: "",
    bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    preferredTime: "Morning (8:00 AM)",
    daysRequired: 1,
    workerCount: 1,
    customerLocation: user?.location || "",
    message: "",
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit: 12,
        sort: sortBy,
      };

      if (selectedCategory !== "All") params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();
      if (maxWage) params.maxPrice = maxWage;
      if (minExperience) params.minExperience = minExperience;
      if (availabilityFilter !== "All") params.availability = availabilityFilter;

      const res = await axios.get("/api/labour", { params });
      if (res.data?.workers) {
        setWorkers(res.data.workers);
        setTotal(res.data.total || res.data.workers.length);
        setTotalPages(res.data.totalPages || 1);
      } else if (Array.isArray(res.data)) {
        setWorkers(res.data);
        setTotal(res.data.length);
      } else {
        setWorkers([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Labour Services Fetch Error:", err);
      setError(
        err.response?.data?.message ||
          "Could not load labour services. Please verify backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [selectedCategory, availabilityFilter, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchWorkers();
  };

  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSearch("");
    setMaxWage("");
    setMinExperience("");
    setAvailabilityFilter("All");
    setSortBy("newest");
    setPage(1);
  };

  const openBookingModal = (worker) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/Labour" } });
      return;
    }
    setSelectedWorker(worker);
    setBookingSuccess(false);
    setBookingError("");
    setBookingForm({
      taskCategory: worker.labourType || "General Farm Work",
      taskDescription: "",
      bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      preferredTime: "Morning (8:00 AM)",
      daysRequired: 1,
      workerCount: 1,
      customerLocation: user?.location || worker.location || "",
      message: "",
    });
  };

  const estimatedPrice = useMemo(() => {
    if (!selectedWorker) return 0;
    const rate = Number(selectedWorker.price) || 0;
    const days = Math.max(1, Number(bookingForm.daysRequired) || 1);
    const count = Math.max(1, Number(bookingForm.workerCount) || 1);
    return rate * days * count;
  }, [selectedWorker, bookingForm.daysRequired, bookingForm.workerCount]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker) return;

    try {
      setBookingLoading(true);
      setBookingError("");

      const res = await axios.post(
        "/api/labour/book",
        {
          itemId: selectedWorker._id,
          taskCategory: bookingForm.taskCategory,
          taskDescription: bookingForm.taskDescription,
          daysRequired: Number(bookingForm.daysRequired) || 1,
          workerCount: Number(bookingForm.workerCount) || 1,
          bookingDate: bookingForm.bookingDate,
          preferredTime: bookingForm.preferredTime,
          customerLocation: bookingForm.customerLocation,
          message: bookingForm.message,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setBookingSuccess(true);
        setTimeout(() => {
          setSelectedWorker(null);
          navigate("/bookings");
        }, 1800);
      } else {
        setBookingError(res.data?.message || "Failed to submit booking.");
      }
    } catch (err) {
      console.error("Labour booking error:", err);
      setBookingError(
        err.response?.data?.message ||
          "Could not submit booking request. Please check input details."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f8fafc] pb-24 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        {/* ── Premium Hero Section ── */}
        <div className="relative overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-900 px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />

          <div className="relative mx-auto max-w-7xl">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3.5 py-1 text-xs font-bold text-emerald-200 backdrop-blur-md border border-emerald-700/50">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>WorkShetu Verified Agricultural Workforce</span>
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Find Skilled Labour for Every Farm Task
                </h1>
                <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-100/90 sm:text-base">
                  Connect directly with verified agricultural workers, machine operators, harvesters, and crop specialists. Transparent wage rates, genuine experience, and reliable service for your fields.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/labour/apply"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-emerald-950 shadow-lg shadow-black/15 transition hover:bg-emerald-50 hover:shadow-xl active:scale-95"
                >
                  <Plus size={17} />
                  <span>Become a Labour Provider</span>
                </Link>
                {user?.role === "Labour" && (
                  <Link
                    to="/labour/dashboard"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-800/90 px-5 py-3.5 text-sm font-black text-white backdrop-blur-md transition hover:bg-emerald-700 border border-emerald-700/60"
                  >
                    <HardHat size={17} />
                    <span>My Labour Dashboard</span>
                  </Link>
                )}
              </div>
            </div>

            {/* ── Search Bar & Filter Toggle ── */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-3xl">
                <div className="flex items-center rounded-2xl bg-white p-2 shadow-xl dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                  <Search size={20} className="ml-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by worker name, skill, village, city or task..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-green-700 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-green-800 shrink-0"
                  >
                    Search
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-bold transition shadow-md ${
                  showFilters
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-950/70 text-emerald-200 border border-emerald-800/60 hover:bg-emerald-900"
                }`}
              >
                <Filter size={15} />
                <span>Filters {maxWage || minExperience || availabilityFilter !== "All" ? "•" : ""}</span>
              </button>
            </div>

            {/* ── Expanded Filters Bar ── */}
            {showFilters && (
              <div className="mt-4 rounded-2xl bg-emerald-950/90 p-4 backdrop-blur-md border border-emerald-800/60 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-emerald-200 mb-1">Max Wage Rate (₹ / Day)</label>
                  <input
                    type="number"
                    placeholder="e.g. 800"
                    value={maxWage}
                    onChange={(e) => setMaxWage(e.target.value)}
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-white placeholder:text-emerald-400 outline-none border border-emerald-800 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-200 mb-1">Min Experience (Years)</label>
                  <select
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    className="w-full rounded-xl bg-emerald-900 px-3 py-2 text-white outline-none border border-emerald-800"
                  >
                    <option value="">Any Experience</option>
                    <option value="1">1+ Years</option>
                    <option value="3">3+ Years</option>
                    <option value="5">5+ Years</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-emerald-200 mb-1">Availability</label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="w-full rounded-xl bg-emerald-900 px-3 py-2 text-white outline-none border border-emerald-800"
                  >
                    <option value="All">All Workers</option>
                    <option value="Available">Available Now</option>
                    <option value="Booked">Currently Booked</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setPage(1); fetchWorkers(); }}
                    className="flex-1 rounded-xl bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-500"
                  >
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-xl border border-emerald-700/60 px-3 py-2 font-bold text-emerald-300 hover:bg-white/10"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Category Pill Bar ── */}
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 shadow-2xs">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-green-700 text-white shadow-md shadow-green-700/25 scale-[1.02]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Marketplace Content ── */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Active summary & sorting */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-semibold text-slate-500">
            <p>
              Showing <span className="font-extrabold text-slate-900 dark:text-white">{workers.length}</span> of{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{total}</span> verified labour listings
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
            </p>

            <div className="flex items-center gap-2">
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="experience_desc">Experience: High to Low</option>
                <option value="rating_desc">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchWorkers}
                className="rounded-lg bg-rose-200 px-3 py-1 text-xs font-black text-rose-900 hover:bg-rose-300 dark:bg-rose-900 dark:text-rose-100"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-4 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-4 flex justify-between">
                    <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : workers.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <HardHat size={32} />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                No workers match your current filters
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Try widening your budget, resetting category filters, or register as the first agricultural service provider in this area!
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Reset All Filters
                </button>
                <Link
                  to="/labour/apply"
                  className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-xs font-black text-white hover:bg-green-800 shadow-md shadow-green-700/20"
                >
                  <Plus size={14} />
                  <span>Register as Labour Provider</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Workers Grid */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workers.map((worker) => {
                const imageUrl = worker.image?.url || DEFAULT_AVATAR;
                const isAvailable = worker.availability === "Available";

                return (
                  <div
                    key={worker._id}
                    className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      {/* Image + Top Badges */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imageUrl}
                          alt={worker.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.src = DEFAULT_AVATAR;
                          }}
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow-md backdrop-blur-md ${
                            isAvailable
                              ? "bg-white/95 text-emerald-800 dark:bg-slate-900/95 dark:text-emerald-300"
                              : "bg-amber-100/90 text-amber-800"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {isAvailable ? "Available" : "Booked"}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                            {worker.experience || 0}+ Yrs Exp
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                              {worker.name}
                            </h3>
                            <span className="inline-block mt-0.5 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {worker.labourType}
                            </span>
                          </div>
                          {worker.rating > 0 && worker.reviewCount > 0 && (
                            <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              {worker.rating.toFixed(1)}
                            </span>
                          )}
                        </div>

                        {/* Location & Coverage */}
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <MapPin size={14} className="shrink-0 text-slate-400" />
                          <span className="truncate">{worker.location}</span>
                          {worker.serviceArea && (
                            <span className="text-[10px] text-slate-400">({worker.serviceArea})</span>
                          )}
                        </div>

                        {/* Skills Chips */}
                        {worker.skills && worker.skills.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {worker.skills.slice(0, 3).map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Description */}
                        {worker.description && (
                          <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {worker.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer / Price & Actions */}
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Wage Rate
                          </span>
                          <p className="text-base font-black text-green-700 dark:text-lime-300">
                            ₹{worker.price}{" "}
                            <span className="text-xs font-bold text-slate-500">
                              / {worker.pricingUnit || "day"}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/labour/${worker._id}`}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => openBookingModal(worker)}
                            disabled={!isAvailable}
                            className={`rounded-xl px-3.5 py-2 text-xs font-black text-white shadow-xs transition active:scale-95 ${
                              isAvailable
                                ? "bg-green-700 hover:bg-green-800"
                                : "bg-slate-400 cursor-not-allowed opacity-60"
                            }`}
                          >
                            Book Labour
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Previous
              </button>
              <span className="px-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* ── Book Labour Modal ── */}
        {selectedWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <HardHat size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Book {selectedWorker.name}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {selectedWorker.labourType} · ₹{selectedWorker.price} / {selectedWorker.pricingUnit || "day"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              {bookingSuccess ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                    Booking Request Sent!
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The labour provider has received your request. Redirecting to My Bookings...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4 text-xs">
                  {bookingError && (
                    <div className="rounded-xl bg-rose-50 p-3 font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {bookingError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Work Category
                      </label>
                      <input
                        type="text"
                        value={bookingForm.taskCategory}
                        onChange={(e) => setBookingForm({ ...bookingForm, taskCategory: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="e.g. Wheat Harvesting"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Booking Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={bookingForm.bookingDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Start Time
                      </label>
                      <select
                        value={bookingForm.preferredTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, preferredTime: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="Morning (8:00 AM)">Morning (8:00 AM)</option>
                        <option value="Afternoon (1:00 PM)">Afternoon (1:00 PM)</option>
                        <option value="Full Day (8:00 AM - 5:00 PM)">Full Day (8 AM - 5 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Days Required
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={bookingForm.daysRequired}
                        onChange={(e) => setBookingForm({ ...bookingForm, daysRequired: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Workers Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={bookingForm.workerCount}
                        onChange={(e) => setBookingForm({ ...bookingForm, workerCount: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Farm / Work Location
                    </label>
                    <input
                      type="text"
                      value={bookingForm.customerLocation}
                      onChange={(e) => setBookingForm({ ...bookingForm, customerLocation: e.target.value })}
                      placeholder="e.g. Village Sonipat, Farm Plot 4"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Task Description / Specific Instructions
                    </label>
                    <textarea
                      rows="2"
                      value={bookingForm.taskDescription}
                      onChange={(e) => setBookingForm({ ...bookingForm, taskDescription: e.target.value })}
                      placeholder="Specify task requirements, crop type, equipment details..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Estimated Price Card */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          Estimated Total Price
                        </span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          ₹{selectedWorker.price} × {bookingForm.daysRequired} day(s) × {bookingForm.workerCount} worker(s)
                        </p>
                      </div>
                      <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                        ₹{estimatedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedWorker(null)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="flex-1 rounded-xl bg-green-700 py-3 font-black text-white hover:bg-green-800 shadow-md shadow-green-700/20 disabled:opacity-50"
                    >
                      {bookingLoading ? "Submitting..." : "Confirm & Send Request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
