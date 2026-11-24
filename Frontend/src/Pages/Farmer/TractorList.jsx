import axios from "axios";
import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Sun,
  Globe2,
  MapPin,
  Navigation,
  SlidersHorizontal,
  Search,
  Zap,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  LocateFixed,
  Radio
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useUserLocation } from "../../context/LocationContext.jsx";
import PromotionsBanner from "../Common/PromotionsBanner.jsx";
import { formatDistance } from "../../utils/locationHelper.js";

const distanceInKilometers = (firstPoint, secondPoint) => {
  if (!firstPoint?.latitude || !firstPoint?.longitude || !secondPoint?.latitude || !secondPoint?.longitude) {
    return null;
  }
  const earthRadiusKm = 6371;
  const latitudeDelta = ((secondPoint.latitude - firstPoint.latitude) * Math.PI) / 180;
  const longitudeDelta = ((secondPoint.longitude - firstPoint.longitude) * Math.PI) / 180;
  const firstLatitude = (firstPoint.latitude * Math.PI) / 180;
  const secondLatitude = (secondPoint.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(firstLatitude) * Math.cos(secondLatitude);

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 10) / 10;
};

function Machines() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = user?.isAdmin === true || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";
  const isEligibleDriver = isDriver && user?.driverApplicationStatus === "Approved" && user?.isActive !== false;

  // Consume shared singleton LocationContext (zero repeated GPS requests)
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

  // Machine listings state machine: 'idle' | 'loading_listings' | 'success' | 'empty' | 'error'
  const [listingsStatus, setListingsStatus] = useState("idle");
  const [listingsError, setListingsError] = useState("");
  const [machines, setMachines] = useState([]);
  const [nearbyMachines, setNearbyMachines] = useState([]);
  const [sameCityMachines, setSameCityMachines] = useState([]);
  const [appliedRadiusKm, setAppliedRadiusKm] = useState(5);
  const [initialRadiusKm, setInitialRadiusKm] = useState(5);
  const [isExpandedRadius, setIsExpandedRadius] = useState(false);

  // Filters & Search
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");
  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";
  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState(urlCategory || "All");
  const [selectedDistance, setSelectedDistance] = useState("All");
  const [priceSort, setPriceSort] = useState("none");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  // Deduplication & In-Flight Request Refs
  const lastRequestKeyRef = useRef("");
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (urlCategory) {
      setCategory(urlCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Language setup
  const currentLanguage = i18n.language?.split("-")[0] || "en";
  const languageNames = {
    en: "English",
    hi: "हिन्दी",
    hinglish: "Hinglish",
  };
  const selectedLanguage = languageNames[currentLanguage] || currentLanguage.toUpperCase();

  const changeLanguage = (language) => {
    localStorage.setItem("workshetu-language", language);
    i18n.changeLanguage(language);
    setLanguageMenuOpen(false);
  };

  // Dedicated Machine Listing Fetcher (Completely decoupled from GPS detection)
  useEffect(() => {
    // Only fetch when coordinates are available
    if (coordinates?.latitude == null || coordinates?.longitude == null) {
      return;
    }

    const lat = Number(coordinates.latitude).toFixed(4);
    const lon = Number(coordinates.longitude).toFixed(4);
    const requestKey = `${lat}_${lon}_${category}_${search.trim()}_${onlyAvailable}_${selectedDistance}_${priceSort}`;

    // Prevent duplicate request if parameters haven't changed
    if (lastRequestKeyRef.current === requestKey) {
      console.log(`[REQUEST_DEDUPLICATED] Machine fetch skipped, duplicate key: ${requestKey}`);
      return;
    }

    // Abort any existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    lastRequestKeyRef.current = requestKey;
    setListingsStatus("loading_listings");
    setListingsError("");
    console.log(`[MACHINE_FETCH_START] key=${requestKey}`);

    const params = {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm: 5
    };
    if (category !== "All") params.category = category;
    if (search.trim()) params.search = search.trim();

    axios
      .get("/api/machine", {
        params,
        signal: abortControllerRef.current.signal
      })
      .then((response) => {
        const payload = response.data;
        if (payload?.locationRequired) {
          setMachines([]);
          setNearbyMachines([]);
          setSameCityMachines([]);
          setListingsStatus("empty");
          return;
        }

        const allList = Array.isArray(payload) ? payload : (payload.machines || []);
        const nearbyList = payload.nearbyMachines || [];
        const sameCityList = payload.sameCityMachines || [];

        setMachines(allList);
        setNearbyMachines(nearbyList);
        setSameCityMachines(sameCityList);
        setAppliedRadiusKm(payload.appliedRadiusKm || payload.radiusKm || 5);
        setInitialRadiusKm(payload.initialRadiusKm || 5);
        setIsExpandedRadius(Boolean(payload.isExpandedRadius));
        setListingsStatus(allList.length > 0 ? "success" : "empty");
        console.log(`[MACHINE_FETCH_SUCCESS] Found ${allList.length} machines (${nearbyList.length} nearby)`);
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          console.log("[MACHINE_FETCH_ABORTED] Request cancelled for newer parameters");
          return;
        }
        console.error("Machine load error:", err);
        setListingsError(t("machines.loadError", "Unable to load machines. Please try again."));
        setListingsStatus("error");
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [coordinates?.latitude, coordinates?.longitude, category, search, onlyAvailable, selectedDistance, priceSort, t]);

  const handleManualRefresh = () => {
    lastRequestKeyRef.current = "";
    refreshLocation();
  };

  // Categories
  const categories = [
    { value: "All", label: t("machines.all", "All Machines"), icon: "🚜" },
    { value: "Tractor", label: t("machines.categories.tractor", "Tractor"), icon: "🚜" },
    { value: "Cultivator", label: t("machines.categories.cultivator", "Cultivator"), icon: "🌱" },
    { value: "Rotavator", label: t("machines.categories.rotavator", "Rotavator"), icon: "⚙️" },
    { value: "Harrow", label: t("machines.categories.harrow", "Harrow"), icon: "🌾" },
    { value: "Harvester", label: t("machines.categories.harvester", "Harvester"), icon: "🌾" },
    { value: "Loader", label: "Loader", icon: "🚜" },
  ];

  const getCategoryLabel = (value) => {
    if (!value) return "";
    const key = String(value).toLowerCase();
    return t(`machines.categories.${key}`, value);
  };

  const getUnitLabel = (unit) => {
    if (!unit) return t("machines.unit", "Unit");
    return t(`machines.units.${String(unit).toLowerCase()}`, unit);
  };

  // Filter & Sort Logic across retrieved location-restricted machines
  const filterAndSortList = (list) => {
    const query = search.trim().toLowerCase();

    let res = list.filter((machine) => {
      const matchesCategory = category === "All" || machine.category === category;
      const matchesAvailability = !onlyAvailable || machine.availability === "Available";

      let matchesDistance = true;
      if (selectedDistance !== "All" && coordinates?.latitude && coordinates?.longitude) {
        const dist = machine.distanceKm ?? distanceInKilometers(coordinates, machine);
        matchesDistance = dist !== null && dist <= Number(selectedDistance);
      }

      if (!query) return matchesCategory && matchesAvailability && matchesDistance;

      const searchableText = [
        machine.title,
        machine.category,
        machine.location,
        machine.description,
        machine.fuelType,
        machine.vehicleNumber,
        machine.year,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesCategory && matchesAvailability && matchesDistance && searchableText.includes(query);
    });

    if (priceSort === "low") {
      res.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (priceSort === "high") {
      res.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (coordinates?.latitude && coordinates?.longitude) {
      res.sort((a, b) => {
        const distA = a.distanceKm ?? (distanceInKilometers(coordinates, a) ?? 99999);
        const distB = b.distanceKm ?? (distanceInKilometers(coordinates, b) ?? 99999);
        return distA - distB;
      });
    }

    return res;
  };

  const filteredMachines = useMemo(() => filterAndSortList(machines), [
    machines,
    search,
    category,
    onlyAvailable,
    selectedDistance,
    priceSort,
    coordinates
  ]);

  const filteredNearbyMachines = useMemo(() => filterAndSortList(nearbyMachines), [
    nearbyMachines,
    search,
    category,
    onlyAvailable,
    selectedDistance,
    priceSort,
    coordinates
  ]);

  const filteredSameCityMachines = useMemo(() => filterAndSortList(sameCityMachines), [
    sameCityMachines,
    search,
    category,
    onlyAvailable,
    selectedDistance,
    priceSort,
    coordinates
  ]);

  const formatPrice = (price) => {
    if (!price && price !== 0) return "₹0";
    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  const handleBookNow = (machine) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/bookings/${machine._id}` } });
      return;
    }
    navigate(`/bookings/${machine._id}`);
  };

  const handleViewDetails = (machine) => {
    navigate(`/machine/${machine._id}`);
  };

  const openWhatsApp = (phone, machine) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(
      `Hello, I saw your ${machine.title || machine.category} on WorkShetu and would like to rent it.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
  };

  const renderMachineCard = (machine) => {
    const isAvailable = machine.availability === "Available";
    const proximityBadge = machine.proximityLabel || formatDistance(machine.distanceKm) || (machine.distanceKm != null ? `${machine.distanceKm} km away` : "Nearby");

    return (
      <article
        key={machine._id}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-lime-500/50 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          {/* Machine Image */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={machine.image?.url || "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80"}
              alt={machine.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            {/* Availability Dot */}
            <div className="absolute right-3 top-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black shadow-md backdrop-blur-md ${
                  isAvailable
                    ? "bg-green-600 text-white"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-white" : "bg-slate-400"}`} />
                {isAvailable ? "Available" : "Booked"}
              </span>
            </div>

            {/* Distance or Location Chip */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/70 px-2.5 py-1 backdrop-blur-md truncate max-w-[65%]">
                <MapPin size={12} className="shrink-0 text-lime-400" />
                <span className="truncate">{machine.location}</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 backdrop-blur-md text-[11px] font-black shadow-md">
                <Navigation size={11} />
                <span>{proximityBadge}</span>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 sm:p-5">
            {/* Verified Owner & Year */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" /> Verified Owner
              </span>
              {machine.year && (
                <span className="font-semibold text-slate-400">{machine.year} Model</span>
              )}
            </div>

            {/* Title */}
            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900 line-clamp-1 dark:text-white">
              {machine.title || getCategoryLabel(machine.category)}
            </h3>

            {/* Key Specs */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {machine.power && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  {machine.power} HP
                </span>
              )}
              {machine.fuelType && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  {machine.fuelType}
                </span>
              )}
              {machine.vehicleNumber && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] uppercase dark:bg-slate-800">
                  {machine.vehicleNumber}
                </span>
              )}
            </div>

            {/* Transparent Price Card */}
            <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-green-50/80 p-3.5 border border-green-200/80 dark:border-green-900 dark:bg-green-950/20">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-green-800 dark:text-green-300">
                  Rental Price
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-green-950 dark:text-lime-300">
                    {formatPrice(machine.price)}
                  </span>
                  <span className="text-xs font-bold text-green-700 dark:text-lime-400">
                    / {getUnitLabel(machine.unit)}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg shadow-sm">
                Direct Booking
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleViewDetails(machine)}
              className="flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 text-xs font-black text-slate-700 hover:bg-slate-50 transition active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("machines.viewDetails", "View Details")}
            </button>

            <button
              type="button"
              onClick={() => handleBookNow(machine)}
              disabled={!isAvailable}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-green-700 px-3 text-xs font-black text-white shadow-md shadow-green-900/15 hover:bg-green-800 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={13} />
              <span>Book Machine</span>
            </button>
          </div>

          {machine.phone && (
            <button
              type="button"
              onClick={() => openWhatsApp(machine.phone, machine)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              <MessageCircle size={13} />
              <span>Chat on WhatsApp</span>
            </button>
          )}
        </div>
      </article>
    );
  };

  const isLocating = locationStatus === "requesting_location";
  const isPermissionDenied = locationStatus === "permission_denied";
  const isLocationError = locationStatus === "error";
  const isLoadingListings = listingsStatus === "loading_listings";

  return (
    <main className="min-h-screen bg-[#f8faf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* ============================================
          TOP HERO & BLINKIT-STYLE AUTO LOCATION BAR
      ============================================ */}
      <section className="relative overflow-hidden bg-[#123524] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,0.18),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          {/* Top Bar Navigation */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                🚜
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-lime-300">WorkShetu</p>
                <h1 className="text-lg font-black text-white">{t("machines.title", "Farm Machinery")}</h1>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur transition hover:bg-white/20"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLanguageMenuOpen((open) => !open)}
                  aria-expanded={languageMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-white/20"
                >
                  <Globe2 size={15} />
                  <span>{selectedLanguage}</span>
                  <ChevronDown size={14} className={`transition-transform ${languageMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {languageMenuOpen && (
                  <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    {[
                      ["en", "English"],
                      ["hi", "हिन्दी"],
                      ["hinglish", "Hinglish"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => changeLanguage(value)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-semibold text-slate-700 transition hover:bg-green-50 hover:text-green-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-lime-300"
                      >
                        {label}
                        {currentLanguage === value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate("/admin/dashboard")}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-green-950 shadow-lg transition hover:bg-lime-50"
                    >
                      <ShieldCheck size={15} />
                      <span>Admin</span>
                    </button>
                  )}
                  {isEligibleDriver && (
                    <button
                      type="button"
                      onClick={() => navigate("/Drivers")}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-green-950 shadow-lg transition hover:bg-lime-50"
                    >
                      <LayoutDashboard size={15} />
                      <span>{t("driver.dashboard", "Driver Dashboard")}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/bookings")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-green-950 shadow-lg transition hover:bg-lime-50"
                  >
                    <ClipboardList size={15} />
                    <span>{t("navbar.myBookings", "My Bookings")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Blinkit-Style Automatic Location Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
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
                    Delivering Near You
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

          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tractors, rotavators, harvesters near you..."
              className="w-full rounded-2xl border border-white/20 bg-white/15 py-3.5 pl-12 pr-4 text-sm font-semibold text-white placeholder-white/60 outline-none backdrop-blur transition focus:border-lime-400 focus:bg-white/20"
            />
          </div>
        </div>
      </section>

      {/* ============================================
          MAIN CONTENT AREA
      ============================================ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PromotionsBanner />

        {/* Category Pills */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition ${
                category === c.value
                  ? "bg-green-700 text-white shadow-md shadow-green-900/20"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Filters & Proximity Filter Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1 text-slate-500">
              <SlidersHorizontal size={14} /> Filter Radius:
            </span>
            {["All", "5", "10", "15", "25"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDistance(d)}
                className={`rounded-xl px-3 py-1.5 transition ${
                  selectedDistance === d
                    ? "bg-green-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {d === "All" ? "All Nearby" : `Within ${d} km`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                onlyAvailable
                  ? "bg-green-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {onlyAvailable ? "Showing Available Only" : "All Availability"}
            </button>

            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="none">Sort: Nearest First</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>

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
                  Enable Location to See Machines Operating Near Your Farm
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                  WorkShetu connects farmers directly with local machinery drivers in real time. We use your live browser GPS coordinates to show tractors, harvesters, and rotavators within your immediate operating radius.
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

        {/* LOADING INDICATOR (LISTINGS SKELETON / SPINNER) */}
        {isLoadingListings && (
          <div className="py-20 text-center">
            <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-green-600 border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              Finding nearby machines for your farm...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {listingsStatus === "error" && !isLoadingListings && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-bold">{listingsError || "Unable to load machines."}</p>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {listingsStatus === "empty" && !isLoadingListings && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
              🚜
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              No Machines Found Near Your Location
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              We searched within {appliedRadiusKm} km of {displayName || "your location"}. Try resetting filters or expanding the search radius.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setSelectedDistance("All");
                  setOnlyAvailable(false);
                }}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="rounded-xl bg-green-700 px-5 py-2.5 text-xs font-black text-white hover:bg-green-800"
              >
                Refresh Location
              </button>
            </div>
          </div>
        )}

        {/* MACHINE CARDS - GROUPED BY PRIORITY (NEARBY FIRST) */}
        {listingsStatus === "success" && !isLoadingListings && filteredMachines.length > 0 && (
          <div className="space-y-10">
            {/* Radius expansion alert */}
            {isExpandedRadius && (
              <div className="rounded-2xl border border-lime-300 bg-lime-50/70 p-3.5 text-xs font-bold text-green-950 dark:border-lime-900 dark:bg-lime-950/30 dark:text-lime-200 flex items-center justify-between">
                <span>
                  🌾 Search expanded to {appliedRadiusKm} km from {initialRadiusKm} km to ensure machinery availability in your area.
                </span>
                <span className="text-[11px] font-black uppercase text-green-800 dark:text-lime-300">
                  {filteredMachines.length} Found
                </span>
              </div>
            )}

            {/* PRIORITY 1: NEARBY LISTINGS */}
            {filteredNearbyMachines.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-800 font-black text-xs">
                      {appliedRadiusKm}km
                    </span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      Machines Near You
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-green-700 dark:text-lime-300">
                    {filteredNearbyMachines.length} nearby
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredNearbyMachines.map(renderMachineCard)}
                </div>
              </section>
            )}

            {/* PRIORITY 2: SAME REGION / EXTENDED CITY LISTINGS */}
            {filteredSameCityMachines.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-black text-xs">
                      <MapPin size={14} />
                    </span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      More Machines in {city || locality || "Your Region"}
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {filteredSameCityMachines.length} in area
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSameCityMachines.map(renderMachineCard)}
                </div>
              </section>
            )}

            {/* FALLBACK FLAT GRID IF NEITHER SUB-LIST WAS EXPLICITLY SEGREGATED */}
            {filteredNearbyMachines.length === 0 && filteredSameCityMachines.length === 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Machines Near {displayName || "You"}
                  </h2>
                  <span className="text-xs font-bold text-slate-500">
                    {filteredMachines.length} available
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMachines.map(renderMachineCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default Machines;
