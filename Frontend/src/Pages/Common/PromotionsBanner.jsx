import { useEffect, useState } from "react";
import axios from "axios";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  Sparkles,
  Tag,
  Tractor,
  Zap,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PromotionsBanner({
  service = "All",
  category,
  title = "Active Offers & Seasonal Discounts",
}) {
  const { user } = useAuth() || {};
  const [offers, setOffers] = useState([]);
  const [copiedCode, setCopiedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchOffers = async () => {
      try {
        setLoading(true);
        const params = {};
        if (service && service !== "All") params.service = service;
        if (category) params.category = category;
        if (user?._id) params.userId = user._id;

        const res = await axios.get("/api/offers/active", {
          params,
          withCredentials: true,
        });
        if (isMounted && res.data.success) {
          setOffers(res.data.offers || []);
        }
      } catch (err) {
        console.error("Promotions banner fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOffers();

    return () => {
      isMounted = false;
    };
  }, [service, category, user?._id]);

  const handleCopyCode = (e, code) => {
    if (e) e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const getTargetUrl = (offer) => {
    const srv = offer.applicableService || "Machine";
    if (srv === "Labour") return "/labour";
    if (srv === "Transport") return "/transport";

    const firstCat =
      Array.isArray(offer.applicableCategories) && offer.applicableCategories.length > 0
        ? offer.applicableCategories[0]
        : null;

    if (firstCat) {
      return `/machine?category=${encodeURIComponent(firstCat)}`;
    }
    return "/machine";
  };

  const getTargetCategoryLabel = (offer) => {
    if (Array.isArray(offer.applicableCategories) && offer.applicableCategories.length > 0) {
      return offer.applicableCategories[0];
    }
    if (offer.applicableService && offer.applicableService !== "All") {
      return offer.applicableService;
    }
    return "Machine";
  };

  if (loading || offers.length === 0) {
    return null;
  }

  return (
    <section className="my-8 w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              {title}
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                {offers.length} {offers.length === 1 ? "Offer" : "Offers"} Active
              </span>
            </h2>
          </div>
        </div>

        <Link
          to="/machine"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1"
        >
          View All Machines
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* DYNAMIC LAYOUT:
          - If 1 Offer: Professional Full-Width Billboard Layout (Entire Photo Uncropped)
          - If 2 Offers: 2 Columns side-by-side in a SINGLE line (md:grid-cols-2)
          - If 3+ Offers: 3 Columns side-by-side in a single row on desktop (lg:grid-cols-3)
      */}
      {offers.length === 1 ? (
        <SingleHeroBanner
          offer={offers[0]}
          copiedCode={copiedCode}
          onCopy={handleCopyCode}
          onNavigate={() => navigate(getTargetUrl(offers[0]))}
          targetCategory={getTargetCategoryLabel(offers[0])}
        />
      ) : (
        <div
          className={`grid gap-5 w-full ${
            offers.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {offers.map((offer) => (
            <MultiOfferCard
              key={offer._id}
              offer={offer}
              copiedCode={copiedCode}
              onCopy={handleCopyCode}
              onNavigate={() => navigate(getTargetUrl(offer))}
              targetCategory={getTargetCategoryLabel(offer)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * 1 BANNER: Sleek horizontal promo frame with photo on the RIGHT SIDE
 * Compact, proportional height with 100% uncropped photo display
 */
function SingleHeroBanner({ offer, copiedCode, onCopy, onNavigate, targetCategory }) {
  const isPercent = offer.discountType === "Percentage";
  const discountLabel = isPercent
    ? `${offer.discountValue}% OFF`
    : `₹${offer.discountValue} OFF`;

  const validUntil = new Date(offer.endDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      onClick={onNavigate}
      className="group relative w-full overflow-hidden rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:border-emerald-400 cursor-pointer p-4 sm:p-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left Side: Information & Action Controls */}
        <div className={offer.bannerUrl ? "md:col-span-7 lg:col-span-8 flex flex-col justify-between min-w-0" : "md:col-span-12 flex flex-col justify-between min-w-0"}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-lime-400 text-emerald-950 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {discountLabel}
            </span>

            {offer.maxDiscount && isPercent && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-emerald-200 border border-white/15">
                Up to ₹{offer.maxDiscount}
              </span>
            )}

            {offer.firstBookingOnly && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950">
                First Booking Exclusive
              </span>
            )}

            {targetCategory && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {targetCategory} Special
              </span>
            )}

            <span className="text-xs text-emerald-200/80 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Valid until {validUntil}
            </span>
          </div>

          <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug group-hover:text-lime-300 transition-colors">
            {offer.title}
          </h3>

          {offer.description && (
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 line-clamp-2 leading-relaxed max-w-2xl font-normal">
              {offer.description}
            </p>
          )}

          {offer.applicableCategories && offer.applicableCategories.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="font-semibold text-emerald-300">Machines:</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md text-emerald-100 font-medium">
                {offer.applicableCategories.join(", ")}
              </span>
            </div>
          )}

          {/* Action Controls: Code / Auto + CTA */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {offer.isAutomatic ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                <span>Auto-Applied</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 backdrop-blur px-3 py-1.5 rounded-lg">
                <span className="font-mono text-xs font-black text-lime-300 tracking-wider">
                  {offer.code}
                </span>
                <button
                  type="button"
                  onClick={(e) => onCopy(e, offer.code)}
                  className="p-1 rounded text-white/80 hover:text-white transition"
                  title="Copy promo code"
                >
                  {copiedCode === offer.code ? (
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-emerald-950 text-xs sm:text-sm font-black shadow-md hover:from-lime-300 hover:to-emerald-300 transition group-hover:scale-102 active:scale-98"
            >
              Book {targetCategory} Now
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Photo Showcase in Promo Frame */}
        {offer.bannerUrl && (
          <div className="md:col-span-5 lg:col-span-4 flex items-center justify-center">
            <div className="relative w-full max-w-[340px] sm:max-w-[400px] md:max-w-none overflow-hidden rounded-xl bg-slate-950/70 p-1.5 sm:p-2 border border-emerald-500/20 shadow-inner flex items-center justify-center">
              <img
                src={offer.bannerUrl}
                alt={offer.title}
                className="w-full h-auto max-h-[180px] sm:max-h-[210px] object-contain rounded-lg transition-transform duration-500 group-hover:scale-[1.02]"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 2 OR MORE BANNERS: Compact side-by-side cards with photo on the RIGHT SIDE
 * Adapts width equally in 1 line
 */
function MultiOfferCard({ offer, copiedCode, onCopy, onNavigate, targetCategory }) {
  const isPercent = offer.discountType === "Percentage";
  const discountLabel = isPercent
    ? `${offer.discountValue}% OFF`
    : `₹${offer.discountValue} OFF`;

  const validUntil = new Date(offer.endDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      onClick={onNavigate}
      className="group relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/40 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:border-emerald-300 hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer dark:border-emerald-900/60 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
        {/* Left: Info & Details */}
        <div className={offer.bannerUrl ? "sm:col-span-7 flex flex-col justify-between min-w-0" : "sm:col-span-12 flex flex-col justify-between min-w-0"}>
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
              {discountLabel}
            </span>
            {offer.maxDiscount && isPercent && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md dark:bg-emerald-950 dark:text-emerald-300">
                Up to ₹{offer.maxDiscount}
              </span>
            )}
            {offer.firstBookingOnly && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md dark:bg-amber-950 dark:text-amber-300">
                First Booking
              </span>
            )}
            {targetCategory && (
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md dark:bg-teal-950 dark:text-teal-300">
                {targetCategory}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug group-hover:text-emerald-700 transition-colors">
            {offer.title}
          </h3>
          {offer.description && (
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {offer.description}
            </p>
          )}

          {offer.applicableCategories && offer.applicableCategories.length > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              Machines: {offer.applicableCategories.join(", ")}
            </p>
          )}

          {/* Action Row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {offer.isAutomatic ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded-md">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Auto-applied
              </span>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {offer.code}
                </span>
                <button
                  type="button"
                  onClick={(e) => onCopy(e, offer.code)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition p-0.5"
                  title="Copy code"
                >
                  {copiedCode === offer.code ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}

            <span className="text-[10px] text-gray-400 dark:text-slate-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3 text-emerald-600" />
              Till {validUntil}
            </span>
          </div>
        </div>

        {/* Right: Banner Photo Showcase */}
        {offer.bannerUrl && (
          <div className="sm:col-span-5 flex items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-xl bg-slate-950/70 p-1.5 border border-emerald-500/20 shadow-xs flex items-center justify-center">
              <img
                src={offer.bannerUrl}
                alt={offer.title}
                className="w-full h-auto max-h-[140px] sm:max-h-[160px] object-contain rounded-lg transition-transform duration-500 group-hover:scale-102"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
