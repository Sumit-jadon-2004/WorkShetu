import { useEffect, useState } from "react";
import axios from "axios";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Navigation, RefreshCw, ShieldCheck, Tractor, XCircle } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import ChatBox from "../Common/ChatBox.jsx";
import { useTranslation } from "react-i18next";

const statusStyles = {
  Pending: "bg-amber-100 text-amber-800",
  RequestSent: "bg-amber-100 text-amber-800",
  Accepted: "bg-green-100 text-green-800",
  Completed: "bg-slate-200 text-slate-700",
  Rejected: "bg-red-100 text-red-800",
  Forming: "bg-blue-100 text-blue-800",
};

function DirectionsLink({ latitude, longitude }) {
  const { t } = useTranslation();
  if (latitude == null || longitude == null) return null;
  return <a href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-800 transition hover:bg-blue-100"><Navigation size={15} />{t("bookings.viewMachineLocation", "View machine location")}</a>;
}

function CompletionCode({ otp }) {
  const { t } = useTranslation();
  if (!otp) return null;
  return <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide"><ShieldCheck size={16} />{t("bookings.completionOtp", "Work completion OTP")}</div><p className="mt-2 text-3xl font-black tracking-[0.35em]">{otp}</p><p className="mt-2 text-xs font-semibold">{t("bookings.shareOtp", "Share this OTP with the Driver only after the work is complete.")}</p></div>;
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusStyles[status] || "bg-slate-100 text-slate-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{t(`driver.status.${status}`, status)}</span>;
}

function BookingCard({ booking, type, onCancel }) {
  const { t, i18n } = useTranslation();
  const isGroup = type === "Group";
  const title = isGroup ? booking.listing?.title || t("bookings.groupMachineBooking", "Group machine booking") : booking.itemId?.title || t("bookings.machineBooking", "Machine booking");
  const machine = isGroup ? booking.listing : booking.itemId;
  const date = booking.bookingDate || booking.requiredDate;

  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
      <div className="flex min-w-0 items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"><Tractor size={21} /></div><div className="min-w-0"><h2 className="truncate text-lg font-black">{title}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{t(`bookings.type.${type.toLowerCase()}`, type)} {t("bookings.booking", "booking")} · #{String(booking._id).slice(-8)}</p></div></div>
      <StatusBadge status={booking.status} />
    </div>

    <div className="space-y-4 p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("bookings.yourLocation", "Your location")}</p><p className="mt-1 flex items-start gap-2 text-sm font-semibold"><MapPin size={16} className="mt-0.5 shrink-0 text-green-700" />{booking.location || booking.customerLocation || t("bookings.locationUnavailable", "Location unavailable")}</p></div><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("bookings.requiredDate", "Required date")}</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} className="text-green-700" />{date ? new Date(date).toLocaleDateString(i18n.language === "en" || i18n.language === "hinglish" ? "en-IN" : "hi-IN", { day: "numeric", month: "short", year: "numeric" }) : t("bookings.notSet", "Not set")}</p></div></div>

      {booking.status === "Accepted" && <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20"><p className="text-sm font-black text-blue-900 dark:text-blue-200">{t("bookings.driverAccepted", "Driver has accepted your request")}</p><p className="mt-1 text-xs text-blue-700 dark:text-blue-300">{t("bookings.acceptedHelp", "Use the location action to view the machine route. Share the OTP only after the work is finished.")}</p><div className="mt-3"><DirectionsLink latitude={machine?.latitude} longitude={machine?.longitude} /></div></div>}
      {booking.status === "Accepted" && (isGroup ? booking.members?.filter((member) => member.booking).map((member) => <div key={member.booking} className="mt-3"><ChatBox bookingId={member.booking} title={`Chat about ${title}`} /></div>) : <ChatBox bookingId={booking._id} title={`Chat about ${title}`} />)}
      {booking.status === "Accepted" && <CompletionCode otp={booking.completionOtp} />}
      {booking.status === "Completed" && <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-4 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"><CheckCircle2 size={20} className="text-green-600" />{t("bookings.workCompleted", "Work completed successfully")}</div>}
      {booking.status === "Rejected" && <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 dark:bg-red-950/30 dark:text-red-300"><XCircle size={20} />{t("bookings.driverRejected", "Driver rejected this booking")}</div>}
      {booking.status === "Pending" || booking.status === "RequestSent" || booking.status === "Forming" ? <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><Clock3 size={19} />{t("bookings.waitingDriver", "Waiting for the Driver to review your request")}</div> : null}
      {onCancel && (booking.status === "Pending" || booking.status === "RequestSent" || booking.status === "Forming") && <button type="button" onClick={() => onCancel(booking)} className="min-h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 transition hover:bg-red-100">{t("bookings.cancel", "Cancel booking")}</button>}
    </div>
  </article>;
}

function MyBooking() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cancelBooking = async (booking) => {
    if (!window.confirm(t("bookings.cancelConfirm", "Are you sure you want to cancel this booking?"))) return;
    try {
      const isGroup = booking.bookingType === "Group" || booking.groupBookingId || booking.members;
      const bookingId = isGroup ? booking.members?.find((member) => member.booking)?.booking : booking._id;
      if (!bookingId) return;
      await axios.put(`/api/group-bookings/my/${isGroup ? "group" : "single"}/${bookingId}/cancel`, {}, { withCredentials: true });
      await loadBookings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("bookings.cancelError", "Booking could not be cancelled."));
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/group-bookings/my/requests", { withCredentials: true });
      setGroups(response.data?.groups || []);
      setBookings(response.data?.bookings || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("bookings.loadError", "Bookings could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">{t("bookings.workspace", "Farmer workspace")}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t("bookings.title", "My bookings")}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("bookings.subtitle", "Track every request, acceptance and work completion in one place.")}</p></div><button type="button" onClick={loadBookings} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#123524] px-4 text-sm font-black text-white transition hover:bg-[#176b3a] disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />{t("common.refresh", "Refresh")}</button></header>
        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {loading && <div className="mt-8 rounded-3xl bg-white p-12 text-center dark:bg-slate-900">{t("bookings.loading", "Loading bookings...")}</div>}
        {!loading && (groups.length > 0 || bookings.length > 0) && <section className="mt-8 grid gap-3 sm:grid-cols-3"><SummaryCard label={t("bookings.total", "Total bookings")} value={groups.length + bookings.length} /><SummaryCard label={t("driver.status.Accepted", "Accepted")} value={[...groups, ...bookings].filter((booking) => booking.status === "Accepted").length} tone="green" /><SummaryCard label={t("driver.status.Completed", "Completed")} value={[...groups, ...bookings].filter((booking) => booking.status === "Completed").length} tone="slate" /></section>}
        {!loading && groups.length === 0 && bookings.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">{t("bookings.empty", "No bookings found.")}</div>}

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {groups.map((group) => <BookingCard key={group._id} booking={group} type="Group" onCancel={cancelBooking} />)}
          {bookings.map((booking) => <BookingCard key={booking._id} booking={booking} type="Fast" onCancel={cancelBooking} />)}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  const styles = tone === "green" ? "text-green-700" : tone === "slate" ? "text-slate-700 dark:text-slate-200" : "text-slate-900 dark:text-white";
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className={`text-3xl font-black ${styles}`}>{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;
}

export default MyBooking;
