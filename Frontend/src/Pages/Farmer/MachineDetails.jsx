import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../UI/Navbar.jsx";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  Navigation,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
  Tractor,
} from "lucide-react";

function MachineDetails() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    reviewerName: "",
    rating: 0,
    text: "",
  });
  const [editingReviewId, setEditingReviewId] = useState(null);

  const [bookingType, setBookingType] = useState(null);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerLocation: "",
    landArea: "",
    areaUnit: "Bigha",
    workType: "",
    requiredDate: "",
  });

  // --------------------------------------------------
  // LANGUAGE
  // --------------------------------------------------

  const currentLanguage = i18n.language?.split("-")[0] || "en";

  const reviewLocale =
    currentLanguage === "hi" ? "hi-IN" : "en-IN";

  // --------------------------------------------------
  // SCROLL TOP
  // --------------------------------------------------

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [id]);

  // --------------------------------------------------
  // LOAD MACHINE
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    const loadMachine = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(`/api/machine/${id}`);

        if (active) {
          setMachine(response.data);
        }
      } catch (requestError) {
        console.error(requestError);

        if (active) {
          setError(
            requestError.response?.data?.message ||
              t(
                "machineDetails.loadError",
                "This machine could not be loaded."
              )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMachine();

    return () => {
      active = false;
    };
  }, [id, t]);

  // --------------------------------------------------
  // LOAD REVIEWS
  // --------------------------------------------------

  const loadReviews = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/machine/${id}/reviews`
      );

      setReviews(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (reviewError) {
      console.error("Review load failed:", reviewError);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReviews();
  }, [loadReviews]);

  // --------------------------------------------------
  // CATEGORY / UNIT
  // --------------------------------------------------

  const getCategoryLabel = (value) => {
    if (!value) return "";

    return t(
      `machines.categories.${String(value).toLowerCase()}`,
      value
    );
  };

  const getUnitLabel = (value) => {
    if (!value) {
      return t("machines.unit", "Unit");
    }

    return t(
      `machines.units.${String(value).toLowerCase()}`,
      value
    );
  };

  // --------------------------------------------------
  // PRICE
  // --------------------------------------------------

  const price = (() => {
    if (!machine?.price && machine?.price !== 0) {
      return "—";
    }

    const locale =
      currentLanguage === "hi"
        ? "hi-IN"
        : "en-IN";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(machine.price);
  })();

  // --------------------------------------------------
  // MAP
  // --------------------------------------------------

  const mapUrl =
    machine?.latitude != null &&
    machine?.longitude != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${
          machine.longitude - 0.08
        }%2C${machine.latitude - 0.06}%2C${
          machine.longitude + 0.08
        }%2C${machine.latitude + 0.06}&layer=mapnik&marker=${
          machine.latitude
        }%2C${machine.longitude}`
      : null;

  const googleMapsUrl =
    machine?.latitude != null &&
    machine?.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${machine.latitude},${machine.longitude}`
      : "#";

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  const handleSave = () => {
    setSaved((value) => !value);
  };

  // --------------------------------------------------
  // BOOKING
  // --------------------------------------------------

  const openBooking = (type) => {
    setBookingType(type);
    setBookingSubmitted(false);
  };

  const closeBooking = () => {
    setBookingType(null);
    setBookingSubmitted(false);
  };

  const updateBookingField = (event) => {
    const { name, value } = event.target;

    setBookingForm((form) => ({
      ...form,
      [name]: value,
    }));
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    setBookingSubmitting(true);
    setError("");

    try {
      const endpoint = bookingType === "group"
        ? "/api/group-bookings/create"
        : "/api/bookings/single";
      const response = await axios.post(endpoint, {
        itemId: id,
        location: bookingForm.customerLocation,
        landArea: bookingForm.landArea,
        bookingDate: bookingForm.requiredDate,
        workType: bookingForm.workType,
        message: `Booking requested by ${bookingForm.customerName}`
      });

      setBookingSubmitted(true);
      return response;
    } catch (bookingError) {
      console.error(bookingError);
      setError(
        bookingError.response?.data?.message ||
          t("machineDetails.bookingSaveError", "Booking could not be created.")
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  // --------------------------------------------------
  // REVIEWS
  // --------------------------------------------------

  const submitReview = async (event) => {
    event.preventDefault();

    setError("");

    if (!reviewForm.rating) {
      setError(
        t(
          "machineDetails.selectRating",
          "Please select a star rating before submitting."
        )
      );
      return;
    }

    try {
      const endpoint = editingReviewId
        ? `/api/reviews/${editingReviewId}`
        : `/api/machine/${id}/reviews`;

      const method = editingReviewId ? "put" : "post";

      await axios({
        method,
        url: endpoint,
        data: reviewForm,
      });

      setReviewForm({
        reviewerName: "",
        rating: 0,
        text: "",
      });

      setEditingReviewId(null);

      await loadReviews();
    } catch (reviewError) {
      console.error(reviewError);

      setError(
        reviewError.response?.data?.message ||
          t(
            "machineDetails.reviewSaveError",
            "Review could not be saved."
          )
      );
    }
  };

  const editReview = (review) => {
    setEditingReviewId(review._id);

    setReviewForm({
      reviewerName: review.reviewerName || "",
      rating: review.rating || 0,
      text: review.text || "",
    });

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);

    setReviewForm({
      reviewerName: "",
      rating: 0,
      text: "",
    });
  };

  const deleteReview = async (reviewId) => {
    const confirmed = window.confirm(
      t(
        "machineDetails.deleteReviewConfirm",
        "Delete this review?"
      )
    );

    if (!confirmed) return;

    try {
      await axios.delete(`/api/reviews/${reviewId}`);

      setReviews((currentReviews) =>
        currentReviews.filter(
          (review) => review._id !== reviewId
        )
      );

      if (editingReviewId === reviewId) {
        cancelEditReview();
      }
    } catch (reviewError) {
      console.error(reviewError);

      setError(
        reviewError.response?.data?.message ||
          t(
            "machineDetails.reviewDeleteError",
            "Review could not be deleted."
          )
      );
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-10 w-32 rounded-xl bg-slate-200" />

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="h-[420px] rounded-[30px] bg-slate-200 sm:h-[560px]" />
            <div className="h-[420px] rounded-[30px] bg-slate-200" />
          </div>

          <div className="h-48 rounded-[30px] bg-slate-200" />
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error || !machine) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8f3] px-5">
        <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Tractor size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            {t(
              "machineDetails.unavailable",
              "Machine unavailable"
            )}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              t(
                "machineDetails.notFound",
                "We could not find this listing."
              )}
          </p>

          <button
            type="button"
            onClick={() => navigate("/machine")}
            className="mt-6 min-h-12 rounded-2xl bg-[#176b3a] px-6 text-sm font-black text-white shadow-lg shadow-green-900/20 transition hover:bg-[#125a31]"
          >
            {t(
              "machineDetails.backToMachines",
              "Back to machines"
            )}
          </button>
        </div>
      </main>
    );
  }

  const isAvailable =
    machine.availability === "Available";

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) =>
              sum + Number(review.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : "—";

  return (
    <main className="min-h-screen bg-[#f6f8f3] pb-28 text-slate-900 lg:pb-16">

      <Navbar />

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-8 lg:py-10">

        {/* =================================================
            BREADCRUMB
        ================================================= */}

        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <button
            type="button"
            onClick={() => navigate("/machine")}
            className="transition hover:text-green-700"
          >
            {t(
              "machines.title",
              "Farm Machinery"
            )}
          </button>

          <ChevronRight size={14} />

          <span className="text-green-700">
            {getCategoryLabel(machine.category)}
          </span>
        </div>

        {/* =================================================
            HERO GRID
        ================================================= */}

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:gap-7">

          {/* IMAGE CARD */}

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

            <div className="relative h-[300px] overflow-hidden bg-slate-100 sm:h-[500px]">

              {machine.image?.url ? (
                <img
                  src={machine.image.url}
                  alt={
                    machine.title ||
                    t(
                      "machineDetails.farmMachine",
                      "Farm machine"
                    )
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-50 via-lime-50 to-slate-100 text-8xl">
                  🚜
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />

              {/* Category */}

              <div className="absolute left-4 top-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-2 text-xs font-black text-white backdrop-blur-xl">
                  🚜 {getCategoryLabel(machine.category)}
                </span>
              </div>

              {/* Availability */}

              <div className="absolute right-4 top-4">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black shadow-lg ${
                    isAvailable
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900/80 text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
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

              {/* Image bottom info */}

              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-xs font-semibold text-white/70">
                  {t(
                    "machineDetails.listing",
                    "WorkShetu machinery listing"
                  )}
                </p>

                <p className="mt-1 truncate text-sm font-bold text-white">
                  {machine.image?.filename ||
                    machine.title ||
                    t(
                      "machineDetails.agriculturalEquipment",
                      "Agricultural equipment"
                    )}
                </p>
              </div>
            </div>

            {/* QUICK SPECS */}

            <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">

              <div className="p-4 sm:p-5">
                <Gauge
                  size={20}
                  className="text-green-700"
                />

                <p className="mt-2 text-sm font-black">
                  {machine.power
                    ? `${machine.power} HP`
                    : t(
                        "machineDetails.standard",
                        "Standard"
                      )}
                </p>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {t(
                    "machines.power",
                    "Power"
                  )}
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <Fuel
                  size={20}
                  className="text-green-700"
                />

                <p className="mt-2 truncate text-sm font-black">
                  {machine.fuelType ||
                    t(
                      "machineDetails.notAvailable",
                      "N/A"
                    )}
                </p>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {t(
                    "machines.fuel",
                    "Fuel"
                  )}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <Clock3
                  size={20}
                  className="text-green-700"
                />

                <p className="mt-2 text-sm font-black">
                  {getUnitLabel(machine.unit)}
                </p>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {t(
                    "machineDetails.rentalUnit",
                    "Rental unit"
                  )}
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <CheckCircle2
                  size={20}
                  className="text-green-700"
                />

                <p className="mt-2 text-sm font-black">
                  {machine.year || "—"}
                </p>

                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {t(
                    "machineDetails.modelYear",
                    "Model year"
                  )}
                </p>
              </div>

            </div>
          </section>

          {/* PRICE / BOOKING CARD */}

          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-green-700">
                  {t(
                    "machineDetails.rentalPrice",
                    "Rental price"
                  )}
                </p>

                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-green-900 sm:text-4xl">
                    {price}
                  </span>

                  <span className="pb-1 text-xs font-bold text-slate-400">
                    / {getUnitLabel(machine.unit)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
                  saved
                    ? "border-red-200 bg-red-50 text-red-500"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                }`}
                aria-label={t(
                  "machineDetails.saveMachine",
                  "Save machine"
                )}
              >
                <Heart
                  size={20}
                  fill={
                    saved
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            {/* TITLE */}

            <div className="mt-6 border-t border-slate-100 pt-5">

              <p className="text-xs font-bold text-slate-400">
                {getCategoryLabel(machine.category)}
              </p>

              <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-slate-900">
                {machine.title}
              </h1>

              {machine.location && (
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <MapPin
                    size={17}
                    className="shrink-0 text-green-700"
                  />

                  <span className="line-clamp-2">
                    {machine.location}
                  </span>
                </div>
              )}
            </div>

            {/* BOOKING ACTIONS */}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">

              <button
                type="button"
                onClick={() => openBooking("fast")}
                disabled={!isAvailable}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#176b3a] px-4 text-sm font-black text-white shadow-lg shadow-green-900/20 transition hover:bg-[#125a31] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clock3 size={18} />

                {t(
                  "machineDetails.fastBooking",
                  "Fast Booking"
                )}
              </button>

              <button
                type="button"
                onClick={() => openBooking("group")}
                disabled={!isAvailable}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 text-sm font-black text-green-800 transition hover:bg-green-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Tractor size={18} />

                {t(
                  "machineDetails.groupBooking",
                  "Group Booking"
                )}
              </button>
            </div>

            {/* TRUST */}

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">

              <p className="text-xs font-black text-slate-800">
                {t(
                  "machineDetails.beforeBooking",
                  "Before you book"
                )}
              </p>

              <div className="mt-3 space-y-3">

                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-green-700"
                  />

                  <p className="text-xs leading-5 text-slate-500">
                    {t(
                      "machineDetails.verifyOwner",
                      "Confirm machine details and owner information before payment."
                    )}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-green-700"
                  />

                  <p className="text-xs leading-5 text-slate-500">
                    {t(
                      "machineDetails.confirmAvailability",
                      "Confirm availability and rental terms with the owner."
                    )}
                  </p>
                </div>

              </div>
            </div>
          </aside>
        </div>
                        
        {/* =================================================
            MACHINE INFORMATION
        ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">

          {/* ABOUT */}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <Tractor size={21} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-700">
                  {t(
                    "machineDetails.aboutLabel",
                    "About this machine"
                  )}
                </p>

                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  {t(
                    "machineDetails.readyForWork",
                    "Ready for your next field job"
                  )}
                </h2>
              </div>

            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              {machine.description ||
                t(
                  "machineDetails.noDescription",
                  "No additional description was provided for this machine."
                )}
            </p>

            {/* DETAILS */}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t(
                    "machineDetails.vehicleNumber",
                    "Vehicle number"
                  )}
                </p>

                <p className="mt-1 text-sm font-black">
                  {machine.vehicleNumber ||
                    t(
                      "machineDetails.notApplicable",
                      "Not applicable"
                    )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t(
                    "machineDetails.bookingType",
                    "Booking options"
                  )}
                </p>

                <p className="mt-1 text-sm font-black">
                  {t(
                    "machineDetails.fastAndGroup",
                    "Fast or group booking"
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t(
                    "machineDetails.category",
                    "Category"
                  )}
                </p>

                <p className="mt-1 text-sm font-black">
                  {getCategoryLabel(machine.category)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t(
                    "machineDetails.status",
                    "Availability"
                  )}
                </p>

                <p
                  className={`mt-1 text-sm font-black ${
                    isAvailable
                      ? "text-emerald-700"
                      : "text-orange-700"
                  }`}
                >
                  {isAvailable
                    ? t(
                        "machines.available",
                        "Available"
                      )
                    : t(
                        "machines.booked",
                        "Booked"
                      )}
                </p>
              </div>

            </div>
          </section>

          {/* LOCATION */}

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

            <div className="p-5 sm:p-7">

              <div className="flex items-center justify-between gap-3">

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-700">
                    {t(
                      "machineDetails.locationLabel",
                      "Machine location"
                    )}
                  </p>

                  <h2 className="mt-1 text-xl font-black sm:text-2xl">
                    {machine.location ||
                      t(
                        "machineDetails.locationNotAvailable",
                        "Location unavailable"
                      )}
                  </h2>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <MapPin size={21} />
                </div>

              </div>
            </div>

            {mapUrl ? (
              <iframe
                title={
                  t(
                    "machineDetails.mapTitle",
                    "Machine location map"
                  )
                }
                src={mapUrl}
                className="h-64 w-full border-0 sm:h-72"
                loading="lazy"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                {t(
                  "machineDetails.mapUnavailable",
                  "Map location unavailable"
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex min-w-0 items-center gap-2">
                <Navigation
                  size={17}
                  className="shrink-0 text-green-700"
                />

                <span className="truncate text-sm font-bold text-slate-600">
                  {machine.location ||
                    t(
                      "machineDetails.locationNotAvailable",
                      "Location unavailable"
                    )}
                </span>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-green-50 px-4 text-xs font-black text-green-800 transition hover:bg-green-100"
              >
                {t(
                  "machineDetails.openMap",
                  "Open Map"
                )}

                <ExternalLink size={14} />
              </a>
            </div>
          </section>
        </div>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section className="mt-6 rounded-[28px] bg-[#123524] p-5 text-white shadow-xl shadow-green-950/10 sm:p-8">

          <div className="max-w-2xl">

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
              {t(
                "machineDetails.simpleProcessLabel",
                "Simple process"
              )}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {t(
                "machineDetails.howItWorks",
                "Get the machine you need, without the hassle."
              )}
            </h2>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">

            {[
              {
                number: "01",
                title: t(
                  "machineDetails.stepOneTitle",
                  "Check details"
                ),
                text: t(
                  "machineDetails.stepOneText",
                  "Review price, location, specifications and availability."
                ),
              },
              {
                number: "02",
                title: t(
                  "machineDetails.stepTwoTitle",
                  "Contact owner"
                ),
                text: t(
                  "machineDetails.stepTwoText",
                  "Choose a fast or group booking request for your requirement."
                ),
              },
              {
                number: "03",
                title: t(
                  "machineDetails.stepThreeTitle",
                  "Confirm booking"
                ),
                text: t(
                  "machineDetails.stepThreeText",
                  "Agree on timing, rental terms and payment directly."
                ),
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
              >
                <span className="text-xs font-black text-lime-300">
                  {step.number}
                </span>

                <h3 className="mt-2 text-sm font-black">
                  {step.title}
                </h3>

                <p className="mt-1 text-xs leading-5 text-white/60">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =================================================
            REVIEWS
        ================================================= */}

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-700">
                {t(
                  "machineDetails.communityFeedback",
                  "Community feedback"
                )}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {t(
                  "machineDetails.reviewsFromFarmers",
                  "Reviews from farmers"
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2">

              <span className="text-2xl font-black">
                {averageRating}
              </span>

              <div
                className="flex text-amber-400"
                aria-label={t(
                  "machineDetails.rating",
                  "Rating"
                )}
              >
                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <Star
                      key={star}
                      size={17}
                      fill="currentColor"
                    />
                  )
                )}
              </div>

            </div>
          </div>

          {/* REVIEW FORM */}

          <form
            onSubmit={submitReview}
            className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5"
          >

            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">

              <input
                required
                value={reviewForm.reviewerName}
                onChange={(event) =>
                  setReviewForm({
                    ...reviewForm,
                    reviewerName:
                      event.target.value,
                  })
                }
                placeholder={t(
                  "machineDetails.yourName",
                  "Your name"
                )}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-green-600"
              />

              <div
                className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3"
                aria-label={t(
                  "machineDetails.chooseRating",
                  "Choose rating"
                )}
              >
                {[1, 2, 3, 4, 5].map(
                  (rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        setReviewForm({
                          ...reviewForm,
                          rating,
                        })
                      }
                      className={`transition hover:scale-110 ${
                        rating <= reviewForm.rating
                          ? "text-amber-400"
                          : "text-slate-300"
                      }`}
                      aria-label={t(
                        "machineDetails.starRating",
                        `${rating} star rating`
                      )}
                      aria-pressed={
                        rating ===
                        reviewForm.rating
                      }
                    >
                      <Star
                        size={19}
                        fill="currentColor"
                      />
                    </button>
                  )
                )}
              </div>
            </div>

            <textarea
              required
              value={reviewForm.text}
              onChange={(event) =>
                setReviewForm({
                  ...reviewForm,
                  text: event.target.value,
                })
              }
              placeholder={t(
                "machineDetails.shareExperience",
                "Share your experience"
              )}
              rows="3"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-green-600"
            />

            <div className="mt-3 flex flex-wrap gap-2">

              <button
                type="submit"
                className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white hover:bg-green-800"
              >
                {editingReviewId
                  ? t(
                      "machineDetails.updateReview",
                      "Update review"
                    )
                  : t(
                      "machineDetails.addReview",
                      "Add review"
                    )}
              </button>

              {editingReviewId && (
                <button
                  type="button"
                  onClick={cancelEditReview}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
                >
                  {t(
                    "machineDetails.cancel",
                    "Cancel"
                  )}
                </button>
              )}

            </div>
          </form>

          {/* REVIEWS LIST */}

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            {reviews.length === 0 && (
              <p className="text-sm text-slate-500 md:col-span-2">
                {t(
                  "machineDetails.noReviews",
                  "No reviews yet. Be the first to review this machine."
                )}
              </p>
            )}

            {reviews.map((review) => {

              const reviewerName =
                review.reviewerName ||
                t(
                  "machineDetails.farmer",
                  "Farmer"
                );

              return (
                <article
                  key={review._id}
                  className="rounded-2xl bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-3">

                    <div className="flex items-center gap-3">

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-black text-white">
                        {reviewerName
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>

                      <div>
                        <p className="text-sm font-black">
                          {reviewerName}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {review.createdAt
                            ? new Date(
                                review.createdAt
                              ).toLocaleDateString(
                                reviewLocale
                              )
                            : "—"}
                        </p>
                      </div>

                    </div>

                    <div className="flex items-center gap-2">

                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <Star
                              key={star}
                              size={13}
                              fill={
                                star <=
                                Number(
                                  review.rating || 0
                                )
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          editReview(review)
                        }
                        className="text-slate-400 hover:text-green-700"
                        aria-label={t(
                          "machineDetails.editReview",
                          "Edit review"
                        )}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteReview(
                            review._id
                          )
                        }
                        className="text-slate-400 hover:text-red-600"
                        aria-label={t(
                          "machineDetails.deleteReview",
                          "Delete review"
                        )}
                      >
                        <Trash2 size={15} />
                      </button>

                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {review.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* =================================================
            SAFETY
        ================================================= */}

        <section className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>

              <h3 className="text-sm font-black text-amber-950">
                {t(
                  "machineDetails.safetyTitle",
                  "Stay safe while booking"
                )}
              </h3>

              <p className="mt-1 text-xs leading-5 text-amber-900/70">
                {t(
                  "machineDetails.safetyText",
                  "Always inspect the machine, confirm the owner, rental price, timing and payment terms before making a booking or payment."
                )}
              </p>

            </div>
          </div>
        </section>
      </div>

      {/* =====================================================
          BOOKING MODAL
      ===================================================== */}

      {bookingType && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">

          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-700">
                  {bookingType === "group"
                    ? t(
                        "machineDetails.groupBooking",
                        "Group booking"
                      )
                    : t(
                        "machineDetails.fastBooking",
                        "Fast booking"
                      )}
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  {bookingSubmitted
                    ? t(
                        "machineDetails.requestReceived",
                        "Request received"
                      )
                    : t(
                        "machineDetails.bookMachine",
                        "Book {{title}}",
                        {
                          title:
                            machine.title,
                        }
                      )}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeBooking}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label={t(
                  "machineDetails.closeBooking",
                  "Close booking form"
                )}
              >
                ×
              </button>
            </div>

            {/* SUCCESS */}

            {bookingSubmitted ? (
              <div className="mt-7 rounded-2xl bg-green-50 p-5 text-center">

                <CheckCircle2
                  className="mx-auto text-green-700"
                  size={36}
                />

                <p className="mt-3 font-black text-green-900">
                  {t(
                    "machineDetails.bookingReady",
                    "Your booking request is ready."
                  )}
                </p>

                <p className="mt-1 text-sm leading-6 text-green-800/75">
                  {t(
                    "machineDetails.ownerCanReview",
                    "The owner can review your {{type}} booking details after submission.",
                    {
                      type:
                        bookingType ===
                        "group"
                          ? t(
                              "machineDetails.groupBookingLower",
                              "group"
                            )
                          : t(
                              "machineDetails.fastBookingLower",
                              "fast"
                            ),
                    }
                  )}
                </p>

                <button
                  type="button"
                  onClick={closeBooking}
                  className="mt-5 rounded-xl bg-green-700 px-5 py-3 text-sm font-black text-white"
                >
                  {t(
                    "machineDetails.done",
                    "Done"
                  )}
                </button>
              </div>
            ) : (

              /* BOOKING FORM */

              <form
                onSubmit={submitBooking}
                className="mt-6 space-y-4"
              >

                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="text-sm font-bold text-slate-700">
                    {t(
                      "machineDetails.yourName",
                      "Your name"
                    )}

                    <input
                      required
                      name="customerName"
                      value={
                        bookingForm.customerName
                      }
                      onChange={
                        updateBookingField
                      }
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 font-medium outline-none focus:border-green-600"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    {t(
                      "machineDetails.farmLocation",
                      "Farm location"
                    )}

                    <input
                      required
                      name="customerLocation"
                      value={
                        bookingForm.customerLocation
                      }
                      onChange={
                        updateBookingField
                      }
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 font-medium outline-none focus:border-green-600"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="text-sm font-bold text-slate-700">
                    {t(
                      "machineDetails.landArea",
                      "Land area"
                    )}

                    <input
                      required
                      min="1"
                      type="number"
                      name="landArea"
                      value={
                        bookingForm.landArea
                      }
                      onChange={
                        updateBookingField
                      }
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 font-medium outline-none focus:border-green-600"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    {t(
                      "machineDetails.areaUnit",
                      "Area unit"
                    )}

                    <select
                      name="areaUnit"
                      value={
                        bookingForm.areaUnit
                      }
                      onChange={
                        updateBookingField
                      }
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-medium outline-none focus:border-green-600"
                    >
                      <option value="Bigha">
                        {getUnitLabel("Bigha")}
                      </option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-bold text-slate-700">
                  {t(
                    "machineDetails.workType",
                    "Work type"
                  )}

                  <input
                    required
                    name="workType"
                    value={
                      bookingForm.workType
                    }
                    onChange={
                      updateBookingField
                    }
                    placeholder={t(
                      "machineDetails.workTypePlaceholder",
                      "For example: ploughing or harvesting"
                    )}
                    className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 font-medium outline-none focus:border-green-600"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  {t(
                    "machineDetails.requiredDate",
                    "Required date"
                  )}

                  <input
                    required
                    type="date"
                    name="requiredDate"
                    value={
                      bookingForm.requiredDate
                    }
                    onChange={
                      updateBookingField
                    }
                    className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 font-medium outline-none focus:border-green-600"
                  />
                </label>

                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 text-sm font-black text-white shadow-lg shadow-green-700/20 hover:bg-green-800"
                >
                  <CheckCircle2 size={18} />

                  {t(
                    "machineDetails.submitBooking",
                    bookingSubmitting ? "Submitting..." : "Submit booking request"
                  )}
                </button>

              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MOBILE STICKY ACTION BAR
      ===================================================== */}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:hidden">

        <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr_1fr] gap-2">

          <button
            type="button"
            onClick={handleSave}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
              saved
                ? "border-red-200 bg-red-50 text-red-500"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
            aria-label={t(
              "machineDetails.saveMachine",
              "Save machine"
            )}
          >
            <Heart
              size={19}
              fill={
                saved
                  ? "currentColor"
                  : "none"
              }
            />
          </button>

          <button
            type="button"
            onClick={() => openBooking("fast")}
            disabled={!isAvailable}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176b3a] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Clock3 size={17} />

            {t(
              "machineDetails.fastBooking",
              "Fast Booking"
            )}
          </button>

          <button
            type="button"
            onClick={() => openBooking("group")}
            disabled={!isAvailable}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-50 px-3 text-xs font-black text-green-800 ring-1 ring-green-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Tractor size={17} />

            {t(
              "machineDetails.groupBooking",
              "Group Booking"
            )}
          </button>

        </div>
      </div>
    </main>
  );
}

export default MachineDetails;