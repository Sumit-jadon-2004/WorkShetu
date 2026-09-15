import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, Clock3, MapPin, Truck, Users, XCircle } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";

const statusStyles = {
  RequestSent: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  Accepted: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200",
  Completed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
  Forming: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
};

function DriverDashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/group-bookings/owner/list", { withCredentials: true });
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Driver requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const changeStatus = async (groupId, action) => {
    try {
      await axios.put(`/api/group-bookings/${groupId}/${action}`, {}, { withCredentials: true });
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Request could not be updated.");
    }
  };

  const requestCount = groups.filter((group) => group.status === "RequestSent").length;
  const acceptedCount = groups.filter((group) => group.status === "Accepted").length;
  const completedCount = groups.filter((group) => group.status === "Completed").length;
  const totalLand = groups.reduce((total, group) => total + Number(group.totalLandArea || 0), 0);

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">Driver workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Group booking dashboard</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage combined farmer requests for your transport and equipment services.</p>
          </div>
          <button type="button" onClick={loadRequests} className="min-h-11 rounded-xl bg-[#123524] px-4 text-sm font-black text-white hover:bg-[#176b3a]">Refresh requests</button>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Truck, "New requests", requestCount],
            [Users, "Active groups", acceptedCount],
            [CheckCircle2, "Completed", completedCount],
            [MapPin, "Total Bigha", totalLand.toFixed(1)],
          ].map(([Icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Icon className="text-green-700 dark:text-lime-300" size={20} />
              <p className="mt-4 text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-green-700 dark:text-lime-300" /><h2 className="text-xl font-black">Incoming group requests</h2></div>
          {loading && <div className="rounded-3xl bg-white p-10 text-center dark:bg-slate-900">Loading requests...</div>}
          {!loading && groups.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">No group requests found.</div>}
          <div className="grid gap-5 lg:grid-cols-2">
            {groups.map((group) => (
              <article key={group._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="text-lg font-black">{group.listing?.title || "Service request"}</h3><p className="mt-1 text-xs text-slate-400">Group #{String(group._id).slice(-8)}</p></div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusStyles[group.status] || "bg-slate-100 text-slate-700"}`}>{group.status}</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-black">{group.members.length}</p><p className="text-[11px] text-slate-500">Members</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-black">{group.totalLandArea}</p><p className="text-[11px] text-slate-500">Bigha</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-black">₹{Math.round(group.totalFinalPrice || 0)}</p><p className="text-[11px] text-slate-500">Total</p></div></div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><MapPin size={16} />{group.location}</div>
                <div className="mt-4 space-y-2">{group.members.map((member) => <div key={member._id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"><span>{member.user?.fullName || "Farmer"}</span><span className="font-bold">{member.landArea} Bigha</span></div>)}</div>
                {group.status === "RequestSent" && <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => changeStatus(group._id, "accept")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white"><CheckCircle2 size={17} />Accept</button><button type="button" onClick={() => changeStatus(group._id, "reject")} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-700"><XCircle size={17} />Reject</button></div>}
                {group.status === "Accepted" && <button type="button" onClick={() => changeStatus(group._id, "complete")} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-black text-white"><CheckCircle2 size={17} />Mark completed</button>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default DriverDashboard;
