import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  HardHat,
  ImagePlus,
  LocateFixed,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

const EXTENDED_CATEGORIES = [
  "General Agricultural Labour",
  "Sowing & Planting",
  "Harvesting",
  "Irrigation Assistance",
  "Weeding & Field Preparation",
  "Fruit & Vegetable Picking",
  "Loading & Unloading",
  "Tractor Driver",
  "Harvester Operator",
  "Loader Operator",
  "Spray Machine Operator",
  "Farm Worker",
  "Electrician",
  "Mechanical",
  "Welder",
  "Plumber",
  "Carpenter",
  "Painter",
  "Mason",
  "Helper",
];

const PRICING_UNITS = ["per day", "per hour", "per acre", "per bigha"];

export default function ManageLabourListings() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    labourType: "General Agricultural Labour",
    skills: "",
    price: "",
    pricingUnit: "per day",
    experience: 1,
    location: user?.location || "",
    serviceArea: "",
    phone: user?.phone || "",
    description: "",
    bookingInstructions: "Book at least 24 hours in advance.",
    availability: "Available",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const loadListings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/labour/provider/listings", {
        withCredentials: true,
      });
      if (res.data?.success) {
        setListings(res.data.listings || []);
      }
    } catch (err) {
      console.error("Load labour listings error:", err);
      setError(
        err.response?.data?.message || "Failed to load your worker listings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const openAddModal = () => {
    setEditingListing(null);
    setImageFile(null);
    setImagePreview("");
    setForm({
      name: user?.fullName || "",
      labourType: "General Agricultural Labour",
      skills: "",
      price: "",
      pricingUnit: "per day",
      experience: 1,
      location: user?.location || "",
      serviceArea: "",
      phone: user?.phone || "",
      description: "",
      bookingInstructions: "Book at least 24 hours in advance. Provide clear farm location.",
      availability: "Available",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingListing(item);
    setImageFile(null);
    setImagePreview(item.image?.url || "");
    setForm({
      name: item.name || "",
      labourType: item.labourType || "General Agricultural Labour",
      skills: Array.isArray(item.skills) ? item.skills.join(", ") : (item.skills || ""),
      price: item.price ?? "",
      pricingUnit: item.pricingUnit || "per day",
      experience: item.experience ?? 0,
      location: item.location || "",
      serviceArea: item.serviceArea || "",
      phone: item.phone || "",
      description: item.description || "",
      bookingInstructions: item.bookingInstructions || "",
      availability: item.availability || "Available",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setNotice("");

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("labourType", form.labourType);
      formData.append("skills", form.skills);
      formData.append("price", form.price);
      formData.append("pricingUnit", form.pricingUnit);
      formData.append("experience", form.experience);
      formData.append("location", form.location);
      formData.append("serviceArea", form.serviceArea);
      formData.append("phone", form.phone);
      formData.append("description", form.description);
      formData.append("bookingInstructions", form.bookingInstructions);
      formData.append("availability", form.availability);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (editingListing) {
        const res = await axios.put(
          `/api/labour/provider/listings/${editingListing._id}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          }
        );
        if (res.data?.success) {
          setNotice("Worker profile updated successfully!");
          setIsModalOpen(false);
          loadListings();
        }
      } else {
        const res = await axios.post(
          "/api/labour/provider/listings",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          }
        );
        if (res.data?.success) {
          setNotice("New worker profile created successfully!");
          setIsModalOpen(false);
          loadListings();
        }
      }
    } catch (err) {
      console.error("Save labour listing error:", err);
      alert(err.response?.data?.message || "Failed to save worker profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this worker profile?")) return;
    try {
      const res = await axios.delete(`/api/labour/provider/listings/${id}`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        setNotice("Profile deleted successfully.");
        loadListings();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete profile.");
    }
  };

  const toggleAvailability = async (item) => {
    const nextAvailability = item.availability === "Available" ? "Hidden" : "Available";
    try {
      const res = await axios.put(
        `/api/labour/provider/listings/${item._id}`,
        { availability: nextAvailability },
        { withCredentials: true }
      );
      if (res.data?.success) {
        loadListings();
      }
    } catch (err) {
      alert("Failed to change availability status.");
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f8fafc] pb-24 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to="/labour/dashboard"
                  className="text-xs font-bold text-slate-500 hover:text-emerald-700"
                >
                  ← Back to Dashboard
                </Link>
              </div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                My Labour Listings & Profiles
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage all your public agricultural workforce profiles, wage rates, and availability.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadListings}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-green-700/20 hover:bg-green-800 transition active:scale-95"
              >
                <Plus size={16} />
                Add New Profile
              </button>
            </div>
          </div>

          {/* Alert Notice */}
          {notice && (
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{notice}</span>
              </div>
              <button type="button" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Listings Grid */}
          <div className="mt-8">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <HardHat size={36} className="mx-auto text-emerald-600 mb-3" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  No Labour Profiles Yet
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Create your first skilled profile to receive booking requests from local farmers.
                </p>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-black text-white hover:bg-green-800"
                >
                  <Plus size={16} />
                  Create Profile
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((item) => {
                  const isVisible = item.availability === "Available";

                  return (
                    <div
                      key={item._id}
                      className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md"
                    >
                      <div>
                        {/* Image + Availability Pill */}
                        <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800">
                          <img
                            src={item.image?.url || "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80"}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-3 left-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow-md ${
                              isVisible
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-700 text-white"
                            }`}>
                              {item.availability}
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {item.name}
                              </h3>
                              <span className="inline-block mt-0.5 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {item.labourType}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">
                              {item.experience || 0}+ Yrs
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <MapPin size={14} className="text-slate-400" />
                            <span className="truncate">{item.location}</span>
                          </div>

                          {item.skills && item.skills.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {item.skills.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-lg font-black text-green-700 dark:text-lime-300">
                              ₹{item.price}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              / {item.pricingUnit || "day"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(item)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            isVisible
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          }`}
                        >
                          {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{isVisible ? "Hide" : "Make Visible"}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Create / Edit Profile Modal ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="my-8 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingListing ? "Edit Labour Profile" : "Create New Labour Profile"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name / Worker Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={form.labourType}
                      onChange={(e) => setForm({ ...form, labourType: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {EXTENDED_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Wage Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g. 500"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pricing Unit *
                    </label>
                    <select
                      value={form.pricingUnit}
                      onChange={(e) => setForm({ ...form, pricingUnit: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {PRICING_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Skills (comma-separated tags)
                  </label>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="e.g. Tractor Driving, Ploughing, Rotavator Handling, Spraying"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Service Location (City / Village) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Sonipat, Haryana"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Service Area / Coverage Radius
                    </label>
                    <input
                      type="text"
                      value={form.serviceArea}
                      onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
                      placeholder="e.g. Within 20 km of Sonipat"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Availability Status
                    </label>
                    <select
                      value={form.availability}
                      onChange={(e) => setForm({ ...form, availability: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Available">Available</option>
                      <option value="Booked">Booked</option>
                      <option value="Hidden">Hidden (Private)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profile Description *
                  </label>
                  <textarea
                    required
                    rows="2"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe your expertise, experience, and the farm tasks you excel at..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Profile Image */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profile Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-emerald-800 hover:file:bg-emerald-200"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 h-20 w-20 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-green-700 py-2.5 font-black text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingListing ? "Update Profile" : "Create Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
