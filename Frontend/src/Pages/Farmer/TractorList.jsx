import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  ArrowUpDown,
  Search,
  X,
  Zap,
  Phone,
  MessageCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import PromotionsBanner from "../Common/PromotionsBanner.jsx";

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

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");
  const [category, setCategory] = useState(urlCategory || "All");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  // Location & Proximity State
  const [userLocation, setUserLocation] = useState(() => ({
    latitude: user?.latitude != null ? Number(user.latitude) : null,
    longitude: user?.longitude != null ? Number(user.longitude) : null,
    label: user?.location || ""
  }));
  const [locating, setLocating] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState("");
  const [selectedDistance, setSelectedDistance] = useState("All");
  const [priceSort, setPriceSort] = useState("none");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    if (urlCategory) {
      setCategory(urlCategory);
    }
  }, [urlCategory]);

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

  // Load Machines
  const loadMachines = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/machine");
      const data = Array.isArray(response.data) ? response.data : response.data?.machines || [];
      setMachines(data);
    } catch (err) {
      console.error(err);
      setError(t("machines.loadError", "Unable to load machines. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  // Geolocation Detection
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatusMessage("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationStatusMessage("Detecting your farm coordinates...");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        let resolvedName = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            resolvedName = addr.village || addr.town || addr.city || addr.county || "Detected Location";
          }
        } catch {
          resolvedName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
        setUserLocation({
          latitude,
          longitude,
          label: resolvedName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        });
        setLocating(false);
        setLocationStatusMessage(`Near Me active: ${resolvedName || "Coordinates detected"}`);
      },
      () => {
        setLocating(false);
        setLocationStatusMessage("Location permission denied. Enter location manually.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
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

  // Filter & Sort Logic
  const filteredMachines = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = machines.filter((machine) => {
      const matchesCategory = category === "All" || machine.category === category;
      const matchesAvailability = !onlyAvailable || machine.availability === "Available";

      let matchesDistance = true;
      if (selectedDistance !== "All" && userLocation?.latitude && userLocation?.longitude) {
        const dist = distanceInKilometers(userLocation, machine);
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
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (priceSort === "high") {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (userLocation?.latitude && userLocation?.longitude) {
      list.sort((a, b) => {
        const distA = distanceInKilometers(userLocation, a) ?? 99999;
        const distB = distanceInKilometers(userLocation, b) ?? 99999;
        return distA - distB;
      });
    }

    return list;
  }, [machines, search, category, onlyAvailable, selectedDistance, priceSort, userLocation]);

  const formatPrice = (price) => {
    if (price === undefined || price === null) return "—";
    return new Intl.NumberFormat(currentLanguage === "hi" ? "hi-IN" : "en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const openWhatsApp = (phone, machine) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, "");
    const message = encodeURIComponent(`Hello, I am interested in booking your ${machine?.title || "machine"} on WorkShetu.`);
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, "_blank");
  };

  const handleViewDetails = (machine) => {
    if (!machine?._id) return;
    navigate(`/machines/${machine._id}`);
  };

  const handleBookNow = (machine) => {
    if (!machine?._id) return;
    navigate(`/machines/${machine._id}?openBooking=true`);
  };

  const availableCount = machines.filter((machine) => machine.availability === "Available").length;
  const tractorCount = machines.filter((machine) => machine.category === "Tractor").length;

  return (
    <main className="min-h-screen bg-[#f8faf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* ============================================
          TOP HERO & RIDE-BOOKING SEARCH BAR
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
                isAdmin ? (
                  <button
                    type="button"
                    onClick={() => navigate("/admin/dashboard")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-green-950 shadow-lg transition hover:bg-lime-50"
                  >
                    <ShieldCheck size={15} />
                    <span>Admin</span>
                  </button>
                ) : isEligibleDriver ? (
                  <button
                    type="button"
                    onClick={() => navigate("/Drivers")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-green-950 shadow-lg transition hover:bg-lime-50"
                  >
                    <LayoutDashboard size={15} />
                    <span>{t("driver.dashboard", "Driver Dashboard")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/bookings")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-green-950 shadow-lg transition hover:bg-lime-50"
                  >
                    <ClipboardList size={15} />
                    <span>{t("navbar.myBookings", "My Bookings")}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Location Selector Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-green-950">
                <MapPin size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Service Area</p>
                <p className="truncate text-xs sm:text-sm font-black text-white">
                  {userLocation.label || user?.location || "Aligarh & Nearby Service Region"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white/20 px-3 text-xs font-black text-white hover:bg-white/30 transition disabled:opacity-50"
            >
              <Navigation size={13} className={locating ? "animate-spin" : ""} />
              <span>{locating ? "Detecting..." : "Near Me (GPS)"}</span>
            </button>
          </div>

          {locationStatusMessage && (
            <p className="mb-4 text-xs font-medium text-lime-300">
              {locationStatusMessage}
            </p>
          )}

          {/* Search Bar - Rapido Style */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Which machine do you need? (e.g. Mahindra Tractor, Rotavator, Harvester...)"
              className="h-14 w-full rounded-2xl border border-white/20 bg-white/15 pl-12 pr-10 text-sm sm:text-base font-semibold text-white outline-none transition placeholder:text-white/60 focus:border-lime-300 focus:bg-white/20 focus:ring-4 focus:ring-lime-300/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((item) => {
              const active = category === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-xs sm:text-sm font-black transition-all ${
                    active
                      ? "bg-lime-400 text-green-950 shadow-md shadow-lime-400/20"
                      : "border border-white/15 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          MAIN CONTENT AREA & FILTER TOOLBAR
      ============================================ */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PromotionsBanner service="Machine" title="🚜 Special Tractor & Machinery Discounts" />

        {/* Filters Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mr-1">
              <SlidersHorizontal size={14} /> Filter:
            </span>

            {/* Distance Filter */}
            <select
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="All">Distance: Any</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>

            {/* Price Sort */}
            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="none">Sort: Recommended</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>

            {/* Availability Toggle */}
            <button
              type="button"
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                onlyAvailable
                  ? "bg-green-700 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${onlyAvailable ? "bg-lime-300" : "bg-green-500"}`} />
              Available Now
            </button>
          </div>

          <div className="text-xs font-black text-slate-500 dark:text-slate-400">
            {filteredMachines.length} machines found
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="mt-4 space-y-3">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
            <AlertCircle className="mx-auto text-red-600" size={36} />
            <h3 className="mt-3 text-lg font-black text-red-900 dark:text-red-200">Something went wrong</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={loadMachines}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredMachines.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl dark:bg-green-950/40">
              🚜
            </div>
            <h3 className="mt-4 text-xl font-black">No machines match your criteria</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your category, expanding your distance radius, or clearing search filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
                setSelectedDistance("All");
                setOnlyAvailable(false);
              }}
              className="mt-5 rounded-xl bg-green-700 px-5 py-3 text-xs font-black text-white hover:bg-green-800"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* MACHINE CARDS GRID */}
        {!loading && !error && filteredMachines.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMachines.map((machine) => {
              const isAvailable = machine.availability === "Available";
              const distance = distanceInKilometers(userLocation, machine);

              return (
                <article
                  key={machine._id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    {/* Image & Overlay Badges */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {machine.image?.url ? (
                        <img
                          src={machine.image.url}
                          alt={machine.title || "Farm Machine"}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl">🚜</div>
                      )}

                      {/* Category Badge */}
                      <div className="absolute left-3 top-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                          {getCategoryLabel(machine.category)}
                        </span>
                      </div>

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
                        <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/70 px-2.5 py-1 backdrop-blur-md truncate max-w-[70%]">
                          <MapPin size={12} className="shrink-0 text-lime-400" />
                          <span className="truncate">{machine.location}</span>
                        </div>
                        {distance !== null && (
                          <div className="flex items-center gap-1 rounded-xl bg-blue-600/90 px-2.5 py-1 backdrop-blur-md text-[11px]">
                            <Navigation size={11} />
                            <span>{distance} km</span>
                          </div>
                        )}
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
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default Machines;