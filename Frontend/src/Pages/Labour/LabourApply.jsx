import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  HardHat,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

const LABOUR_CATEGORIES = [
  "Tractor Driver",
  "Harvester Operator",
  "Farm Worker",
  "Spray Machine Operator",
  "Irrigation Technician",
  "Electrician",
  "Mechanical",
  "Welder",
  "Carpenter",
  "Plumber",
  "Mason",
  "Loader Operator",
  "Truck Driver",
  "Helper",
];

export default function LabourApply() {
  const { t } = useTranslation();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.fullName || "",
    labourType: "Tractor Driver",
    price: "",
    experience: 1,
    location: user?.location || "",
    phone: user?.phone || "",
    description: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/labour/apply" } });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("labourType", form.labourType);
      formData.append("price", form.price);
      formData.append("experience", form.experience);
      formData.append("location", form.location);
      formData.append("phone", form.phone);
      formData.append("description", form.description);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axios.post("/api/labour/apply", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.success) {
        setSuccess(true);
        if (refreshUser) await refreshUser();
        setTimeout(() => {
          navigate("/labour/dashboard");
        }, 1800);
      } else {
        setError(res.data?.message || "Failed to submit registration.");
      }
    } catch (err) {
      console.error("Labour registration error:", err);
      setError(
        err.response?.data?.message ||
          "Could not submit registration. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f8fafc] py-12 px-4 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Header Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-emerald-800 text-white shadow-md shadow-green-900/20">
                <HardHat size={24} />
              </div>
              <div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Worker Registration
                </span>
                <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  Register as a Labour Provider
                </h1>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Join WorkShetu to offer your agricultural skills, tractor driving, machinery operation, or farm labour services to local farmers.
            </p>

            {success ? (
              <div className="mt-8 py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                  Registration Successful!
                </h2>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Your Labour Provider account is ready. Redirecting to your Labour Dashboard…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Worker Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Full Name / Worker Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>

                {/* Skill / Category */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Primary Skill / Role *
                  </label>
                  <select
                    required
                    value={form.labourType}
                    onChange={(e) => setForm({ ...form, labourType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                  >
                    {LABOUR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Daily Wage & Experience */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Expected Daily Wage (₹/Day) *
                    </label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 600"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      placeholder="e.g. 3"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Location & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Base Location / Village *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Rampur, Bareilly"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Profile Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 h-20 w-20 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Tell farmers about your skills & experience
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. 5 years experience driving Mahindra and Swaraj tractors, rotavator, cultivator, available 7 days a week."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-green-600 focus:bg-white dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-green-700 py-3.5 text-xs font-black text-white shadow-md shadow-green-700/20 transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {loading ? "Registering..." : "Submit & Start Receiving Bookings"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

