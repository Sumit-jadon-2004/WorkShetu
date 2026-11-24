import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Radio,
  RotateCcw,
  Truck,
  Users,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { Link } from "react-router-dom";
import ChatBox from "../Common/ChatBox.jsx";
import { useTranslation } from "react-i18next";
import {
  playBookingAlertSound,
  startRepeatingAlert,
  stopRepeatingAlert,
} from "../../utils/audioAlert.js";
import CreditPackModal from "../Common/CreditPackModal.jsx";

const statusStyles = {
  RequestSent: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  Accepted: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200",
  Completed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  Expired: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  Forming: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
};

function contactPhone(phone) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

function ContactActions({ phone }) {
  const { t } = useTranslation();
  const cleanPhone = contactPhone(phone);
  if (!cleanPhone) return null;

  const whatsappPhone = cleanPhone.replace(/^\+/, "");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a
        href={`tel:${cleanPhone}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-green-700 px-3 text-xs font-black text-white hover:bg-green-800"
      >
        <Phone size={14} />
        {t("driver.callFarmer", "Call farmer")}
      </a>
      <a
        href={`https://wa.me/${whatsappPhone}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-black text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <MessageCircle size={14} />
        Chat
      </a>
    </div>
  );
}

function DirectionsLink({ latitude, longitude }) {
  const { t } = useTranslation();
  if (latitude == null || longitude == null) return null;
  const destination = `${latitude},${longitude}`;
  return (
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-black text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200"
    >
      <Navigation size={14} />
      {t("driver.openDirections", "Open directions")}
    </a>
  );
}

function DriverDashboard() {
  const { t, i18n } = useTranslation();
  const formatMoney = (amount) =>
    new Intl.NumberFormat(
      i18n.language?.startsWith("hi") ? "hi-IN" : "en-IN",
      { style: "currency", currency: "INR", maximumFractionDigits: 0 }
    ).format(Number(amount || 0));

  const [groups, setGroups] = useState([]);
  const [fastBookings, setFastBookings] = useState([]);
  const [rejectedHistory, setRejectedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [otpTarget, setOtpTarget] = useState(null);
  const [completionOtp, setCompletionOtp] = useState("");
  const [groupCompletionOtps, setGroupCompletionOtps] = useState({});
  const [regeneratingOtp, setRegeneratingOtp] = useState({});
  const [soundMuted, setSoundMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [credits, setCredits] = useState(0);

  // Load credit balance
  useEffect(() => {
    axios
      .get("/api/credits/balance", { withCredentials: true })
      .then((res) => {
        if (res.data?.credits != null) setCredits(res.data.credits);
      })
      .catch(() => {});
  }, []);

  // Real-time second clock for timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const response = await axios.get("/api/group-bookings/owner/requests", {
        withCredentials: true,
      });
      setGroups(response.data?.groups || []);
      setFastBookings(response.data?.bookings || []);
      setRejectedHistory(response.data?.rejectedHistory || []);
    } catch (requestError) {
      if (!silent) {
        setError(
          requestError.response?.data?.message ||
            t("driver.requestLoadError", "Driver requests could not be loaded.")
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Periodic polling every 5s so incoming bookings pop up immediately
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadRequests(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [loadRequests]);

  // Audio chimes when active pending requests need attention
  const urgentFastRequests = fastBookings.filter(
    (booking) =>
      booking.status === "Pending" &&
      (!booking.responseDeadline ||
        new Date(booking.responseDeadline).getTime() > currentTime)
  );
  const urgentGroupRequests = groups.filter(
    (group) => group.status === "RequestSent" || group.status === "Forming"
  );
  const urgentRequests = [...urgentFastRequests, ...urgentGroupRequests];
  const hasUrgentRequests = urgentRequests.length > 0;

  useEffect(() => {
    if (hasUrgentRequests && !soundMuted) {
      startRepeatingAlert(3500);
    } else {
      stopRepeatingAlert();
    }
    return () => {
      stopRepeatingAlert();
    };
  }, [hasUrgentRequests, soundMuted]);

  const changeStatus = async (groupId, action) => {
    try {
      await axios.put(`/api/group-bookings/${groupId}/${action}`, {}, {
        withCredentials: true,
      });
      setOtpTarget(null);
      setCompletionOtp("");
      setGroupCompletionOtps((current) => ({ ...current, [groupId]: {} }));
      await loadRequests(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          t("driver.requestUpdateError", "Request could not be updated.")
      );
    }
  };

  const verifyGroupMemberOtp = async (groupId, memberId) => {
    try {
      await axios.put(
        `/api/group-bookings/${groupId}/verify-member-otp`,
        {
          memberId,
          otp: groupCompletionOtps[groupId]?.[memberId] || "",
        },
        { withCredentials: true }
      );
      setGroupCompletionOtps((current) => ({
        ...current,
        [groupId]: { ...(current[groupId] || {}), [memberId]: "" },
      }));
      await loadRequests(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          t("driver.requestUpdateError", "Request could not be updated.")
      );
    }
  };

  const changeFastStatus = async (bookingId, action) => {
    try {
      const data = action === "complete" ? { otp: completionOtp } : {};
      await axios.put(`/api/group-bookings/single/${bookingId}/${action}`, data, {
        withCredentials: true,
      });
      setOtpTarget(null);
      setCompletionOtp("");
      await loadRequests(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          t("driver.bookingUpdateError", "Fast booking could not be updated.")
      );
    }
  };

  const regenerateSingleOtp = async (bookingId) => {
    try {
      setError("");
      setSuccessMessage("");
      setRegeneratingOtp((current) => ({ ...current, [bookingId]: true }));
      const response = await axios.post(
        `/api/group-bookings/single/${bookingId}/regenerate-otp`,
        {},
        { withCredentials: true }
      );
      setSuccessMessage(
        response.data?.message ||
          t(
            "driver.otpRegeneratedSuccess",
            "New completion OTP generated for Farmer! Ask the Farmer to refresh or check their booking page."
          )
      );
      await loadRequests(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          t("driver.otpRegenerateError", "Failed to regenerate Farmer OTP.")
      );
    } finally {
      setRegeneratingOtp((current) => ({ ...current, [bookingId]: false }));
    }
  };

  const regenerateGroupMemberOtp = async (groupId, memberId) => {
    const key = `${groupId}-${memberId}`;
    try {
      setError("");
      setSuccessMessage("");
      setRegeneratingOtp((current) => ({ ...current, [key]: true }));
      const response = await axios.post(
        `/api/group-bookings/${groupId}/member/${memberId}/regenerate-otp`,
        {},
        { withCredentials: true }
      );
      setSuccessMessage(
        response.data?.message ||
          t(
            "driver.groupMemberOtpRegeneratedSuccess",
            "New OTP generated for Farmer! Ask the Farmer to refresh or check their screen."
          )
      );
      await loadRequests(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          t("driver.otpRegenerateError", "Failed to regenerate Farmer OTP.")
      );
    } finally {
      setRegeneratingOtp((current) => ({ ...current, [key]: false }));
    }
  };

  const isBookingExpired = (b) =>
    b.status === "Expired" ||
    b.status === "Rejected" ||
    (b.status === "Pending" &&
      b.responseDeadline &&
      new Date(b.responseDeadline).getTime() <= currentTime);

  const requestCount =
    groups.filter((group) => group.status === "RequestSent" || group.status === "Forming" || group.status === "Ready").length +
    fastBookings.filter((booking) => booking.status === "Pending" && !isBookingExpired(booking)).length;
  const acceptedCount =
    groups.filter((group) => group.status === "Accepted").length +
    fastBookings.filter((booking) => booking.status === "Accepted").length;
  const completedGroups = groups.filter((group) => group.status === "Completed");
  const completedFastBookings = fastBookings.filter(
    (booking) => booking.status === "Completed"
  );
  const activeGroups = groups.filter((group) => group.status !== "Completed" && group.status !== "Rejected" && group.status !== "Cancelled");
  const activeFastBookings = fastBookings.filter(
    (booking) =>
      (booking.status === "Pending" || booking.status === "Accepted") &&
      !isBookingExpired(booking)
  );
  const completedCount = completedGroups.length + completedFastBookings.length;
  const totalLand = groups.reduce(
    (total, group) => total + Number(group.totalLandArea || 0),
    0
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysEarnings = [
    ...completedGroups,
    ...completedFastBookings,
  ].reduce((total, work) => {
    const completedAt = work.completedAt ? new Date(work.completedAt) : null;
    if (!completedAt || completedAt < todayStart) return total;
    return (
      total +
      Number(work.totalFinalPrice || work.finalPrice || work.totalPrice || 0)
    );
  }, 0);

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">
                {t("driver.workspace", "Driver workspace")}
              </p>
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black transition ${
                  isOnline
                    ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-lime-300"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-green-600 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {isOnline
                  ? t("driver.statusOnline", "Online & Receiving")
                  : t("driver.statusOffline", "Offline")}
              </button>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {t("driver.dashboardTitle", "Driver Operations & Booking Desk")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t(
                "driver.dashboardSubtitle",
                "Instant request alerts, live countdowns, route directions, and work completion verification."
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (soundMuted) {
                  playBookingAlertSound();
                }
                setSoundMuted(!soundMuted);
              }}
              title={soundMuted ? "Unmute alert chimes" : "Mute alert chimes"}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-black transition ${
                soundMuted
                  ? "border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  : "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              }`}
            >
              {soundMuted ? (
                <VolumeX size={16} />
              ) : (
                <Volume2 size={16} className="text-amber-600 animate-bounce" />
              )}
              {soundMuted ? t("driver.muted", "Muted") : t("driver.alertSound", "Sound On")}
            </button>
            <button
              type="button"
              onClick={() => setShowCreditModal(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-black text-amber-900 shadow-xs transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <Zap size={16} className="text-amber-500" />
              <span>Credits: {credits}</span>
            </button>
            <Link
              to="/driver/listings"
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-black text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t("driver.manageListings", "Manage listings")}
            </Link>
            <Link
              to="/driver/completed"
              className="inline-flex min-h-11 items-center rounded-xl border border-green-700 px-3.5 text-xs font-black text-green-800 hover:bg-green-50 dark:text-lime-300 dark:hover:bg-slate-800"
            >
              {t("driver.completedHistory", "Completed work history")}
            </Link>
            <Link
              to="/driver/listings/new"
              className="inline-flex min-h-11 items-center rounded-xl bg-green-700 px-3.5 text-xs font-black text-white hover:bg-green-800"
            >
              {t("driver.addMachine", "Add machine listing")}
            </Link>
            <button
              type="button"
              onClick={() => loadRequests()}
              className="min-h-11 rounded-xl bg-[#123524] px-4 text-xs font-black text-white hover:bg-[#176b3a]"
            >
              {t("driver.refreshRequests", "Refresh")}
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="ml-3 text-xs font-bold underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [Truck, t("driver.newRequests", "New requests"), requestCount],
            [Users, t("driver.activeJobs", "Active jobs"), acceptedCount],
            [CheckCircle2, t("driver.completed", "Completed"), completedCount],
            [MapPin, t("driver.totalBigha", "Total Bigha"), totalLand.toFixed(1)],
            [
              CheckCircle2,
              t("driver.todaysEarnings", "Today's earnings"),
              `₹${Math.round(todaysEarnings).toLocaleString("en-IN")}`,
            ],
          ].map(([Icon, label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="text-green-700 dark:text-lime-300" size={20} />
              <p className="mt-4 text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {label}
              </p>
            </div>
          ))}
        </section>

        {/* FAST / INSTANT BOOKING REQUESTS (HERO FOR DRIVER) */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-amber-500 animate-pulse" />
              <h2 className="text-xl font-black">
                {t("driver.fastBookings", "Instant & Individual Bookings")}
              </h2>
            </div>
            {urgentRequests.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Clock3 size={14} className="animate-spin" />
                {urgentRequests.length} {t("driver.awaitingAction", "Action Required")}
              </span>
            )}
          </div>

          {!loading && activeFastBookings.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <Truck size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="font-bold text-slate-600 dark:text-slate-300">
                {t("driver.noFastBookings", "No active machine booking requests right now.")}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("driver.waitingMsg", "New requests from nearby farmers will appear here with instant sound alerts.")}
              </p>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {activeFastBookings.map((booking) => {
              const hasDeadline = Boolean(booking.responseDeadline);
              const remainingSecs = hasDeadline
                ? Math.max(
                    0,
                    Math.floor(
                      (new Date(booking.responseDeadline).getTime() - currentTime) /
                        1000
                    )
                  )
                : null;
              const isExpired =
                booking.status === "Expired" ||
                (booking.status === "Pending" &&
                  hasDeadline &&
                  remainingSecs === 0);
              const totalWindow = booking.isInstantBooking ? 120 : 7200;
              const pct =
                remainingSecs !== null
                  ? Math.min(100, Math.max(0, (remainingSecs / totalWindow) * 100))
                  : 100;

              return (
                <article
                  key={booking._id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm transition dark:bg-slate-900 sm:p-6 ${
                    booking.status === "Pending"
                      ? isExpired
                        ? "border-red-300 opacity-75 dark:border-red-900"
                        : "border-amber-300 ring-2 ring-amber-400/20 dark:border-amber-700"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">
                          {booking.itemId?.title ||
                            t("machineDetails.farmMachine", "Machine booking")}
                        </h3>
                        {booking.isInstantBooking && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <Zap size={12} /> Instant (Today)
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Fast booking #{String(booking._id).slice(-8)}
                        {booking.preferredTime && (
                          <span className="ml-2 font-semibold text-slate-600 dark:text-slate-300">
                            · Slot: {booking.preferredTime}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${
                        isExpired
                          ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                          : statusStyles[booking.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isExpired ? "Expired" : t(`driver.status.${booking.status}`, booking.status)}
                    </span>
                  </div>

                  {/* 2-MIN LIVE COUNTDOWN TIMER FOR PENDING FAST REQUESTS */}
                  {booking.status === "Pending" && (
                    <div className="mt-4">
                      {remainingSecs !== null && remainingSecs > 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/30">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                              <Clock3 size={15} className="animate-spin text-amber-700" />
                              {t("driver.respondWithin", "Response deadline")}
                            </span>
                            <span
                              className={`font-mono text-base font-black ${
                                remainingSecs < 20
                                  ? "text-red-600 animate-pulse dark:text-red-400"
                                  : remainingSecs < 60
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-green-700 dark:text-green-300"
                              }`}
                            >
                              {Math.floor(remainingSecs / 60)}:
                              {String(remainingSecs % 60).padStart(2, "0")}
                            </span>
                          </div>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                remainingSecs < 20
                                  ? "bg-red-600"
                                  : remainingSecs < 60
                                  ? "bg-amber-500"
                                  : "bg-green-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {t(
                              "driver.countdownNote",
                              "Auto-expires if unanswered. Farmer will be recommended alternatives."
                            )}
                          </p>
                        </div>
                      ) : isExpired ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                          <AlertTriangle size={16} />
                          <span>
                            {t(
                              "driver.deadlinePassed",
                              "Response window closed. Request marked Expired."
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-500">{t("driver.farmer", "Farmer")}</p>
                      <p className="mt-1 font-black">
                        {booking.customer?.fullName || booking.customerName}
                      </p>
                      {booking.status === "Accepted" && (
                        <>
                          <p className="mt-1 text-xs text-slate-500">
                            {booking.customer?.phone || booking.customerPhone}
                          </p>
                          <ContactActions
                            phone={booking.customer?.phone || booking.customerPhone}
                          />
                        </>
                      )}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-500">{t("driver.payout", "Your Payout")}</p>
                      <p className="mt-1 font-black text-green-800 dark:text-lime-300">
                        ₹{Math.round(booking.finalPrice || booking.totalPrice || 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {booking.landArea} {booking.areaUnit || "Bigha"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin size={16} className="text-green-700 shrink-0" />
                    <span className="truncate">{booking.customerLocation}</span>
                  </div>

                  {booking.status === "Accepted" && (
                    <DirectionsLink
                      latitude={booking.customerLatitude}
                      longitude={booking.customerLongitude}
                    />
                  )}
                  {booking.status === "Accepted" && (
                    <div className="mt-3">
                      <ChatBox
                        bookingId={booking._id}
                        title={`Chat with ${booking.customer?.fullName || booking.customerName}`}
                      />
                    </div>
                  )}

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {booking.workType} · {t("driver.requiredDateLabel", "Required")}{" "}
                    {new Date(booking.requiredDate).toLocaleDateString("en-IN")}
                  </p>

                  {booking.status === "Pending" && (
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isExpired}
                        onClick={() => changeFastStatus(booking._id, "accept")}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 size={17} />
                        {t("driver.accept", "Accept")}
                      </button>
                      <button
                        type="button"
                        onClick={() => changeFastStatus(booking._id, "reject")}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-700 hover:bg-red-100"
                      >
                        <XCircle size={17} />
                        {t("driver.reject", "Reject")}
                      </button>
                    </div>
                  )}

                  {booking.status === "Accepted" &&
                    (otpTarget === booking._id ? (
                      <div className="mt-5 space-y-2.5">
                        <div className="flex gap-2">
                          <input
                            value={completionOtp}
                            onChange={(event) =>
                              setCompletionOtp(
                                event.target.value.replace(/\D/g, "").slice(0, 6)
                              )
                            }
                            inputMode="numeric"
                            placeholder={t("driver.otpPlaceholder", "Enter Farmer OTP")}
                            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            disabled={completionOtp.length !== 6}
                            onClick={() => changeFastStatus(booking._id, "complete")}
                            className="rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            {t("driver.verifyComplete", "Verify & complete")}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{t("driver.otpExpiredOrMissing", "OTP expired or not showing?")}</span>
                          <button
                            type="button"
                            disabled={regeneratingOtp[booking._id]}
                            onClick={() => regenerateSingleOtp(booking._id)}
                            className="inline-flex items-center gap-1 font-bold text-green-700 hover:text-green-800 dark:text-lime-400 dark:hover:text-lime-300 disabled:opacity-50"
                          >
                            <RotateCcw
                              size={13}
                              className={regeneratingOtp[booking._id] ? "animate-spin" : ""}
                            />
                            {regeneratingOtp[booking._id]
                              ? t("driver.regenerating", "Regenerating...")
                              : t("driver.regenerateOtp", "Regenerate OTP")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOtpTarget(booking._id)}
                          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white hover:bg-slate-800"
                        >
                          <CheckCircle2 size={17} />
                          {t("driver.enterFarmerOtp", "Enter Farmer OTP to Complete")}
                        </button>
                        <button
                          type="button"
                          disabled={regeneratingOtp[booking._id]}
                          onClick={() => regenerateSingleOtp(booking._id)}
                          title={t("driver.regenerateFarmerOtp", "Regenerate Farmer OTP")}
                          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 hover:text-green-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50"
                        >
                          <RotateCcw
                            size={14}
                            className={regeneratingOtp[booking._id] ? "animate-spin" : ""}
                          />
                          <span className="hidden sm:inline">
                            {regeneratingOtp[booking._id]
                              ? t("driver.regenerating", "Regenerating...")
                              : t("driver.regenerateOtp", "Regenerate OTP")}
                          </span>
                        </button>
                      </div>
                    ))}
                </article>
              );
            })}
          </div>
        </section>

        {/* GROUP BOOKING REQUESTS */}
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={18} className="text-green-700 dark:text-lime-300" />
            <h2 className="text-xl font-black">
              {t("driver.incomingGroupRequests", "Pooled Group Requests")}
            </h2>
          </div>
          {loading && (
            <div className="rounded-3xl bg-white p-10 text-center dark:bg-slate-900">
              {t("common.loading", "Loading...")}
            </div>
          )}
          {!loading && activeGroups.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              {t("driver.noGroupRequests", "No group requests found.")}
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            {activeGroups.map((group) => (
              <article
                key={group._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black">
                      {group.listing?.title ||
                        t("driver.serviceRequest", "Service request")}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("driver.group", "Group")} #{String(group._id).slice(-8)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      statusStyles[group.status] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {t(`driver.status.${group.status}`, group.status)}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-lg font-black">{group.members.length}</p>
                    <p className="text-[11px] text-slate-500">
                      {t("driver.members", "Members")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-lg font-black">{group.totalLandArea}</p>
                    <p className="text-[11px] text-slate-500">Bigha</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-lg font-black">
                      ₹{Math.round(group.totalFinalPrice || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t("driver.total", "Total")}
                    </p>
                  </div>
                </div>
                <section className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                  <h4 className="text-xs font-black uppercase tracking-wide text-green-800 dark:text-green-300">
                    {t("driver.priceDetails", "Price details")}
                  </h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                      <span>{t("driver.baseAmount", "Base amount")}</span>
                      <span className="font-bold">
                        {formatMoney(group.totalOriginalPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 text-slate-600 dark:text-slate-300">
                      <span>{t("driver.additionalCharge", "Additional charge")}</span>
                      <span className="font-bold">{formatMoney(0)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-green-800 dark:text-green-300">
                      <span>
                        {t("driver.groupDiscountRate", "Group discount ({{percent}}%)", {
                          percent: group.groupDiscountPercent,
                        })}
                      </span>
                      <span className="font-bold">− {formatMoney(group.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-green-200 pt-3 font-black text-green-900 dark:border-green-800 dark:text-lime-200">
                      <span>{t("driver.finalTotal", "Final group total")}</span>
                      <span>{formatMoney(group.totalFinalPrice)}</span>
                    </div>
                  </div>
                </section>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin size={16} />
                  {group.location}
                </div>
                <div className="mt-4 space-y-2">
                  {group.members.map((member) => {
                    const landArea = Number(member.landArea || 0);
                    const baseAmount = Number(member.originalPrice || 0);
                    const discountAmount = Number(member.discountAmount || 0);
                    const finalAmount = Number(
                      member.finalPrice ?? baseAmount - discountAmount
                    );
                    const rate = landArea > 0 ? baseAmount / landArea : 0;
                    return (
                      <div
                        key={member._id}
                        className="rounded-xl border border-slate-100 px-3 py-3 text-sm dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black">
                            {member.user?.fullName || t("driver.farmer", "Farmer")}
                          </span>
                          <span className="font-black text-green-800 dark:text-lime-300">
                            {formatMoney(finalAmount)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{t("driver.landArea", "Land area")}</span>
                          <span className="text-right font-semibold">
                            {landArea} Bigha
                          </span>
                          <span>{t("driver.ratePerBigha", "Rate per Bigha")}</span>
                          <span className="text-right font-semibold">
                            {formatMoney(rate)}
                          </span>
                          <span>{t("driver.baseAmount", "Base amount")}</span>
                          <span className="text-right font-semibold">
                            {formatMoney(baseAmount)}
                          </span>
                          <span>{t("driver.additionalCharge", "Additional charge")}</span>
                          <span className="text-right font-semibold">
                            {formatMoney(0)}
                          </span>
                          <span>
                            {t("driver.groupDiscountRate", "Group discount ({{percent}}%)", {
                              percent: group.groupDiscountPercent,
                            })}
                          </span>
                          <span className="text-right font-semibold">
                            − {formatMoney(discountAmount)}
                          </span>
                          <span className="font-black text-slate-700 dark:text-slate-200">
                            {t("driver.finalTotal", "Final amount")}
                          </span>
                          <span className="text-right font-black text-green-800 dark:text-lime-300">
                            {formatMoney(finalAmount)}
                          </span>
                        </div>
                        {group.status === "Accepted" && (
                          <>
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              {member.user?.phone ||
                                t("driver.phoneUnavailable", "Phone unavailable")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <ContactActions phone={member.user?.phone} />
                              <DirectionsLink
                                latitude={member.latitude}
                                longitude={member.longitude}
                              />
                              {member.booking && (
                                <ChatBox
                                  bookingId={member.booking}
                                  title={`Chat with ${
                                    member.user?.fullName || "Farmer"
                                  }`}
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(group.status === "RequestSent" || group.status === "Ready" || group.status === "Forming") && (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => changeStatus(group._id, "accept")}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white hover:bg-green-800"
                    >
                      <CheckCircle2 size={17} />
                      {t("driver.accept", "Accept")}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeStatus(group._id, "reject")}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-700 hover:bg-red-100"
                    >
                      <XCircle size={17} />
                      {t("driver.reject", "Reject")}
                    </button>
                  </div>
                )}
                {group.status === "Accepted" && (
                  <div className="mt-5 space-y-2">
                    {group.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs font-bold dark:bg-slate-800"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {member.user?.fullName || t("driver.farmer", "Farmer")}
                        </span>
                        {member.otpVerified ? (
                          <span className="rounded-lg bg-green-100 px-3 py-2 text-green-800">
                            {t("driver.otpVerified", "OTP verified")}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              value={groupCompletionOtps[group._id]?.[member._id] || ""}
                              onChange={(event) =>
                                setGroupCompletionOtps((current) => ({
                                  ...current,
                                  [group._id]: {
                                    ...(current[group._id] || {}),
                                    [member._id]: event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6),
                                  },
                                }))
                              }
                              inputMode="numeric"
                              placeholder={t("driver.otpPlaceholder", "Enter Farmer OTP")}
                              aria-label={`OTP for ${member.user?.fullName || "Farmer"}`}
                              className="h-10 min-w-0 w-28 rounded-lg border border-slate-200 px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              disabled={
                                (groupCompletionOtps[group._id]?.[member._id] || "")
                                  .length !== 6
                              }
                              onClick={() =>
                                verifyGroupMemberOtp(group._id, member._id)
                              }
                              className="h-10 rounded-lg bg-green-700 px-3 text-xs font-black text-white disabled:opacity-50"
                            >
                              {t("driver.verifyOtp", "Verify")}
                            </button>
                            <button
                              type="button"
                              title={t("driver.regenerateFarmerOtp", "Regenerate Farmer OTP")}
                              disabled={regeneratingOtp[`${group._id}-${member._id}`]}
                              onClick={() =>
                                regenerateGroupMemberOtp(group._id, member._id)
                              }
                              className="flex h-10 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-green-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50"
                            >
                              <RotateCcw
                                size={14}
                                className={
                                  regeneratingOtp[`${group._id}-${member._id}`]
                                    ? "animate-spin"
                                    : ""
                                }
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={
                        !group.members.length ||
                        group.members.some((member) => member.otpVerified !== true)
                      }
                      onClick={() => changeStatus(group._id, "complete")}
                      className="min-h-11 w-full rounded-xl bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("driver.completeWork", "Complete work")}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* REJECTED & EXPIRED (24-HOUR RETENTION HISTORY) */}
        {rejectedHistory.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-slate-500" />
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200">
                  {t("driver.expiredAndRejected", "Expired & Rejected (Past 24 Hours)")}
                </h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {rejectedHistory.length}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {t("driver.autoPurgeNotice", "Automatically cleared 24h after status change")}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rejectedHistory.map((item) => (
                <article
                  key={item._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {item.itemId?.title || "Machine booking"}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        #{String(item._id).slice(-8)} · Farmer: {item.customer?.fullName || item.customerName || "Farmer"}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-black text-red-800 dark:bg-red-950/50 dark:text-red-300">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{item.landArea} {item.areaUnit || "Bigha"}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      ₹{Math.round(item.finalPrice || item.totalPrice || 0)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <CreditPackModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onCreditUpdated={(newVal) => setCredits(newVal)}
      />
    </main>
  );
}

export default DriverDashboard;
