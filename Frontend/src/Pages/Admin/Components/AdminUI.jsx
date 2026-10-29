import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  FolderOpen,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

// ==========================================
// 1. SKELETON LOADERS
// ==========================================
export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full animate-pulse divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center space-x-4 py-4 px-4">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={`h-4 bg-gray-200/80 rounded ${
                cIdx === 0
                  ? "w-24"
                  : cIdx === 1
                  ? "w-36"
                  : cIdx === cols - 1
                  ? "w-16 ml-auto"
                  : "w-28"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs animate-pulse space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-7 w-7 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-7 w-16 bg-gray-200 rounded" />
          <div className="h-2.5 w-24 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 2. EMPTY STATE
// ==========================================
export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No Data Found",
  description = "No items match your criteria. Try adjusting your search filters.",
  actionText,
  onAction,
}) {
  return (
    <div className="py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {actionText}
        </button>
      )}
    </div>
  );
}

// ==========================================
// 3. UNIFIED STATUS BADGE
// ==========================================
export function UnifiedBadge({ status, size = "sm" }) {
  const s = String(status || "").toLowerCase().trim();

  const isSmall = size === "sm";
  const baseClasses = isSmall
    ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-2xs"
    : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-2xs";

  if (["completed", "approved", "active", "visible"].includes(s)) {
    return (
      <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}>
        <CheckCircle2 className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  }

  if (["pending", "open", "in progress", "under review"].includes(s)) {
    return (
      <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}>
        <Clock className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  }

  if (["paused"].includes(s)) {
    return (
      <span className={`${baseClasses} bg-amber-100 text-amber-900 border-amber-300 font-bold`}>
        <Clock className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  }

  if (["accepted", "resolved"].includes(s)) {
    return (
      <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}>
        <CheckCircle2 className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  }

  if (["cancelled", "rejected", "suspended", "blocked"].includes(s)) {
    return (
      <span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}>
        <XCircle className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  }

  if (["hidden"].includes(s)) {
    return (
      <span className={`${baseClasses} bg-purple-50 text-purple-700 border-purple-200`}>
        <EyeOff className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {status}
      </span>
    );
  }

  return (
    <span className={`${baseClasses} bg-gray-50 text-gray-700 border-gray-200`}>
      {status}
    </span>
  );
}

// ==========================================
// 4. ACCESSIBLE PAGINATION COMPONENT
// ==========================================
export function PaginationBar({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  loading = false,
}) {
  if (totalItems <= 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="p-4 border-t border-gray-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/60 select-none">
      <p>
        Showing <span className="font-semibold text-gray-900 font-mono">{start}</span> to{" "}
        <span className="font-semibold text-gray-900 font-mono">{end}</span> of{" "}
        <span className="font-semibold text-gray-900 font-mono">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        <span className="font-semibold text-gray-700 px-2 font-mono">
          Page {page} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
          aria-label="Next Page"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

