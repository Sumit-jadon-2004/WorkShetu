import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Clock3, MapPin, Users, XCircle } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";

function GroupBookings() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/group-bookings/owner/list", { withCredentials: true });
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Group bookings could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const updateGroup = async (groupId, action) => {
    try {
      await axios.put(`/api/group-bookings/${groupId}/${action}`, {}, { withCredentials: true });
      await loadGroups();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Group booking could not be updated.");
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">Owner workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Group booking requests</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review combined farmer requests for your machines.</p>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {loading && <div className="rounded-3xl bg-white p-8 text-center dark:bg-slate-900">Loading group bookings...</div>}
        {!loading && groups.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">No group booking requests yet.</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <article key={group._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{group.listing?.title || "Machine booking"}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-400">#{group._id}</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-800 dark:bg-green-950/60 dark:text-lime-300">{group.status}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><Users size={17} /><p className="mt-2 text-lg font-black">{group.members.length}</p><p className="text-xs text-slate-500">Members</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><MapPin size={17} /><p className="mt-2 text-lg font-black">{group.totalLandArea}</p><p className="text-xs text-slate-500">Bigha</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><Clock3 size={17} /><p className="mt-2 text-lg font-black">{group.minimumRequiredLand}</p><p className="text-xs text-slate-500">Required</p></div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><CheckCircle2 size={17} /><p className="mt-2 text-lg font-black">{group.groupDiscountPercent}%</p><p className="text-xs text-slate-500">Discount</p></div>
              </div>

              <div className="mt-5 rounded-2xl bg-green-50 p-4 dark:bg-green-950/40">
                <div className="flex justify-between text-sm"><span>Original amount</span><strong>₹{Math.round(group.totalOriginalPrice)}</strong></div>
                <div className="mt-2 flex justify-between text-sm"><span>Discount</span><strong>- ₹{Math.round(group.totalDiscount)}</strong></div>
                <div className="mt-3 flex justify-between border-t border-green-200 pt-3 text-base font-black text-green-900 dark:border-green-800 dark:text-lime-200"><span>Final amount</span><span>₹{Math.round(group.totalFinalPrice)}</span></div>
              </div>

              <div className="mt-5 space-y-3">
                {group.members.map((member) => (
                  <div key={member._id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-black">{member.user?.fullName || "Farmer"}</p><p className="text-xs text-slate-500">{member.user?.phone || "Phone unavailable"} · {member.location}</p></div><span className="text-sm font-black text-green-700">₹{Math.round(member.finalPrice)}</span></div>
                    <p className="mt-2 text-xs text-slate-500">{member.landArea} Bigha · Original ₹{Math.round(member.originalPrice)} · Discount ₹{Math.round(member.discountAmount)}</p>
                  </div>
                ))}
              </div>

              {group.status === "RequestSent" && <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => updateGroup(group._id, "accept")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white"><CheckCircle2 size={17} />Accept</button><button type="button" onClick={() => updateGroup(group._id, "reject")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-700"><XCircle size={17} />Reject</button></div>}
              {group.status === "Accepted" && <button type="button" onClick={() => updateGroup(group._id, "complete")} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white"><CheckCircle2 size={17} />Mark completed</button>}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default GroupBookings;
