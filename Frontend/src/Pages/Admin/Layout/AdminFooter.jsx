import { ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/80 px-4 py-4 text-xs text-slate-500 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-800 dark:text-slate-200">WorkShetu</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Admin Management Console</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>© {new Date().getFullYear()} All rights reserved</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/"
            className="flex items-center gap-1 font-medium text-slate-600 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            <span>Live Platform</span>
            <ExternalLink size={12} />
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            System Healthy
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            v1.0.0
          </span>
        </div>
      </div>
    </footer>
  );
}

