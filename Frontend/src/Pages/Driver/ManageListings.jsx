import { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Trash2, Save, X, Eye, LocateFixed, ImagePlus, Upload } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
const listingCategories = ["Tractor", "Cultivator", "Rotavator", "Harrow", "Harvester"];
const listingUnits = ["Bigha", "Acre", "Hectare", "Hour", "Day", "Trip"];
const listingFuelTypes = ["Diesel", "Petrol", "Electric", "CNG", "Hybrid"];

export default function ManageListings() {
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("");

  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/machine/mine", { withCredentials: true });
      setListings(response.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("driver.loadListingsError", "Your listings could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadListings(); }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("failed");
      setLocationMessage(t("driver.locationDenied", "Location is unavailable. Enter the location manually."));
      return;
    }

    setLocationStatus("detecting");
    setLocationMessage(t("driver.locationFinding", "Finding your current location..."));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        setForm((current) => ({ ...current, latitude, longitude }));
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { "Accept-Language": "en" },
          });
          if (!response.ok) throw new Error("Location lookup failed.");
          const address = (await response.json()).address || {};
          const location = [
            address.village || address.locality || address.town || address.suburb || address.city,
            address.district || address.county,
            address.state,
          ].filter(Boolean).join(", ").slice(0, 200);
          if (location) setForm((current) => ({ ...current, location }));
          setLocationStatus("success");
          setLocationMessage(location ? t("driver.locationDetected", "Location detected: {{location}}", { location }) : t("driver.locationManual", "Coordinates found; enter the location name manually."));
        } catch {
          setLocationStatus("success");
          setLocationMessage(t("driver.locationManual", "Coordinates found; enter the location name manually."));
        }
      },
      () => {
        setLocationStatus("failed");
        setLocationMessage(t("driver.locationDenied", "Location permission denied. The saved location is unchanged."));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const beginEdit = (listing) => {
    setEditingId(listing._id);
    setImage(null);
    setForm({
      title: listing.title || "",
      category: listing.category || "Tractor",
      vehicleNumber: listing.vehicleNumber || "",
      price: listing.price ?? "",
      unit: listing.unit || "Bigha",
      power: listing.power ?? "",
      fuelType: listing.fuelType || "",
      year: listing.year || new Date().getFullYear(),
      location: listing.location || "",
      latitude: listing.latitude ?? "",
      longitude: listing.longitude ?? "",
      description: listing.description || "",
    });
    setLocationStatus("idle");
    setLocationMessage("");
    detectLocation();
  };

  const closeEdit = () => { setEditingId(null); setForm(null); setImage(null); };
  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "category" && value !== "Tractor" && value !== "Harvester"
        ? { vehicleNumber: "", power: "", fuelType: "" }
        : {}),
    }));
  };
  const needsVehicleDetails = form?.category === "Tractor" || form?.category === "Harvester";
  const editingListing = listings.find((listing) => listing._id === editingId);

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [image]);

  const saveListing = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (image) formData.append("image", image);
    try {
      await axios.put(`/api/machine/${editingId}`, formData, { withCredentials: true });
      setNotice(t("driver.listingUpdated", "Listing updated successfully."));
      closeEdit();
      await loadListings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("driver.updateListingError", "Listing could not be updated."));
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async (listing) => {
    if (!window.confirm(t("driver.deleteConfirm", "Delete {{title}}? This cannot be undone.", { title: listing.title }))) return;
    setError("");
    setNotice("");
    try {
      await axios.delete(`/api/machine/${listing._id}`, { withCredentials: true });
      setListings((current) => current.filter((item) => item._id !== listing._id));
      setNotice(t("driver.listingDeleted", "Listing deleted."));
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("driver.deleteListingError", "Listing could not be deleted."));
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mt-2" id="my-listings">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-black">{t("driver.myListings", "My machine listings")}</h2><p className="mt-1 text-sm text-slate-500">{t("driver.myListingsSubtitle", "View, edit or remove listings you created.")}</p></div>
        <button type="button" onClick={loadListings} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black dark:border-slate-700 dark:bg-slate-900">{t("common.refresh", "Refresh")}</button>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{notice}</p>}
      {loading && <div className="rounded-2xl bg-white p-8 text-center dark:bg-slate-900">{t("driver.loadingListings", "Loading your listings...")}</div>}
      {!loading && listings.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">{t("driver.noListings", "You have not created any machine listings yet.")}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {listings.map((listing) => (
          <article key={listing._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-4 p-4">
              {listing.image?.url && <img src={listing.image.url} alt={listing.title} className="h-24 w-28 shrink-0 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black">{listing.title}</h3><p className="mt-1 text-xs text-slate-500">{t(`machines.categories.${String(listing.category).toLowerCase()}`, listing.category)} · {listing.location}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${listing.availability === "Booked" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{t(`driver.${listing.availability === "Booked" ? "booked" : "available"}`, listing.availability || "Available")}</span></div><p className="mt-2 text-sm font-bold">₹{Number(listing.price || 0).toLocaleString("en-IN")} / {t(`machines.units.${String(listing.unit).toLowerCase()}`, listing.unit)}</p></div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
              <Link to={`/machines/${listing._id}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"><Eye size={15} />{t("driver.view", "View")}</Link>
              <button type="button" onClick={() => editingId === listing._id ? closeEdit() : beginEdit(listing)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 px-3 text-sm font-black text-white"><Pencil size={15} />{editingId === listing._id ? t("driver.closeEditor", "Close editor") : t("driver.edit", "Edit")}</button>
              <button type="button" onClick={() => deleteListing(listing)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-black text-red-700"><Trash2 size={15} />{t("driver.delete", "Delete")}</button>
            </div>
            {editingId === listing._id && form && (
              <form onSubmit={saveListing} className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
                <label className="block text-xs font-bold">{t("driver.title", "Title")}<input name="title" required minLength="3" value={form.title} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold">{t("driver.category", "Category")}<select name="category" value={form.category} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800">{listingCategories.map((category) => <option key={category} value={category}>{t(`machines.categories.${category.toLowerCase()}`, category)}</option>)}</select></label>
                  <label className="text-xs font-bold">{t("driver.price", "Price")}<input name="price" required type="number" min="1" value={form.price} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
                  <label className="text-xs font-bold">{t("driver.unit", "Unit")}<select name="unit" value={form.unit} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800">{listingUnits.map((unit) => <option key={unit} value={unit}>{t(`machines.units.${unit.toLowerCase()}`, unit)}</option>)}</select></label>
                  <label className="text-xs font-bold">{t("driver.year", "Year")}<input name="year" required type="number" min="1980" max={new Date().getFullYear() + 1} value={form.year} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
                </div>
                {needsVehicleDetails && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">{t("driver.vehicleNumber", "Vehicle number")}<input name="vehicleNumber" required value={form.vehicleNumber} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase dark:border-slate-700 dark:bg-slate-800" /></label><label className="text-xs font-bold">{t("driver.power", "Power (HP)")}<input name="power" required type="number" min="1" value={form.power} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="col-span-2 text-xs font-bold">{t("driver.fuelType", "Fuel type")}<select name="fuelType" required value={form.fuelType} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Select fuel type</option>{listingFuelTypes.map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label></div>}
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
                  <div className="flex items-end gap-2">
                    <label className="min-w-0 flex-1 text-xs font-bold">{t("driver.location", "Location")}<input name="location" required value={form.location} onChange={updateField} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
                    <button type="button" onClick={detectLocation} disabled={locationStatus === "detecting"} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-green-700 px-3 text-xs font-black text-white disabled:opacity-60"><LocateFixed size={15} />{locationStatus === "detecting" ? t("driver.findingLocation", "Finding...") : t("driver.findLocation", "Find location")}</button>
                  </div>
                  {locationMessage && <p className={`mt-2 text-xs font-semibold ${locationStatus === "failed" ? "text-amber-700" : "text-green-800 dark:text-lime-200"}`}>{locationMessage}</p>}
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-sm font-black"><ImagePlus size={17} className="text-green-700 dark:text-lime-300" />{t("driver.listingPhoto", "Listing photo")}</div>
                    <span className="text-[11px] font-semibold text-slate-400">Optional · JPG, PNG or WEBP · Max 5 MB</span>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-[160px_1fr] sm:items-center">
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      {(imagePreview || editingListing?.image?.url) ? <img src={imagePreview || editingListing.image.url} alt="Listing preview" className="h-full w-full object-cover" /> : <ImagePlus size={28} className="text-slate-300" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{image ? image.name : t("driver.currentPhoto", "Current listing photo")}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{t("driver.photoGuidance", "Upload a clear photo so farmers can identify your machine easily. Your current photo stays in place unless you choose a replacement.")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-green-700 px-3 text-xs font-black text-white hover:bg-green-800"><Upload size={15} />{image ? t("driver.chooseAnotherPhoto", "Choose another photo") : t("driver.choosePhoto", "Choose new photo")}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/")) {
                            setError(t("driver.invalidImage", "Please select a valid image file."));
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setError(t("driver.imageTooLarge", "Image size must be less than 5 MB."));
                            return;
                          }
                          setError("");
                          setImage(file);
                        }} className="sr-only" /></label>
                        {image && <button type="button" onClick={() => setImage(null)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 dark:border-slate-600 dark:text-slate-200"><X size={14} />{t("driver.keepCurrentPhoto", "Keep current photo")}</button>}
                      </div>
                    </div>
                  </div>
                </div>
                <label className="block text-xs font-bold">{t("driver.description", "Description")}<textarea name="description" required minLength="10" rows="3" value={form.description} onChange={updateField} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
                <div className="flex gap-2"><button type="submit" disabled={saving} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 text-sm font-black text-white disabled:opacity-50"><Save size={15} />{saving ? t("driver.saving", "Saving...") : t("driver.saveChanges", "Save changes")}</button><button type="button" onClick={closeEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-black dark:bg-slate-800"><X size={15} />{t("driver.cancel", "Cancel")}</button></div>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
      </div>
    </main>
  );
}
