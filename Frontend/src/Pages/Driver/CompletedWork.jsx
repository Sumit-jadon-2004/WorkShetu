import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Clock3, MapPin, Users } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useTranslation } from "react-i18next";

function formatDate(value, language = "en") {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString(language.startsWith("hi") ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CompletedWork() {
  const { t, i18n } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    axios.get("/api/group-bookings/owner/completed", { withCredentials: true })
      .then(({ data }) => {
        if (!active) return;
        setGroups(data?.groups || []);
        setBookings(data?.bookings || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || t("driver.historyLoadError", "Completed work history could not be loaded."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const history = [
    ...groups.map((group) => ({ ...group, historyType: "group" })),
    ...bookings.map((booking) => ({ ...booking, historyType: "single" })),
  ].sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-start gap-4">
          <div className="rounded-2xl bg-green-100 p-3 text-green-800 dark:bg-green-950/50 dark:text-lime-300"><CheckCircle2 size={25} /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">{t("driver.workspace", "Driver workspace")}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{t("driver.completedHistory", "Completed work history")}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("driver.completedPageSubtitle", "All your completed group and fast booking work in one place.")}</p>
          </div>
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Clock3 className="mt-0.5 shrink-0" size={18} />
          <p>{t("driver.autoDeleteNotice", "Completed work history is automatically deleted 15 days after the work is marked complete.")}</p>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {loading && <div className="mt-8 rounded-3xl bg-white p-10 text-center dark:bg-slate-900">{t("driver.loadingCompleted", "Loading completed work...")}</div>}
        {!loading && !error && history.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">{t("driver.noRecentCompleted", "No completed work in the last 15 days.")}</div>}

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {history.map((work) => {
            const isGroup = work.historyType === "group";
            const title = isGroup ? work.listing?.title : work.itemId?.title;
            const workId = String(work._id).slice(-8);
            const amount = isGroup ? work.totalFinalPrice : work.finalPrice || work.totalPrice;

            return (
              <article key={`${work.historyType}-${work._id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">{title || (isGroup ? t("driver.group", "Group") : t("driver.fastBooking", "Fast booking"))}</h2>
                    <p className="mt-1 text-xs text-slate-400">{isGroup ? t("driver.group", "Group") : t("driver.fastBooking", "Fast booking")} #{workId}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-xs font-black text-green-800 dark:bg-green-950/50 dark:text-lime-200">{t("driver.completed", "Completed")}</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">{isGroup ? t("driver.farmers", "Farmers") : t("driver.farmer", "Farmer")}</p>
                    <p className="mt-1 font-bold">{isGroup ? `${work.members?.length || 0} ${t("driver.farmers", "farmers")}` : work.customer?.fullName || work.customerName || t("driver.farmer", "Farmer")}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs text-slate-500">{isGroup ? t("driver.groupTotal", "Group total") : t("driver.amount", "Amount")}</p>
                    <p className="mt-1 font-black">₹{Math.round(amount || 0)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                  {isGroup && <span className="inline-flex items-center gap-1.5"><Users size={15} />{work.totalLandArea} Bigha</span>}
                  <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{isGroup ? work.location : work.customerLocation}</span>
                </div>
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">{t("driver.completedAt", "Completed {{date}}", { date: formatDate(work.completedAt || work.updatedAt, i18n.language) })}</p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

export default CompletedWork;
