import { useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  X,
  HardHat,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Briefcase,
  AlertCircle
} from "lucide-react";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80";

export default function LabourBookingModal({
  isOpen,
  worker,
  onClose,
  initialLocation = "",
  onSuccess
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bookingForm, setBookingForm] = useState({
    taskCategory: worker?.labourType || "General Farm Work",
    taskDescription: "",
    bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    preferredTime: "Morning (8:00 AM)",
    daysRequired: 1,
    customerLocation: initialLocation || worker?.location || "",
    message: ""
  });

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const rate = Number(worker?.price) || 0;
  const days = Math.max(1, parseInt(bookingForm.daysRequired, 10) || 1);
  const estimatedPrice = useMemo(() => rate * days, [rate, days]);

  if (!isOpen || !worker) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bookingLoading) return;

    const workerOwnerId = String(worker.owner?._id || worker.owner || "");
    if (user?._id && workerOwnerId && String(user._id) === workerOwnerId) {
      setBookingError("You cannot book your own listing.");
      return;
    }

    if (!bookingForm.bookingDate) {
      setBookingError("Please select a valid booking date.");
      return;
    }
    if (new Date(bookingForm.bookingDate) < new Date(todayStr)) {
      setBookingError("Booking date cannot be in the past.");
      return;
    }
    if (!bookingForm.customerLocation.trim()) {
      setBookingError("Please enter the farm or work location.");
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError("");

      const targetWorkerId = worker?._id || worker?.id || worker?.labourId || (typeof worker === "string" ? worker : "");

      const res = await axios.post(
        "/api/labour/book",
        {
          itemId: targetWorkerId,
          taskCategory: bookingForm.taskCategory.trim() || worker.labourType || "General Farm Work",
          taskDescription: bookingForm.taskDescription.trim(),
          daysRequired: days,
          bookingDate: bookingForm.bookingDate,
          preferredTime: bookingForm.preferredTime,
          customerLocation: bookingForm.customerLocation.trim(),
          message: bookingForm.message.trim()
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setBookingSuccess(true);
        const createdBookingId = res.data?.booking?._id;
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(res.data.booking);
          } else {
            onClose();
            navigate(`/bookings?type=labour${createdBookingId ? `&highlight=${createdBookingId}` : ""}`);
          }
        }, 1200);
      } else {
        setBookingError(res.data?.message || "Failed to submit booking request.");
      }
    } catch (err) {
      console.error("Labour booking error:", err);
      setBookingError(
        err.response?.data?.message ||
          "Could not submit booking request. Please check input details."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const imageUrl = worker.image?.url || DEFAULT_AVATAR;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all max-h-[92vh] flex flex-col">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md dark:border-slate-700 bg-slate-100">
              <img
                src={imageUrl}
                alt={worker.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.src = DEFAULT_AVATAR;
                }}
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Book {worker.name}
              </h3>
              <p className="truncate text-xs font-bold text-emerald-700 dark:text-lime-400">
                {worker.labourType || "Agricultural Professional"} · ₹{rate} / {worker.pricingUnit || "day"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            aria-label="Close booking modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {bookingSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shadow-md shadow-emerald-700/10">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                Labour booking request sent successfully.
              </h4>
              <p className="mx-auto mt-2 max-w-sm text-xs font-semibold text-slate-500 dark:text-slate-400">
                Opening your Labour Bookings...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {bookingError && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Row 1: Work Category & Booking Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Briefcase size={13} className="text-emerald-600" />
                    <span>Work Category</span>
                  </label>
                  <input
                    type="text"
                    value={bookingForm.taskCategory}
                    onChange={(e) => setBookingForm({ ...bookingForm, taskCategory: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-lime-400"
                    placeholder="e.g. Wheat Harvesting, Spraying"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>Booking Date</span>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={bookingForm.bookingDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-lime-400"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Preferred Time & Days Required */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Clock size={13} className="text-emerald-600" />
                    <span>Preferred Time</span>
                  </label>
                  <select
                    value={bookingForm.preferredTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, preferredTime: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-lime-400"
                  >
                    <option value="Morning (8:00 AM)">Morning (8:00 AM)</option>
                    <option value="Afternoon (1:00 PM)">Afternoon (1:00 PM)</option>
                    <option value="Full Day (8:00 AM - 5:00 PM)">Full Day (8:00 AM - 5:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>Days Required</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={bookingForm.daysRequired}
                    onChange={(e) => setBookingForm({ ...bookingForm, daysRequired: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-lime-400"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Farm / Work Location (Full Width) */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <MapPin size={13} className="text-emerald-600" />
                  <span>Farm / Work Location</span>
                </label>
                <input
                  type="text"
                  value={bookingForm.customerLocation}
                  onChange={(e) => setBookingForm({ ...bookingForm, customerLocation: e.target.value })}
                  placeholder="e.g. Village Sonipat, Farm Plot 4, Near Tube-well"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-lime-400"
                  required
                />
              </div>

              {/* Row 4: Task Description / Specific Instructions (Full Width) */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <FileText size={13} className="text-emerald-600" />
                  <span>Task Description / Specific Instructions</span>
                </label>
                <textarea
                  rows={2}
                  value={bookingForm.taskDescription}
                  onChange={(e) => setBookingForm({ ...bookingForm, taskDescription: e.target.value })}
                  placeholder="Specify crop type, acreage, field conditions or any specific tools required..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-lime-400"
                />
              </div>

              {/* ── Prominent Estimated Price Section ── */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Estimated Total Price
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{rate} × {days} day(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-950 dark:text-lime-300">
                      ₹{estimatedPrice.toLocaleString("en-IN")}
                    </span>
                    <p className="text-[10px] font-semibold text-slate-400">
                      Direct payment on completion
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Footer Buttons ── */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={bookingLoading}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || !bookingForm.bookingDate || !bookingForm.customerLocation}
                  className="flex-[1.5] rounded-xl bg-green-700 py-3 text-xs font-black text-white hover:bg-green-800 shadow-md shadow-green-700/25 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? "Submitting Request..." : "Confirm & Send Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
