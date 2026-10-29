import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Star,
  Tractor,
  Trash2,
  X,
} from "lucide-react";

export default function ReviewModeration() {
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState({
    totalReviews: 0,
    averageRating: "0.0",
    stars: { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 },
    visible: 0,
    hidden: 0,
  });

  const [ratingFilter, setRatingFilter] = useState(() => searchParams.get("rating") || "all");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "all");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  useEffect(() => {
    const ratingParam = searchParams.get("rating");
    if (ratingParam) {
      setRatingFilter(ratingParam);
    }
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteModalReview, setDeleteModalReview] = useState(null);

  const fetchReviews = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: targetPage,
        limit: 10,
        rating: ratingFilter !== "all" ? ratingFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      };

      const response = await axios.get("/api/admin/reviews", {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setReviews(response.data.reviews || []);
        if (response.data.metrics) setMetrics(response.data.metrics);
        if (response.data.pagination) setPagination(response.data.pagination);
        setPage(targetPage);
      } else {
        setError(response.data.message || "Failed to load reviews.");
      }
    } catch (err) {
      console.error("Fetch reviews error:", err);
      setError(err.response?.data?.message || "Failed to connect to reviews service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [ratingFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReviews(1);
  };

  // Toggle Visibility
  const handleToggleVisibility = async (review) => {
    try {
      setActionLoading(review._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/reviews/${review._id}/visibility`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchReviews(page);
      } else {
        setError(response.data.message || "Failed to toggle visibility.");
      }
    } catch (err) {
      console.error("Toggle visibility error:", err);
      setError(err.response?.data?.message || "Failed to update review visibility.");
    } finally {
      setActionLoading("");
    }
  };

  // Delete Review
  const handleDeleteReview = async () => {
    if (!deleteModalReview) return;
    try {
      setActionLoading(deleteModalReview._id);
      setError("");
      setSuccess("");

      const response = await axios.delete(
        `/api/admin/reviews/${deleteModalReview._id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Review deleted.");
        setDeleteModalReview(null);
        fetchReviews(page);
      } else {
        setError(response.data.message || "Failed to delete review.");
      }
    } catch (err) {
      console.error("Delete review error:", err);
      setError(err.response?.data?.message || "Failed to delete review.");
    } finally {
      setActionLoading("");
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={13}
            className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
          />
        ))}
        <span className="ml-1 text-xs font-bold text-slate-700 dark:text-slate-300">
          {rating}.0
        </span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Review & Rating Moderation
            </h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {metrics.totalReviews} Reviews
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Monitor farmer feedback, audit equipment ratings, hide inappropriate comments, and maintain community trust.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReviews(page)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-600 hover:text-rose-800">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Rating Score & Breakdown Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Average Score */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <span className="text-2xl font-black">{metrics.averageRating}</span>
            <div className="flex">
              <Star size={10} className="fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Rating</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Across {metrics.totalReviews} total farmer reviews
            </p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {metrics.visible} Visible · {metrics.hidden} Hidden
            </p>
          </div>
        </div>

        {/* Star Breakdown Bars */}
        <div className="col-span-2 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Star Rating Distribution
          </h4>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = metrics.stars?.[`star${s}`] || 0;
              const total = metrics.totalReviews || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={s} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-500">
                    <span>{s}</span>
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                  </div>
                  <p className="mt-1 font-extrabold text-slate-800 dark:text-slate-200">{count}</p>
                  <p className="text-[10px] text-slate-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reviewer name or text content…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rating Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Stars:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Stars</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">Visibility:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All States</option>
              <option value="Visible">Visible Only</option>
              <option value="Hidden">Hidden Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Reviews Cards Grid ── */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-emerald-600" />
          Loading reviews…
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <MessageSquare size={32} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No reviews matching your filters
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => {
            const isHidden = r.status === "Hidden";
            return (
              <div
                key={r._id}
                className={`flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition hover:shadow-md ${
                  isHidden
                    ? "border-amber-200/70 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10"
                    : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div>
                  {/* Top Bar: Reviewer & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {r.reviewerName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <Phone size={10} className="mr-1 inline" />
                        {r.reviewerPhone}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isHidden
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {isHidden ? <EyeOff size={10} /> : <CheckCircle2 size={10} />}
                      {r.status}
                    </span>
                  </div>

                  {/* Rating Stars */}
                  <div className="mt-3">{renderStars(r.rating)}</div>

                  {/* Review Text */}
                  <p className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{r.text}"
                  </p>

                  {/* Machine / Target Tag */}
                  {r.machine && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <Tractor size={14} className="text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1 text-[11px]">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {r.machine.title}
                        </p>
                        <p className="text-[10px] text-slate-400">{r.machine.category}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer & Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>

                  <div className="flex items-center gap-1.5">
                    {/* Toggle Hide/Restore */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(r)}
                      disabled={actionLoading === r._id}
                      title={isHidden ? "Restore Review" : "Hide Review"}
                      className={`rounded-lg border px-2.5 py-1 font-semibold transition ${
                        isHidden
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                      }`}
                    >
                      {isHidden ? "Restore" : "Hide"}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeleteModalReview(r)}
                      title="Delete Review"
                      className="rounded-lg border border-rose-200 p-1 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteModalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/40 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Review
                </h3>
                <p className="text-xs text-slate-500">By {deleteModalReview.reviewerName}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Permanently delete this review? This action cannot be reversed.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalReview(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={actionLoading === deleteModalReview._id}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading === deleteModalReview._id ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

