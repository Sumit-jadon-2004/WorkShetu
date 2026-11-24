import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  HardHat,
  MapPin,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Star,
  RefreshCw,
  LocateFixed,
  Radio
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useUserLocation } from "../../context/LocationContext.jsx";
import LabourBookingModal from "./LabourBookingModal.jsx";
import { formatDistance } from "../../utils/locationHelper.js";

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
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Consume shared singleton LocationContext (zero duplicate GPS requests)
  const {
    coordinates,
    displayName,
    locality,
    city,
    locationStatus,
    locationError,
    refreshLocation,
    requestLocation
  } = useUserLocation();

  // Worker listings state machine: 'idle' | 'loading_listings' | 'success' | 'empty' | 'error'
  const [listingsStatus, setListingsStatus] = useState("idle");
  const [listingsError, setListingsError] = useState("");
  const [workers, setWorkers] = useState([]);
  const [nearbyWorkers, setNearbyWorkers] = useState([]);
  const [sameCityWorkers, setSameCityWorkers] = useState([]);
  const [featuredWorkers, setFeaturedWorkers] = useState([]);
  const [total, setTotal] = useState(0);

  const [appliedRadiusKm, setAppliedRadiusKm] = useState(5);
  const [initialRadiusKm, setInitialRadiusKm] = useState(5);
  const [isExpandedRadius, setIsExpandedRadius] = useState(false);

  // Filters & Search
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");
  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";
  const [search, setSearch] = useState(urlSearch);
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [nearby, setNearby] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory || "All");

  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

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

  // Request deduplication refs
  const lastRequestKeyRef = useRef("");
  const abortControllerRef = useRef(null);

  // Dedicated Labour Listing Fetcher (Completely decoupled from GPS detection)
  useEffect(() => {
    // Only fetch when coordinates are available
    if (coordinates?.latitude == null || coordinates?.longitude == null) {
      return;
    }

    const lat = Number(coordinates.latitude).toFixed(4);
    const lon = Number(coordinates.longitude).toFixed(4);
    const requestKey = `${lat}_${lon}_p${page}_c${selectedCategory}_q${search.trim()}_l${location.trim()}_s${skills.trim()}_w${maxWage}_e${minExperience}_a${availabilityFilter}_sb${sortBy}_nb${nearby}`;

    // Deduplicate if identical request is already processed or in flight
    if (lastRequestKeyRef.current === requestKey) {
      console.log(`[REQUEST_DEDUPLICATED] Labour fetch skipped, duplicate key: ${requestKey}`);
      return;
    }

    // Cancel existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    lastRequestKeyRef.current = requestKey;
    setListingsStatus("loading_listings");
    setListingsError("");
    console.log(`[LABOUR_FETCH_START] key=${requestKey}`);

    const params = {
      page,
      limit: 12,
      sort: sortBy,
      radiusKm: 5,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };

    if (selectedCategory !== "All") params.category = selectedCategory;
    if (search.trim()) params.search = search.trim();
    if (location.trim()) params.location = location.trim();
    if (skills.trim()) params.skills = skills.trim();
    if (maxWage) params.maxPrice = maxWage;
    if (minExperience) params.minExperience = minExperience;
    if (availabilityFilter !== "All") params.availability = availabilityFilter;
    if (nearby) params.nearby = true;

    axios
      .get("/api/labour", {
        params,
        signal: abortControllerRef.current.signal
      })
      .then((res) => {
        const data = res.data;
        if (data?.locationRequired) {
          setWorkers([]);
          setNearbyWorkers([]);
          setSameCityWorkers([]);
          setFeaturedWorkers([]);
          setTotal(0);
          setTotalPages(1);
          setListingsStatus("empty");
          return;
        }

        const wList = data?.workers || (Array.isArray(data) ? data : []);
        setWorkers(wList);
        setNearbyWorkers(data?.nearbyWorkers || []);
        setSameCityWorkers(data?.sameCityWorkers || []);
        setFeaturedWorkers(data?.featuredWorkers || []);
        setTotal(data?.total ?? wList.length);
        setTotalPages(data?.totalPages || 1);
        setAppliedRadiusKm(data?.appliedRadiusKm || data?.radiusKm || 5);
        setInitialRadiusKm(data?.initialRadiusKm || 5);
        setIsExpandedRadius(Boolean(data?.isExpandedRadius));
        setListingsStatus(wList.length > 0 ? "success" : "empty");
        console.log(`[LABOUR_FETCH_SUCCESS] Found ${wList.length} workers (${(data?.nearbyWorkers || []).length} nearby)`);
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          console.log("[LABOUR_FETCH_ABORTED] Request cancelled for newer parameters");
          return;
        }
        console.error("Labour Services Fetch Error:", err);
        setListingsError(
          err.response?.data?.message ||
            "Could not load labour services. Please verify backend connection."
        );
        setListingsStatus("error");
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [coordinates?.latitude, coordinates?.longitude, page, selectedCategory, search, location, skills, maxWage, minExperience, availabilityFilter, sortBy, nearby]);

  const handleManualRefresh = () => {
    lastRequestKeyRef.current = "";
    refreshLocation();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSearch("");
    setLocation("");
    setSkills("");
    setNearby(false);
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
    const isOwner = Boolean(user?._id && worker?.owner && String(user._id) === String(worker.owner?._id || worker.owner));
    if (isOwner) {
      alert("You cannot book your own listing.");
      return;
    }
    setSelectedWorker(worker);
  };

  const renderWorkerCard = (worker) => {
    const imageUrl = worker.image?.url || DEFAULT_AVATAR;
    const isAvailable = worker.availability === "Available";
    const isOwner = Boolean(user?._id && worker?.owner && String(user._id) === String(worker.owner?._id || worker.owner));
    const proximityBadge = worker.proximityLabel || formatDistance(worker.distanceKm) || (worker.distanceKm != null ? `${worker.distanceKm} km away` : "Nearby");

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
            {/* Proximity badge chip */}
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-md shadow-md">
                <Navigation size={11} />
                <span>{proximityBadge}</span>
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
              {isOwner ? (
                <span className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  Your Listing
                </span>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isLocating = locationStatus === "requesting_location";
  const isPermissionDenied = locationStatus === "permission_denied";
  const isLocationError = locationStatus === "error";
  const isLoadingListings = listingsStatus === "loading_listings";

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
                  Connect directly with verified agricultural workers, machine operators, harvesters, and crop specialists in your immediate locality.
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

            {/* Blinkit-Style Automatic Location Header */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-green-950 shadow-md">
                  <MapPin size={18} />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-lime-300 flex items-center gap-1">
                      <Radio size={11} className="text-lime-300 animate-pulse" />
                      Workers Near You
                    </p>
                    {isExpandedRadius && (
                      <span className="rounded-full bg-lime-400/20 border border-lime-400/40 px-2 py-0.2 text-[10px] font-bold text-lime-200">
                        Expanded to {appliedRadiusKm} km
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs sm:text-sm font-black text-white">
                    {isLocating
                      ? "Detecting live GPS coordinates..."
                      : displayName || "GPS Location Not Set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isLocating}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-3.5 text-xs font-bold text-white hover:bg-white/25 transition disabled:opacity-50"
                  title="Refresh current location"
                >
                  <RefreshCw size={13} className={isLocating ? "animate-spin text-lime-300" : ""} />
                  <span>{isLocating ? "Refreshing..." : "Refresh Location"}</span>
                </button>
              </div>
            </div>

            {/* ── Search Bar & Filter Toggle ── */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-3xl">
                <div className="flex items-center rounded-2xl bg-white p-2 shadow-xl dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                  <Search size={20} className="ml-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search workers by name, skill, village or task near you..."
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
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition shadow-lg backdrop-blur-md ${
                  showFilters
                    ? "bg-white text-emerald-950 shadow-white/10"
                    : "bg-emerald-800/80 text-white hover:bg-emerald-700/80 border border-emerald-700/50"
                }`}
              >
                <Filter size={15} />
                <span>Filters</span>
                {(maxWage || minExperience || availabilityFilter !== "All" || sortBy !== "newest") && (
                  <span className="h-2 w-2 rounded-full bg-lime-400" />
                )}
              </button>
            </div>

            {/* ── Filter Tray ── */}
            {showFilters && (
              <div className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                      Max Daily Wage (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 800"
                      value={maxWage}
                      onChange={(e) => setMaxWage(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white placeholder:text-emerald-200/50 outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                      Min Experience (Yrs)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      value={minExperience}
                      onChange={(e) => setMinExperience(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white placeholder:text-emerald-200/50 outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                      Availability
                    </label>
                    <select
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-emerald-950/80 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-white"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Available">Available Now</option>
                      <option value="Booked">Currently Booked</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-emerald-950/80 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-white"
                    >
                      <option value="newest">Newest Profiles</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                      <option value="experience">Most Experienced</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-emerald-200 hover:text-white"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPage(1);
                    }}
                    className="rounded-xl bg-lime-400 px-4 py-2 text-xs font-black text-emerald-950 hover:bg-lime-300 transition"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Category Chips Slider ── */}
        <div className="border-b border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition ${
                    selectedCategory === cat
                      ? "bg-green-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          {/* LOCATION PERMISSION PROMPT CARD (NON-BLOCKING) */}
          {(isPermissionDenied || isLocationError) && (
            <div className="mb-10 overflow-hidden rounded-3xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-6 sm:p-8 shadow-xl dark:border-emerald-800/80 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                  <LocateFixed size={28} />
                </div>

                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-2">
                    <Radio size={12} className="animate-pulse text-emerald-600" />
                    <span>GPS Location Required</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Enable Location to See Farm Labour and Operators Near You
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                    WorkShetu connects you with agricultural labourers, tractor drivers, and machine operators in your immediate farm locality. Browser location access is required to display workers operating within your radius.
                  </p>

                  {locationError && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{locationError}</span>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => requestLocation(true)}
                      disabled={isLocating}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-xs font-black text-white shadow-md hover:bg-green-800 transition active:scale-95 disabled:opacity-50"
                    >
                      <Navigation size={14} className={isLocating ? "animate-spin" : ""} />
                      <span>{isLocating ? "Detecting GPS..." : "Enable Location / Retry"}</span>
                    </button>

                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tip: Click the lock icon 🔒 next to the browser URL bar & allow Location access.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingListings && (
            <div className="py-20 text-center">
              <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                Finding verified farm workers near you...
              </p>
            </div>
          )}

          {/* Error Message */}
          {listingsStatus === "error" && !isLoadingListings && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-bold">{listingsError || "Failed to load labour listings."}</p>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Radius expansion alert */}
          {listingsStatus === "success" && !isLoadingListings && isExpandedRadius && (
            <div className="mb-6 rounded-2xl border border-lime-300 bg-lime-50/70 p-3.5 text-xs font-bold text-green-950 dark:border-lime-900 dark:bg-lime-950/30 dark:text-lime-200 flex items-center justify-between">
              <span>
                🌾 Search expanded to {appliedRadiusKm} km from {initialRadiusKm} km to ensure verified workers are available in your area.
              </span>
              <span className="text-[11px] font-black uppercase text-green-800 dark:text-lime-300">
                {workers.length} Available
              </span>
            </div>
          )}

          {/* ── Featured Workers Carousel / Top Picks (Strictly within Location) ── */}
          {listingsStatus === "success" && !isLoadingListings && featuredWorkers.length > 0 && (
            <div className="mb-12">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    <span>Top-Rated Workers Near You</span>
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Highest customer ratings in your operating radius
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {featuredWorkers.map(renderWorkerCard)}
              </div>
            </div>
          )}

          {/* ── Empty State ── */}
          {listingsStatus === "empty" && !isLoadingListings && (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
                🌾
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                No Workers Found Near Your Location
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                We searched within {appliedRadiusKm} km of {displayName || "your location"}. Try adjusting your search query or refreshing your GPS coordinates.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="rounded-xl bg-green-700 px-5 py-2.5 text-xs font-black text-white hover:bg-green-800 shadow-md shadow-green-700/20"
                >
                  Refresh Location
                </button>
              </div>
            </div>
          )}

          {/* ── Workers Grid (Strictly Nearby & Region) ── */}
          {listingsStatus === "success" && !isLoadingListings && workers.length > 0 && (
            <div className="space-y-10">
              {/* PRIORITY 1: LABOUR NEAR YOU */}
              {nearbyWorkers.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-800 font-black text-xs">
                        {appliedRadiusKm}km
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        Labour Near You
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-green-700 dark:text-lime-300">
                      {nearbyWorkers.length} workers nearby
                    </span>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {nearbyWorkers.map(renderWorkerCard)}
                  </div>
                </section>
              )}

              {/* PRIORITY 2: SAME REGION / AREA LISTINGS */}
              {sameCityWorkers.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-black text-xs">
                        <MapPin size={14} />
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        More Labour in {city || locality || "Your Area"}
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {sameCityWorkers.length} in area
                    </span>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sameCityWorkers.map(renderWorkerCard)}
                  </div>
                </section>
              )}

              {/* Flat list if neither sub-list was segregated */}
              {nearbyWorkers.length === 0 && sameCityWorkers.length === 0 && (
                <section>
                  <h2 className="mb-4 text-2xl font-black text-slate-900 dark:text-white">
                    Verified Workers Near {displayName || "You"}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {workers.map(renderWorkerCard)}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Pagination */}
          {listingsStatus === "success" && totalPages > 1 && (
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
        <LabourBookingModal
          isOpen={Boolean(selectedWorker)}
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          initialLocation={displayName || user?.location || ""}
        />
      </main>
    </>
  );
}
