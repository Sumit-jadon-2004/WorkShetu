import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HardHat,
  MapPin,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import { WorkerLocationMap } from "./LabourMap.jsx";
import LabourBookingModal from "./LabourBookingModal.jsx";

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

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, totalReviews: 0, distribution: {} });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewSort, setReviewSort] = useState("newest");
  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [hasReviewedProfile, setHasReviewedProfile] = useState(false);
  const [reviewForm, setReviewForm] = useState({ bookingId: "", rating: 5, comment: "" });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [workerLocation, setWorkerLocation] = useState(null);
  const [editingReviewId, setEditingReviewId] = useState("");
  const [editReviewForm, setEditReviewForm] = useState({ rating: 5, comment: "" });
  const isProfileOwner = Boolean(user?._id && worker?.owner && String(user._id) === String(worker.owner?._id || worker.owner));

  useEffect(() => {
    if (id === "bookings" || id === "my-bookings") {
      navigate("/bookings?type=labour", { replace: true });
      return;
    }

    if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setError("Labour profile not found.");
      setLoading(false);
      return;
    }

    async function fetchWorker() {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`/api/labour/${id}`);
        if (res.data?.success && res.data.worker) {
          setWorker(res.data.worker);
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

    fetchWorker();
  }, [id, user, navigate]);

  useEffect(() => {
    if (!id || id === "bookings" || id === "my-bookings" || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) return;

    // Independent Location Fetch (Immediate, completely decoupled from reviews/ratings)
    axios
      .get(`/api/labour/${id}/location`)
      .then((locRes) => {
        if (locRes.data?.success) {
          setWorkerLocation(locRes.data);
        }
      })
      .catch((err) => {
        console.warn("Labour location endpoint warning:", err);
      });

    // Independent Rating Summary Fetch
    axios
      .get(`/api/labour/${id}/rating`)
      .then((ratingRes) => {
        if (ratingRes.data) {
          setRatingSummary(ratingRes.data);
        }
      })
      .catch((err) => {
        console.warn("Labour rating summary warning:", err);
      });

    // Independent Reviews Fetch
    axios
      .get(`/api/labour/${id}/reviews`, { params: { page: reviewPage, limit: 6, sort: reviewSort } })
      .then((reviewRes) => {
        setReviews(reviewRes.data?.reviews || []);
        setReviewPages(reviewRes.data?.pagination?.pages || 1);
      })
      .catch((err) => {
        console.warn("Labour reviews fetch warning:", err);
      });
  }, [id, reviewPage, reviewSort]);

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setEligibleBookings([]);
      setHasReviewedProfile(false);
      return;
    }
    axios.get(`/api/labour/review-eligible/${id}`).then((response) => {
      const bookings = response.data?.bookings || [];
      setEligibleBookings(bookings);
      setHasReviewedProfile(Boolean(response.data?.hasReviewed));
      setReviewForm((current) => ({
        ...current,
        bookingId: bookings[0]?._id || ""
      }));
    }).catch(() => {
      setEligibleBookings([]);
      setHasReviewedProfile(false);
    });
  }, [id, isAuthenticated]);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/labour/${id}` } });
      return;
    }
    setReviewLoading(true);
    setReviewMessage("");
    try {
      const payload = {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment
      };
      if (reviewForm.bookingId) {
        payload.bookingId = reviewForm.bookingId;
      }
      const response = await axios.post(`/api/labour/${id}/reviews`, payload, { withCredentials: true });
      setReviewMessage(response.data?.message || "Review submitted.");
      setReviewForm({ bookingId: "", rating: 5, comment: "" });
      setReviewPage(1);
      const [ratingResponse, reviewResponse, eligibleResponse] = await Promise.all([
        axios.get(`/api/labour/${id}/rating`),
        axios.get(`/api/labour/${id}/reviews`, { params: { page: 1, limit: 6, sort: reviewSort } }),
        axios.get(`/api/labour/review-eligible/${id}`)
      ]);
      setRatingSummary(ratingResponse.data);
      setReviews(reviewResponse.data.reviews || []);
      setReviewPages(reviewResponse.data.pagination?.pages || 1);
      setEligibleBookings(eligibleResponse.data?.bookings || []);
      setHasReviewedProfile(Boolean(eligibleResponse.data?.hasReviewed));
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || "Could not submit review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const refreshReviews = async () => {
    const [ratingResponse, reviewResponse] = await Promise.all([
      axios.get(`/api/labour/${id}/rating`),
      axios.get(`/api/labour/${id}/reviews`, { params: { page: reviewPage, limit: 6, sort: reviewSort } })
    ]);
    setRatingSummary(ratingResponse.data);
    setReviews(reviewResponse.data.reviews || []);
    setReviewPages(reviewResponse.data.pagination?.pages || 1);
  };

  const saveReviewEdit = async (event) => {
    event.preventDefault();
    setReviewLoading(true);
    setReviewMessage("");
    try {
      const response = await axios.put(`/api/labour/${id}/reviews/${editingReviewId}`, {
        rating: Number(editReviewForm.rating),
        comment: editReviewForm.comment
      }, { withCredentials: true });
      setReviewMessage(response.data?.message || t("labourProfile.reviewUpdated"));
      setEditingReviewId("");
      await refreshReviews();
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || t("labourProfile.reviewSaveError"));
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteOwnReview = async (reviewId) => {
    if (!window.confirm(t("labourProfile.deleteReviewConfirm"))) return;
    setReviewLoading(true);
    setReviewMessage("");
    try {
      const response = await axios.delete(`/api/labour/${id}/reviews/${reviewId}`, { withCredentials: true });
      setReviewMessage(response.data?.message || t("labourProfile.reviewDeleted"));
      setEditingReviewId("");
      await refreshReviews();
      const eligibleResponse = await axios.get(`/api/labour/review-eligible/${id}`, { withCredentials: true });
      setEligibleBookings(eligibleResponse.data?.bookings || []);
      setHasReviewedProfile(Boolean(eligibleResponse.data?.hasReviewed));
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || t("labourProfile.reviewDeleteError"));
    } finally {
      setReviewLoading(false);
    }
  };

  const reportReview = async (reviewId) => {
    const reason = window.prompt("Why should this review be reviewed by an administrator?");
    if (!reason?.trim()) return;
    try {
      await axios.post(`/api/labour/reviews/${reviewId}/report`, { reason }, { withCredentials: true });
      setReviewMessage("Review reported for moderation.");
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || "Could not report review.");
    }
  };

  const handleOpenBooking = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/labour/${id}` } });
      return;
    }
    if (isProfileOwner) {
      alert("You cannot book your own listing.");
      return;
    }
    setIsBookingOpen(true);
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
              <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
                <div className="grid lg:grid-cols-[minmax(280px,0.85fr)_1.35fr]">
                  <div className="relative min-h-[300px] bg-slate-100 dark:bg-slate-800 lg:min-h-[460px]">
                    <img
                      src={worker.image?.url || DEFAULT_AVATAR}
                      alt={worker.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                    {worker.status === "Approved" && (
                      <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-emerald-800 shadow-lg dark:bg-slate-950/95 dark:text-emerald-300">
                        <ShieldCheck size={15} className="text-emerald-600" />
                        Verified profile
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col justify-between p-6 sm:p-9">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {worker.labourType}
                          </span>
                          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                            {worker.name}
                          </h1>
                          {worker.subProfession && (
                            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{worker.subProfession}</p>
                          )}
                        </div>
                        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          worker.availability === "Available"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {worker.availability === "Available" ? "Available now" : "Currently booked"}
                        </span>
                      </div>

                      <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                        <span className="flex items-center gap-2"><MapPin size={17} className="text-emerald-700" />{worker.location}</span>
                        <span className="flex items-center gap-2"><Clock size={17} className="text-emerald-700" />{worker.experience || 0}+ years experience</span>
                        {worker.serviceRadiusKm && <span className="flex items-center gap-2"><MapPin size={17} className="text-emerald-700" />Works within {worker.serviceRadiusKm} km</span>}
                        {worker.rating > 0 && worker.reviewCount > 0 && (
                          <span className="flex items-center gap-2 font-bold text-amber-600"><Star size={16} className="fill-amber-400 text-amber-400" />{worker.rating.toFixed(1)} ({worker.reviewCount} reviews)</span>
                        )}
                      </div>

                      {worker.skills?.length > 0 && (
                        <div className="mt-7">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Skills & expertise</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {worker.skills.map((skill, index) => <span key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{skill}</span>)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Starting rate</p>
                        <p className="mt-1 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                          ₹{Number(worker.price || 0).toLocaleString("en-IN")}
                          <span className="ml-1 text-sm font-bold text-slate-500">/ {worker.pricingUnit || "per day"}</span>
                        </p>
                      </div>
                      {isProfileOwner ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                          You cannot book your own listing.
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenBooking}
                          disabled={worker.availability !== "Available"}
                          className={`w-full rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto ${
                            worker.availability === "Available" ? "bg-emerald-700 shadow-emerald-700/20 hover:bg-emerald-800" : "cursor-not-allowed bg-slate-400 opacity-60"
                          }`}
                        >
                          Book This Worker
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">About this service provider</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{worker.description || "This provider has not added an introduction yet."}</p>
                  {(worker.qualification || worker.experience || worker.skills?.length > 0) && (
                    <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-slate-800">
                      {worker.qualification && <div><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Qualification</p><p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{worker.qualification}</p></div>}
                      {worker.experience != null && <div><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Experience</p><p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{worker.experience} years</p></div>}
                    </div>
                  )}
                </section>

                {(worker.bookingInstructions || worker.serviceLocation || worker.availabilityDays?.length || worker.emergencyAvailability) && (
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="text-xl font-black text-slate-950 dark:text-white">Booking information</h2>
                    {worker.bookingInstructions && <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{worker.bookingInstructions}</p>}
                    {worker.serviceLocation && <p className="mt-4 flex gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><MapPin size={17} className="mt-0.5 shrink-0 text-emerald-700" />Service area: {worker.serviceLocation}</p>}
                    {worker.availabilityDays?.length > 0 && <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Available: {worker.availabilityDays.join(", ")}</p>}
                    {worker.emergencyAvailability && <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Emergency requests accepted</p>}
                  </section>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <WorkerLocationMap
                  location={{
                    locationVisible: Boolean(
                      workerLocation?.locationVisible ||
                      worker.locationVisibility?.mapVisible ||
                      workerLocation?.coordinates ||
                      worker.locationVisibility?.coordinates
                    ),
                    publicLocation: workerLocation?.publicLocation || worker.locationVisibility?.publicLocation || worker.serviceLocation || worker.location,
                    serviceArea: worker.serviceArea,
                    serviceRadiusKm: workerLocation?.serviceRadiusKm || worker.locationVisibility?.serviceRadiusKm || worker.serviceRadiusKm,
                    coordinates: workerLocation?.coordinates || worker.locationVisibility?.coordinates || null,
                    isCityCenter: Boolean(workerLocation?.isCityCenter || worker.locationVisibility?.isCityCenter)
                  }}
                />

                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Ratings & reviews</h2>
                  <div className="mt-5 flex items-end gap-3">
                    <span className="text-5xl font-black text-slate-950 dark:text-white">
                      {Number(ratingSummary.averageRating || 0).toFixed(1)}
                    </span>
                    <div className="pb-1">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={18} className={star <= Math.round(ratingSummary.averageRating || 0) ? "fill-current" : "text-slate-200"} />
                        ))}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Based on {ratingSummary.totalReviews || 0} verified review{ratingSummary.totalReviews === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingSummary.distribution?.[stars] || 0;
                      const percentage = ratingSummary.totalReviews ? Math.round((count / ratingSummary.totalReviews) * 100) : 0;
                      return (
                        <div key={stars} className="grid grid-cols-[18px_1fr_36px] items-center gap-2 text-xs">
                          <span className="font-bold">{stars}</span>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-right text-slate-500">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {isProfileOwner ? (
                    <p className="mt-6 border-t border-slate-100 pt-5 text-sm font-semibold text-slate-500 dark:border-slate-800">
                      {t("labourProfile.ownerCannotReview")}
                    </p>
                  ) : !isAuthenticated ? (
                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Please{" "}
                        <Link to="/login" state={{ from: `/labour/${id}` }} className="font-bold text-emerald-700 hover:underline dark:text-emerald-400">
                          log in
                        </Link>{" "}
                        to leave a review.
                      </p>
                    </div>
                  ) : (hasReviewedProfile || reviews.some((r) => String(r.reviewerId) === String(user?._id))) && eligibleBookings.length === 0 ? (
                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500">
                        You have submitted a review for this worker. You can edit or delete your review below.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {eligibleBookings.length > 0 ? "Submit a verified review" : "Leave a review"}
                      </h3>
                      {eligibleBookings.length > 0 && (
                        <div className="mt-3">
                          <label className="block text-[11px] font-bold text-slate-500">Completed booking</label>
                          <select
                            value={reviewForm.bookingId}
                            onChange={(event) => setReviewForm({ ...reviewForm, bookingId: event.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                          >
                            {eligibleBookings.map((booking) => (
                              <option key={booking._id} value={booking._id}>
                                Completed booking · {new Date(booking.completedAt || booking.updatedAt || booking.bookingDate).toLocaleDateString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="mt-3 flex gap-1" role="group" aria-label="Rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: star })} aria-label={`${star} star rating`}>
                            <Star size={22} className={star <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        required
                        minLength={10}
                        maxLength={1000}
                        value={reviewForm.comment}
                        onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
                        placeholder="Share details about the completed work..."
                        className="mt-3 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                      <button
                        type="submit"
                        disabled={reviewLoading}
                        className="mt-3 w-full rounded-xl bg-emerald-700 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {reviewLoading ? "Submitting..." : "Submit Review"}
                      </button>
                      {reviewMessage && <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{reviewMessage}</p>}
                    </form>
                  )}
                </section>
              </div>

              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Customer reviews</h2>
                  <select
                    value={reviewSort}
                    onChange={(event) => { setReviewSort(event.target.value); setReviewPage(1); }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="newest">Newest</option>
                    <option value="highest">Highest rating</option>
                    <option value="lowest">Lowest rating</option>
                  </select>
                </div>
                {reviews.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-800">{t("labourProfile.noReviews")}</p>
                ) : (
                  <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                    {reviews.map((review) => (
                      <article key={review._id} className="py-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {review.customerImage ? (
                              <img src={review.customerImage} alt="" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-800">{review.customerName?.charAt(0) || "C"}</div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900 dark:text-white">{review.customerName}</p>
                              <p className="text-[11px] text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-black text-amber-500">{review.rating} ★</span>
                            {review.verifiedBooking && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><ShieldCheck size={11} />Verified Booking</span>}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{review.comment}</p>
                        {isAuthenticated && String(review.reviewerId) === String(user?._id) && (
                          <div className="mt-3 flex gap-3">
                            <button type="button" onClick={() => { setEditingReviewId(review._id); setEditReviewForm({ rating: review.rating, comment: review.comment || "" }); }} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">{t("labourProfile.editReview")}</button>
                            <button type="button" disabled={reviewLoading} onClick={() => deleteOwnReview(review._id)} className="text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50">{t("labourProfile.deleteReview")}</button>
                          </div>
                        )}
                        {editingReviewId === review._id && (
                          <form onSubmit={saveReviewEdit} className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                            <div className="flex gap-1" role="group" aria-label={t("labourProfile.ratingLabel")}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => setEditReviewForm({ ...editReviewForm, rating: star })} aria-label={t("machineDetails.starRating", { count: star })}>
                                  <Star size={20} className={star <= editReviewForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                                </button>
                              ))}
                            </div>
                            <textarea required minLength={10} maxLength={1000} value={editReviewForm.comment} onChange={(event) => setEditReviewForm({ ...editReviewForm, comment: event.target.value })} className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                            <div className="mt-3 flex gap-2">
                              <button disabled={reviewLoading} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{t("labourProfile.saveReview")}</button>
                              <button type="button" onClick={() => setEditingReviewId("")} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold">{t("machineDetails.cancel")}</button>
                            </div>
                          </form>
                        )}
                        {isAuthenticated && (
                          <button type="button" onClick={() => reportReview(review._id)} className="mt-3 text-[11px] font-bold text-slate-400 hover:text-rose-600">Report review</button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                {reviewPages > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <button type="button" disabled={reviewPage <= 1} onClick={() => setReviewPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
                    <span className="text-xs font-bold text-slate-500">{reviewPage} / {reviewPages}</span>
                    <button type="button" disabled={reviewPage >= reviewPages} onClick={() => setReviewPage((current) => Math.min(reviewPages, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* ── Booking Modal ── */}
        {/* ── Book Labour Modal ── */}
        <LabourBookingModal
          isOpen={isBookingOpen}
          worker={worker}
          onClose={() => setIsBookingOpen(false)}
          initialLocation={user?.location || worker?.location || ""}
        />
      </main>
    </>
  );
}

