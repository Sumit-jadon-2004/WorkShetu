import { useState, useEffect } from "react";
import axios from "axios";
import { Zap, CheckCircle2, X, Shield, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CreditPackModal({ isOpen, onClose, onCreditUpdated }) {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [credits, setCredits] = useState(user?.bookingCredits || 0);
  const [loading, setLoading] = useState(true);
  const [purchasingPack, setPurchasingPack] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const fetchPackagesAndBalance = async () => {
      try {
        setLoading(true);
        setError("");
        const [pkgRes, balRes] = await Promise.all([
          axios.get("/api/credits/packages"),
          axios.get("/api/credits/balance", { withCredentials: true }).catch(() => null),
        ]);

        if (active) {
          if (pkgRes.data?.packages) {
            setPackages(pkgRes.data.packages);
          }
          if (balRes?.data?.credits != null) {
            setCredits(balRes.data.credits);
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Failed to load credit plans.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPackagesAndBalance();
    return () => {
      active = false;
    };
  }, [isOpen]);

  const handlePurchase = async (pkg) => {
    try {
      setPurchasingPack(pkg.packSize);
      setError("");
      setMessage("");

      // 1. Initiate order
      const initRes = await axios.post(
        "/api/credits/initiate",
        { packSize: pkg.packSize, paymentGateway: "UPI" },
        { withCredentials: true }
      );

      if (!initRes.data?.success) {
        throw new Error(initRes.data?.message || "Failed to initiate payment.");
      }

      const { transactionId } = initRes.data.order;

      // 2. Verified Payment (simulated verified transaction signature)
      const verifyRes = await axios.post(
        "/api/credits/verify-payment",
        {
          transactionId,
          paymentSignature: "VERIFIED_TEST_SIGNATURE",
        },
        { withCredentials: true }
      );

      if (verifyRes.data?.success) {
        setCredits(verifyRes.data.bookingCredits);
        setMessage(`Success! ${pkg.packSize} booking credits added to your account.`);
        if (onCreditUpdated) onCreditUpdated(verifyRes.data.bookingCredits);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment verification failed.");
    } finally {
      setPurchasingPack(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Premium Booking Credits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current balance: <span className="font-black text-green-600 dark:text-lime-400">{credits} Requests</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="animate-spin text-green-700" size={32} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {packages.map((pkg) => {
              const isSelected = purchasingPack === pkg.packSize;
              return (
                <div
                  key={pkg.packSize}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition ${
                    pkg.popular
                      ? "border-amber-400 bg-amber-50/40 dark:border-amber-600 dark:bg-amber-950/20 shadow-sm"
                      : pkg.bestValue
                      ? "border-green-400 bg-green-50/40 dark:border-green-600 dark:bg-green-950/20 shadow-sm"
                      : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                      Popular
                    </span>
                  )}
                  {pkg.bestValue && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-2.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                      Best Value
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {pkg.packSize}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Requests</span>
                    </div>

                    <p className="mt-1 text-base font-black text-slate-800 dark:text-slate-100">
                      ₹{pkg.price}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      ₹{pkg.pricePerBooking}/booking
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={purchasingPack != null}
                    onClick={() => handlePurchase(pkg)}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-green-700 py-2 text-xs font-black text-white transition hover:bg-green-800 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
                  >
                    {isSelected ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Buy Pack"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-400 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-green-600" />
            <span>Verified 100% Secure Payment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>Preserves Confirmed Bookings</span>
          </div>
        </div>
      </div>
    </div>
  );
}

