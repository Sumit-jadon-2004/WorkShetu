import { useCallback, useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCw,
  ShieldCheck,
  Star,
  Tractor,
  HardHat,
  UserRound,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n.js";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const statusStyles = {
  Pending: "bg-amber-100 text-amber-800",
  RequestSent: "bg-amber-100 text-amber-800",
  Accepted: "bg-green-100 text-green-800",
  Completed: "bg-slate-200 text-slate-700",
  Rejected: "bg-red-100 text-red-800",
  Expired: "bg-red-100 text-red-800",
  Cancelled: "bg-slate-200 text-slate-700",
  Forming: "bg-blue-100 text-blue-800",
};

function DirectionsLink({ latitude, longitude }) {
  const { t } = useTranslation();
  if (latitude == null || longitude == null) return null;
  return (
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-800 transition hover:bg-blue-100"
    >
      <Navigation size={15} />
      {t("bookings.viewMachineLocation", "View machine location")}
    </a>
  );
}

function CompletionCode({ otp, isLabour = false }) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  if (!otp) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(String(otp));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const isHindi = i18n.language && i18n.language.startsWith("hi");

  return (
    <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-950 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span>{isLabour ? (isHindi ? "कार्य पूर्णता कोड (Completion OTP)" : "Worker Completion OTP") : t("bookings.completionOtp", "Work completion OTP")}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200"
        >
          {copied ? (isHindi ? "कॉपी हो गया!" : "Copied!") : (isHindi ? "OTP कॉपी करें" : "Copy OTP")}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="font-mono text-3xl font-black tracking-[0.4em] text-emerald-900 dark:text-emerald-100">{otp}</p>
      </div>
      <p className="mt-2 text-xs font-medium text-emerald-800/90 dark:text-emerald-300">
        ⚠️ {isHindi
          ? `काम पूरा होने के बाद ही यह OTP ${isLabour ? "लेबर / वर्कर" : "ड्राइवर"} को बताएं।`
          : `Share this OTP with the ${isLabour ? "worker" : "driver"} ONLY after the work is fully finished.`}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
        statusStyles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status === "Expired"
        ? "Expired"
        : t(`driver.status.${status}`, status)}
    </span>
  );
}

function InlineAlternativeMachines({ booking, allBookings, onBookingSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmMachine, setConfirmMachine] = useState(null);
  const [radius, setRadius] = useState(5);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [requiresLocation, setRequiresLocation] = useState(false);

  // Check if an alternative request was already created for this booking
  const existingAltBooking = allBookings?.find(
    (b) =>
      String(b.originalBookingId) === String(booking._id) &&
      ["Pending", "Accepted", "Completed"].includes(b.status)
  );

  const fetchAlternatives = useCallback(async (customRadius = radius, customCoords = customerCoords) => {
    try {
      setLoading(true);
      setError("");
      setRequiresLocation(false);
      const params = new URLSearchParams({ radius: customRadius });
      if (customCoords?.latitude != null && customCoords?.longitude != null) {
        params.append("latitude", customCoords.latitude);
        params.append("longitude", customCoords.longitude);
      }
      const res = await axios.get(
        `/api/group-bookings/single/${booking._id}/alternatives?${params.toString()}`,
        { withCredentials: true }
      );
      if (res.data?.requiresLocation) {
        setRequiresLocation(true);
      }
      setAlternatives(res.data?.alternatives || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load alternative machines for this category."
      );
    } finally {
      setLoading(false);
    }
  }, [booking._id, radius, customerCoords]);

  useEffect(() => {
    if (!existingAltBooking) {
      fetchAlternatives(radius, customerCoords);
    }
  }, [fetchAlternatives, existingAltBooking]);

  const handleSetRadius = (newRadius) => {
    setRadius(newRadius);
    fetchAlternatives(newRadius, customerCoords);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        setCustomerCoords(coords);
        fetchAlternatives(radius, coords);
      },
      (err) => {
        setLocating(false);
        setError("Could not detect location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectAlternative = async (alt) => {
    setSubmittingId(alt._id);
    setError("");
    try {
      const payload = {
        itemId: alt._id,
        originalBookingId: booking._id,
        landArea: booking.landArea,
        bookingDate: booking.bookingDate || booking.requiredDate,
        preferredTime: booking.preferredTime || "",
        customerName: booking.customerName || user?.fullName,
        customerPhone: booking.customerPhone || user?.phone,
        customerLocation: booking.customerLocation || user?.location,
        customerLatitude: customerCoords?.latitude ?? booking.customerLatitude ?? user?.latitude,
        customerLongitude: customerCoords?.longitude ?? booking.customerLongitude ?? user?.longitude,
        isInstantBooking: true,
      };

      const res = await axios.post("/api/group-bookings/single", payload, {
        withCredentials: true,
      });
      setSuccessMsg(
        `Alternative request sent to ${alt.owner?.fullName || "the driver"}! The driver has 2 minutes to confirm.`
      );
      setConfirmMachine(null);
      if (onBookingSuccess) {
        onBookingSuccess(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create alternative booking request. Please try again."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  if (existingAltBooking) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
              Alternative Request Active
            </p>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              You submitted request #{String(existingAltBooking._id).slice(-8)} (Status: {existingAltBooking.status}). Check the Active tab to monitor the 2-minute confirmation window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
              Alternative Request Submitted!
            </p>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              {successMsg}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-red-200/70 pt-4 dark:border-red-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tractor size={18} className="text-green-700 dark:text-lime-300" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            Find Another Machine Nearby
          </h4>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Within {radius} km
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => handleSetRadius(5)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-black transition ${
                radius === 5
                  ? "bg-green-700 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              5 km
            </button>
            <button
              type="button"
              onClick={() => handleSetRadius(10)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-black transition ${
                radius === 10
                  ? "bg-green-700 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              10 km
            </button>
          </div>
          <button
            type="button"
            onClick={() => fetchAlternatives(radius, customerCoords)}
            disabled={loading}
            className="text-xs font-bold text-green-700 hover:underline dark:text-lime-300"
          >
            {loading ? "Searching..." : "Refresh"}
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Showing verified available alternatives for {booking.itemId?.category || "machinery"} within {radius} km. Choose an operator to send a direct request.
      </p>

      {requiresLocation && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-2.5">
            <MapPin size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                Location Coordinates Required
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                Precise coordinates are needed to calculate nearby tractor distances.
              </p>
              <button
                type="button"
                disabled={locating}
                onClick={handleDetectLocation}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-black text-white hover:bg-green-800 disabled:opacity-50"
              >
                <Navigation size={13} className={locating ? "animate-spin" : ""} />
                {locating ? "Detecting Location..." : "Use Current Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white/80 p-5 text-xs font-semibold text-slate-500 dark:bg-slate-800/50">
          <Clock3 size={16} className="animate-spin text-green-700" />
          Searching available alternative machines within {radius} km...
        </div>
      )}

      {!loading && !requiresLocation && alternatives.length === 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center dark:border-slate-800 dark:bg-slate-800/30">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {radius === 5
              ? "No available machines found within 5 km. Try expanding the search radius."
              : "No available machines found within 10 km. Try checking back later or adjusting your requirements."}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {radius === 5 ? (
              <button
                type="button"
                onClick={() => handleSetRadius(10)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-green-700 px-3 text-[11px] font-black text-white hover:bg-green-800"
              >
                Search within 10 km
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSetRadius(5)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Reset to 5 km
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchAlternatives(radius, customerCoords)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Check Again
            </button>
          </div>
        </div>
      )}

      {!loading && alternatives.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {alternatives.map((alt) => (
            <div
              key={alt._id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-green-300 dark:border-slate-800 dark:bg-slate-850 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {alt.image?.url ? (
                    <img
                      src={alt.image.url}
                      alt={alt.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      🚜
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {alt.title}
                  </h5>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Driver: {alt.owner?.fullName || "Verified Driver"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span className="text-green-700 dark:text-lime-300">
                      ₹{alt.price} / {alt.unit || "Bigha"}
                    </span>
                    {alt.distanceKm != null && (
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <MapPin size={11} /> {alt.distanceKm} km away
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  to={`/machines/${alt._id}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmMachine(alt)}
                  disabled={submittingId === alt._id}
                  className="rounded-xl bg-green-700 px-3.5 py-2 text-xs font-black text-white shadow-xs transition hover:bg-green-800 disabled:opacity-50"
                >
                  {submittingId === alt._id ? "Requesting..." : "Select Machine"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-green-950 dark:text-lime-300">
              <Tractor size={22} />
            </div>
            <h4 className="mt-3 text-base font-black text-slate-900 dark:text-white">
              Confirm Alternative Request
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Send booking request for <span className="font-bold text-slate-800 dark:text-slate-200">{confirmMachine.title}</span> owned by <span className="font-bold text-slate-800 dark:text-slate-200">{confirmMachine.owner?.fullName}</span>?
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Land Area:</span>
                <span className="font-bold">{booking.landArea} {booking.areaUnit || "Bigha"}</span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span className="font-bold">₹{confirmMachine.price} / {confirmMachine.unit || "Bigha"}</span>
              </div>
              <div className="flex justify-between text-amber-700 dark:text-amber-300 font-bold">
                <span>Response Window:</span>
                <span>2 Minutes</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmMachine(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSelectAlternative(confirmMachine)}
                disabled={submittingId === confirmMachine._id}
                className="flex-1 rounded-xl bg-green-700 py-2.5 text-xs font-black text-white hover:bg-green-800 disabled:opacity-50"
              >
                {submittingId === confirmMachine._id ? "Sending..." : "Confirm & Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, type, onCancel, allBookings, onBookingSuccess, isHighlighted = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardRef = useRef(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const isGroup = type === "Group";
  const isLabour = booking.requestType === "Labour";
  const title = isGroup
    ? booking.listing?.title || t("bookings.groupMachineBooking", "Group machine booking")
    : isLabour
      ? `${booking.itemId?.name || "Skilled Farm Worker"} (${booking.itemId?.labourType || "Labour"})`
      : booking.itemId?.title || t("bookings.machineBooking", "Machine booking");
  const machine = isGroup ? booking.listing : booking.itemId;
  const rawDriver =
    booking.driver ||
    (typeof booking.owner === "object" ? booking.owner : null) ||
    (typeof machine?.owner === "object" ? machine.owner : null);
  const driverName =
    rawDriver?.fullName && rawDriver.fullName.trim() !== ""
      ? rawDriver.fullName.trim()
      : typeof booking.owner === "string" && booking.owner.trim() !== ""
        ? booking.owner.trim()
        : "";
  const driverPhone = rawDriver?.phone || "";
  const driverPhoto = rawDriver?.profileImage?.url || rawDriver?.profileImage || null;
  const isDriverVerified = Boolean(
    rawDriver?.isVerified || rawDriver?.driverApplicationStatus === "Approved"
  );
  const driverVehicleType =
    rawDriver?.vehicleType || rawDriver?.driverVehicleType || machine?.category || "Tractor";
  const driverVehicleNumber =
    rawDriver?.vehicleNumber || rawDriver?.driverVehicleNumber || machine?.vehicleNumber || "";
  const date = booking.bookingDate || booking.requiredDate;
  const currentMember = isGroup
    ? booking.members?.find(
        (member) => String(member.user?._id || member.user) === String(user?._id)
      )
    : null;
  const totalPrice = Number(
    isGroup
      ? currentMember?.finalPrice ?? currentMember?.originalPrice
      : booking.finalPrice ?? booking.totalPrice
  );
  const landArea = isGroup ? currentMember?.landArea : booking.landArea;
  const areaUnit = booking.areaUnit || "Bigha";
  const additionalCharge = isGroup ? 0 : Number(booking.extraCharge || 0);
  const baseAmount = Number(
    isGroup
      ? currentMember?.originalPrice
      : booking.basePrice ?? Number(booking.originalPrice) - additionalCharge
  );
  const discountAmount = Number(
    isGroup ? currentMember?.discountAmount || 0 : booking.discountAmount || 0
  );
  const discountPercent = Number(
    isGroup
      ? booking.groupDiscountPercent ??
          (baseAmount ? (discountAmount / baseAmount) * 100 : 0)
      : booking.discountPercent || 0
  );
  const pricePerBigha =
    Number(landArea) > 0 && Number.isFinite(baseAmount)
      ? baseAmount / Number(landArea)
      : null;
  const formatPrice = (amount) =>
    new Intl.NumberFormat(
      i18n.language.startsWith("hi") ? "hi-IN" : "en-IN",
      { style: "currency", currency: "INR", maximumFractionDigits: 0 }
    ).format(amount);
  const openChat = (bookingId) =>
    navigate("/chat", { state: { bookingId, title: `Chat about ${title}` } });
  const chatButton = (bookingId) => (
    <button
      type="button"
      onClick={() => openChat(bookingId)}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      <MessageCircle size={15} />
      {t("chat.trigger", "Chat on WorkShetu")}
    </button>
  );

  const isRejectedOrExpired =
    booking.status === "Rejected" ||
    booking.status === "Expired" ||
    booking.status === "Cancelled";

  return (
    <article
      ref={cardRef}
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
        isHighlighted
          ? "border-green-600 ring-4 ring-green-600/30 shadow-lg shadow-green-700/10"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
            {isLabour ? <HardHat size={21} /> : <Tractor size={21} />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">{title}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {t(`bookings.type.${type.toLowerCase()}`, type)}{" "}
              {t("bookings.booking", "booking")} · #{String(booking._id).slice(-8)}
              {booking.preferredTime && (
                <span className="ml-1.5 font-bold text-slate-600 dark:text-slate-300">
                  · Slot: {booking.preferredTime}
                </span>
              )}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              {t("bookings.yourLocation", "Your location")}
            </p>
            <p className="mt-1 flex items-start gap-2 text-sm font-semibold">
              <MapPin size={16} className="mt-0.5 shrink-0 text-green-700" />
              {booking.location ||
                booking.customerLocation ||
                t("bookings.locationUnavailable", "Location unavailable")}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              {t("bookings.requiredDate", "Required date")}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays size={16} className="text-green-700" />
              {date
                ? new Date(date).toLocaleDateString(
                    i18n.language === "en" || i18n.language === "hinglish"
                      ? "en-IN"
                      : "hi-IN",
                    { day: "numeric", month: "short", year: "numeric" }
                  )
                : t("bookings.notSet", "Not set")}
            </p>
          </div>
        </div>

        {Number.isFinite(totalPrice) && (
          <section className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <h3 className="text-xs font-black uppercase tracking-wide text-green-800 dark:text-green-300">
              {t("bookings.priceDetails", "Price details")}
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              {isLabour ? (
                <>
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>Skill Category</span>
                    <span className="font-bold">{booking.itemId?.labourType || "Agricultural Worker"}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>Days Required</span>
                    <span className="font-bold">{booking.daysRequired || 1} Day(s)</span>
                  </div>
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>Daily Wage Rate</span>
                    <span className="font-bold">{formatPrice(booking.basePrice || (totalPrice / (booking.daysRequired || 1)))} / Day</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>{t("bookings.landArea", "Land area")}</span>
                    <span className="font-bold">
                      {landArea ?? "—"} {areaUnit}
                    </span>
                  </div>
                  {pricePerBigha !== null && (
                    <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                      <span>{t("bookings.ratePerBigha", "Rate per Bigha")}</span>
                      <span className="font-bold">{formatPrice(pricePerBigha)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>{t("bookings.baseAmount", "Base amount")}</span>
                    <span className="font-bold">{formatPrice(baseAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>{t("bookings.additionalCharge", "Additional charge")}</span>
                    <span className="font-bold">{formatPrice(additionalCharge)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                    <span>
                      {t(
                        isGroup ? "bookings.groupDiscountRate" : "bookings.discount",
                        isGroup
                          ? "Group discount ({{percent}}%)"
                          : "Discount ({{percent}}%)",
                        { percent: discountPercent }
                      )}
                    </span>
                    <span className="font-bold">− {formatPrice(discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-3 border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                <span>{t("bookings.finalTotal", "Final total")}</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </section>
        )}

        {/* DRIVER INFORMATION SECTION */}
        {(booking.status === "Accepted" || booking.status === "Completed") && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5 dark:border-emerald-900/40">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {isLabour ? "YOUR WORKER / LABOUR" : t("bookings.yourDriver", "YOUR DRIVER")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                <CheckCircle2 size={12} />
                {booking.status === "Completed"
                  ? t("bookings.completed", "Completed")
                  : t("bookings.driverAcceptedBadge", "Request Accepted")}
              </span>
            </div>

            <div className="mt-3.5 flex items-start gap-3.5">
              {/* Profile Photo or Initials Avatar */}
              <div className="relative shrink-0">
                {driverPhoto ? (
                  <img
                    src={driverPhoto}
                    alt={driverName || "Driver"}
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-emerald-300 dark:ring-emerald-800"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-200/80 text-emerald-900 font-black text-lg ring-2 ring-emerald-300 dark:bg-emerald-900/80 dark:text-emerald-200 dark:ring-emerald-800">
                    {driverName ? driverName.slice(0, 2).toUpperCase() : <UserRound size={24} />}
                  </div>
                )}
                {isDriverVerified && (
                  <span
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
                    title={t("bookings.verifiedDriver", "Verified Driver")}
                  >
                    <ShieldCheck size={12} />
                  </span>
                )}
              </div>

              {/* Driver Details */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-base font-black text-slate-900 dark:text-white">
                    {driverName || t("bookings.driverUnavailable", "Driver details unavailable")}
                  </h4>
                  {isDriverVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <ShieldCheck size={11} /> {t("bookings.verifiedDriver", "Verified Driver")}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {driverPhone && (
                    <p className="flex items-center gap-1.5 font-medium">
                      <Phone size={13} className="text-emerald-700 shrink-0" />
                      <span>
                        {t("bookings.phone", "Phone")}:{" "}
                        <a
                          href={`tel:${driverPhone}`}
                          className="font-bold text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
                        >
                          {driverPhone}
                        </a>
                      </span>
                    </p>
                  )}

                  <p className="flex items-center gap-1.5">
                    <Tractor size={13} className="text-emerald-700 shrink-0" />
                    <span>
                      {t("bookings.vehicle", "Vehicle")}:{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {driverVehicleType}
                        {driverVehicleNumber ? ` · ${driverVehicleNumber}` : ""}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons: [Call Driver/Worker] & [Chat on WorkShetu] */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-emerald-200/60 pt-3 dark:border-emerald-900/40">
              {driverPhone && (
                <a
                  href={`tel:${driverPhone}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
                >
                  <Phone size={14} />
                  {isLabour ? "Call Worker" : t("bookings.callDriver", "Call Driver")}
                </a>
              )}

              {chatButton(isGroup ? currentMember?.booking : booking._id)}
            </div>
          </section>
        )}

        {booking.status === "Accepted" && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <p className="text-sm font-black text-blue-900 dark:text-blue-200">
              {isLabour ? "Worker has accepted your request" : t("bookings.driverAccepted", "Driver has accepted your request")}
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              {isLabour
                ? "The worker has been scheduled. Share the OTP below only after the work is completely done."
                : t(
                    "bookings.acceptedHelp",
                    "Use the location action to view the machine route. Share the OTP only after the work is finished."
                  )}
            </p>
            {!isLabour && (
              <div className="mt-3">
                <DirectionsLink
                  latitude={machine?.latitude}
                  longitude={machine?.longitude}
                />
              </div>
            )}
          </div>
        )}

        {booking.status === "Accepted" && (
          <CompletionCode
            otp={isGroup ? currentMember?.completionOtp : booking.completionOtp}
            isLabour={isLabour}
          />
        )}

        {booking.status === "Completed" && (
          <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
            <div>
              {t("bookings.workCompleted", "Work completed successfully")}
              {booking.completedAt && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {t("bookings.completedAt", "Completed {{date}}", {
                    date: new Date(booking.completedAt).toLocaleString(
                      i18n.language.startsWith("hi") ? "hi-IN" : "en-IN",
                      { dateStyle: "medium", timeStyle: "short" }
                    ),
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* DRIVER DID NOT CONFIRM / REJECTED / EXPIRED BANNER & ALTERNATIVE ACTIONS */}
        {isRejectedOrExpired && (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <XCircle size={20} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-black text-red-800 dark:text-red-300">
                  {booking.status === "Expired"
                    ? t("bookings.driverTimedOut", "Driver did not confirm within the 2-minute response window.")
                    : booking.status === "Cancelled"
                    ? t("bookings.cancelledByUser", "This booking was cancelled.")
                    : t("bookings.driverRejected", "Driver was unavailable to accept this booking.")}
                </p>
                <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                  {t(
                    "bookings.alternativesHelp",
                    "Choose an alternative available machine nearby. No payment is lost."
                  )}
                </p>
              </div>
            </div>

            {!isGroup && (
              <InlineAlternativeMachines
                booking={booking}
                allBookings={allBookings}
                onBookingSuccess={onBookingSuccess}
              />
            )}
          </div>
        )}

        {(booking.status === "Pending" ||
          booking.status === "RequestSent" ||
          booking.status === "Forming") && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <Clock3 size={19} className="mt-0.5 animate-spin text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-900 dark:text-amber-200">
                  {t("bookings.waitingDriverConfirmTitle", "Waiting for Driver Confirmation")}
                </p>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
                  {driverName
                    ? t("bookings.waitingForNamedDriver", "Request sent to {{name}}. The driver will review and confirm availability.", { name: driverName })
                    : t("bookings.waitingDriver", "Waiting for the Driver to review your request.")}
                </p>
                {driverVehicleType && (
                  <p className="mt-1.5 text-[11px] font-semibold text-amber-900/70 dark:text-amber-300/70">
                    {t("bookings.vehicle", "Vehicle")}: {driverVehicleType} {driverVehicleNumber ? `· ${driverVehicleNumber}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {onCancel &&
          (booking.status === "Pending" ||
            booking.status === "RequestSent" ||
            booking.status === "Forming") && (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              className="min-h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 transition hover:bg-red-100"
            >
              {t("bookings.cancel", "Cancel booking")}
            </button>
          )}
      </div>
    </article>
  );
}

function LabourBookingCard({ booking, onRefresh, isHighlighted = false }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const isPending = booking.status === "Pending";
  const isAccepted = booking.status === "Accepted";
  const isCompleted = booking.status === "Completed";
  const isRejectedOrCancelled = ["Rejected", "Cancelled", "Expired"].includes(booking.status);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this labour booking request?")) return;
    try {
      setCancelling(true);
      await axios.put(`/api/labour/bookings/${booking._id}/cancel`, {}, { withCredentials: true });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyOtp = () => {
    if (!booking.completionOtp) return;
    try {
      navigator.clipboard?.writeText(String(booking.completionOtp));
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } catch (e) {}
  };

  const isWorkerUnavailable = Boolean(
    booking.workerProfileUnavailable ||
    (!booking.workerName && !booking.itemId?.name && !booking.owner?.fullName) ||
    booking.workerName === "Worker profile unavailable"
  );
  const workerImage = booking.workerImage || booking.itemId?.image?.url || booking.itemId?.image || booking.owner?.profileImage?.url;
  const workerName = isWorkerUnavailable
    ? "Worker profile unavailable"
    : (booking.workerName || booking.itemId?.name || booking.owner?.fullName || "Worker profile unavailable");
  const workerSkill = booking.workerSkill || booking.itemId?.labourType || booking.itemId?.category || booking.taskCategory || "Labour Service";
  const bookingDateStr = booking.bookingDate
    ? new Date(booking.bookingDate).toLocaleDateString(
        i18n.language?.startsWith("hi") ? "hi-IN" : "en-IN",
        { weekday: "short", day: "numeric", month: "short", year: "numeric" }
      )
    : "N/A";

  const totalAmount = booking.finalPrice || booking.totalPrice || 0;
  const dailyRate = booking.unitPrice || (booking.daysRequired ? Math.round(totalAmount / booking.daysRequired) : totalAmount);

  return (
    <article
      ref={cardRef}
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-900 flex flex-col justify-between ${
        isHighlighted
          ? "border-emerald-500 ring-4 ring-emerald-500/30 shadow-lg shadow-emerald-700/10"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="p-5">
        {/* Top Header: Category, Reference & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <HardHat size={15} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Labour Booking
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {booking.reference || `#LB-${String(booking._id).slice(-6).toUpperCase()}`}
            </span>
            {isHighlighted && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                New Booking
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
              isAccepted
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : isCompleted
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : isPending
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
            }`}
          >
            {isAccepted ? <CheckCircle2 size={13} /> : isPending ? <Clock size={13} /> : isCompleted ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {booking.status}
          </span>
        </div>

        {/* Worker Info */}
        <div className="mt-4 flex items-start gap-3.5">
          {workerImage ? (
            <img
              src={workerImage}
              alt={workerName}
              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-emerald-200 dark:ring-emerald-800 shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-800 ring-2 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">
              {workerName ? workerName.slice(0, 2).toUpperCase() : <UserRound size={22} />}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
              {workerName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {workerSkill}
              </span>
              {isWorkerUnavailable && (
                <span className="inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Profile unavailable
                </span>
              )}
              {booking.workerLocation && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{booking.workerLocation}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Work Details Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking Date</span>
            <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">{bookingDateStr}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</span>
            <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">{booking.daysRequired || 1} Day(s)</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preferred Time</span>
            <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">{booking.preferredTime || "Standard hours"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Wage</span>
            <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">₹{dailyRate} / Day</p>
          </div>
          {booking.customerLocation && (
            <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Work Location</span>
              <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <MapPin size={12} className="shrink-0 text-slate-400" />
                {booking.customerLocation}
              </p>
            </div>
          )}
          {booking.taskDescription && (
            <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Details</span>
              <p className="mt-0.5 italic text-slate-600 dark:text-slate-300">"{booking.taskDescription}"</p>
            </div>
          )}
        </div>

        {/* Wage Summary */}
        <div className="mt-3.5 flex items-center justify-between rounded-xl bg-emerald-50/70 px-4 py-2.5 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200">
          <span className="text-xs font-bold">Total Estimated Wage:</span>
          <span className="text-base font-black text-emerald-800 dark:text-emerald-300">₹{totalAmount}</span>
        </div>

        {/* ── CUSTOMER LABOUR OTP CARD ── */}
        {isAccepted && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                <ShieldCheck size={17} className="text-blue-600 dark:text-blue-400" />
                <span>Work Completion OTP</span>
              </div>
              {booking.completionOtp && (
                <button
                  type="button"
                  onClick={handleCopyOtp}
                  className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-bold text-blue-800 shadow-2xs hover:bg-blue-100 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-200"
                >
                  {copiedOtp ? "Copied!" : "Copy OTP"}
                </button>
              )}
            </div>

            {booking.completionOtp ? (
              <div className="mt-2.5">
                <p className="font-mono text-3xl font-black tracking-[0.45em] text-blue-950 dark:text-blue-100">
                  {booking.completionOtp}
                </p>
                <p className="mt-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
                  ⚠️ Share this OTP with the worker only after the work has been completed.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                The completion OTP will appear here once the worker requests work completion verification.
              </p>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-slate-100 p-3.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p>Work completed successfully. OTP verified.</p>
              {booking.completedAt && (
                <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                  Completed on {new Date(booking.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {isRejectedOrCancelled && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            <XCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p>{booking.status === "Cancelled" ? "This booking request was cancelled." : "The worker was unavailable to accept this request."}</p>
              {booking.cancellationReason && (
                <p className="text-[11px] font-normal text-rose-600 mt-0.5">Reason: {booking.cancellationReason}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          {/* Call button visible ONLY when status is Accepted or Completed */}
          {["Accepted", "Completed"].includes(booking.status) && booking.workerPhone ? (
            <a
              href={`tel:${booking.workerPhone}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800"
            >
              <Phone size={13} />
              Call Worker
            </a>
          ) : null}

          {["Accepted", "Completed"].includes(booking.status) && (
            <button
              type="button"
              onClick={() => navigate("/chat", { state: { bookingId: booking._id, title: `Chat with ${workerName}` } })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <MessageCircle size={13} />
              Chat
            </button>
          )}
        </div>

        {isPending && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Request"}
          </button>
        )}
      </div>
    </article>
  );
}

function MyBooking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true || String(user?.role || "").trim().toLowerCase() === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawTypeParam = (searchParams.get("type") || searchParams.get("tab") || "").toLowerCase();
  const typeParam = rawTypeParam === "labour" ? "labour" : (rawTypeParam === "machine" || rawTypeParam === "machines") ? "machine" : "";
  const highlightBookingId = searchParams.get("highlight");

  // Primary Tab: "machines" | "labour"
  const [activeTab, setActiveTab] = useState(() => {
    return typeParam === "labour" ? "labour" : "machines";
  });

  // Keep activeTab in sync with URL searchParams (e.g. back/forward navigation or link changes)
  useEffect(() => {
    if (typeParam === "labour" && activeTab !== "labour") {
      setActiveTab("labour");
    } else if (typeParam === "machine" && activeTab !== "machines") {
      setActiveTab("machines");
    }
  }, [typeParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(location.search);
    const normalized = newTab === "labour" ? "labour" : "machine";
    nextParams.set("type", normalized);
    nextParams.set("tab", normalized);
    navigate({ search: nextParams.toString() }, { replace: true });
  };

  // Machine Data States
  const [groups, setGroups] = useState([]);
  const [machineBookings, setMachineBookings] = useState([]);
  const [machineLoading, setMachineLoading] = useState(true);
  const [machineError, setMachineError] = useState("");
  const [machineSection, setMachineSection] = useState(() =>
    location.pathname.endsWith("/rejected") ? "rejected" : "all"
  );

  // Labour Data States
  const [labourBookings, setLabourBookings] = useState([]);
  const [labourLoading, setLabourLoading] = useState(true);
  const [labourError, setLabourError] = useState("");
  const [labourSection, setLabourSection] = useState("all");

  const isRejectedStatus = (status) =>
    ["Rejected", "Cancelled", "Expired"].includes(status);

  // Load Machine Bookings
  const loadMachineBookings = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setMachineLoading(true);
      const response = await axios.get("/api/group-bookings/my/requests", {
        withCredentials: true,
      });
      setGroups(response.data?.groups || []);
      setMachineBookings(response.data?.bookings || []);
      setMachineError("");
    } catch (err) {
      setMachineError(err.response?.data?.message || "Machine bookings could not be loaded.");
    } finally {
      if (!silent) setMachineLoading(false);
    }
  }, []);

  // Load Labour Bookings
  const loadLabourBookings = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLabourLoading(true);
      const response = await axios.get("/api/labour/bookings", {
        withCredentials: true,
      });
      setLabourBookings(response.data?.bookings || []);
      setLabourError("");
    } catch (err) {
      setLabourError(err.response?.data?.message || "Labour bookings could not be loaded.");
    } finally {
      if (!silent) setLabourLoading(false);
    }
  }, []);

  const refreshAll = () => {
    loadMachineBookings();
    loadLabourBookings();
  };

  useEffect(() => {
    loadMachineBookings();
    loadLabourBookings();
    const refreshTimer = window.setInterval(() => {
      loadMachineBookings({ silent: true });
      loadLabourBookings({ silent: true });
    }, 12000);
    return () => window.clearInterval(refreshTimer);
  }, [loadMachineBookings, loadLabourBookings]);

  // Intelligent auto-switch to Labour tab if customer only has Labour bookings
  const autoSwitchedTabRef = useRef(false);
  useEffect(() => {
    if (autoSwitchedTabRef.current) return;
    const params = new URLSearchParams(location.search);
    const hasTypeParam = params.get("type") || params.get("tab");
    if (hasTypeParam) {
      autoSwitchedTabRef.current = true;
      return;
    }
    if (!machineLoading && !labourLoading) {
      autoSwitchedTabRef.current = true;
      if (groups.length === 0 && machineBookings.length === 0 && labourBookings.length > 0) {
        setActiveTab("labour");
      }
    }
  }, [machineLoading, labourLoading, groups.length, machineBookings.length, labourBookings.length, location.search]);

  // Cancel Machine Booking
  const cancelMachineBooking = async (booking) => {
    if (!window.confirm(t("bookings.cancelConfirm", "Are you sure you want to cancel this booking?"))) return;
    try {
      const isGroup = booking.bookingType === "Group" || booking.groupBookingId || booking.members;
      const bookingId = isGroup
        ? booking.members?.find((member) => member.booking)?.booking
        : booking._id;
      if (!bookingId) return;
      await axios.put(
        `/api/group-bookings/my/${isGroup ? "group" : "single"}/${bookingId}/cancel`,
        {},
        { withCredentials: true }
      );
      await loadMachineBookings();
    } catch (requestError) {
      setMachineError(requestError.response?.data?.message || t("bookings.cancelError", "Booking could not be cancelled."));
    }
  };

  // Filtered Machine Lists
  const completedGroups = groups.filter((g) => g.status === "Completed");
  const rejectedGroups = groups.filter((g) => isRejectedStatus(g.status));
  const activeGroups = groups.filter((g) => g.status !== "Completed" && !isRejectedStatus(g.status));

  const completedMachines = machineBookings.filter((b) => b.status === "Completed");
  const rejectedMachines = machineBookings.filter((b) => isRejectedStatus(b.status));
  const activeMachines = machineBookings.filter((b) => b.status !== "Completed" && !isRejectedStatus(b.status));

  const shownGroups =
    machineSection === "completed"
      ? completedGroups
      : machineSection === "rejected"
      ? rejectedGroups
      : machineSection === "active"
      ? activeGroups
      : groups;

  const shownMachines =
    machineSection === "completed"
      ? completedMachines
      : machineSection === "rejected"
      ? rejectedMachines
      : machineSection === "active"
      ? activeMachines
      : machineBookings;

  // Filtered Labour Lists
  const pendingLabour = labourBookings.filter((b) => b.status === "Pending");
  const acceptedLabour = labourBookings.filter((b) => b.status === "Accepted");
  const completedLabour = labourBookings.filter((b) => b.status === "Completed");
  const rejectedLabour = labourBookings.filter((b) => isRejectedStatus(b.status));

  const shownLabour =
    labourSection === "pending"
      ? pendingLabour
      : labourSection === "accepted"
      ? acceptedLabour
      : labourSection === "completed"
      ? completedLabour
      : labourSection === "rejected"
      ? rejectedLabour
      : labourBookings;

  const totalMachineCount = groups.length + machineBookings.length;
  const totalLabourCount = labourBookings.length;
  const isLoading = machineLoading && labourLoading;

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-20">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">
              {isAdmin ? "Admin Personal Account" : "Central Booking Management"}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage your Machine and Labour bookings in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <Link
                to="/admin/bookings"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-green-700 bg-green-50 px-4 text-xs font-black text-green-800 transition hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-lime-300"
              >
                <ClipboardList size={16} />
                Manage Platform Bookings
              </Link>
            )}

            <button
              type="button"
              onClick={refreshAll}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#123524] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#176b3a] disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              {t("common.refresh", "Refresh")}
            </button>
          </div>
        </header>

        {/* ── TWO PRIMARY CENTRAL TABS: MACHINE BOOKINGS & LABOUR BOOKINGS ── */}
        <div className="mt-8 flex rounded-2xl bg-slate-200/80 p-1.5 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => handleTabChange("machines")}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-black transition-all ${
              activeTab === "machines"
                ? "bg-white text-green-900 shadow-sm dark:bg-slate-800 dark:text-lime-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Tractor size={18} />
            <span>Machine Bookings</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "machines"
                  ? "bg-green-100 text-green-800 dark:bg-lime-950 dark:text-lime-300"
                  : "bg-slate-300/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {totalMachineCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("labour")}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-black transition-all ${
              activeTab === "labour"
                ? "bg-white text-emerald-900 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <HardHat size={18} />
            <span>Labour Bookings</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "labour"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-300/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {totalLabourCount}
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION A: MACHINE BOOKINGS
        ══════════════════════════════════════════════════ */}
        {activeTab === "machines" && (
          <div className="mt-6">
            {machineError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {machineError}
              </div>
            )}
            {/* Machine Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" aria-label="Machine Booking Filters">
                <button
                  type="button"
                  onClick={() => setMachineSection("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    machineSection === "all"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  All ({totalMachineCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMachineSection("active")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    machineSection === "active"
                      ? "bg-white text-green-800 shadow-xs dark:bg-slate-800 dark:text-lime-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Active ({activeGroups.length + activeMachines.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMachineSection("completed")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    machineSection === "completed"
                      ? "bg-white text-green-800 shadow-xs dark:bg-slate-800 dark:text-lime-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Completed ({completedGroups.length + completedMachines.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMachineSection("rejected")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    machineSection === "rejected"
                      ? "bg-white text-rose-700 shadow-xs dark:bg-slate-800 dark:text-rose-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Rejected & Expired ({rejectedGroups.length + rejectedMachines.length})
                </button>
              </nav>

              <Link
                to="/machine"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:underline dark:text-lime-400"
              >
                <Tractor size={14} />
                Explore Machinery Marketplace →
              </Link>
            </div>

            {/* Machine Loading Skeleton */}
            {machineLoading && (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800/60" />
                ))}
              </div>
            )}

            {/* Machine Empty State */}
            {!machineLoading && totalMachineCount === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-800 dark:bg-green-950 dark:text-lime-300">
                  <Tractor size={28} />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">
                  You haven't booked any machines yet.
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Find tractors, harvesters, rotavators, and cultivators available around your village.
                </p>
                <Link
                  to="/machine"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-xs font-black text-white hover:bg-green-800 transition shadow-sm"
                >
                  <Tractor size={15} />
                  Explore Machinery Marketplace
                </Link>
              </div>
            )}

            {/* Machine Cards Grid */}
            {!machineLoading && (shownGroups.length > 0 || shownMachines.length > 0) && (
              <section className="mt-6 grid gap-5 lg:grid-cols-2">
                {shownGroups.map((group) => (
                  <BookingCard
                    key={group._id}
                    booking={group}
                    type="Group"
                    isHighlighted={highlightBookingId === String(group._id)}
                    onCancel={machineSection === "active" ? cancelMachineBooking : undefined}
                  />
                ))}
                {shownMachines.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    type="Fast"
                    isHighlighted={highlightBookingId === String(booking._id)}
                    onCancel={machineSection === "active" ? cancelMachineBooking : undefined}
                    allBookings={machineBookings}
                    onBookingSuccess={() => {
                      loadMachineBookings();
                      setMachineSection("active");
                    }}
                  />
                ))}
              </section>
            )}

            {/* Section Specific Filter Empty */}
            {!machineLoading && totalMachineCount > 0 && shownGroups.length === 0 && shownMachines.length === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold text-slate-500">
                  {machineSection === "completed"
                    ? "No completed machine requests yet."
                    : machineSection === "rejected"
                    ? "No rejected or expired machine requests."
                    : "No active machine requests."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            SECTION B: LABOUR BOOKINGS
        ══════════════════════════════════════════════════ */}
        {activeTab === "labour" && (
          <div className="mt-6">
            {labourError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {labourError}
              </div>
            )}
            {/* Labour Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" aria-label="Labour Booking Filters">
                <button
                  type="button"
                  onClick={() => setLabourSection("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    labourSection === "all"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  All ({totalLabourCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLabourSection("pending")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    labourSection === "pending"
                      ? "bg-white text-amber-800 shadow-xs dark:bg-slate-800 dark:text-amber-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Pending ({pendingLabour.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLabourSection("accepted")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    labourSection === "accepted"
                      ? "bg-white text-blue-800 shadow-xs dark:bg-slate-800 dark:text-blue-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Accepted ({acceptedLabour.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLabourSection("completed")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    labourSection === "completed"
                      ? "bg-white text-emerald-800 shadow-xs dark:bg-slate-800 dark:text-emerald-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Completed ({completedLabour.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLabourSection("rejected")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    labourSection === "rejected"
                      ? "bg-white text-rose-700 shadow-xs dark:bg-slate-800 dark:text-rose-300"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Rejected / Cancelled ({rejectedLabour.length})
                </button>
              </nav>

              <Link
                to="/Labour"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                <HardHat size={14} />
                Explore Farm Labour Marketplace →
              </Link>
            </div>

            {/* Labour Loading Skeleton */}
            {labourLoading && (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800/60" />
                ))}
              </div>
            )}

            {/* Labour Empty State */}
            {!labourLoading && totalLabourCount === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <HardHat size={28} />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">
                  You haven't booked any workers yet.
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Hire verified mistris, farm labourers, beldars, and tractor drivers on daily wages.
                </p>
                <Link
                  to="/Labour"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-800 transition shadow-sm"
                >
                  <HardHat size={15} />
                  Explore Farm Labour Marketplace
                </Link>
              </div>
            )}

            {/* Labour Cards Grid */}
            {!labourLoading && shownLabour.length > 0 && (
              <section className="mt-6 grid gap-5 lg:grid-cols-2">
                {shownLabour.map((b) => (
                  <LabourBookingCard
                    key={b._id}
                    booking={b}
                    isHighlighted={highlightBookingId === String(b._id)}
                    onRefresh={loadLabourBookings}
                  />
                ))}
              </section>
            )}

            {/* Labour Filter Specific Empty */}
            {!labourLoading && totalLabourCount > 0 && shownLabour.length === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold text-slate-500">
                  {labourSection === "completed"
                    ? "No completed labour requests yet."
                    : labourSection === "rejected"
                    ? "No rejected or cancelled labour requests."
                    : labourSection === "pending"
                    ? "No pending labour requests."
                    : labourSection === "accepted"
                    ? "No accepted labour bookings currently active."
                    : "No labour bookings found for this filter."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  const styles =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
      ? "text-red-700 dark:text-red-300"
      : tone === "slate"
      ? "text-slate-700 dark:text-slate-200"
      : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className={`text-3xl font-black ${styles}`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default MyBooking;
