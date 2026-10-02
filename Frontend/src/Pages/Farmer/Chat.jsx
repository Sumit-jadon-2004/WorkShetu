import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { MessageCircle, RefreshCw, Tractor } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import ChatBox from "../Common/ChatBox.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

function Chat() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { t } = useTranslation();
  const [openSignal, setOpenSignal] = useState(0);

  const loadChats = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === "Driver" || user?.isAdmin ? "/api/group-bookings/owner/requests" : "/api/group-bookings/my/requests";
      const response = await axios.get(endpoint, { withCredentials: true });
      const groups = (response.data?.groups || []).flatMap((group) => (group.status === "Accepted" ? (group.members || []).filter((member) => member.booking).map((member) => ({ id: member.booking, title: group.listing?.title || "Group machine booking", type: "Group" })) : []));
      const fast = (response.data?.bookings || []).filter((booking) => booking.status === "Accepted").map((booking) => ({ id: booking._id, title: booking.itemId?.title || "Machine booking", type: "Fast" }));
      const next = [...groups, ...fast];
      setConversations(next);
      setSelectedId((current) => next.some((chat) => chat.id === current) ? current : next[0]?.id || "");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("chat.loadError", "Chats could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadChats(); }, [user?.role, user?.isAdmin]);

  const selected = useMemo(() => conversations.find((chat) => chat.id === selectedId), [conversations, selectedId]);

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">{t("chat.brand", "WorkShetu messages")}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t("chat.title", "Selected chats")}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("chat.subtitle", "Select an accepted booking to chat privately with its Driver.")}</p></div><button type="button" onClick={loadChats} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#123524] px-4 text-sm font-black text-white disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />{t("chat.refresh", "Refresh chats")}</button></header>
        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        <div className="mt-8 grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 px-3 py-3 text-sm font-black"><MessageCircle size={18} className="text-green-700" />{t("chat.conversations", "Your conversations")}</div>{!loading && conversations.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-500">{t("chat.empty", "Chats appear after a booking is accepted.")}</p>}{conversations.map((chat) => <button key={chat.id} type="button" onClick={() => { setSelectedId(chat.id); setOpenSignal((value) => value + 1); }} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === chat.id ? "bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white"><Tractor size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-black">{chat.title}</span><span className="text-[11px] font-semibold text-slate-500">{t(`bookings.type.${chat.type.toLowerCase()}`, chat.type)} {t("bookings.booking", "booking")}</span></span></button>)}</aside>
          <section className="min-h-[560px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">{selected ? <div><div className="mb-5"><p className="text-xs font-black uppercase tracking-wide text-green-700">{t("chat.selectedConversation", "Selected conversation")}</p><h2 className="mt-1 text-xl font-black">{selected.title}</h2></div><ChatBox key={selected.id} bookingId={selected.id} title={selected.title} openSignal={openSignal} openOnMount showTrigger={false} /></div> : <div className="flex min-h-[480px] flex-col items-center justify-center text-center"><MessageCircle size={42} className="text-green-700" /><h2 className="mt-4 text-xl font-black">{t("chat.select", "Select a chat")}</h2><p className="mt-2 max-w-sm text-sm text-slate-500">{t("chat.selectHelp", "Choose an accepted booking from the left to start chatting.")}</p></div>}</section>
        </div>
      </div>
    </main>
  );
}

export default Chat;
