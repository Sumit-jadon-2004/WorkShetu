import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, CheckCircle2, ClipboardList, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

function OrderNotice() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [notice, setNotice] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const savedNotice = localStorage.getItem("workshetu-order-notice");
    if (!savedNotice) return;
    try {
      setNotice(JSON.parse(savedNotice));
    } catch {
      localStorage.removeItem("workshetu-order-notice");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !notice?.bookingId) return undefined;
    const checkCompletion = async () => {
      try {
        const response = await axios.get("/api/group-bookings/my/requests", { withCredentials: true });
        const group = (response.data?.groups || []).find((item) => item._id === notice.bookingId);
        const booking = (response.data?.bookings || []).find((item) => item._id === notice.bookingId);
        if (!group && !booking || group?.status === "Completed" || booking?.status === "Completed") {
          localStorage.removeItem("workshetu-order-notice");
          setNotice(null);
        }
      } catch {
        // Keep the notice until completion can be confirmed.
      }
    };
    checkCompletion();
    const timer = window.setInterval(checkCompletion, 10000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, notice?.bookingId]);

  if (!notice || !isAuthenticated) return null;

  if (collapsed) {
    return <button type="button" onClick={() => setCollapsed(false)} className="fixed bottom-20 right-4 z-[120] flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-green-700 text-white shadow-xl shadow-green-900/25 sm:bottom-5 sm:right-5" aria-label="Open order notification"><ClipboardList size={19} /></button>;
  }

  return <aside className="fixed bottom-20 right-3 z-[120] w-[calc(100vw-1.5rem)] max-w-[280px] animate-[slide-in_220ms_ease-out] overflow-hidden rounded-2xl border border-green-200 bg-white shadow-2xl shadow-green-950/15 dark:border-green-900 dark:bg-slate-900 sm:bottom-5 sm:right-5" role="status"><div className="h-1 bg-gradient-to-r from-green-700 via-lime-400 to-green-700" /><div className="flex items-center gap-2.5 p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"><CheckCircle2 size={16} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-black text-slate-900 dark:text-white">My Order</h2><button type="button" onClick={() => setCollapsed(true)} aria-label="Minimize order notification" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><X size={15} /></button></div><button type="button" onClick={() => navigate("/bookings")} className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-green-700 px-2.5 text-[11px] font-black text-white transition hover:bg-green-800">Open bookings <ArrowRight size={13} /></button></div></div></aside>;
}

export default OrderNotice;
