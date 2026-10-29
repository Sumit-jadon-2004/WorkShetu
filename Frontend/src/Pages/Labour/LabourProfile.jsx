import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  HardHat,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80";

export default function LabourProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking Modal
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    taskCategory: "",
    taskDescription: "",
    bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    preferredTime: "Morning (8:00 AM)",
    daysRequired: 1,
    workerCount: 1,
    customerLocation: user?.location || "",
    message: "",
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    async function fetchWorker() {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`/api/labour/${id}`);
        if (res.data?.success && res.data.worker) {
          setWorker(res.data.worker);
          setBookingForm((prev) => ({
            ...prev,
            taskCategory: res.data.worker.labourType || "General Farm Work",
            customerLocation: user?.location || res.data.worker.location || "",
          }));
        } else {
          setError("Labour profile not found.");
        }
      } catch (err) {
        console.error("Fetch Worker Profile Error:", err);
        setError(err.response?.data?.message || "Failed to load worker profile.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchWorker();
  }, [id, user]);

  const estimatedPrice = useMemo(() => {
    if (!worker) return 0;
    const rate = Number(worker.price) || 0;
    const days = Math.max(1, Number(bookingForm.daysRequired) || 1);
    const count = Math.max(1, Number(bookingForm.workerCount) || 1);
    return rate * days * count;
  }, [worker, bookingForm.daysRequired, bookingForm.workerCount]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!worker) return;

    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/labour/${id}` } });
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError("");

      const res = await axios.post(
        "/api/labour/book",
        {
          itemId: worker._id,
          taskCategory: bookingForm.taskCategory,
          taskDescription: bookingForm.taskDescription,
          daysRequired: Number(bookingForm.daysRequired) || 1,
          workerCount: Number(bookingForm.workerCount) || 1,
          bookingDate: bookingForm.bookingDate,
          preferredTime: bookingForm.preferredTime,
          customerLocation: bookingForm.customerLocation,
          message: bookingForm.message,
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setBookingSuccess(true);
        setTimeout(() => {
          setIsBookingOpen(false);
          navigate("/bookings");
        }, 1800);
      } else {
        setBookingError(res.data?.message || "Failed to submit booking.");
      }
    } catch (err) {
      console.error("Labour booking error:", err);
      setBookingError(err.response?.data?.message || "Failed to submit booking request.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f8fafc] pb-24 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back Navigation */}
          <Link
            to="/Labour"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 mb-6 transition"
          >
            <ArrowLeft size={16} />
            <span>Back to Labour Marketplace</span>
          </Link>

          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : error || !worker ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle size={32} className="mx-auto mb-2 text-rose-600" />
              <h3 className="text-base font-black">{error || "Labour profile not found."}</h3>
              <Link
                to="/Labour"
                className="mt-4 inline-block rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white hover:bg-rose-800"
              >
                Browse Available Workers
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col md:flex-row">
                  {/* Photo */}
                  <div className="relative h-64 md:h-auto md:w-80 shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={worker.image?.url || DEFAULT_AVATAR}
                      alt={worker.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-emerald-800 shadow-md backdrop-blur-md dark:bg-slate-900/95 dark:text-emerald-300">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Verified Worker
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {worker.labourType}
                          </span>
                          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                            {worker.name}
                          </h1>
                        </div>

                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                          worker.availability === "Available"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {worker.availability === "Available" ? "Available for Hire" : "Currently Booked"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={15} className="text-slate-400" />
                          {worker.location}
                        </span>
                        {worker.serviceArea && (
                          <span className="text-slate-400">· Coverage: {worker.serviceArea}</span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock size={15} className="text-slate-400" />
                          {worker.experience || 0}+ Years Experience
                        </span>
                        {worker.rating > 0 && worker.reviewCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 font-bold">
                            <Star size={14} className="fill-amber-400 text-amber-400" />
                            {worker.rating.toFixed(1)} ({worker.reviewCount} reviews)
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {worker.skills && worker.skills.length > 0 && (
                        <div className="mt-4">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                            Skills & Expertise
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {worker.skills.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wage & Booking CTA */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Listed Wage Rate
                        </span>
                        <p className="text-2xl font-black text-green-700 dark:text-lime-300">
                          ₹{worker.price}{" "}
                          <span className="text-sm font-bold text-slate-500">
                            / {worker.pricingUnit || "day"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {worker.phone && (
                          <a
                            href={`tel:${worker.phone}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Phone size={15} />
                            <span>Call Worker</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsBookingOpen(true)}
                          disabled={worker.availability !== "Available"}
                          className={`rounded-2xl px-6 py-3 text-xs font-black text-white shadow-md transition active:scale-95 ${
                            worker.availability === "Available"
                              ? "bg-green-700 hover:bg-green-800 shadow-green-700/20"
                              : "bg-slate-400 cursor-not-allowed opacity-60"
                          }`}
                        >
                          Book This Worker
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio & Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    About this Service Provider
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {worker.description || "Experienced agricultural service provider registered on WorkShetu."}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Booking Instructions
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {worker.bookingInstructions || "Book at least 24 hours in advance. Provide exact farm location and task description."}
                  </p>
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <p className="font-bold">WorkShetu Guarantee:</p>
                    <p className="mt-0.5 text-[11px]">Payment is released to the provider only after task confirmation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Booking Modal ── */}
        {isBookingOpen && worker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <HardHat size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Book {worker.name}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {worker.labourType} · ₹{worker.price} / {worker.pricingUnit || "day"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              {bookingSuccess ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                    Booking Request Sent!
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The labour provider has received your request. Redirecting to My Bookings...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4 text-xs">
                  {bookingError && (
                    <div className="rounded-xl bg-rose-50 p-3 font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {bookingError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Work Category
                      </label>
                      <input
                        type="text"
                        value={bookingForm.taskCategory}
                        onChange={(e) => setBookingForm({ ...bookingForm, taskCategory: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="e.g. Sowing & Planting"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Booking Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={bookingForm.bookingDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Preferred Time
                      </label>
                      <select
                        value={bookingForm.preferredTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, preferredTime: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="Morning (8:00 AM)">Morning (8 AM)</option>
                        <option value="Afternoon (1:00 PM)">Afternoon (1 PM)</option>
                        <option value="Full Day">Full Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Days Required
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={bookingForm.daysRequired}
                        onChange={(e) => setBookingForm({ ...bookingForm, daysRequired: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Workers Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={bookingForm.workerCount}
                        onChange={(e) => setBookingForm({ ...bookingForm, workerCount: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Farm / Work Location
                    </label>
                    <input
                      type="text"
                      value={bookingForm.customerLocation}
                      onChange={(e) => setBookingForm({ ...bookingForm, customerLocation: e.target.value })}
                      placeholder="e.g. Village, Plot Number, Landmark"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Task Description / Specific Instructions
                    </label>
                    <textarea
                      rows="2"
                      value={bookingForm.taskDescription}
                      onChange={(e) => setBookingForm({ ...bookingForm, taskDescription: e.target.value })}
                      placeholder="Specify task requirements, crop type, equipment details..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Estimated Price Card */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          Estimated Total Price
                        </span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          ₹{worker.price} × {bookingForm.daysRequired} day(s) × {bookingForm.workerCount} worker(s)
                        </p>
                      </div>
                      <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                        ₹{estimatedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBookingOpen(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="flex-1 rounded-xl bg-green-700 py-3 font-black text-white hover:bg-green-800 shadow-md shadow-green-700/20 disabled:opacity-50"
                    >
                      {bookingLoading ? "Submitting..." : "Confirm & Send Request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

