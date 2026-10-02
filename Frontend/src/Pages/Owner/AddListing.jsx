import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ImagePlus, LocateFixed, Upload, X } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";

const categories = ["Tractor", "Cultivator", "Rotavator", "Harrow", "Harvester"];
const units = ["Bigha", "Acre", "Hectare", "Hour", "Day", "Trip"];
const fuelTypes = ["Diesel", "Petrol", "Electric", "CNG", "Hybrid"];

function AddListing() {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		title: "",
		category: "Tractor",
		vehicleNumber: "",
		price: "",
		unit: "Bigha",
		power: "",
		fuelType: "",
		year: String(new Date().getFullYear()),
		location: "",
		latitude: "",
		longitude: "",
		description: "",
	});
	const [image, setImage] = useState(null);
	const [imagePreview, setImagePreview] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const [locationStatus, setLocationStatus] = useState("detecting");
	const [locationMessage, setLocationMessage] = useState("Detecting your location...");

	const updateField = (event) => {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
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
		setImage(file);
		setImagePreview(URL.createObjectURL(file));
	};

	useEffect(() => () => {
		if (imagePreview) URL.revokeObjectURL(imagePreview);
	}, [imagePreview]);

	const detectLocation = () => {
		if (!navigator.geolocation) {
			setLocationStatus("failed");
			setLocationMessage("Location is unavailable. Enter it manually.");
			return;
		}

		setLocationStatus("detecting");
		setLocationMessage("Detecting your location...");
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
					const address = (await response.json()).address || {};
					const location = [
						address.village || address.locality || address.town || address.suburb || address.city,
						address.district || address.county,
						address.state,
						address.country,
					].filter(Boolean).join(", ").slice(0, 200);
					setForm((current) => ({ ...current, location }));
					setLocationStatus("success");
					setLocationMessage(location ? `Location detected: ${location}` : "Location coordinates detected.");
				} catch {
					setLocationStatus("success");
					setLocationMessage("Coordinates detected. Enter the location name manually.");
				}
			},
			() => {
				setLocationStatus("failed");
				setLocationMessage("Location permission denied. Enter it manually.");
			},
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
		);
	};

	useEffect(() => {
		detectLocation();
	}, []);

	const submit = async (event) => {
		event.preventDefault();
		setError("");
		setSuccess("");

		if (!image) {
			setError("Please upload a machine image.");
			return;
		}

		const data = new FormData();
		Object.entries(form).forEach(([key, value]) => data.append(key, value));
		data.append("image", image);

		try {
			setLoading(true);
			const response = await axios.post("/api/machine", data, { withCredentials: true });
			setSuccess(response.data.message);
			setTimeout(() => navigate("/machine"), 900);
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Machine listing could not be added.");
		} finally {
			setLoading(false);
		}
	};

	const needsVehicleDetails = ["Tractor", "Harvester"].includes(form.category);

	return (
		<main className="min-h-screen bg-[#f6f8f3] dark:bg-slate-950">
			<Navbar />
			<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
				<div className="mb-8">
					<p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-lime-300">Driver workspace</p>
					<h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Add machine listing</h1>
					<p className="mt-2 text-slate-500 dark:text-slate-400">Publish your equipment so farmers can discover and book it.</p>
				</div>

				{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
				{success && <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{success}</div>}

				<form onSubmit={submit} className="space-y-5 rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8">
					<label className="block text-sm font-bold">Listing title<input name="title" required minLength="3" value={form.title} onChange={updateField} placeholder="e.g. John Deere Tractor" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label>

					<div className="grid gap-5 sm:grid-cols-2">
						<label className="text-sm font-bold">Category<select name="category" value={form.category} onChange={updateField} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
						<label className="text-sm font-bold">Price<input name="price" required type="number" min="1" value={form.price} onChange={updateField} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label>
					</div>

					<div className="grid gap-5 sm:grid-cols-2">
						<label className="text-sm font-bold">Pricing unit<select name="unit" value={form.unit} onChange={updateField} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
						<label className="text-sm font-bold">Manufacturing year<input name="year" required type="number" min="1980" max={new Date().getFullYear() + 1} value={form.year} onChange={updateField} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label>
					</div>

					{needsVehicleDetails && <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold">Vehicle number<input name="vehicleNumber" required value={form.vehicleNumber} onChange={updateField} placeholder="UP80AB1234" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 uppercase dark:border-slate-700 dark:bg-slate-800" /></label><label className="text-sm font-bold">Power (HP)<input name="power" required type="number" min="1" value={form.power} onChange={updateField} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label></div>}

					{needsVehicleDetails && <label className="block text-sm font-bold">Fuel type<select name="fuelType" required value={form.fuelType} onChange={updateField} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800"><option value="">Select fuel type</option>{fuelTypes.map((fuelType) => <option key={fuelType} value={fuelType}>{fuelType}</option>)}</select></label>}

					<div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
						<div className="flex items-start justify-between gap-3">
							<label className="block flex-1 text-sm font-bold">Location<input name="location" required value={form.location} onChange={updateField} placeholder="Village, District, State" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label>
							<button type="button" onClick={detectLocation} disabled={locationStatus === "detecting"} className="mt-7 inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-green-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-wait disabled:opacity-70"><LocateFixed size={17} className={locationStatus === "detecting" ? "animate-pulse" : ""} />{locationStatus === "detecting" ? "Detecting..." : "Use current location"}</button>
						</div>
						<p className={`mt-2 text-xs font-semibold ${locationStatus === "failed" ? "text-amber-700" : "text-green-700"}`}>{locationMessage}</p>
					</div>


					<input type="hidden" name="latitude" value={form.latitude} />
					<input type="hidden" name="longitude" value={form.longitude} />

					<div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
						<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
							<div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100"><ImagePlus size={18} className="text-green-700" />Machine image</div>
							<span className="text-xs font-semibold text-slate-400">Required</span>
						</div>
						{imagePreview ? (
							<div className="relative">
								<img src={imagePreview} alt="Machine preview" className="h-56 w-full object-cover" />
								<div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
									<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-black text-slate-800"><Upload size={15} />Change<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" /></label>
									<button type="button" onClick={() => { setImage(null); setImagePreview(""); }} className="inline-flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-2 text-xs font-black text-white"><X size={15} />Remove</button>
								</div>
							</div>
						) : (
							<label className="flex cursor-pointer flex-col items-center justify-center px-5 py-10 text-center transition hover:bg-green-50 dark:hover:bg-green-950/20">
								<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"><Upload size={22} /></div>
								<span className="text-sm font-black text-slate-800 dark:text-slate-100">Upload machine photo</span>
								<span className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP, maximum 5 MB</span>
								<input required type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
							</label>
						)}
					</div>
					<label className="block text-sm font-bold">Description<textarea name="description" required minLength="10" value={form.description} onChange={updateField} rows="4" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>

					<button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-green-700 font-black text-white disabled:opacity-50">{loading ? "Publishing..." : "Publish machine listing"}</button>
				</form>
			</div>
		</main>
	);
}

export default AddListing;
