import { useCallback, useEffect, useState } from "react";
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
import { Link, useLocation, useNavigate } from "react-router-dom";
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

function CompletionCode({ otp }) {
  const { t } = useTranslation();
  if (!otp) return null;
  return (
    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
        <ShieldCheck size={16} />
        {t("bookings.completionOtp", "Work completion OTP")}
      </div>
      <p className="mt-2 text-3xl font-black tracking-[0.35em]">{otp}</p>
      <p className="mt-2 text-xs font-semibold">
        {t(
          "bookings.shareOtp",
          "Share this OTP with the Driver only after the work is complete."
        )}
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

function BookingCard({ booking, type, onCancel, allBookings, onBookingSuccess }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
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
                {t("bookings.yourDriver", "YOUR DRIVER")}
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

            {/* Action Buttons: [Call Driver] & [Chat on WorkShetu] */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-emerald-200/60 pt-3 dark:border-emerald-900/40">
              {driverPhone && (
                <a
                  href={`tel:${driverPhone}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
                >
                  <Phone size={14} />
                  {t("bookings.callDriver", "Call Driver")}
                </a>
              )}

              {chatButton(isGroup ? currentMember?.booking : booking._id)}
            </div>
          </section>
        )}

        {booking.status === "Accepted" && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <p className="text-sm font-black text-blue-900 dark:text-blue-200">
              {t("bookings.driverAccepted", "Driver has accepted your request")}
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              {t(
                "bookings.acceptedHelp",
                "Use the location action to view the machine route. Share the OTP only after the work is finished."
              )}
            </p>
            <div className="mt-3">
              <DirectionsLink
                latitude={machine?.latitude}
                longitude={machine?.longitude}
              />
            </div>
          </div>
        )}

        {booking.status === "Accepted" && (
          <CompletionCode
            otp={isGroup ? currentMember?.completionOtp : booking.completionOtp}
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

function MyBooking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true || String(user?.role || "").trim().toLowerCase() === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState(() =>
    location.pathname.endsWith("/rejected") ? "rejected" : "active"
  );

  const cancelBooking = async (booking) => {
    if (
      !window.confirm(
        t("bookings.cancelConfirm", "Are you sure you want to cancel this booking?")
      )
    )
      return;
    try {
      const isGroup =
        booking.bookingType === "Group" ||
        booking.groupBookingId ||
        booking.members;
      const bookingId = isGroup
        ? booking.members?.find((member) => member.booking)?.booking
        : booking._id;
      if (!bookingId) return;
      await axios.put(
        `/api/group-bookings/my/${isGroup ? "group" : "single"}/${bookingId}/cancel`,
        {},
        { withCredentials: true }
      );
      await loadBookings();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          t("bookings.cancelError", "Booking could not be cancelled.")
      );
    }
  };

  const loadBookings = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/api/group-bookings/my/requests", {
        withCredentials: true,
      });
      setGroups(response.data?.groups || []);
      setBookings(response.data?.bookings || []);
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          i18n.t("bookings.loadError", "Bookings could not be loaded.")
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const refreshTimer = window.setInterval(
      () => loadBookings({ silent: true }),
      10000
    );
    return () => window.clearInterval(refreshTimer);
  }, [loadBookings]);

  const isRejectedStatus = (status) =>
    ["Rejected", "Cancelled", "Expired"].includes(status);
  const completedGroups = groups.filter((group) => group.status === "Completed");
  const rejectedGroups = groups.filter((group) => isRejectedStatus(group.status));
  const activeGroups = groups.filter(
    (group) => group.status !== "Completed" && !isRejectedStatus(group.status)
  );
  const completedBookings = bookings.filter(
    (booking) =>
      booking.status === "Completed" && booking.bookingType !== "Group"
  );
  const rejectedBookings = bookings.filter((booking) =>
    isRejectedStatus(booking.status)
  );
  const activeBookings = bookings.filter(
    (booking) =>
      booking.status !== "Completed" && !isRejectedStatus(booking.status)
  );
  const shownGroups =
    section === "completed"
      ? completedGroups
      : section === "rejected"
      ? rejectedGroups
      : activeGroups;
  const shownBookings =
    section === "completed"
      ? completedBookings
      : section === "rejected"
      ? rejectedBookings
      : activeBookings;
  const completedCount = completedGroups.length + completedBookings.length;
  const rejectedCount = rejectedGroups.length + rejectedBookings.length;

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">
              {isAdmin
                ? "Admin Personal Account"
                : t("bookings.workspace", "Farmer workspace")}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {isAdmin ? "My Personal Bookings" : t("bookings.title", "My bookings")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isAdmin
                ? "Personal reservations created under your account. Platform-wide bookings are managed separately in the Admin Dashboard."
                : t(
                    "bookings.subtitle",
                    "Track every request, acceptance, live status, and work completion in one place."
                  )}
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
              onClick={() => loadBookings()}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#123524] px-4 text-sm font-black text-white transition hover:bg-[#176b3a] disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {t("common.refresh", "Refresh")}
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-12 text-center dark:bg-slate-900">
            {t("bookings.loading", "Loading bookings...")}
          </div>
        )}

        {!loading && (groups.length > 0 || bookings.length > 0) && (
          <section className="mt-8 grid gap-3 sm:grid-cols-4">
            <SummaryCard
              label={t("bookings.total", "Total bookings")}
              value={groups.length + bookings.length}
            />
            <SummaryCard
              label={t("driver.status.Accepted", "Accepted")}
              value={
                [...groups, ...bookings].filter(
                  (booking) => booking.status === "Accepted"
                ).length
              }
              tone="green"
            />
            <SummaryCard
              label={t("driver.status.Completed", "Completed")}
              value={completedCount}
              tone="slate"
            />
            <SummaryCard
              label={t("driver.status.Rejected", "Rejected / Expired")}
              value={rejectedCount}
              tone="red"
            />
          </section>
        )}

        {!loading && (groups.length > 0 || bookings.length > 0) && (
          <nav
            className="mt-8 flex gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900"
            aria-label={t("bookings.sectionsLabel", "Booking sections")}
          >
            <button
              type="button"
              onClick={() => setSection("active")}
              aria-pressed={section === "active"}
              className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-black transition ${
                section === "active"
                  ? "bg-white text-green-800 shadow-sm dark:bg-slate-800 dark:text-lime-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {t("bookings.activeSection", "Active")}{" "}
              <span className="ml-1 opacity-70">
                {activeGroups.length + activeBookings.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSection("completed")}
              aria-pressed={section === "completed"}
              className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-black transition ${
                section === "completed"
                  ? "bg-white text-green-800 shadow-sm dark:bg-slate-800 dark:text-lime-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {t("bookings.completedSection", "Completed")}{" "}
              <span className="ml-1 opacity-70">{completedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setSection("rejected")}
              aria-pressed={section === "rejected"}
              className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-black transition ${
                section === "rejected"
                  ? "bg-white text-red-700 shadow-sm dark:bg-slate-800 dark:text-red-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {t("bookings.rejectedSection", "Rejected & Expired")}{" "}
              <span className="ml-1 opacity-70">{rejectedCount}</span>
            </button>
          </nav>
        )}

        {!loading && groups.length === 0 && bookings.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            {t("bookings.empty", "No bookings found.")}
          </div>
        )}

        {!loading && section === "completed" && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {t(
              "bookings.completedAutoDelete",
              "Completed requests are automatically preserved in work history."
            )}
          </div>
        )}

        {!loading && section === "rejected" && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {t(
              "bookings.rejectedAlternativesHint",
              "Unconfirmed or expired requests can be rebooked instantly with nearby alternative machines."
            )}
          </div>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {shownGroups.map((group) => (
            <BookingCard
              key={group._id}
              booking={group}
              type="Group"
              onCancel={section === "active" ? cancelBooking : undefined}
            />
          ))}
          {shownBookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              type="Fast"
              onCancel={section === "active" ? cancelBooking : undefined}
              allBookings={bookings}
              onBookingSuccess={() => {
                loadBookings();
                setSection("active");
              }}
            />
          ))}
        </section>

        {!loading &&
          (groups.length > 0 || bookings.length > 0) &&
          shownGroups.length === 0 &&
          shownBookings.length === 0 && (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              {section === "completed"
                ? t("bookings.completedEmpty", "No completed requests yet.")
                : section === "rejected"
                ? t("bookings.rejectedEmpty", "No rejected or expired requests.")
                : t("bookings.activeEmpty", "No active requests.")}
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
