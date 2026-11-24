import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Fuel,
  Gauge,
  Heart,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Tractor,
  X,
  Zap,
} from "lucide-react";
import { playBookingAlertSound } from "../../utils/audioAlert.js";

function MachineDetails() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const autoSubmittedReview = useRef(false);

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
  const [bookingLocationStatus, setBookingLocationStatus] = useState("idle");
  const [bookingLocationMessage, setBookingLocationMessage] = useState("");
  const [bookingModalError, setBookingModalError] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(120);
  const [alternativesList, setAlternativesList] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [rebookingInProgress, setRebookingInProgress] = useState(false);
  const [searchParams] = useSearchParams();

  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerLocation: "",
    landArea: searchParams.get("landArea") || "",
    areaUnit: "Bigha",
    workType: searchParams.get("workType") || "",
    preferredTime: searchParams.get("preferredTime") || "",
    requiredDate: "",
    latitude: "",
    longitude: "",
  });

  const [promoCode, setPromoCode] = useState("");
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [manualPromoApplied, setManualPromoApplied] = useState(false);
  const [autoOfferLoading, setAutoOfferLoading] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [autoShiftNotice, setAutoShiftNotice] = useState("");

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
          const apiMsg = requestError.response?.data?.message;
          const isUnavailable = requestError.response?.data?.unavailable || requestError.response?.status === 404;
          setError(
            isUnavailable
              ? "This machine listing is currently unavailable for bookings. The owner's equipment may be undergoing verification or is temporarily offline."
              : (apiMsg || t("machineDetails.loadError", "This machine could not be loaded."))
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
      return "-";
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

  const fastBookingQuote = (() => {
    const landArea = Number(bookingForm.landArea);
    const pricePerBigha = Number(machine?.price);
    if (bookingType !== "fast" || !Number.isFinite(landArea) || landArea <= 0 || !Number.isFinite(pricePerBigha)) return null;

    const minimumLandArea = Number(machine?.pricingRules?.minimumLandArea ?? 5);
    const basePrice = pricePerBigha * landArea;
    const missingLandArea = Math.max(0, minimumLandArea - landArea);
    const higherRateAfter = Number(machine?.pricingRules?.higherExtraChargeAfterMissingBigha ?? 2);
    const firstRateArea = Math.min(missingLandArea, higherRateAfter);
    const higherRateArea = Math.max(0, missingLandArea - higherRateAfter);
    const extraCharge = Math.round(
      firstRateArea * Number(machine?.pricingRules?.extraChargePerMissingBigha ?? 100)
        + higherRateArea * Number(machine?.pricingRules?.higherExtraChargePerMissingBigha ?? 150)
    );
    return { pricePerBigha, basePrice, extraCharge, total: basePrice + extraCharge, minimumLandArea };
  })();

  const groupBookingQuote = (() => {
    const landArea = Number(bookingForm.landArea);
    const pricePerBigha = Number(machine?.price);
    if (bookingType !== "group" || !Number.isFinite(landArea) || landArea <= 0 || !Number.isFinite(pricePerBigha)) return null;

    const discountPercent = Number(machine?.pricingRules?.groupDiscountPercent ?? 10);
    const basePrice = pricePerBigha * landArea;
    const discountAmount = basePrice * discountPercent / 100;
    return { pricePerBigha, basePrice, discountPercent, discountAmount, total: basePrice - discountAmount };
  })();

  const formatMoney = (amount) => new Intl.NumberFormat(
    currentLanguage === "hi" ? "hi-IN" : "en-IN",
    { style: "currency", currency: "INR", maximumFractionDigits: 0 }
  ).format(amount);

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

  const detectBookingLocation = (saveForGroup = false) => {
    if (!navigator.geolocation) {
      setBookingLocationStatus("failed");
      setBookingLocationMessage("Location is unavailable. Enter it manually.");
      return;
    }

    setBookingLocationStatus("detecting");
    setBookingLocationMessage("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        const coordinateLabel = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setBookingForm((form) => ({
          ...form,
          customerLocation: form.customerLocation || coordinateLabel,
          latitude,
          longitude,
        }));

        let resolvedLocation = "";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (response.ok) {
            const address = (await response.json()).address || {};
            resolvedLocation = [
              address.village || address.locality || address.town || address.suburb || address.city,
              address.district || address.county,
              address.state,
              address.country,
            ].filter(Boolean).join(", ").slice(0, 200);
          }
        } catch {
          // Reverse geocoding is optional; coordinates are sufficient for group matching.
        }
        setBookingForm((form) => ({
          ...form,
          customerLocation: resolvedLocation || form.customerLocation || coordinateLabel,
          latitude,
          longitude,
        }));
        try {
          if (saveForGroup) {
            const profileUpdate = { latitude, longitude };
            if (resolvedLocation) profileUpdate.location = resolvedLocation;
            await axios.put("/api/auth/profile", profileUpdate, { withCredentials: true });
            await refreshUser();
          }
          setBookingLocationStatus("success");
          setBookingLocationMessage(saveForGroup
            ? "Location detected and saved for nearby group matching."
            : resolvedLocation ? "Location detected." : "Coordinates detected. Enter location name if needed.");
        } catch {
          if (saveForGroup) {
            setBookingLocationStatus("failed");
            setBookingLocationMessage("Coordinates were detected but could not be saved. Please try again before group booking.");
          } else {
            setBookingLocationStatus("success");
            setBookingLocationMessage("Coordinates detected. Enter location name if needed.");
          }
        }
      },
      () => {
        setBookingLocationStatus("failed");
        setBookingLocationMessage("Location permission denied. Enter it manually.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const openBooking = (type) => {
    if (!user) {
      navigate("/login", { state: { from: `/machines/${id}` } });
      return;
    }

    if (machine?.isOwner === true) {
      setError(
        t(
          "machineDetails.cannotBookOwnListing",
          "You cannot book your own listing."
        )
      );
      return;
    }

    const currentArea = Number(bookingForm.landArea);
    let resolvedType = type;
    if (type === "group" && Number.isFinite(currentArea) && currentArea >= 5) {
      resolvedType = "fast";
      setAutoShiftNotice(
        t(
          "machineDetails.autoShiftedToFastNotice",
          "Aapka land area 5 Bigha ya usse zyada hai, isliye booking automatically Fast Booking me shift kar di gayi hai (Direct booking, bina group wait ke)."
        )
      );
    } else {
      setAutoShiftNotice("");
    }

    setBookingType(resolvedType);
    setBookingSubmitted(false);
    setBookingModalError("");
    setBookingForm((form) => ({
      ...form,
      customerName: form.customerName || user?.name || "",
      ...(resolvedType === "group"
        ? {
            customerLocation: form.customerLocation || user?.location || "",
            latitude: user?.latitude ?? form.latitude,
            longitude: user?.longitude ?? form.longitude,
          }
        : {}),
    }));
    detectBookingLocation(resolvedType === "group");
  };

  useEffect(() => {
    if (searchParams.get("openBooking") === "true" && machine && !bookingType && !bookingSubmitted) {
      openBooking("fast");
    }
  }, [searchParams, machine]);

  const closeBooking = () => {
    setBookingType(null);
    setBookingSubmitted(false);
    setBookingModalError("");
    setAppliedOffer(null);
    setPromoCode("");
    setPromoError("");
    setManualPromoApplied(false);
    setShowPromoInput(false);
    setAutoShiftNotice("");
  };

  const checkAutoOffer = useCallback(async (currentLandArea, currentLocation) => {
    const area = Number(currentLandArea);
    if (!bookingType || !Number.isFinite(area) || area <= 0 || manualPromoApplied) {
      return;
    }

    try {
      setAutoOfferLoading(true);
      const response = await axios.post(
        "/api/offers/validate",
        {
          itemId: id,
          service: "Machine",
          category: machine?.category,
          landArea: area,
          location: currentLocation || bookingForm.customerLocation || user?.location || "",
          bookingType: bookingType === "group" ? "Group" : "Single",
        },
        { withCredentials: true }
      );

      if (response.data?.valid && response.data?.offer) {
        setAppliedOffer(response.data);
      } else if (!manualPromoApplied) {
        setAppliedOffer(null);
      }
    } catch (err) {
      console.warn("Auto-offer check error:", err?.response?.data?.message || err.message);
    } finally {
      setAutoOfferLoading(false);
    }
  }, [bookingType, id, machine?.category, manualPromoApplied, bookingForm.customerLocation, user?.location]);

  useEffect(() => {
    if (!bookingType || manualPromoApplied || !bookingForm.landArea) return;
    const timer = setTimeout(() => {
      checkAutoOffer(bookingForm.landArea, bookingForm.customerLocation);
    }, 250);
    return () => clearTimeout(timer);
  }, [bookingType, bookingForm.landArea, bookingForm.customerLocation, manualPromoApplied, checkAutoOffer]);

  const handleApplyPromo = async (e) => {
    if (e) e.preventDefault();
    if (!promoCode || !promoCode.trim()) {
      setPromoError(t("machineDetails.enterPromoCode", "Please enter a coupon code."));
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const response = await axios.post(
        "/api/offers/validate",
        {
          code: promoCode.trim().toUpperCase(),
          itemId: id,
          service: "Machine",
          category: machine?.category,
          landArea: Number(bookingForm.landArea),
          location: bookingForm.customerLocation,
          bookingType: bookingType === "group" ? "Group" : "Single",
        },
        { withCredentials: true }
      );

      if (response.data?.valid) {
        setAppliedOffer(response.data);
        setManualPromoApplied(true);
        setPromoError("");
      } else {
        setPromoError(response.data?.message || "Invalid coupon code.");
      }
    } catch (err) {
      console.error("Apply promo error:", err);
      setPromoError(
        err.response?.data?.message ||
        t("machineDetails.promoFailed", "Coupon code is invalid or not applicable.")
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedOffer(null);
    setPromoCode("");
    setPromoError("");
    setManualPromoApplied(false);
    if (bookingForm.landArea) {
      checkAutoOffer(bookingForm.landArea, bookingForm.customerLocation);
    }
  };

  const updateBookingField = (event) => {
    const { name, value } = event.target;

    if (name === "requiredDate") {
      const todayLocal = new Date().toLocaleDateString("en-CA");
      if (value && value < todayLocal) {
        setBookingModalError(t("bookings.pastDateError", "Please select a valid date. Past dates are not allowed."));
        setBookingForm((form) => ({
          ...form,
          [name]: "",
        }));
        return;
      } else {
        setBookingModalError("");
      }
    }

    setBookingForm((form) => ({
      ...form,
      [name]: value,
    }));

    if (name === "landArea") {
      const area = Number(value);
      if (bookingType === "group" && Number.isFinite(area) && area >= 5) {
        // Automatically shift from Group Booking to Fast Booking
        setBookingType("fast");
        setAutoShiftNotice(
          t(
            "machineDetails.autoShiftedToFastNotice",
            "Aapka land area 5 Bigha ya usse zyada hai, isliye booking automatically Fast Booking me shift ho gayi hai — bina group forming ke direct machine booking!"
          )
        );
      } else if (Number.isFinite(area) && area < 5 && autoShiftNotice) {
        setAutoShiftNotice("");
      }

      if (manualPromoApplied) {
        setAppliedOffer(null);
        setManualPromoApplied(false);
      }
    }
  };

  const submitBooking = async (event) => {
    event.preventDefault();

    if (!user) {
      setBookingType(null);
      navigate("/login", { state: { from: `/machines/${id}` } });
      return;
    }

    setBookingModalError("");

    const todayLocal = new Date().toLocaleDateString("en-CA");
    if (!bookingForm.requiredDate || bookingForm.requiredDate < todayLocal) {
      setBookingModalError(t("bookings.pastDateError", "Please select a valid date. Past dates are not allowed."));
      return;
    }

    if (bookingForm.requiredDate === todayLocal && bookingForm.preferredTime) {
      const timeMatch = String(bookingForm.preferredTime).trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const meridian = timeMatch[3]?.toUpperCase();
        if (meridian === "PM" && hours < 12) hours += 12;
        if (meridian === "AM" && hours === 12) hours = 0;
        const now = new Date();
        if (hours * 60 + minutes < now.getHours() * 60 + now.getMinutes() - 10) {
          setBookingModalError(t("bookings.pastDateError", "Please select a valid date. Past dates are not allowed."));
          return;
        }
      }
    }

    if (machine?.isOwner === true) {
      setBookingModalError(
        t(
          "machineDetails.cannotBookOwnListing",
          "You cannot book your own listing."
        )
      );
      return;
    }

    const hasSavedCoordinates = user?.latitude != null && user?.longitude != null
      && Number.isFinite(Number(user.latitude)) && Number.isFinite(Number(user.longitude));
    if (bookingType === "group" && !hasSavedCoordinates) {
      setBookingModalError("Save your farm coordinates in your profile before creating a group booking. Use the location button to detect and save them.");
      return;
    }

    setBookingSubmitting(true);

    try {
      const endpoint = bookingType === "group"
        ? "/api/group-bookings/create"
        : "/api/bookings/single";
      const response = await axios.post(endpoint, {
        itemId: id,
        location: bookingForm.customerLocation,
        latitude: bookingForm.latitude,
        longitude: bookingForm.longitude,
        landArea: bookingForm.landArea,
        bookingDate: bookingForm.requiredDate,
        workType: bookingForm.workType,
        preferredTime: bookingForm.preferredTime || searchParams.get("preferredTime") || undefined,
        originalBookingId: searchParams.get("originalBookingId") || undefined,
        message: `Booking requested by ${bookingForm.customerName}`,
        offerCode: appliedOffer?.offer?.code || null,
        offerId: appliedOffer?.offer?._id || null,
      });

      setActiveBooking(response.data);
      setCountdownSeconds(120);
      setBookingSubmitted(true);
      playBookingAlertSound();
      localStorage.setItem("workshetu-order-notice", JSON.stringify({
        type: bookingType === "group" ? "Group" : "Fast",
        bookingId: response.data?._id || response.data?.group?._id,
      }));
      window.dispatchEvent(new Event("workshetu-order-notice"));
      return response;
    } catch (bookingError) {
      console.error(bookingError);
      setBookingModalError(
        bookingError.response?.data?.message ||
          t("machineDetails.bookingSaveError", "Booking could not be created.")
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  // --------------------------------------------------
  // LIVE 2-MINUTE COUNTDOWN & STATUS POLLING
  // --------------------------------------------------

  useEffect(() => {
    if (!bookingSubmitted || !activeBooking?._id) return;
    if (activeBooking.status !== "Pending") return;

    // Countdown interval
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveBooking((curr) => curr ? { ...curr, status: "Expired" } : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Backend status poll interval
    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get("/api/group-bookings/my/requests", { withCredentials: true });
        const updated = (res.data?.bookings || []).find((b) => b._id === activeBooking._id);
        if (updated && updated.status !== "Pending") {
          setActiveBooking(updated);
          if (updated.status === "Accepted") {
            playBookingAlertSound();
          }
          clearInterval(pollInterval);
          clearInterval(timer);
        }
      } catch (pollErr) {
        console.warn("Status poll error:", pollErr.message);
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [bookingSubmitted, activeBooking?._id, activeBooking?.status]);

  const loadAlternatives = async (bookingId) => {
    if (!bookingId) return;
    try {
      setLoadingAlternatives(true);
      const res = await axios.get(`/api/group-bookings/single/${bookingId}/alternatives`, { withCredentials: true });
      setAlternativesList(res.data?.alternatives || []);
    } catch (err) {
      console.warn("Failed to load alternative machines:", err);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const rebookAlternative = async (altMachine) => {
    if (!altMachine?._id || !activeBooking?._id) return;
    try {
      setRebookingInProgress(true);
      const res = await axios.post("/api/bookings/single", {
        itemId: altMachine._id,
        originalBookingId: activeBooking._id,
        location: bookingForm.customerLocation,
        latitude: bookingForm.latitude,
        longitude: bookingForm.longitude,
        landArea: bookingForm.landArea,
        bookingDate: bookingForm.requiredDate,
        preferredTime: bookingForm.preferredTime,
        workType: bookingForm.workType,
        message: `Alternative booking requested for ${bookingForm.customerName}`
      }, { withCredentials: true });

      setActiveBooking(res.data);
      setCountdownSeconds(120);
      setAlternativesList([]);
      playBookingAlertSound();
    } catch (err) {
      setBookingModalError(err.response?.data?.message || "Failed to book alternative machine.");
    } finally {
      setRebookingInProgress(false);
    }
  };

  // --------------------------------------------------
  // REVIEWS
  // --------------------------------------------------

  const submitReview = async (event, reviewToSubmit = reviewForm) => {
    event?.preventDefault();

    if (!reviewToSubmit.rating) {
      setError(t("machineDetails.selectRating", "Please select a star rating before submitting."));
      return;
    }

    if (!user) {
      navigate("/login", {
        state: {
          from: `/machines/${id}`,
          pendingReview: {
            rating: reviewToSubmit.rating,
            text: reviewToSubmit.text,
          },
        },
      });
      return;
    }

    setError("");

    try {
      const endpoint = editingReviewId
        ? `/api/reviews/${editingReviewId}`
        : `/api/machine/${id}/reviews`;

      const method = editingReviewId ? "put" : "post";

      await axios({
        method,
        url: endpoint,
        data: {
          rating: reviewToSubmit.rating,
          text: reviewToSubmit.text,
        },
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

  useEffect(() => {
    const pendingReview = location.state?.pendingReview;
    if (!user || !pendingReview || autoSubmittedReview.current) return;

    autoSubmittedReview.current = true;
    navigate(location.pathname, { replace: true, state: null });
    setReviewForm({ reviewerName: "", rating: pendingReview.rating || 0, text: pendingReview.text || "" });
    submitReview(null, pendingReview);
  }, [user, location.pathname, location.state, navigate]);

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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Tractor size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Machine Listing Unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "This machine listing is currently unavailable for bookings. The owner's machinery is undergoing scheduled verification or is temporarily offline."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/machine")}
            className="mt-6 min-h-12 rounded-2xl bg-[#176b3a] px-6 text-sm font-black text-white shadow-lg shadow-green-900/20 transition hover:bg-[#125a31]"
          >
            Browse Available Machines
          </button>
        </div>
      </main>
    );
  }

  const isAvailable =
    machine.availability === "Available";

  const ownerId = machine.owner?._id || machine.owner;
  const isOwner = machine.isOwner === true || (
    user?._id && ownerId && String(ownerId) === String(user._id)
  );

  const driverObj = machine.driver || machine.owner || {};
  const driverName =
    driverObj.fullName ||
    driverObj.name ||
    (typeof machine.owner === "string" ? "Machinery Owner" : "Driver / Machinery Owner");
  const isDriverVerified = Boolean(
    driverObj.isVerified || driverObj.driverApplicationStatus === "Approved"
  );
  const driverLocation = driverObj.location || machine.location || "";
  const driverExperience =
    driverObj.driverExperience != null ? Number(driverObj.driverExperience) : 0;
  const driverPhone = driverObj.phone || "";
  const driverPhoto =
    driverObj.profileImage || driverObj.avatar || driverObj.photo || "";
  const driverVehicleNumber =
    machine.vehicleNumber || driverObj.driverVehicleNumber || "";

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) =>
              sum + Number(review.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : "-";

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-32 text-slate-900 lg:pb-16 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">

      <Navbar />

      {/* =====================================================
          MAIN CONTAINER — BALANCED 1200-1320px CONTAINER
      ===================================================== */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

        {/* =================================================
            BREADCRUMB & VERIFICATION BADGE
        ================================================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <button
              type="button"
              onClick={() => navigate("/machine")}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#166534]"
            >
              <ArrowLeft size={14} className="text-slate-400" />
              <span>{t("machines.title", "Farm Machinery")}</span>
            </button>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-slate-700 font-semibold">
              {getCategoryLabel(machine.category)}
            </span>
            {Boolean(machine.title?.trim()) && (
              <>
                <ChevronRight size={13} className="text-slate-300" />
                <span className="max-w-[200px] sm:max-w-xs truncate font-bold text-[#166534]">
                  {machine.title.trim()}
                </span>
              </>
            )}
          </nav>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-xs">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>{t("machineDetails.verifiedListing", "WorkShetu Verified Listing")}</span>
          </div>
        </div>

        {/* =================================================
            MAIN TWO-COLUMN MARKETPLACE LAYOUT
            Left Column: Showcase Gallery, Specs, Overview, Map, Reviews
            Right Column: Sticky Pricing, CTAs, Driver Operator, Farmer Assurance
        ================================================= */}
        <div className="grid gap-8 lg:grid-cols-[1.58fr_1fr] items-start">

          {/* ===============================================
              LEFT COLUMN — MACHINE PRODUCT SHOWCASE
          =============================================== */}
          <div className="space-y-6">

            {/* 1. MACHINE HEADER TITLE CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                  🚜 {getCategoryLabel(machine.category)}
                </span>

                {reviews.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          fill={star <= Math.round(Number(averageRating)) ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-black text-amber-950">{averageRating}</span>
                    <span className="text-xs text-amber-800/80">({reviews.length} {t("machineDetails.reviews", "reviews")})</span>
                  </div>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-[#172033] sm:text-3xl lg:text-4xl leading-tight">
                {machine.title?.trim() || "Agricultural Equipment"}
              </h1>

              {machine.location && (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 sm:text-sm">
                  <MapPin size={16} className="shrink-0 text-emerald-700" />
                  <span>{machine.location}</span>
                </div>
              )}
            </div>

            {/* 2. LARGE MACHINE IMAGE SHOWCASE */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-100 shadow-sm">
              {machine.image?.url ? (
                <img
                  src={machine.image.url}
                  alt={machine.title || t("machineDetails.farmMachine", "Farm machine")}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-lime-50 to-slate-100 text-slate-400">
                  <span className="text-7xl sm:text-8xl">🚜</span>
                  <p className="mt-3 text-sm font-bold text-slate-500">Image awaiting driver upload</p>
                </div>
              )}

              {/* Status Badges on Image */}
              <div className="absolute left-4 top-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/60 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md">
                  🚜 {getCategoryLabel(machine.category)}
                </span>
              </div>

              <div className="absolute right-4 top-4">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black shadow-md backdrop-blur-md ${
                    isAvailable
                      ? "border border-emerald-400/40 bg-emerald-600/95 text-white"
                      : "border border-slate-700/50 bg-slate-900/90 text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isAvailable ? "bg-white animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  {isAvailable
                    ? t("machines.available", "Available for Rent")
                    : t("machines.booked", "Currently Booked")}
                </span>
              </div>
            </div>

            {/* 3. FOUR BALANCED CORE SPECIFICATIONS */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">

              {/* Item 1: Power */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs transition hover:border-emerald-300">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#166534]">
                    <Gauge size={18} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("machines.power", "Power")}
                  </span>
                </div>
                <p className="mt-3 text-base font-black text-[#172033] sm:text-lg">
                  {machine.power
                    ? `${machine.power} HP`
                    : "40 HP"}
                </p>
              </div>

              {/* Item 2: Fuel */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs transition hover:border-emerald-300">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#166534]">
                    <Fuel size={18} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("machines.fuel", "Fuel")}
                  </span>
                </div>
                <p className="mt-3 truncate text-base font-black text-[#172033] sm:text-lg">
                  {machine.fuelType || t("machineDetails.diesel", "Diesel")}
                </p>
              </div>

              {/* Item 3: Rental Unit */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs transition hover:border-emerald-300">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#166534]">
                    <Clock3 size={18} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("machineDetails.rentalUnit", "Rental Unit")}
                  </span>
                </div>
                <p className="mt-3 text-base font-black text-[#172033] sm:text-lg">
                  {getUnitLabel(machine.unit)}
                </p>
              </div>

              {/* Item 4: Model Year */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs transition hover:border-emerald-300">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#166534]">
                    <CalendarDays size={18} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t("machineDetails.modelYear", "Model Year")}
                  </span>
                </div>
                <p className="mt-3 text-base font-black text-[#172033] sm:text-lg">
                  {machine.year || "2024"}
                </p>
              </div>

            </div>

            {/* 4. MACHINE OVERVIEW & DESCRIPTION */}
            <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Tractor size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
                    {t("machineDetails.aboutLabel", "Equipment Details")}
                  </p>
                  <h2 className="mt-0.5 text-xl font-black text-slate-900 sm:text-2xl">
                    {t("machineDetails.readyForWork", "Machine Overview & Specifications")}
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                {machine.description ||
                  t(
                    "machineDetails.noDescription",
                    "Well-maintained agricultural machinery ready for field operations. Suitable for heavy-duty farming tasks with high fuel efficiency and experienced operator availability."
                  )}
              </p>

              {/* SPECIFICATION TILES */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("machineDetails.category", "Category")}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {getCategoryLabel(machine.category)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("machineDetails.vehicleNumber", "Vehicle Identification")}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {machine.vehicleNumber || driverVehicleNumber || t("machineDetails.notApplicable", "Verified on platform")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("machineDetails.bookingType", "Available Booking Types")}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {t("machineDetails.fastAndGroup", "Fast Booking (Instant) & Group Booking")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t("machineDetails.status", "Operational Status")}
                  </p>
                  <p className={`mt-1 text-sm font-black ${isAvailable ? "text-emerald-700" : "text-amber-700"}`}>
                    {isAvailable ? t("machines.available", "Available for immediate booking") : t("machines.booked", "Currently reserved")}
                  </p>
                </div>
              </div>
            </section>

            {/* 5. MACHINE LOCATION & MAP */}
            <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
                      {t("machineDetails.locationLabel", "Location")}
                    </p>
                    <h2 className="mt-0.5 text-lg font-black text-slate-900 sm:text-xl line-clamp-1">
                      {machine.location || t("machineDetails.locationNotAvailable", "Location unavailable")}
                    </h2>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <MapPin size={20} />
                  </div>
                </div>
              </div>

              {mapUrl ? (
                <iframe
                  title={t("machineDetails.mapTitle", "Machine location map")}
                  src={mapUrl}
                  className="h-64 w-full border-0 sm:h-72"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-64 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400 sm:h-72">
                  {t("machineDetails.mapUnavailable", "Map location unavailable")}
                </div>
              )}

              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 bg-slate-50/50">
                <div className="flex min-w-0 items-center gap-2">
                  <Navigation size={16} className="shrink-0 text-emerald-700" />
                  <span className="truncate text-xs font-bold text-slate-600">
                    {machine.location || t("machineDetails.locationNotAvailable", "Location unavailable")}
                  </span>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-emerald-100/80 px-3.5 py-1.5 text-xs font-black text-emerald-900 transition hover:bg-emerald-200"
                >
                  <span>{t("machineDetails.openMap", "Open in Google Maps")}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </section>

            {/* 6. REVIEWS & FARMER FEEDBACK */}
            <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
                    {t("machineDetails.communityFeedback", "Community Feedback")}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    {t("machineDetails.reviewsFromFarmers", "Reviews from Farmers")}
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-2">
                  <span className="text-2xl font-black text-slate-900">
                    {averageRating}
                  </span>
                  <div className="flex text-amber-400" aria-label={t("machineDetails.rating", "Rating")}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        fill={star <= Math.round(Number(averageRating)) ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    ({reviews.length})
                  </span>
                </div>
              </div>

              {/* REVIEW SUBMISSION FORM */}
              <form onSubmit={submitReview} className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    {t("machineDetails.rateThisMachine", "Rate this machine & service")}
                  </label>
                  <div className="flex h-11 w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3" aria-label={t("machineDetails.chooseRating", "Choose rating")}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating })}
                        className={`transition hover:scale-125 ${
                          rating <= reviewForm.rating ? "text-amber-400" : "text-slate-300"
                        }`}
                        aria-label={t("machineDetails.starRating", `${rating} star rating`)}
                        aria-pressed={rating === reviewForm.rating}
                      >
                        <Star size={20} fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  required
                  value={reviewForm.text}
                  onChange={(event) => setReviewForm({ ...reviewForm, text: event.target.value })}
                  placeholder={t("machineDetails.shareExperience", "Share your experience with this machine, driver punctuality, and field work quality...")}
                  rows="3"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#166534] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#14532d] active:scale-95 shadow-xs"
                  >
                    {editingReviewId
                      ? t("machineDetails.updateReview", "Update review")
                      : t("machineDetails.addReview", "Add review")}
                  </button>

                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={cancelEditReview}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                    >
                      {t("machineDetails.cancel", "Cancel")}
                    </button>
                  )}
                </div>
              </form>

              {/* REVIEWS LIST */}
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {reviews.length === 0 && (
                  <p className="text-sm text-slate-500 md:col-span-2 py-4 text-center">
                    {t("machineDetails.noReviews", "No reviews yet. Be the first to review this machine.")}
                  </p>
                )}

                {reviews.map((review) => {
                  const isReviewAuthor = Boolean(
                    user?._id && review.author?._id && String(review.author._id) === String(user._id)
                  );
                  const reviewerName = review.reviewerName || t("machineDetails.farmer", "Farmer");

                  return (
                    <article key={review._id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-xs font-black text-white">
                            {reviewerName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-900">{reviewerName}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString(reviewLocale) : "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={13}
                                fill={star <= Number(review.rating || 0) ? "currentColor" : "none"}
                              />
                            ))}
                          </div>

                          {isReviewAuthor && (
                            <button
                              type="button"
                              onClick={() => editReview(review)}
                              className="text-slate-400 hover:text-emerald-700 ml-1"
                              aria-label={t("machineDetails.editReview", "Edit review")}
                            >
                              <Pencil size={14} />
                            </button>
                          )}

                          {isReviewAuthor && (
                            <button
                              type="button"
                              onClick={() => deleteReview(review._id)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label={t("machineDetails.deleteReview", "Delete review")}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-3.5 text-sm leading-6 text-slate-600">
                        {review.text}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

          </div>

          {/* ===============================================
              RIGHT COLUMN — STICKY PRICING, CTAS, DRIVER, ASSURANCE
          =============================================== */}
          <aside className="space-y-6 lg:sticky lg:top-8">

            {/* 1. RENTAL PRICE & BOOKING ACTIONS CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    <Tag size={12} className="text-emerald-700" />
                    <span>{t("machineDetails.rentalPrice", "Rental Rate")}</span>
                  </span>
                  <div className="mt-2.5 flex flex-wrap items-baseline gap-1.5">
                    <span className="text-3xl font-black tracking-tight text-[#123B2A] sm:text-4xl">
                      {price}
                    </span>
                    <span className="text-sm font-bold text-slate-500">
                      / {getUnitLabel(machine.unit)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
                    saved
                      ? "border-red-200 bg-red-50 text-red-500 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                  aria-label={t("machineDetails.saveMachine", "Save machine")}
                >
                  <Heart
                    size={20}
                    fill={saved ? "currentColor" : "none"}
                  />
                </button>
              </div>

              {/* Status pill */}
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    isAvailable
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
                      : "bg-amber-50 text-amber-800 border border-amber-200/70"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {isAvailable ? "Available for Instant Booking" : "Currently Booked"}
                </span>
              </div>

              {/* Booking CTAs */}
              <div className="mt-6 space-y-3">
                {!isOwner ? (
                  <>
                    {/* Primary Fast Booking CTA */}
                    <button
                      type="button"
                      onClick={() => openBooking("fast")}
                      disabled={!isAvailable}
                      className="group relative flex min-h-[52px] w-full flex-col items-center justify-center rounded-2xl bg-[#166534] px-4 py-3 text-white shadow-lg shadow-emerald-950/20 transition-all hover:bg-[#14532d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 text-sm font-black">
                        <Clock3 size={18} className="transition group-hover:scale-110" />
                        <span>{t("machineDetails.fastBooking", "Fast Booking")}</span>
                      </div>
                      <span className="mt-0.5 text-[11px] font-medium text-emerald-100">
                        Instant 2-minute driver confirmation
                      </span>
                    </button>

                    {/* Secondary Group Booking CTA */}
                    <button
                      type="button"
                      onClick={() => openBooking("group")}
                      disabled={!isAvailable}
                      className="group flex min-h-[50px] w-full flex-col items-center justify-center rounded-2xl border-2 border-emerald-600/80 bg-[#F0FDF4] px-4 py-2.5 text-[#166534] transition hover:bg-emerald-100 hover:border-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-900">
                        <Tractor size={18} className="transition group-hover:scale-110 text-emerald-700" />
                        <span>{t("machineDetails.groupBooking", "Group Booking")}</span>
                      </div>
                      <span className="mt-0.5 text-[11px] font-medium text-emerald-700">
                        Pool with neighbors & save up to 15%
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-900">
                      {t("machineDetails.yourOwnListing", "Your Listing")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800/80">
                      {t(
                        "machineDetails.cannotBookOwnListing",
                        "You cannot book your own listing."
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. VERIFIED DRIVER / MACHINERY OPERATOR CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                  {t("machineDetails.verifiedDriverOperator", "Machinery Operator")}
                </span>
                {isDriverVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                    <ShieldCheck size={12} className="text-emerald-700" /> Verified Driver
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-start gap-4">
                {/* Profile Photo / Fallback Avatar */}
                <div className="relative shrink-0">
                  {driverPhoto ? (
                    <img
                      src={driverPhoto}
                      alt={driverName}
                      className="h-15 w-15 rounded-2xl object-cover ring-2 ring-emerald-200 shadow-xs"
                    />
                  ) : (
                    <div className="flex h-15 w-15 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#123B2A] text-white font-black text-lg ring-2 ring-emerald-200 shadow-xs">
                      {driverName ? driverName.slice(0, 2).toUpperCase() : <UserRound size={24} />}
                    </div>
                  )}
                  {isDriverVerified && (
                    <span
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs ring-2 ring-white"
                      title="Verified Driver"
                    >
                      <ShieldCheck size={12} />
                    </span>
                  )}
                </div>

                {/* Driver Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-black text-slate-900">
                    {driverName}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-800">
                    {isDriverVerified ? "Registered & Verified Operator" : "Equipment Owner"}
                  </p>

                  <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                    {driverExperience > 0 && (
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-700" />
                        <span>{driverExperience} Years Operating Experience</span>
                      </p>
                    )}
                    {driverLocation && (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="shrink-0 text-emerald-700" />
                        <span className="truncate">{driverLocation}</span>
                      </p>
                    )}
                    {driverVehicleNumber && (
                      <p className="flex items-center gap-1.5">
                        <Tractor size={13} className="shrink-0 text-emerald-700" />
                        <span>{driverVehicleNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* STRICT DRIVER PHONE PRIVACY SECTION */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                {(() => {
                  const canSeePhone = Boolean(
                    (machine.canViewDriverPhone || activeBooking?.status === "Accepted" || isOwner) &&
                    (driverPhone || activeBooking?.driver?.phone)
                  );
                  const resolvedPhone = driverPhone || activeBooking?.driver?.phone || "";

                  if (canSeePhone && resolvedPhone) {
                    return (
                      <div className="space-y-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                            Driver Contact Unlocked
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 size={12} /> Booking Accepted
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone size={15} className="text-emerald-700 shrink-0" />
                          <span className="text-base font-black text-slate-900 tracking-wide">
                            {resolvedPhone}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={`tel:${resolvedPhone}`}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#166534] px-3 text-xs font-black text-white shadow-xs transition hover:bg-[#14532d]"
                          >
                            <Phone size={14} />
                            <span>Call Driver</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => navigate("/chat")}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-black text-emerald-900 transition hover:bg-emerald-50"
                          >
                            <MessageSquare size={14} className="text-emerald-700" />
                            <span>WorkShetu Chat</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Default: Contact is strictly protected
                  return (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-slate-700 mt-0.5">
                          <Lock size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            Driver Contact Protected
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Direct phone number and direct call button will unlock immediately once the driver accepts your booking request.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. WORKSHETU FARMER ASSURANCE & SIMPLE PROCESS */}
            <div className="rounded-3xl bg-gradient-to-br from-[#123B2A] to-[#0A2619] p-6 text-white shadow-lg shadow-emerald-950/15 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lime-300">
                  <Sparkles size={11} />
                  <span>Farmer Protection</span>
                </span>
              </div>

              <h3 className="mt-2 text-lg font-black text-white sm:text-xl">
                How Renting Works for Farmers
              </h3>

              <div className="mt-4 space-y-3 text-xs text-white/80">
                <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 backdrop-blur-xs">
                  <span className="font-black text-lime-300">01</span>
                  <div>
                    <span className="font-bold text-white">Select Date & Land Area</span>
                    <p className="mt-0.5 text-[11px] text-white/70">Upfront transparent rate with zero hidden booking charges.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 backdrop-blur-xs">
                  <span className="font-black text-lime-300">02</span>
                  <div>
                    <span className="font-bold text-white">2-Min Driver Confirmation</span>
                    <p className="mt-0.5 text-[11px] text-white/70">Instant response deadline. Auto-alternative options if driver is busy.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 backdrop-blur-xs">
                  <span className="font-black text-lime-300">03</span>
                  <div>
                    <span className="font-bold text-white">OTP Handover on Completion</span>
                    <p className="mt-0.5 text-[11px] text-white/70">Share completion OTP only after field operation is satisfactorily done.</p>
                  </div>
                </div>
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* =====================================================
          MOBILE STICKY BOTTOM BOOKING BAR (lg:hidden)
      ===================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-slate-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("machineDetails.rentalPrice", "Rental Rate")}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#123B2A]">{price}</span>
              <span className="text-xs font-bold text-slate-500">/ {getUnitLabel(machine.unit)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => openBooking("group")}
                  disabled={!isAvailable}
                  className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-600 bg-[#F0FDF4] px-3.5 text-xs font-black text-[#166534] transition hover:bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Tractor size={15} className="text-emerald-700" />
                  <span>Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => openBooking("fast")}
                  disabled={!isAvailable}
                  className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#166534] px-4 py-2 text-xs font-black text-white shadow-md shadow-emerald-950/20 transition hover:bg-[#14532d] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clock3 size={15} />
                  <span>Fast Booking</span>
                </button>
              </>
            ) : (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                Your Listing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          BOOKING MODAL
      ===================================================== */}

      {bookingType && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">

          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">

            <div className="flex items-start justify-between gap-4">

              <div>
                <div className="flex items-center gap-2">
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
                  {autoShiftNotice && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      <Zap size={10} /> Auto-Shifted
                    </span>
                  )}
                </div>

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
                <X size={18} />
              </button>
            </div>

            {autoShiftNotice && !bookingSubmitted && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-950 shadow-sm dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                <Zap size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <span className="font-black">Auto-Shifted to Fast Booking (5+ Bigha)</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300/80">
                    {autoShiftNotice}
                  </p>
                </div>
              </div>
            )}

            {bookingModalError && !bookingSubmitted && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-950 shadow-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <span className="font-black">Booking Notice</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-rose-800/90 dark:text-rose-300/80">
                    {bookingModalError}
                  </p>
                </div>
              </div>
            )}

            {/* LIVE 2-MINUTE STATUS & CONFIRMATION TRACKER */}

            {bookingSubmitted ? (
              <div className="mt-6 space-y-4">
                {activeBooking?.status === "Accepted" ? (
                  <div className="rounded-3xl border border-green-300 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/40">
                    <CheckCircle2 className="mx-auto text-green-700 dark:text-lime-400" size={44} />
                    <h3 className="mt-3 text-xl font-black text-green-950 dark:text-white">Driver Confirmed Booking!</h3>
                    <p className="mt-1 text-sm text-green-800/80 dark:text-green-300">
                      The owner accepted your request. Your machinery is reserved.
                    </p>
                    {activeBooking.completionOtp && (
                      <div className="mt-4 rounded-2xl border border-green-200 bg-white p-4 shadow-sm dark:border-green-900 dark:bg-slate-900">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Work Completion OTP</p>
                        <p className="mt-1 text-3xl font-black tracking-widest text-green-700 dark:text-lime-300">
                          {activeBooking.completionOtp}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">Share this OTP with driver only after completion</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { closeBooking(); navigate("/bookings?type=machine"); }}
                      className="mt-5 w-full rounded-2xl bg-green-700 py-3.5 text-sm font-black text-white shadow-lg shadow-green-700/20 hover:bg-green-800"
                    >
                      View in My Bookings
                    </button>
                  </div>
                ) : activeBooking?.status === "Rejected" || activeBooking?.status === "Expired" || countdownSeconds === 0 ? (
                  <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-6 text-center dark:border-amber-800 dark:bg-amber-950/40">
                    <AlertCircle className="mx-auto text-amber-600 dark:text-amber-400" size={44} />
                    <h3 className="mt-3 text-xl font-black text-amber-950 dark:text-white">Driver Did Not Confirm</h3>
                    <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-300">
                      {activeBooking?.status === "Rejected"
                        ? "The driver was unavailable for this booking time."
                        : "The 2-minute confirmation window expired without a response."}
                    </p>

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => loadAlternatives(activeBooking?._id)}
                        disabled={loadingAlternatives}
                        className="w-full rounded-2xl bg-[#123524] py-3.5 text-sm font-black text-white shadow-lg hover:bg-green-800 transition disabled:opacity-50"
                      >
                        {loadingAlternatives ? "Finding Alternative Machines..." : "🚜 Find Another Available Machine"}
                      </button>
                    </div>

                    {alternativesList.length > 0 && (
                      <div className="mt-5 space-y-3 text-left">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Matching Verified Machines Nearby ({alternativesList.length})
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {alternativesList.map((alt) => (
                            <div
                              key={alt._id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900 dark:text-white">{alt.title}</p>
                                <p className="text-xs font-bold text-green-700 dark:text-lime-300">
                                  ₹{alt.price} / {alt.unit} {alt.distanceKm != null ? `· ${alt.distanceKm} km away` : ""}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={rebookingInProgress}
                                onClick={() => rebookAlternative(alt)}
                                className="shrink-0 rounded-xl bg-green-700 px-3.5 py-2 text-xs font-black text-white hover:bg-green-800 disabled:opacity-50"
                              >
                                {rebookingInProgress ? "Booking..." : "Book Now"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* LIVE PENDING COUNTDOWN TRACKER */
                  <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50/80 to-white p-6 text-center dark:border-green-900 dark:from-green-950/30 dark:to-slate-900 shadow-sm">
                    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-green-600 transition-all duration-1000 dark:text-lime-400"
                          strokeDasharray={`${(countdownSeconds / 120) * 100}, 100`}
                          strokeLinecap="round"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {`${Math.floor(countdownSeconds / 60)}:${String(countdownSeconds % 60).padStart(2, "0")}`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Wait</span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                      Waiting for Machine Owner Response
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      We notified the owner. They have 2 minutes to confirm or decline this request.
                    </p>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3 border border-slate-200 text-xs font-bold dark:border-slate-800 dark:bg-slate-800">
                      <span className="text-slate-500">Service:</span>
                      <span className="text-slate-800 dark:text-slate-200">{machine?.title} ({bookingForm.landArea} Bigha)</span>
                    </div>

                    <button
                      type="button"
                      onClick={closeBooking}
                      className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 underline"
                    >
                      Close and track from My Bookings
                    </button>
                  </div>
                )}
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

                  <div className="text-sm font-bold text-slate-700">
                    {t(
                      "machineDetails.farmLocation",
                      "Farm location"
                    )}

                    <div className="mt-1.5 flex gap-2">
                      <input
                        required
                        name="customerLocation"
                        value={
                          bookingForm.customerLocation
                        }
                        onChange={
                          updateBookingField
                        }
                        className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 font-medium outline-none focus:border-green-600"
                      />
                      <button
                        type="button"
                        onClick={detectBookingLocation}
                        disabled={bookingLocationStatus === "detecting"}
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-green-700 px-3 text-xs font-black text-white disabled:opacity-60"
                      >
                        <MapPin size={15} />
                        {bookingLocationStatus === "detecting" ? "Detecting" : "Use location"}
                      </button>
                    </div>
                    {bookingLocationMessage && (
                      <p className={`mt-1 text-xs font-medium ${bookingLocationStatus === "failed" ? "text-amber-700" : "text-green-700"}`}>
                        {bookingLocationMessage}
                      </p>
                    )}
                  </div>
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

                {Number(bookingForm.landArea) > 0 && Number(bookingForm.landArea) < 5 && bookingType === "fast" && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    <span>💡 5 Bigha se kam area ke liye aap Group Pooling bhi chun sakte hain.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingType("group");
                        setAutoShiftNotice("");
                      }}
                      className="font-bold text-green-800 underline hover:text-green-950 dark:text-lime-300"
                    >
                      Group Booking
                    </button>
                  </div>
                )}

                {/* COUPONS & PROMOTIONS SECTION */}
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      <Tag size={14} className="text-emerald-600" />
                      <span>{t("machineDetails.haveCoupon", "Offers & Promotions")}</span>
                    </div>
                    {appliedOffer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Sparkles size={12} />
                        {appliedOffer.breakdown.actualDiscount > 0
                          ? `Saved ${formatMoney(appliedOffer.breakdown.actualDiscount)}`
                          : "Applied"}
                      </span>
                    )}
                  </div>

                  {/* CASE 1: AUTOMATIC OFFER APPLIED */}
                  {appliedOffer?.offer?.isAutomatic ? (
                    <div className="mt-2.5 space-y-2">
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-xs dark:border-emerald-800 dark:bg-emerald-950/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                              <Sparkles size={11} /> Auto Applied
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {appliedOffer.offer.title}
                            </span>
                          </div>
                          <span className="font-black text-emerald-700 dark:text-emerald-300">
                            {appliedOffer.offer.discountType === "Percentage"
                              ? `${appliedOffer.offer.discountValue}% OFF`
                              : `- ${formatMoney(appliedOffer.offer.discountValue)}`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-900/80 dark:text-emerald-300/80">
                          {appliedOffer.offer.firstBookingOnly
                            ? "Special First Booking Discount automatically applied for your account!"
                            : "Platform offer automatically applied. No promo code needed!"}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <MapPin size={11} className="shrink-0 text-emerald-600" />
                          <span>
                            {appliedOffer.offer.applicableLocations && appliedOffer.offer.applicableLocations.length > 0
                              ? `Valid in: ${appliedOffer.offer.applicableLocations.join(", ")}`
                              : "Available across supported WorkShetu service areas"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowPromoInput(!showPromoInput)}
                          className="font-bold text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
                        >
                          {showPromoInput
                            ? t("machineDetails.hidePromoInput", "Close coupon input")
                            : t("machineDetails.haveAnotherPromo", "Have a different coupon code? Enter here")}
                        </button>
                      </div>
                    </div>
                  ) : appliedOffer ? (
                    /* CASE 2: MANUAL PROMO CODE APPLIED */
                    <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs dark:border-emerald-800 dark:bg-emerald-950/40">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 font-mono font-black text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200">
                          {appliedOffer.offer.code}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          ({appliedOffer.offer.title})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-700 font-medium dark:text-emerald-400 hidden sm:inline">
                          {appliedOffer.offer.applicableLocations && appliedOffer.offer.applicableLocations.length > 0
                            ? appliedOffer.offer.applicableLocations.join(", ")
                            : "All Locations"}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="font-bold text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-400"
                        >
                          {t("machineDetails.remove", "Remove")}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* PROMO CODE INPUT BOX: SHOW IF NO OFFER OR IF USER WANTS TO OVERRIDE AUTO OFFER */}
                  {(!appliedOffer || showPromoInput) && (
                    <div className="mt-2.5 flex gap-2">
                      <input
                        type="text"
                        placeholder={t("machineDetails.enterPromoPlaceholder", "Enter promo code (e.g. TRACTOR500)")}
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          if (promoError) setPromoError("");
                        }}
                        disabled={promoLoading}
                        className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-800 outline-none focus:border-emerald-600 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {promoLoading ? "..." : t("machineDetails.apply", "Apply")}
                      </button>
                    </div>
                  )}

                  {autoOfferLoading && !appliedOffer && (
                    <p className="mt-2 text-[11px] font-medium text-emerald-700 animate-pulse dark:text-emerald-400">
                      Checking available promotions...
                    </p>
                  )}

                  {promoError && (
                    <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {promoError}
                    </p>
                  )}
                </div>

                {fastBookingQuote && (
                  <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm dark:border-green-900 dark:from-green-950/40 dark:to-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-green-900 dark:text-green-200">
                        {t("machineDetails.priceEstimate", "Fast booking price estimate")}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {bookingForm.landArea} {getUnitLabel(bookingForm.areaUnit)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                        <span>{t("machineDetails.pricePerBigha", "Machine rate per Bigha")}</span>
                        <span className="font-bold">{formatMoney(fastBookingQuote.pricePerBigha)} / Bigha</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                        <span>{t("machineDetails.basePrice", "Base price")} ({bookingForm.landArea} × {formatMoney(fastBookingQuote.pricePerBigha)})</span>
                        <span className="font-bold">{formatMoney(fastBookingQuote.basePrice)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                        <span>{t("machineDetails.additionalCharge", "Additional charge")}</span>
                        <span className="font-bold">{fastBookingQuote.extraCharge ? `+ ${formatMoney(fastBookingQuote.extraCharge)}` : formatMoney(0)}</span>
                      </div>
                      {fastBookingQuote.extraCharge > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("machineDetails.smallLandChargeNote", "Applies below {{area}} Bigha.", { area: fastBookingQuote.minimumLandArea })}
                        </p>
                      )}
                      {appliedOffer && appliedOffer.breakdown && appliedOffer.breakdown.actualDiscount > 0 && (
                        <>
                          <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                            <span>{t("machineDetails.originalPrice", "Original payable")}</span>
                            <span className="font-bold">{formatMoney(appliedOffer.breakdown.originalFarmerPayable || fastBookingQuote.total)}</span>
                          </div>
                          <div className="flex justify-between gap-3 font-semibold text-emerald-700 dark:text-emerald-300">
                            <span>
                              {t("machineDetails.promoDiscount", "Offer discount")}{" "}
                              {appliedOffer.offer.code ? `(${appliedOffer.offer.code})` : `(${appliedOffer.offer.title})`}
                            </span>
                            <span className="font-bold">- {formatMoney(appliedOffer.breakdown.actualDiscount)}</span>
                          </div>
                          <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/90 p-2.5 my-2 text-xs dark:border-emerald-800 dark:bg-emerald-950/50">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                              <span>Platform-Funded Promotion</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-emerald-950 dark:text-emerald-300 font-medium">
                              "Your discount is funded by WorkShetu. Your Driver's agreed payment is not reduced."
                            </p>
                            <div className="mt-1.5 pt-1.5 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                              <span>Driver's Protected Payout:</span>
                              <span className="font-bold">{formatMoney(appliedOffer.breakdown.driverPayout || fastBookingQuote.total)} (100% Guaranteed)</span>
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between gap-3 border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                        <span>{appliedOffer?.breakdown?.actualDiscount > 0 ? "Farmer Final Payable" : t("machineDetails.totalEstimate", "Estimated total")}</span>
                        <span>
                          {appliedOffer && appliedOffer.breakdown
                            ? formatMoney(appliedOffer.breakdown.finalPayableAmount)
                            : formatMoney(fastBookingQuote.total)}
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {groupBookingQuote && (
                  <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm dark:border-green-900 dark:from-green-950/40 dark:to-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-green-900 dark:text-green-200">
                        {t("machineDetails.groupPriceEstimate", "Group booking amount estimate")}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {bookingForm.landArea} {getUnitLabel(bookingForm.areaUnit)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                        <span>{t("machineDetails.pricePerBigha", "Machine rate per Bigha")}</span>
                        <span className="font-bold">{formatMoney(groupBookingQuote.pricePerBigha)} / Bigha</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                        <span>{t("machineDetails.basePrice", "Base price")} ({bookingForm.landArea} × {formatMoney(groupBookingQuote.pricePerBigha)})</span>
                        <span className="font-bold">{formatMoney(groupBookingQuote.basePrice)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-green-800 dark:text-green-300">
                        <span>{t("machineDetails.groupDiscount", "Group discount ({{percent}}%)", { percent: groupBookingQuote.discountPercent })}</span>
                        <span className="font-bold">- {formatMoney(groupBookingQuote.discountAmount)}</span>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                        <span>{t("machineDetails.discountedGroupTotal", "Your estimated group total")}</span>
                        <span>{formatMoney(groupBookingQuote.total)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("machineDetails.groupNoExtraCharge", "Group bookings include the group discount and no additional land-area charge.")}
                      </p>
                    </div>
                  </section>
                )}

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
                    min={new Date().toLocaleDateString("en-CA")}
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

    </main>
  );
}

export default MachineDetails;
