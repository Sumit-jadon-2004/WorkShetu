import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Globe2 } from "lucide-react";

/*
const NEARBY_RADIUS_KM = 50;

const distanceInKilometers = (firstPoint, secondPoint) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = (secondPoint.latitude - firstPoint.latitude) * Math.PI / 180;
  const longitudeDelta = (secondPoint.longitude - firstPoint.longitude) * Math.PI / 180;
  const firstLatitude = firstPoint.latitude * Math.PI / 180;
  const secondLatitude = secondPoint.latitude * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(firstLatitude) * Math.cos(secondLatitude);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};
*/

function Machines() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  // const [userLocation, setUserLocation] = useState(null);
  // const [locationError, setLocationError] = useState("");
  // const [locating, setLocating] = useState(true);

  // --------------------------------------------------
  // LANGUAGE
  // --------------------------------------------------

  const currentLanguage = i18n.language?.split("-")[0] || "en";

  const languageNames = {
    en: "English",
    hi: "हिन्दी",
    hinglish: "Hinglish",
  };

  const selectedLanguage =
    languageNames[currentLanguage] || currentLanguage.toUpperCase();

  const changeLanguage = (language) => {
    localStorage.setItem("workshetu-language", language);
    i18n.changeLanguage(language);
    setLanguageMenuOpen(false);
  };

  // --------------------------------------------------
  // LOAD MACHINES
  // --------------------------------------------------

  const loadMachines = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get("/api/machine");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.machines || [];

      setMachines(data);
    } catch (err) {
      console.error(err);

      setError(
        t(
          "machines.loadError",
          "Unable to load machines. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMachines();
  }, [loadMachines]);

  /*
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(
        t("machines.locationUnavailable", "Location is not available in this browser.")
      );
      setLocating(false);
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError(
          t("machines.locationPermission", "Allow location access to see machines near you.")
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [t]);
  */

  // --------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------

  const categories = [
    {
      value: "All",
      label: t("machines.all", "All Machines"),
      icon: "🚜",
    },
    {
      value: "Tractor",
      label: t("machines.categories.tractor", "Tractor"),
      icon: "🚜",
    },
    {
      value: "Cultivator",
      label: t("machines.categories.cultivator", "Cultivator"),
      icon: "🌱",
    },
    {
      value: "Rotavator",
      label: t("machines.categories.rotavator", "Rotavator"),
      icon: "⚙️",
    },
    {
      value: "Harrow",
      label: t("machines.categories.harrow", "Harrow"),
      icon: "🌾",
    },
    {
      value: "Harvester",
      label: t("machines.categories.harvester", "Harvester"),
      icon: "🌾",
    },
  ];

  const getCategoryLabel = (value) => {
    if (!value) return "";

    const key = String(value).toLowerCase();

    return t(`machines.categories.${key}`, value);
  };

  const getUnitLabel = (unit) => {
    if (!unit) return t("machines.unit", "Unit");

    return t(
      `machines.units.${String(unit).toLowerCase()}`,
      unit
    );
  };

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredMachines = useMemo(() => {
    const query = search.trim().toLowerCase();

    return machines.filter((machine) => {
      const matchesCategory =
        category === "All" || machine.category === category;
      if (!query) return matchesCategory;

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

      return matchesCategory && searchableText.includes(query);
    });
  }, [machines, search, category]);

  // --------------------------------------------------
  // FORMAT PRICE
  // --------------------------------------------------

  const formatPrice = (price) => {
    if (price === undefined || price === null) {
      return "—";
    }

    return new Intl.NumberFormat(
      currentLanguage === "hi" ? "hi-IN" : "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(price);
  };

  // --------------------------------------------------
  // WHATSAPP
  // --------------------------------------------------

  const openWhatsApp = (phone, machine) => {
    if (!phone) return;

    const cleanPhone = String(phone).replace(/\D/g, "");

    const message = encodeURIComponent(
      `Hello, I am interested in your ${machine?.title || "machine"} on WorkShetu.`
    );

    window.open(
      `https://wa.me/91${cleanPhone}?text=${message}`,
      "_blank"
    );
  };

  // --------------------------------------------------
  // VIEW DETAILS
  // --------------------------------------------------

  const handleViewDetails = (machine) => {
    if (!machine?._id) return;

    navigate(`/machines/${machine._id}`);
  };

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  const availableCount = machines.filter(
    (machine) => machine.availability === "Available"
  ).length;

  const tractorCount = machines.filter(
    (machine) => machine.category === "Tractor"
  ).length;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900">

      {/* ============================================
          HERO
      ============================================ */}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#123c27] via-[#176b3a] to-[#2d8a4e]">

        {/* Background decoration */}

        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">

          {/* Top bar */}

          <div className="mb-10 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                🚜
              </div>

              <div>
                <p className="text-sm font-medium text-white/70">
                  WorkShetu
                </p>

                <h1 className="text-lg font-bold text-white">
                  {t("machines.title", "Farm Machinery")}
                </h1>
              </div>
            </div>

            {/* Selected language */}

            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageMenuOpen((open) => !open)}
                aria-expanded={languageMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-white/20"
              >
                <Globe2 size={16} aria-hidden="true" />
                <span>{selectedLanguage}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${languageMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
                <span className="sr-only">Language</span>
              </button>

              {languageMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                >
                  {[
                    ["en", "English"],
                    ["hi", "हिन्दी"],
                    ["hinglish", "Hinglish"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitem"
                      onClick={() => changeLanguage(value)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-green-50 hover:text-green-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-lime-300"
                    >
                      {label}
                      {currentLanguage === value && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Hero content */}

          <div className="max-w-3xl">

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-lime-300" />
              {t(
                "machines.heroBadge",
                "Trusted farming equipment near you"
              )}
            </div>

            <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-6xl">
              {t(
                "machines.heroTitle",
                "Power your farming with the right machine."
              )}
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
              {t(
                "machines.heroDescription",
                "Find tractors, cultivators, rotavators and harvesters from local machine owners."
              )}
            </p>

          </div>

          {/* Stats */}

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-4">

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:p-4">
              <p className="text-xl font-black text-white sm:text-2xl">
                {machines.length}
              </p>

              <p className="mt-1 text-[11px] text-white/60 sm:text-xs">
                {t("machines.totalMachines", "Machines")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:p-4">
              <p className="text-xl font-black text-white sm:text-2xl">
                {availableCount}
              </p>

              <p className="mt-1 text-[11px] text-white/60 sm:text-xs">
                {t("machines.availableNow", "Available")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:p-4">
              <p className="text-xl font-black text-white sm:text-2xl">
                {tractorCount}
              </p>

              <p className="mt-1 text-[11px] text-white/60 sm:text-xs">
                {t("machines.tractors", "Tractors")}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================
          SEARCH + FILTER
      ============================================ */}

      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="rounded-3xl border border-green-900/30 bg-[#123524] p-3 shadow-xl shadow-slate-900/20 sm:p-5">

          {/* Search */}

          <div className="relative">

            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
              🔎
            </span>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                "machines.searchPlaceholder",
                "Search tractor, rotavator, location..."
              )}
              className="h-14 w-full rounded-2xl border border-white/15 bg-white/10 pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/55 focus:border-lime-300 focus:bg-white/15 focus:ring-4 focus:ring-lime-300/20"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-white/15 text-sm text-white transition hover:bg-white/25"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}

          </div>

          {/* Category chips */}

          <div className="mt-3 overflow-x-auto pb-1 scrollbar-none">

            <div className="flex min-w-max gap-2">

              {categories.map((item) => {
                const active = category === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value)}
                    className={`flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition-all ${
                      active
                        ? "bg-lime-300 text-green-950 shadow-lg shadow-lime-300/20"
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

        </div>

      </section>

      {/* ============================================
          MACHINE LIST
      ============================================ */}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

        {/* Result header */}

        <div className="mb-6 flex items-end justify-between gap-4">

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">
              {t("machines.explore", "Explore")}
            </p>

            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {t("machines.availableMachines", "Available Machinery")}
            </h3>
          </div>

          <div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
            {filteredMachines.length}{" "}
            {t("machines.results", "results")}
          </div>

        </div>

        {/*
        {locating && !loading && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            {t("machines.findingNearby", "Finding machines near you...")}
          </div>
        )}

        {!locating && locationError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {locationError}
          </div>
        )}
        */}

        {/* =========================================
            LOADING
        ========================================= */}

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="h-56 animate-pulse bg-slate-200" />

                <div className="space-y-4 p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
                </div>
              </div>
            ))}

          </div>
        )}

        {/* =========================================
            ERROR
        ========================================= */}

        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl">
              ⚠️
            </div>

            <h3 className="mt-4 text-lg font-black text-red-900">
              {t("machines.somethingWrong", "Something went wrong")}
            </h3>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadMachines}
              className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700"
            >
              {t("machines.retry", "Try Again")}
            </button>

          </div>
        )}

        {/* =========================================
            EMPTY
        ========================================= */}

        {!loading && !error && filteredMachines.length === 0 && (
          <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-50 text-4xl">
              🚜
            </div>

            <h3 className="mt-5 text-xl font-black">
              {t(
                "machines.noMachines",
                "No machines found"
              )}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {t(
                "machines.noMachinesDescription",
                "Try another search or choose a different machine category."
              )}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="mt-5 rounded-2xl bg-[#176b3a] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20"
            >
              {t("machines.clearFilters", "Clear Filters")}
            </button>

          </div>
        )}

        {/* =========================================
            CARDS
        ========================================= */}

        {!loading && !error && filteredMachines.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {filteredMachines.map((machine) => {

              const isAvailable =
                machine.availability === "Available";

              return (
                <article
                  key={machine._id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 sm:rounded-[28px]"
                >

                  {/* =================================
                      IMAGE
                  ================================= */}

                  <div className="relative h-48 overflow-hidden bg-slate-100 sm:h-56">

                    {machine.image?.url ? (
                      <img
                        src={machine.image.url}
                        alt={machine.title || "Farm machine"}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-50 to-lime-50 text-7xl">
                        🚜
                      </div>
                    )}

                    {/* Gradient */}

                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />

                    {/* Category */}

                    <div className="absolute left-4 top-4">

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                        {getCategoryLabel(machine.category)}
                      </span>

                    </div>

                    {/* Availability */}

                    <div className="absolute right-4 top-4">

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur ${
                          isAvailable
                            ? "bg-green-500 text-white"
                            : "bg-slate-800/80 text-white"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable
                              ? "bg-white"
                              : "bg-slate-400"
                          }`}
                        />

                        {isAvailable
                          ? t(
                              "machines.available",
                              "Available"
                            )
                          : t(
                              "machines.booked",
                              "Booked"
                            )}
                      </span>

                    </div>

                    {/* Location */}

                    {machine.location && (
                      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white">

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                          📍
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white/70">
                            {t(
                              "machines.location",
                              "Location"
                            )}
                          </p>

                          <p className="truncate text-sm font-bold">
                            {machine.location}
                          </p>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* =================================
                      CONTENT
                  ================================= */}

                  <div className="p-4 sm:p-5">

                    {/* Title */}

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h4 className="line-clamp-2 text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl">
                          {machine.title ||
                            getCategoryLabel(
                              machine.category
                            )}
                        </h4>

                        {machine.year && (
                          <p className="mt-1.5 text-xs font-semibold text-slate-400">
                            {t("machines.year", "Model Year")}{" "}
                            {machine.year}
                          </p>
                        )}

                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg sm:h-10 sm:w-10 sm:rounded-2xl sm:text-xl">
                        🚜
                      </div>

                    </div>

                    {/* Vehicle */}

                    {machine.vehicleNumber && (
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-3">

                        <span className="text-xs font-semibold text-slate-500">
                          {t(
                            "machines.vehicleNumber",
                            "Vehicle Number"
                          )}
                        </span>

                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black tracking-wide text-slate-800 shadow-sm">
                          {machine.vehicleNumber}
                        </span>

                      </div>
                    )}

                    {/* =================================
                        SPECS
                    ================================= */}

                    {(machine.power || machine.fuelType) && (
                      <div className="mt-4 grid grid-cols-2 gap-2">

                        {machine.power && (
                          <div className="rounded-2xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {t(
                                "machines.power",
                                "Power"
                              )}
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-800">
                              {machine.power} HP
                            </p>

                          </div>
                        )}

                        {machine.fuelType && (
                          <div className="rounded-2xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {t(
                                "machines.fuel",
                                "Fuel"
                              )}
                            </p>

                            <p className="mt-1 truncate text-sm font-black text-slate-800">
                              {machine.fuelType}
                            </p>

                          </div>
                        )}

                      </div>
                    )}

                    {/* =================================
                        DESCRIPTION
                    ================================= */}

                    {machine.description && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                        {machine.description}
                      </p>
                    )}

                    {/* =================================
                        PRICE
                    ================================= */}

                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-green-50 to-lime-50 p-3.5 ring-1 ring-green-100 sm:mt-5 sm:rounded-[22px] sm:p-4">

                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-700 dark:text-green-950">
                        {t(
                          "machines.rentalPrice",
                          "Rental Price"
                        )}
                      </p>

                      <div className="mt-1 flex items-end justify-between gap-2">

                        <div>

                          <span className="text-xl font-black tracking-tight text-green-900 sm:text-2xl">
                            {formatPrice(machine.price)}
                          </span>

                          <span className="ml-1 text-xs font-semibold text-green-700">
                            / {getUnitLabel(machine.unit)}
                          </span>

                        </div>

                        <span className="text-lg">
                          💰
                        </span>

                      </div>

                    </div>

                    {/* =================================
                        ACTIONS
                    ================================= */}

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 sm:mt-4">

                      <button
                        type="button"
                        onClick={() =>
                          handleViewDetails(machine)
                        }
                        className="min-h-12 rounded-2xl bg-[#176b3a] px-4 text-sm font-black text-white shadow-lg shadow-green-900/15 transition hover:bg-[#125a31] active:scale-[0.98]"
                      >
                        {t(
                          "machines.viewDetails",
                          "View Details"
                        )}
                      </button>

                      {machine.phone && (
                        <button
                          type="button"
                          onClick={() =>
                            openWhatsApp(
                              machine.phone,
                              machine
                            )
                          }
                          className="flex min-h-12 w-12 items-center justify-center rounded-2xl border border-green-200 bg-green-50 text-xl transition hover:bg-green-100 active:scale-95"
                          aria-label="Contact owner on WhatsApp"
                          title="WhatsApp"
                        >
                          💬
                        </button>
                      )}

                    </div>

                    {/* Trust */}

                    <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-400">

                      <span>✓</span>

                      <span>
                        {t(
                          "machines.farmerTrust",
                          "Connect directly with local machine owners"
                        )}
                      </span>

                    </div>

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>

      {/* ============================================
          BOTTOM TRUST SECTION
      ============================================ */}

      <section className="border-t border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

          <div className="grid gap-4 sm:grid-cols-3">

            <div className="rounded-3xl bg-slate-50 p-5">

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-xl">
                🔎
              </div>

              <h4 className="font-black">
                {t(
                  "machines.easySearch",
                  "Easy to Find"
                )}
              </h4>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t(
                  "machines.easySearchDescription",
                  "Search machinery by type, location and details."
                )}
              </p>

            </div>

            <div className="rounded-3xl bg-slate-50 p-5">

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-xl">
                🤝
              </div>

              <h4 className="font-black">
                {t(
                  "machines.directContact",
                  "Direct Connection"
                )}
              </h4>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t(
                  "machines.directContactDescription",
                  "Connect directly with machine owners."
                )}
              </p>

            </div>

            <div className="rounded-3xl bg-slate-50 p-5">

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-xl">
                🌾
              </div>

              <h4 className="font-black">
                {t(
                  "machines.farmerFirst",
                  "Made for Farmers"
                )}
              </h4>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t(
                  "machines.farmerFirstDescription",
                  "Simple, clear and farmer-friendly machinery marketplace."
                )}
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Machines;