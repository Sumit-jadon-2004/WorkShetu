import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, CheckCircle2, ClipboardList, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

function OrderNotice() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = user?.isAdmin === true || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";
  const destination = isDriver ? "/Drivers" : "/bookings";
  const destinationLabel = isDriver ? "Driver Dashboard" : "Open bookings";
  const noticeTitle = isDriver ? "Driver Orders" : "My Order";
  const [notice, setNotice] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotice(null);
      return;
    }

    const loadNotice = () => {
      const savedNotice = localStorage.getItem("workshetu-order-notice");
      if (savedNotice) {
        try {
          setNotice(JSON.parse(savedNotice));
          return;
        } catch {
          localStorage.removeItem("workshetu-order-notice");
        }
      }

      const endpoint = isDriver
        ? "/api/group-bookings/owner/requests"
        : "/api/group-bookings/my/requests";

      axios
        .get(endpoint, { withCredentials: true })
        .then((res) => {
          const activeBooking = (res.data?.bookings || []).find(
            (b) => b.status === "Pending" || b.status === "Accepted"
          );
          const groupStatuses = isDriver
            ? ["RequestSent", "Accepted"]
            : ["Forming", "Ready", "RequestSent", "Accepted"];
          const activeGroup = (res.data?.groups || []).find((g) =>
            groupStatuses.includes(g.status)
          );

          if (activeBooking || activeGroup) {
            const item = activeBooking || activeGroup;
            setNotice({
              type: activeGroup ? "Group" : "Fast",
              bookingId: item._id,
              status: item.status,
            });
          } else {
            setNotice(null);
          }
        })
        .catch(() => {});
    };

    loadNotice();
    window.addEventListener("workshetu-order-notice", loadNotice);
    window.addEventListener("storage", loadNotice);
    return () => {
      window.removeEventListener("workshetu-order-notice", loadNotice);
      window.removeEventListener("storage", loadNotice);
    };
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || !notice?.bookingId) return undefined;
    const endpoint = isDriver
      ? "/api/group-bookings/owner/requests"
      : "/api/group-bookings/my/requests";

    const checkCompletion = async () => {
      try {
        const response = await axios.get(endpoint, { withCredentials: true });
        const group = (response.data?.groups || []).find(
          (item) => item._id === notice.bookingId
        );
        const booking = (response.data?.bookings || []).find(
          (item) => item._id === notice.bookingId
        );
        if (
          (!group && !booking) ||
          group?.status === "Completed" ||
          booking?.status === "Completed"
        ) {
          localStorage.removeItem("workshetu-order-notice");
          setNotice(null);
        }
      } catch {
        // Keep notice on temporary network error
      }
    };

    checkCompletion();
    const timer = window.setInterval(checkCompletion, 10000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, isDriver, notice?.bookingId]);

  if (!notice || !isAuthenticated) return null;

  /* ── Collapsed state: clean green circle with green dot indicator ── */
  if (collapsed) {
    return (
      <button
        data-floating-order="true"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCollapsed(false);
        }}
        className="fixed bottom-20 right-4 z-[120] flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-white shadow-xl shadow-green-900/30 hover:bg-green-800 sm:bottom-5 sm:right-5"
        aria-label="Open order notification"
      >
        <ClipboardList size={20} />
        {/* live dot */}
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-lime-400 ring-2 ring-white" />
      </button>
    );
  }

  /* ── Expanded state: Popup card on both Mobile & Desktop ── */
  return (
    <aside
      data-floating-order="true"
      className="fixed bottom-20 right-4 z-[120] w-[calc(100vw-2rem)] max-w-[280px] overflow-hidden rounded-2xl border border-green-200 bg-white shadow-2xl shadow-green-950/20 dark:border-green-800 dark:bg-slate-900 sm:bottom-5 sm:right-5"
      role="status"
    >
      {/* top colour strip */}
      <div className="h-1 bg-gradient-to-r from-green-700 via-lime-400 to-green-700" />

      <div className="flex items-start gap-2.5 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
          <CheckCircle2 size={16} />
        </div>

        <div className="min-w-0 flex-1">
          {/* title + collapse X */}
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              {noticeTitle}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(true);
              }}
              aria-label="Minimize order notification"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={15} />
            </button>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => navigate(destination)}
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-green-700 px-2.5 text-[11px] font-black text-white transition hover:bg-green-800"
          >
            {destinationLabel} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default OrderNotice;
