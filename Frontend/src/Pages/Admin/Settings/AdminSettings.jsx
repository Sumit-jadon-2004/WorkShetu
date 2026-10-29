import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  HelpCircle,
  Info,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  Settings,
  Shield,
  Tractor,
  Users,
  X,
} from "lucide-react";

export default function AdminSettings() {
  const [formData, setFormData] = useState({
    nearbyMachineRadiusKm: 5,
    minimumLandArea: 5,
    groupMaxDistanceKm: 2,
    groupDiscountPercent: 10,
    extraBookingCharge: 500,
    smallLandExtraChargePerMissingBigha: 100,
    higherSmallLandExtraChargePerMissingBigha: 150,
    allowGroupBookings: true,
    requireDriverVerification: true,
    cancellationWindowHours: 24,
    platformCommissionPercent: 5,
    supportPhone: "+91 98765 43210",
    supportEmail: "support@workshetu.com",
    emergencyHelpline: "1800-123-FARM",
    operationalOffice: "WorkShetu Agri-Tech Hub, Sector 62, Noida, Uttar Pradesh, 201301",
    workingHours: "Monday - Saturday: 6:00 AM - 9:00 PM IST",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("rules");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get("/api/admin/settings", {
        withCredentials: true,
      });

      if (response.data.success && response.data.settings) {
        setFormData(response.data.settings);
      } else {
        setError(response.data.message || "Failed to load platform settings.");
      }
    } catch (err) {
      console.error("Fetch settings error:", err);
      setError(err.response?.data?.message || "Failed to connect to settings service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await axios.put("/api/admin/settings", formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        setSuccess(response.data.message || "Settings updated successfully.");
        if (response.data.settings) setFormData(response.data.settings);
      } else {
        setError(response.data.message || "Failed to update platform settings.");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setError(err.response?.data?.message || "Error updating platform settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    try {
      setResetting(true);
      setError("");
      setSuccess("");

      const response = await axios.post(
        "/api/admin/settings/reset",
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        if (response.data.settings) setFormData(response.data.settings);
        setShowResetModal(false);
      } else {
        setError(response.data.message || "Failed to reset settings.");
      }
    } catch (err) {
      console.error("Reset settings error:", err);
      setError(err.response?.data?.message || "Error resetting settings.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading platform configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-emerald-600" />
            Platform Business Rules & Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure geographic search radius, pooling thresholds, service surcharges, and contact details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={fetchSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            Reload
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WorkShetu Core Business Rules Card Callout */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-teal-500/10 p-4 rounded-2xl border border-emerald-200/80">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <p className="font-bold text-sm text-emerald-950 mb-1">
              Active WorkShetu Business Rules Engine:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
              <li>
                <strong>5 KM Radius:</strong> Default geographic proximity threshold for nearby tractor and machinery discovery.
              </li>
              <li>
                <strong>5 Bigha Threshold:</strong> Minimum land area requirement for group pooling without smallholding surcharges.
              </li>
              <li>
                <strong>₹500 Extra Charge:</strong> Standard base operational surcharge applied to small parcels or single machine dispatches.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("rules")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === "rules"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Compass className="w-4 h-4" />
          Search & Radius Rules
        </button>

        <button
          onClick={() => setActiveTab("group")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === "group"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Group Booking & Land Thresholds
        </button>

        <button
          onClick={() => setActiveTab("charges")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === "charges"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Pricing & Extra Charges
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === "contact"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          Platform Contact & Support
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Search & Radius Rules */}
        {activeTab === "rules" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <Compass className="w-5 h-5 text-emerald-600" />
              Geographic Proximity & Dispatch Radius
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nearby Machine Search Radius (KM)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    name="nearbyMachineRadiusKm"
                    value={formData.nearbyMachineRadiusKm}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    KM
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Default: <strong>5 KM</strong>. Restricts AI assistant and farmer catalogue searches to machines within this distance.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Cancellation Window (Hours)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    name="cancellationWindowHours"
                    value={formData.cancellationWindowHours}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    Hours
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Grace period allowed for farmers to cancel a confirmed order without penalty charges.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Platform Commission (%)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    name="platformCommissionPercent"
                    value={formData.platformCommissionPercent}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Platform facilitation fee deducted on completed booking settlements.
                </p>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="requireDriverVerification"
                    checked={formData.requireDriverVerification}
                    onChange={handleChange}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Require Driver Verification</span>
                    <span className="text-xs text-gray-500 block">
                      Enforce strict admin approval before driver listings can be booked by farmers.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Group Booking & Land Thresholds */}
        {activeTab === "group" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <Users className="w-5 h-5 text-emerald-600" />
              Group Booking (Pooling) & Land Area Thresholds
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Minimum Land Area (Bigha)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1"
                    name="minimumLandArea"
                    value={formData.minimumLandArea}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    Bigha
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Standard: <strong>5 Bigha</strong>. Individual farmers with less land must pool together or incur smallholding surcharges.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Group Pooling Maximum Distance (KM)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    name="groupMaxDistanceKm"
                    value={formData.groupMaxDistanceKm}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    KM
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Maximum proximity between participating farmers to join the same collective tractor pool (Default: 2 KM).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Group Booking Discount (%)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    name="groupDiscountPercent"
                    value={formData.groupDiscountPercent}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Incentive discount percentage granted to all members once the pool reaches 5+ Bigha (Default: 10%).
                </p>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowGroupBookings"
                    checked={formData.allowGroupBookings}
                    onChange={handleChange}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Enable Group Pooling Feature</span>
                    <span className="text-xs text-gray-500 block">
                      Permits neighboring smallholder farmers to create and join land pools.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Pricing & Extra Charges */}
        {activeTab === "charges" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Surcharges & Small Land Area Pricing Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Extra Booking Charge (₹)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    name="extraBookingCharge"
                    value={formData.extraBookingCharge}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    ₹
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Standard default: <strong>₹500</strong>. Base mobilization fee for dedicated single-dispatch bookings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Small Land Charge / Missing Bigha (₹)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    name="smallLandExtraChargePerMissingBigha"
                    value={formData.smallLandExtraChargePerMissingBigha}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    ₹/Bigha
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Tier 1 rate for the first 2 missing Bighas below threshold (Default: ₹100).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Higher Tier Missing Land Charge (₹)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    name="higherSmallLandExtraChargePerMissingBigha"
                    value={formData.higherSmallLandExtraChargePerMissingBigha}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    ₹/Bigha
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Tier 2 rate for each missing Bigha beyond 2 Bighas deficit (Default: ₹150).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Contact & Support */}
        {activeTab === "contact" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
              <PhoneCall className="w-5 h-5 text-emerald-600" />
              Platform Contact & Public Support Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Customer Support Phone
                </label>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="supportPhone"
                    value={formData.supportPhone}
                    onChange={handleChange}
                    className="w-full pl-10 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Support Email
                </label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="supportEmail"
                    value={formData.supportEmail}
                    onChange={handleChange}
                    className="w-full pl-10 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Emergency Farmer Helpline
                </label>
                <div className="relative mt-1">
                  <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="emergencyHelpline"
                    value={formData.emergencyHelpline}
                    onChange={handleChange}
                    className="w-full pl-10 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Support Hours
                </label>
                <div className="relative mt-1">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleChange}
                    className="w-full pl-10 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Operational Head Office
                </label>
                <div className="relative mt-1">
                  <Building className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <textarea
                    rows={2}
                    name="operationalOffice"
                    value={formData.operationalOffice}
                    onChange={handleChange}
                    className="w-full pl-10 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Platform Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Reset to System Defaults?</h3>
            <p className="text-sm text-gray-600 mt-2">
              This will restore all business logic parameters to their original WorkShetu values:
            </p>
            <ul className="text-xs text-gray-700 list-disc list-inside mt-2 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <li>Nearby Machine Search: <strong>5 KM</strong></li>
              <li>Minimum Land Area: <strong>5 Bigha</strong></li>
              <li>Extra Booking Charge: <strong>₹500</strong></li>
              <li>Group Pool Distance: <strong>2 KM</strong> (10% Discount)</li>
            </ul>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={resetting}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {resetting ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

