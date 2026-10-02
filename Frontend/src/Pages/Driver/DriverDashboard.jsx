import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Clock3, MapPin, MessageCircle, Navigation, Phone, Truck, Users, XCircle } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { Link } from "react-router-dom";
import ChatBox from "../Common/ChatBox.jsx";
import { useTranslation } from "react-i18next";

const statusStyles = {
  RequestSent: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  Accepted: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200",
  Completed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  Forming: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
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
      <a href={`tel:${cleanPhone}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-green-700 px-3 text-xs font-black text-white"><Phone size={14} />{t("driver.callFarmer", "Call farmer")}</a>
      <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><MessageCircle size={14} />Chat</a>
    </div>
  );
}

function DirectionsLink({ latitude, longitude }) {
  const { t } = useTranslation();
  if (latitude == null || longitude == null) return null;
  const destination = `${latitude},${longitude}`;
  return (
    <a href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-black text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"><Navigation size={14} />{t("driver.openDirections", "Open directions")}</a>
  );
}

function DriverDashboard() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [fastBookings, setFastBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [otpTarget, setOtpTarget] = useState(null);
  const [completionOtp, setCompletionOtp] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/group-bookings/owner/requests", { withCredentials: true });
      setGroups(response.data?.groups || []);
      setFastBookings(response.data?.bookings || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("driver.requestLoadError", "Driver requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const changeStatus = async (groupId, action) => {
    try {
      const data = action === "complete" ? { otp: completionOtp } : {};
      await axios.put(`/api/group-bookings/${groupId}/${action}`, data, { withCredentials: true });
      setOtpTarget(null);
      setCompletionOtp("");
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("driver.requestUpdateError", "Request could not be updated."));
    }
  };

  const changeFastStatus = async (bookingId, action) => {
    try {
      const data = action === "complete" ? { otp: completionOtp } : {};
      await axios.put(`/api/group-bookings/single/${bookingId}/${action}`, data, { withCredentials: true });
      setOtpTarget(null);
      setCompletionOtp("");
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("driver.bookingUpdateError", "Fast booking could not be updated."));
    }
  };

  const requestCount = groups.filter((group) => group.status === "RequestSent").length + fastBookings.filter((booking) => booking.status === "Pending").length;
  const acceptedCount = groups.filter((group) => group.status === "Accepted").length;
  const completedGroups = groups.filter((group) => group.status === "Completed");
  const completedFastBookings = fastBookings.filter((booking) => booking.status === "Completed");
  const activeGroups = groups.filter((group) => group.status !== "Completed");
  const activeFastBookings = fastBookings.filter((booking) => booking.status !== "Completed");
  const completedCount = completedGroups.length + completedFastBookings.length;
  const totalLand = groups.reduce((total, group) => total + Number(group.totalLandArea || 0), 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysEarnings = [
    ...completedGroups,
    ...completedFastBookings,
  ].reduce((total, work) => {
    const completedAt = work.completedAt ? new Date(work.completedAt) : null;
    if (!completedAt || completedAt < todayStart) return total;
    return total + Number(work.totalFinalPrice || work.finalPrice || work.totalPrice || 0);
  }, 0);

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">{t("driver.workspace", "Driver workspace")}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{t("driver.dashboardTitle", "Group booking dashboard")}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("driver.dashboardSubtitle", "Manage combined farmer requests for your transport and equipment services.")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/driver/listings" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-black text-slate-800 hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">{t("driver.manageListings", "Manage listings")}</Link>
            <Link to="/driver/completed" className="inline-flex min-h-11 items-center rounded-xl border border-green-700 px-4 text-sm font-black text-green-800 hover:bg-green-50 dark:text-lime-300 dark:hover:bg-slate-800">{t("driver.completedHistory", "Completed work history")}</Link>
            <Link to="/driver/listings/new" className="inline-flex min-h-11 items-center rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800">{t("driver.addMachine", "Add machine listing")}</Link>
            <button type="button" onClick={loadRequests} className="min-h-11 rounded-xl bg-[#123524] px-4 text-sm font-black text-white hover:bg-[#176b3a]">{t("driver.refreshRequests", "Refresh requests")}</button>
          </div>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [Truck, t("driver.newRequests", "New requests"), requestCount],
            [Users, t("driver.activeGroups", "Active groups"), acceptedCount],
            [CheckCircle2, t("driver.completed", "Completed"), completedCount],
            [MapPin, t("driver.totalBigha", "Total Bigha"), totalLand.toFixed(1)],
            [CheckCircle2, t("driver.todaysEarnings", "Today's earnings"), `₹${Math.round(todaysEarnings).toLocaleString("en-IN")}`],
          ].map(([Icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Icon className="text-green-700 dark:text-lime-300" size={20} />
              <p className="mt-4 text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </section>


        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-green-700 dark:text-lime-300" /><h2 className="text-xl font-black">{t("driver.incomingGroupRequests", "Incoming group requests")}</h2></div>
          {loading && <div className="rounded-3xl bg-white p-10 text-center dark:bg-slate-900">{t("common.loading", "Loading...")}</div>}
          {!loading && activeGroups.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">{t("driver.noGroupRequests", "No group requests found.")}</div>}
          <div className="grid gap-5 lg:grid-cols-2">
            {activeGroups.map((group) => (
              <article key={group._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="text-lg font-black">{group.listing?.title || t("driver.serviceRequest", "Service request")}</h3><p className="mt-1 text-xs text-slate-400">{t("driver.group", "Group")} #{String(group._id).slice(-8)}</p></div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusStyles[group.status] || "bg-slate-100 text-slate-700"}`}>{t(`driver.status.${group.status}`, group.status)}</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-black">{group.members.length}</p><p className="text-[11px] text-slate-500">{t("driver.members", "Members")}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-black">{group.totalLandArea}</p><p className="text-[11px] text-slate-500">Bigha</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-black">₹{Math.round(group.totalFinalPrice || 0)}</p><p className="text-[11px] text-slate-500">{t("driver.total", "Total")}</p></div></div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><MapPin size={16} />{group.location}</div>
                <div className="mt-4 space-y-2">{group.members.map((member) => <div key={member._id} className="rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"><div className="flex items-center justify-between gap-3"><span>{member.user?.fullName || "Farmer"}</span><span className="font-bold">{member.landArea} Bigha</span></div>{group.status === "Accepted" && <><p className="mt-2 text-xs font-semibold text-slate-500">{member.user?.phone || t("driver.phoneUnavailable", "Phone unavailable")}</p><div className="flex flex-wrap gap-2"><ContactActions phone={member.user?.phone} /><DirectionsLink latitude={member.latitude} longitude={member.longitude} />{member.booking && <ChatBox bookingId={member.booking} title={`Chat with ${member.user?.fullName || "Farmer"}`} />}</div></>}</div>)}</div>
                {group.status === "RequestSent" && <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => changeStatus(group._id, "accept")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white"><CheckCircle2 size={17} />{t("driver.accept", "Accept")}</button><button type="button" onClick={() => changeStatus(group._id, "reject")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-700"><XCircle size={17} />{t("driver.reject", "Reject")}</button></div>}
                {group.status === "Accepted" && (otpTarget === group._id ? <div className="mt-5 flex gap-2"><input value={completionOtp} onChange={(event) => setCompletionOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder={t("driver.otpPlaceholder", "Enter Farmer OTP")} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /><button type="button" disabled={completionOtp.length !== 6} onClick={() => changeStatus(group._id, "complete")} className="rounded-xl bg-slate-900 px-3 text-xs font-black text-white disabled:opacity-50">{t("driver.verifyComplete", "Verify & complete")}</button></div> : <button type="button" onClick={() => setOtpTarget(group._id)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white"><CheckCircle2 size={17} />{t("driver.enterFarmerOtp", "Enter Farmer OTP")}</button>)}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2"><Truck size={18} className="text-green-700 dark:text-lime-300" /><h2 className="text-xl font-black">{t("driver.fastBookings", "Fast booking requests")}</h2></div>
          {!loading && activeFastBookings.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">{t("driver.noFastBookings", "No fast booking requests found.")}</div>}
          <div className="grid gap-5 lg:grid-cols-2">
            {activeFastBookings.map((booking) => (
              <article key={booking._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="text-lg font-black">{booking.itemId?.title || t("machineDetails.farmMachine", "Machine booking")}</h3><p className="mt-1 text-xs text-slate-400">Fast booking #{String(booking._id).slice(-8)}</p></div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusStyles[booking.status] || "bg-slate-100 text-slate-700"}`}>{t(`driver.status.${booking.status}`, booking.status)}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{t("driver.farmer", "Farmer")}</p><p className="mt-1 font-black">{booking.customer?.fullName || booking.customerName}</p>{booking.status === "Accepted" && <><p className="mt-1 text-xs text-slate-500">{booking.customer?.phone || booking.customerPhone}</p><ContactActions phone={booking.customer?.phone || booking.customerPhone} /></>}</div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{t("driver.amount", "Amount")}</p><p className="mt-1 font-black">₹{Math.round(booking.finalPrice || booking.totalPrice || 0)}</p><p className="text-xs text-slate-500">{booking.landArea} {booking.areaUnit || "Bigha"}</p></div></div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><MapPin size={16} />{booking.customerLocation}</div>
                {booking.status === "Accepted" && <DirectionsLink latitude={booking.customerLatitude} longitude={booking.customerLongitude} />}
                {booking.status === "Accepted" && <div className="mt-3"><ChatBox bookingId={booking._id} title={`Chat with ${booking.customer?.fullName || booking.customerName}`} /></div>}
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{booking.workType} · {t("driver.requiredDateLabel", "Required")} {new Date(booking.requiredDate).toLocaleDateString("en-IN")}</p>
                {booking.status === "Pending" && <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => changeFastStatus(booking._id, "accept")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white"><CheckCircle2 size={17} />{t("driver.accept", "Accept")}</button><button type="button" onClick={() => changeFastStatus(booking._id, "reject")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-700"><XCircle size={17} />{t("driver.reject", "Reject")}</button></div>}
                {booking.status === "Accepted" && (otpTarget === booking._id ? <div className="mt-5 flex gap-2"><input value={completionOtp} onChange={(event) => setCompletionOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder={t("driver.otpPlaceholder", "Enter Farmer OTP")} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /><button type="button" disabled={completionOtp.length !== 6} onClick={() => changeFastStatus(booking._id, "complete")} className="rounded-xl bg-slate-900 px-3 text-xs font-black text-white disabled:opacity-50">{t("driver.verifyComplete", "Verify & complete")}</button></div> : <button type="button" onClick={() => setOtpTarget(booking._id)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white"><CheckCircle2 size={17} />{t("driver.enterFarmerOtp", "Enter Farmer OTP")}</button>)}
              </article>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

export default DriverDashboard;
