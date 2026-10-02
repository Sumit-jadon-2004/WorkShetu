import { useEffect, useState } from "react";
import axios from "axios";
import { MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

function ChatBox({ bookingId, title, openOnMount = false, openSignal = 0, showTrigger = true }) {
	const { user } = useAuth();
	const [open, setOpen] = useState(openOnMount);
	const [messages, setMessages] = useState([]);
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState("");

	const loadMessages = async (showLoading = false) => {
		try {
			if (showLoading) setLoading(true);
			const response = await axios.get(`/api/chat/${bookingId}`, { withCredentials: true });
			setMessages(response.data?.messages || []);
			setError("");
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Chat could not be loaded.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!open) return undefined;
		loadMessages(true);
		const timer = window.setInterval(() => loadMessages(false), 4000);
		return () => window.clearInterval(timer);
	}, [open, bookingId]);

	useEffect(() => {
		if (openSignal > 0) setOpen(true);
	}, [openSignal]);

	if (!bookingId) return null;

	const sendMessage = async (event) => {
		event.preventDefault();
		if (!text.trim() || sending) return;
		try {
			setSending(true);
			const response = await axios.post(`/api/chat/${bookingId}`, { text }, { withCredentials: true });
			setMessages((current) => [...current, response.data.message]);
			setText("");
			setError("");
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Message could not be sent.");
		} finally {
			setSending(false);
		}
	};

	return (
		<>
			{showTrigger && <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200"><MessageCircle size={15} />Chat on WorkShetu</button>}
			{open && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center"><section role="dialog" aria-modal="true" aria-label="Private booking chat" className="flex h-[min(680px,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:bg-slate-900"><header className="flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-green-700 dark:text-lime-300">WorkShetu private chat</p><h2 className="mt-1 font-black">{title || "Booking chat"}</h2><p className="mt-1 text-xs text-slate-500">Only the Farmer and Driver can see these messages.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></header><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/50">{loading && messages.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Opening secure chat...</p>}{!loading && !error && messages.length === 0 && <div className="mx-auto max-w-xs py-12 text-center"><MessageCircle size={30} className="mx-auto text-green-700" /><p className="mt-3 font-black">Start the conversation</p><p className="mt-1 text-sm text-slate-500">Send a message about timing, location or work details.</p></div>}{messages.map((message) => { const own = String(message.sender?._id) === String(user?._id); return <div key={message._id} className={`flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${own ? "rounded-br-md bg-green-700 text-white" : "rounded-bl-md bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"}`}><p>{message.text}</p><p className={`mt-1 text-[10px] ${own ? "text-green-100" : "text-slate-400"}`}>{own ? "You" : message.sender?.fullName || "Participant"}</p></div></div>; })}</div>{error && <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"><p>{error}</p><button type="button" onClick={() => loadMessages(true)} className="mt-2 font-black underline">Try again</button></div>}<form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><input autoFocus={open} value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Write a message..." className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800" /><button type="submit" disabled={!text.trim() || sending || loading} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white disabled:opacity-50"><Send size={17} /></button></form></section></div>}
		</>
	);
}

export default ChatBox;
