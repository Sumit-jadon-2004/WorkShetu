import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Briefcase,
  Check,
  CheckCircle,
  Clock,
  ImagePlus,
  LocateFixed,
  Phone,
  ShieldCheck,
  Tractor,
  Truck,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

const categories = ["Tractor", "Cultivator", "Rotavator", "Harrow", "Harvester"];
const units = ["Hour", "Bigha", "Acre", "Hectare", "Day", "Trip"];
const fuelTypes = ["Diesel", "Petrol", "Electric", "CNG", "Hybrid"];

export default function DriverApply() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    aadhaarNumber: "",
    licenseNumber: "",
    experience: "2",
    address: user?.location || user?.driverAddress || "",
    latitude: user?.latitude || "",
    longitude: user?.longitude || "",
    // First Listing fields (styled like AddListing)
    title: "",
    category: "Tractor",
    vehicleNumber: "",
    price: "600",
    unit: "Hour",
    power: "45",
    fuelType: "Diesel",
    year: String(new Date().getFullYear()),
    description: "",
  });

  const [equipmentImage, setEquipmentImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [application, setApplication] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(true);

  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("");

  // Auto-fill user details (Name, Mobile, Location) from profile
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        phone: prev.phone || user.phone || "",
        address: prev.address || user.location || user.driverAddress || "",
        latitude: prev.latitude || user.latitude || "",
        longitude: prev.longitude || user.longitude || "",
      }));
    }
  }, [user]);

  const fetchApplication = async () => {
    try {
      const response = await axios.get("/api/driver/application", {
        withCredentials: true,
      });
      if (response.data.success) {
        setApplication(response.data.application);
      }
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        console.error("GET DRIVER APPLICATION:", requestError);
      }
    } finally {
      setApplicationLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setError("");
    setEquipmentImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setEquipmentImage(null);
    setImagePreview("");
  };

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  // Auto-detect location & address
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("failed");
      setLocationMessage("Geolocation is unavailable on this browser. Enter address manually.");
      return;
    }

    setLocationStatus("detecting");
    setLocationMessage("Fetching your current location...");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        setForm((current) => ({ ...current, latitude, longitude }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (!response.ok) throw new Error("Reverse geocoding failed");
          const addressData = (await response.json()).address || {};
          const fullAddress = [
            addressData.village ||
              addressData.locality ||
              addressData.town ||
              addressData.suburb ||
              addressData.city,
            addressData.district || addressData.county,
            addressData.state,
            addressData.country,
          ]
            .filter(Boolean)
            .join(", ")
            .slice(0, 200);

          setForm((current) => ({
            ...current,
            address: fullAddress,
          }));
          setLocationStatus("success");
          setLocationMessage(
            fullAddress
              ? `Location detected: ${fullAddress}`
              : "Coordinates found; enter village/city name manually."
          );
        } catch {
          setLocationStatus("success");
          setLocationMessage("Coordinates detected; please confirm your village or city name.");
        }
      },
      () => {
        setLocationStatus("failed");
        setLocationMessage("Location permission denied. Enter your address manually.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Automatically trigger location detection on load if address is empty
  useEffect(() => {
    if (!form.address) {
      detectLocation();
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!form.fullName || form.fullName.trim().length < 3) {
        setError("Please enter your full name (at least 3 characters).");
        setLoading(false);
        return;
      }

      const digits = (form.phone || "").replace(/\D/g, "");
      if (digits.length !== 10) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        setLoading(false);
        return;
      }

      const aadhaarDigits = (form.aadhaarNumber || "").replace(/\D/g, "");
      if (aadhaarDigits.length !== 12) {
        setError("Please enter a valid 12-digit Aadhaar Card number.");
        setLoading(false);
        return;
      }

      const cleanLicense = (form.licenseNumber || "").trim().toUpperCase();
      if (!cleanLicense || cleanLicense.length < 5) {
        setError("Please enter a valid Driving License (DL) number.");
        setLoading(false);
        return;
      }

      if (!form.address || form.address.trim().length < 5) {
        setError("Please enter or auto-detect your full address.");
        setLoading(false);
        return;
      }

      if (["Tractor", "Harvester"].includes(form.category) && !form.vehicleNumber?.trim()) {
        setError("Vehicle registration number is required for tractors and harvesters.");
        setLoading(false);
        return;
      }

      if (!equipmentImage) {
        setError("Please upload an agricultural equipment photo.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      formData.set("aadhaarNumber", aadhaarDigits);
      formData.set("licenseNumber", cleanLicense);
      formData.append("drivingLicense", cleanLicense);
      formData.append("equipmentImage", equipmentImage);
      // Map vehicleType for backwards compatibility
      formData.append("vehicleType", form.category);

      const response = await axios.post("/api/driver/apply", formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        setSuccess(
          "Application submitted successfully! Once approved by Admin, your account and first machine listing will be activated."
        );
        removeImage();
        await fetchApplication();
      }
    } catch (err) {
      console.error("DRIVER APPLY ERROR:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === "string" && !err.response.data.includes("<html")
          ? err.response.data
          : null) ||
        err.message ||
        "Something went wrong. Please check your network and try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const needsVehicleDetails = ["Tractor", "Harvester"].includes(form.category);

  return (
    <main className="min-h-screen bg-[#f6f8f3] dark:bg-slate-950">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">
            WorkShetu Partner Network
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            Driver Onboarding & First Listing
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Apply to become a verified Driver and register your first equipment. Once approved by Admin, your machine will automatically go live for farmers to book!
          </p>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
            <CheckCircle size={22} className="shrink-0" />
            <span className="text-sm font-semibold">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <XCircle size={22} className="shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Existing Application Status Banner */}
        {!applicationLoading && application?.driverApplicationStatus !== "None" && (
          <ApplicationStatus application={application} />
        )}

        {/* Application Form */}
        {(!application ||
          application.driverApplicationStatus === "None" ||
          application.driverApplicationStatus === "Rejected") && (
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-6 rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8"
          >
            {/* ====================================================
                SECTION 1: DRIVER PERSONAL INFORMATION
            ==================================================== */}
            <div className="border-b border-slate-100 pb-6 dark:border-slate-800">
              <div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                <User className="text-green-700 dark:text-lime-400" size={20} />
                Driver Profile Details
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Full Name
                  <input
                    name="fullName"
                    required
                    minLength={3}
                    autoComplete="off"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Mobile Number
                  <input
                    name="phone"
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    autoComplete="off"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Aadhaar Card Number
                  <input
                    name="aadhaarNumber"
                    required
                    type="text"
                    maxLength={14}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={form.aadhaarNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                      const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                      setForm((prev) => ({ ...prev, aadhaarNumber: formatted }));
                    }}
                    placeholder="12-digit Aadhaar number"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium tracking-wider outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Driving License Number
                  <input
                    name="licenseNumber"
                    required
                    type="text"
                    maxLength={20}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={form.licenseNumber}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        licenseNumber: e.target.value.toUpperCase(),
                      }));
                    }}
                    placeholder="Driving License number"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium uppercase tracking-wider outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Driving Experience (Years)
                  <input
                    name="experience"
                    type="number"
                    min="0"
                    max="50"
                    autoComplete="off"
                    value={form.experience}
                    onChange={handleChange}
                    placeholder="Experience in years (e.g. 3)"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>
            </div>

            {/* ====================================================
                SECTION 2: AUTO-DETECT LOCATION & SERVICE ADDRESS
            ==================================================== */}
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-900 dark:text-white">
                    Driver Address / Service Area
                    <input
                      name="address"
                      required
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Village, Tehsil, District, State"
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locationStatus === "detecting"}
                  className="mt-0 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-wait disabled:opacity-70 sm:mt-7"
                >
                  <LocateFixed
                    size={17}
                    className={locationStatus === "detecting" ? "animate-spin" : ""}
                  />
                  {locationStatus === "detecting" ? "Fetching..." : "Fetch Location"}
                </button>
              </div>

              {locationMessage && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    locationStatus === "failed" ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-lime-300"
                  }`}
                >
                  {locationMessage}
                </p>
              )}

              <input type="hidden" name="latitude" value={form.latitude} />
              <input type="hidden" name="longitude" value={form.longitude} />
            </div>

            {/* ====================================================
                SECTION 3: FIRST MACHINE LISTING DETAILS
            ==================================================== */}
            <div className="border-b border-slate-100 pb-6 dark:border-slate-800">
              <div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                <Tractor className="text-green-700 dark:text-lime-400" size={20} />
                First Machine Listing (Auto-published on Approval)
              </div>
              <p className="mt-1 text-xs text-slate-400">
                This equipment will be listed in the marketplace as soon as Admin approves your application.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Machine Title
                  <input
                    name="title"
                    required
                    minLength={3}
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Mahindra 575 DI Tractor with Rotavator"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Rent Price (₹)
                  <input
                    name="price"
                    required
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="e.g. 600"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Pricing Unit
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        Per {unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Manufacturing Year
                  <input
                    name="year"
                    required
                    type="number"
                    min="1980"
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={handleChange}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              {needsVehicleDetails && (
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Vehicle Registration Number
                    <input
                      name="vehicleNumber"
                      required
                      value={form.vehicleNumber}
                      onChange={handleChange}
                      placeholder="e.g. UP80AB1234 / HR26DQ5551 / RJ14CD7890"
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium uppercase outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Registration plate from any Indian state / RTO
                    </span>
                  </label>

                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Engine Power (HP)
                    <input
                      name="power"
                      required
                      type="number"
                      min="1"
                      value={form.power}
                      onChange={handleChange}
                      placeholder="e.g. 50"
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                </div>
              )}

              {needsVehicleDetails && (
                <div className="mt-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                    Fuel Type
                    <select
                      name="fuelType"
                      required
                      value={form.fuelType}
                      onChange={handleChange}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {fuelTypes.map((fuelType) => (
                        <option key={fuelType} value={fuelType}>
                          {fuelType}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* ====================================================
                SECTION 4: EQUIPMENT PHOTO UPLOAD
            ==================================================== */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                  <ImagePlus size={18} className="text-green-700 dark:text-lime-400" />
                  Machine / Equipment Photo
                </div>
                <span className="text-xs font-semibold text-slate-400">Required</span>
              </div>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Equipment preview"
                    className="h-60 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-black text-slate-800 shadow transition hover:bg-white">
                      <Upload size={14} />
                      Change Photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-2 text-xs font-black text-white shadow transition hover:bg-red-600"
                    >
                      <X size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center px-5 py-10 text-center transition hover:bg-green-50 dark:hover:bg-green-950/20">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                    <Upload size={22} />
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Upload Clear Machine / Tractor Photo
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    JPG, PNG or WEBP, maximum 5 MB
                  </span>
                  <input
                    required
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Additional Details / Description
                <textarea
                  name="description"
                  required
                  minLength={10}
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe your machinery, operational area, attachments available, and experience..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-green-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            {/* Platform Guarantee / Admin notice */}
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold">Admin Verification Notice:</span> Once you submit this application, our admin team will verify your vehicle details. As soon as approved, your role will be switched to <strong>Driver</strong> and your <strong>First Machine Listing</strong> will automatically be published on the marketplace!
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-black text-white shadow-lg shadow-green-900/20 transition hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? (
                "Submitting Application..."
              ) : (
                <>
                  <Check size={18} /> Submit Driver Application & First Listing
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function ApplicationStatus({ application }) {
  const status = application.driverApplicationStatus;
  const statusDetails = {
    Pending: {
      icon: <Clock size={24} />,
      title: "Application Under Review",
      message:
        "Your Driver application and First Listing have been received. WorkShetu team is reviewing your documents. Once approved, your driver dashboard will be activated and your machine will be published automatically.",
      classes:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    },
    Approved: {
      icon: <CheckCircle size={24} />,
      title: "Application Accepted!",
      message:
        "Congratulations! Your Driver profile has been approved and your machine listing is now active on WorkShetu.",
      classes:
        "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200",
    },
    Rejected: {
      icon: <XCircle size={24} />,
      title: "Application Needs Revision",
      message:
        application.driverRejectionReason ||
        "The admin requested changes to your Driver application. You can submit a corrected application below.",
      classes:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
    },
  }[status];

  if (!statusDetails) return null;

  return (
    <section className={`mb-6 rounded-2xl border p-5 ${statusDetails.classes}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{statusDetails.icon}</div>
        <div>
          <h2 className="font-black">{statusDetails.title}</h2>
          <p className="mt-1 text-sm leading-relaxed">{statusDetails.message}</p>
          {application.driverApplicationDate && (
            <p className="mt-2 text-xs opacity-75">
              Submitted on{" "}
              {new Date(application.driverApplicationDate).toLocaleDateString("en-IN")}
            </p>
          )}
          {(application.driverAadhaarNumber || application.driverLicenseNumber) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {application.driverAadhaarNumber && (
                <span className="rounded-lg bg-black/5 px-2.5 py-1 font-semibold dark:bg-white/10">
                  Aadhaar: •••• •••• {application.driverAadhaarNumber.slice(-4)}
                </span>
              )}
              {application.driverLicenseNumber && (
                <span className="rounded-lg bg-black/5 px-2.5 py-1 font-semibold dark:bg-white/10">
                  DL: {application.driverLicenseNumber}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}