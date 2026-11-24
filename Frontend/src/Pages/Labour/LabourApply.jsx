import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, HardHat } from "lucide-react";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const CATEGORIES = [
  "Mistri & Construction", "Engineer", "Technician", "Mechanic",
  "Electrician", "Plumber", "Carpenter", "Painter", "Beldar",
  "Agricultural Labour", "General Labour", "Other Professional",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none focus:border-green-600 dark:border-slate-800 dark:bg-slate-800";

export default function LabourApply() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: user?.fullName || "",
    phone: user?.phone || "",
    location: user?.location || "",
    serviceLocation: user?.location || "",
    labourType: "Agricultural Labour",
    subProfession: "",
    experience: 0,
    skills: "",
    qualification: "",
    description: "",
    serviceRadiusKm: 25,
    price: "",
    pricingUnit: "per day",
    availabilityDays: DAYS,
    emergencyAvailability: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const validateStep = () => {
    if (step === 1 && (!form.name.trim() || !/^[6-9]\d{9}$/.test(form.phone) || !form.location.trim())) {
      return "Enter your name, valid 10-digit phone number, and location.";
    }
    if (step === 2 && (!form.labourType || !form.description.trim())) {
      return "Choose a profession and describe your work.";
    }
    if (step === 3 && (!Number(form.price) || Number(form.price) <= 0 || !form.serviceLocation.trim())) {
      return "Enter a valid charge and service location.";
    }
    return "";
  };

  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => Math.min(4, current + 1));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/labour/apply" } });
      return;
    }
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) body.append(key, value.join(","));
        else body.append(key, String(value));
      });
      if (imageFile) body.append("image", imageFile);
      const response = await axios.post("/api/labour/apply", body, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      if (!response.data?.success) throw new Error(response.data?.message || "Registration failed.");
      setSuccess(true);
      await refreshUser();
      setTimeout(() => navigate("/labour/dashboard"), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not submit registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white"><HardHat /></div>
            <div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Worker Registration</p><h1 className="text-2xl font-black dark:text-white">Create your professional profile</h1></div>
          </div>
          {success ? (
            <div className="py-16 text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h2 className="mt-4 text-xl font-black dark:text-white">Registration successful</h2><p className="mt-2 text-sm text-slate-500">Opening your Labour dashboard…</p></div>
          ) : (
            <form onSubmit={submit} className="mt-8">
              <div className="mb-8 grid grid-cols-4 gap-2">
                {["Personal", "Profession", "Service", "Preview"].map((label, index) => <div key={label} className={`rounded-xl px-2 py-2 text-center text-xs font-black ${step === index + 1 ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{index + 1}. {label}</div>)}
              </div>
              {error && <div className="mb-5 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800"><AlertCircle size={16} />{error}</div>}

              {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold">Full name<input required value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold">Phone<input required pattern="[6-9][0-9]{9}" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold sm:col-span-2">Location / Village<input required value={form.location} onChange={(e) => update("location", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold sm:col-span-2">Profile photo<input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { update("image", file); setImageFile(file); setImagePreview(URL.createObjectURL(file)); } }} className={inputClass} /></label>
                {imagePreview && <img src={imagePreview} alt="Profile preview" className="h-24 w-24 rounded-2xl object-cover" />}
              </div>}

              {step === 2 && <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold">Profession<select value={form.labourType} onChange={(e) => update("labourType", e.target.value)} className={inputClass}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="text-xs font-bold">Sub-profession<input value={form.subProfession} onChange={(e) => update("subProfession", e.target.value)} placeholder="e.g. Brick masonry" className={inputClass} /></label>
                <label className="text-xs font-bold">Experience (years)<input type="number" min="0" value={form.experience} onChange={(e) => update("experience", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold">Qualification<input value={form.qualification} onChange={(e) => update("qualification", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold sm:col-span-2">Skills (comma separated)<input value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="Welding, wiring, tractor repair" className={inputClass} /></label>
                <label className="text-xs font-bold sm:col-span-2">Work description<textarea required rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputClass} /></label>
              </div>}

              {step === 3 && <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold">Service location<input required value={form.serviceLocation} onChange={(e) => update("serviceLocation", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold">Work radius (km)<input type="number" min="1" max="200" value={form.serviceRadiusKm} onChange={(e) => update("serviceRadiusKm", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold">Expected charges<input required type="number" min="1" value={form.price} onChange={(e) => update("price", e.target.value)} className={inputClass} /></label>
                <label className="text-xs font-bold">Charge unit<select value={form.pricingUnit} onChange={(e) => update("pricingUnit", e.target.value)} className={inputClass}><option>per day</option><option>per hour</option><option>per acre</option><option>per bigha</option></select></label>
                <fieldset className="sm:col-span-2"><legend className="text-xs font-bold">Available days</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label key={day} className="rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"><input type="checkbox" checked={form.availabilityDays.includes(day)} onChange={(e) => update("availabilityDays", e.target.checked ? [...form.availabilityDays, day] : form.availabilityDays.filter((item) => item !== day))} /> {day.slice(0, 3)}</label>)}</div></fieldset>
                <label className="flex items-center gap-2 text-xs font-bold sm:col-span-2"><input type="checkbox" checked={form.emergencyAvailability} onChange={(e) => update("emergencyAvailability", e.target.checked)} /> Available for emergency requests</label>
              </div>}

              {step === 4 && <div className="space-y-3 rounded-2xl bg-slate-50 p-5 text-sm dark:bg-slate-800">
                <h2 className="text-lg font-black dark:text-white">Profile preview</h2>
                <p><b>{form.name}</b> · {form.labourType}{form.subProfession && ` · ${form.subProfession}`}</p>
                <p>{form.experience} years · {form.skills || "Skills not specified"}</p>
                <p>{form.location} · Service radius {form.serviceRadiusKm} km</p>
                <p className="font-black text-emerald-700">₹{form.price} / {form.pricingUnit}</p>
                <p className="text-slate-600 dark:text-slate-300">{form.description}</p>
              </div>}

              <div className="mt-8 flex justify-between gap-3">
                <button type="button" disabled={step === 1 || loading} onClick={() => setStep((current) => current - 1)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold disabled:opacity-40 dark:border-slate-700">Back</button>
                {step < 4 ? <button type="button" onClick={next} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white">Continue</button> : <button type="submit" disabled={loading} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? "Publishing…" : "Publish profile"}</button>}
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
