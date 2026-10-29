import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  BarChart3,
  TrendingUp,
  Receipt,
  Edit2,
  Eye,
  Gift,
  Globe,
  HelpCircle,
  Layers,
  MapPin,
  PauseCircle,
  PlayCircle,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Image as ImageIcon,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  CardSkeleton,
  EmptyState,
  PaginationBar,
  TableSkeleton,
  UnifiedBadge,
} from "../Components/AdminUI.jsx";

const POPULAR_HUBS = [
  "Noida",
  "Greater Noida",
  "Meerut",
  "Aligarh",
  "Bulandshahr",
  "Karnal",
  "Panipat",
  "Mathura",
  "Agra",
  "Hapur",
];

const INITIAL_FORM = {
  title: "",
  description: "",
  code: "",
  isAutomatic: false,
  bannerUrl: "",
  discountType: "Flat",
  discountValue: "",
  maxDiscount: "",
  fundingSource: "WorkShetu",
  campaignBudget: "",
  applicableService: "All",
  categoryMode: "all", // "all" | "selected"
  applicableCategories: [],
  userEligibility: "All",
  firstBookingOnly: false,
  groupBookingOnly: false,
  minimumBookingAmount: "",
  locationMode: "all", // "all" | "selected"
  selectedCities: [],
  applicableLocations: "",
  totalUsageLimit: "",
  perUserUsageLimit: "1",
  startDate: "",
  startTime: "00:00",
  endDate: "",
  endTime: "23:59",
};

export default function OfferManagement() {
  const [offers, setOffers] = useState([]);
  const [stats, setStats] = useState({
    totalOffers: 0,
    activeOffers: 0,
    scheduledOffers: 0,
    expiredOffers: 0,
    inactiveOffers: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
  });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image file size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError("");

      const uploadData = new FormData();
      uploadData.append("image", file);

      const response = await axios.post("/api/admin/offers/upload-image", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (response.data.success && response.data.url) {
        setFormData((prev) => ({ ...prev, bannerUrl: response.data.url }));
        setSuccess("Banner photo uploaded successfully!");
      } else {
        setUploadError(response.data.message || "Failed to upload image.");
      }
    } catch (err) {
      console.error("Banner upload error:", err);
      setUploadError(err.response?.data?.message || "Failed to upload image to server.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Machine Categories state (dynamically fetched from server)
  const [machineCategories, setMachineCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Modals & Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [cityInputText, setCityInputText] = useState("");
  const [viewingOffer, setViewingOffer] = useState(null);
  const [deleteModalOffer, setDeleteModalOffer] = useState(null);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError("");
      const response = await axios.get("/api/admin/offers/categories", {
        withCredentials: true,
      });
      if (response.data?.success && Array.isArray(response.data?.categories)) {
        setMachineCategories(response.data.categories);
      } else {
        setCategoriesError("Failed to load machine categories.");
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
      setCategoriesError(err.response?.data?.message || "Failed to load machine categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return machineCategories;
    const term = categorySearch.toLowerCase().trim();
    return machineCategories.filter((cat) => cat.toLowerCase().includes(term));
  }, [machineCategories, categorySearch]);

  const unavailableSelectedCategories = useMemo(() => {
    if (formData.categoryMode !== "selected" || !Array.isArray(formData.applicableCategories)) return [];
    if (categoriesLoading || machineCategories.length === 0) return [];
    const availableSet = new Set(machineCategories.map((c) => c.toLowerCase()));
    return formData.applicableCategories.filter((c) => !availableSet.has(c.toLowerCase()));
  }, [formData.categoryMode, formData.applicableCategories, machineCategories, categoriesLoading]);

  const fetchOffers = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: targetPage,
        limit: 10,
        status: activeTab !== "all" ? activeTab : undefined,
        service: serviceFilter !== "All" ? serviceFilter : undefined,
        search: search.trim() || undefined,
      };

      const response = await axios.get("/api/admin/offers", {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setOffers(response.data.offers || []);
        if (response.data.stats) setStats(response.data.stats);
        if (response.data.pagination) setPagination(response.data.pagination);
        setPage(targetPage);
      } else {
        setError(response.data.message || "Failed to load offers.");
      }
    } catch (err) {
      console.error("Fetch offers error:", err);
      setError(err.response?.data?.message || "Failed to connect to offers service.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await axios.get("/api/admin/offers/analytics", {
        withCredentials: true,
      });
      if (response.data.success) {
        setAnalyticsData(response.data);
      }
    } catch (err) {
      console.error("Failed to load offer analytics:", err);
      setError("Failed to load promotion analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    } else {
      fetchOffers(1);
    }
  }, [activeTab, serviceFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOffers(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOfferId(null);
    setError("");
    setSuccess("");
    setCityInputText("");
    setCategorySearch("");
    if (machineCategories.length === 0) fetchCategories();
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormData({
      ...INITIAL_FORM,
      locationMode: "all",
      selectedCities: [],
      startDate: today.toISOString().slice(0, 10),
      startTime: "00:00",
      endDate: nextMonth.toISOString().slice(0, 10),
      endTime: "23:59",
    });
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (offer) => {
    setEditingOfferId(offer._id);
    setError("");
    setSuccess("");
    setCityInputText("");
    setCategorySearch("");
    if (machineCategories.length === 0) fetchCategories();
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);

    const locations = Array.isArray(offer.applicableLocations)
      ? offer.applicableLocations
      : [];
    const hasLocationRestriction = locations.length > 0;

    const categories = Array.isArray(offer.applicableCategories)
      ? offer.applicableCategories
      : [];
    const selectionMode =
      offer.categorySelectionMode ||
      (categories.length > 0 ? "selected" : "all");

    setFormData({
      title: offer.title || "",
      description: offer.description || "",
      code: offer.code || "",
      isAutomatic: Boolean(offer.isAutomatic),
      bannerUrl: offer.bannerUrl || "",
      discountType: offer.discountType || "Flat",
      discountValue: offer.discountValue ?? "",
      maxDiscount: offer.maxDiscount ?? "",
      fundingSource: offer.fundingSource || "WorkShetu",
      campaignBudget: offer.campaignBudget ?? "",
      applicableService: offer.applicableService || "All",
      categoryMode: selectionMode,
      applicableCategories: categories,
      userEligibility: offer.userEligibility || "All",
      firstBookingOnly: Boolean(offer.firstBookingOnly),
      groupBookingOnly: Boolean(offer.groupBookingOnly),
      minimumBookingAmount: offer.minimumBookingAmount ?? "",
      locationMode: hasLocationRestriction ? "selected" : "all",
      selectedCities: locations,
      applicableLocations: locations.join(", "),
      totalUsageLimit: offer.totalUsageLimit ?? "",
      perUserUsageLimit: offer.perUserUsageLimit ?? "1",
      startDate: start.toISOString().slice(0, 10),
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().slice(0, 10),
      endTime: end.toTimeString().slice(0, 5),
    });
    setShowCreateModal(true);
  };

  // City selection helpers for Location Restrictions
  const handleToggleHub = (hubName) => {
    setFormData((prev) => {
      const exists = prev.selectedCities.some(
        (c) => c.toLowerCase() === hubName.toLowerCase()
      );
      if (exists) {
        return {
          ...prev,
          selectedCities: prev.selectedCities.filter(
            (c) => c.toLowerCase() !== hubName.toLowerCase()
          ),
        };
      }
      return {
        ...prev,
        selectedCities: [...prev.selectedCities, hubName],
      };
    });
  };

  const handleAddCity = (e) => {
    if (e) e.preventDefault();
    const trimmed = (cityInputText || "").trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const exists = prev.selectedCities.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        selectedCities: [...prev.selectedCities, trimmed],
      };
    });
    setCityInputText("");
  };

  const handleRemoveCity = (cityToRemove) => {
    setFormData((prev) => ({
      ...prev,
      selectedCities: prev.selectedCities.filter((c) => c !== cityToRemove),
    }));
  };

  // Toggle Checkbox for Machine Categories
  const handleToggleCategory = (cat) => {
    setFormData((prev) => {
      const exists = prev.applicableCategories.includes(cat);
      const updated = exists
        ? prev.applicableCategories.filter((c) => c !== cat)
        : [...prev.applicableCategories, cat];
      return { ...prev, applicableCategories: updated };
    });
  };

  // Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      if (!formData.title || !formData.title.trim()) {
        setError("Please enter an offer title.");
        return;
      }

      if (!formData.isAutomatic && (!formData.code || !formData.code.trim())) {
        setError("Please enter a coupon code (or check 'Automatic Offer').");
        return;
      }

      if (formData.discountValue === "" || isNaN(Number(formData.discountValue)) || Number(formData.discountValue) <= 0) {
        setError("Please enter a valid discount value greater than 0.");
        return;
      }

      if (formData.discountType === "Percentage" && Number(formData.discountValue) > 100) {
        setError("Percentage discount cannot exceed 100%.");
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError("Please select both start date and end date.");
        return;
      }

      const todayStr = new Date().toLocaleDateString("en-CA");
      if (formData.startDate < todayStr || formData.endDate < todayStr) {
        setError("Please select a valid date. Past dates are not allowed.");
        return;
      }

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || "00:00"}:00`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime || "23:59"}:59`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setError("Invalid date or time format.");
        return;
      }

      if (endDateTime <= startDateTime) {
        setError("End date and time must be after start date and time.");
        return;
      }

      if (
        formData.locationMode === "selected" &&
        (!formData.selectedCities || formData.selectedCities.length === 0)
      ) {
        setError("Please add at least one city or choose 'All Locations (Default)'.");
        return;
      }

      if (
        (formData.applicableService === "Machine" || formData.applicableService === "All") &&
        formData.categoryMode === "selected" &&
        (!formData.applicableCategories || formData.applicableCategories.length === 0)
      ) {
        setError("Please select at least one machine category or choose 'All Available Machines (Default)'.");
        return;
      }

      if (
        (formData.applicableService === "Machine" || formData.applicableService === "All") &&
        formData.categoryMode === "selected" &&
        unavailableSelectedCategories.length > 0
      ) {
        setError(`Please remove unavailable categories (${unavailableSelectedCategories.join(", ")}) before saving.`);
        return;
      }

      setActionLoading(true);

      const payload = {
        title: formData.title,
        description: formData.description,
        code: formData.isAutomatic ? null : formData.code,
        isAutomatic: formData.isAutomatic,
        bannerUrl: formData.bannerUrl,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        fundingSource: formData.fundingSource || "WorkShetu",
        campaignBudget: formData.campaignBudget ? Number(formData.campaignBudget) : null,
        applicableService: formData.applicableService,
        categorySelectionMode: formData.categoryMode,
        categoryMode: formData.categoryMode,
        applicableCategories:
          (formData.applicableService === "Machine" || formData.applicableService === "All") &&
          formData.categoryMode === "selected"
            ? formData.applicableCategories
            : [],
        userEligibility: formData.userEligibility,
        firstBookingOnly: formData.firstBookingOnly,
        groupBookingOnly: formData.groupBookingOnly,
        minimumBookingAmount: formData.minimumBookingAmount ? Number(formData.minimumBookingAmount) : 0,
        applicableLocations:
          formData.locationMode === "selected"
            ? formData.selectedCities.map((c) => String(c).trim()).filter(Boolean)
            : [],
        totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : null,
        perUserUsageLimit: Number(formData.perUserUsageLimit) || 1,
        startDate: startDateTime,
        endDate: endDateTime,
      };

      let res;
      if (editingOfferId) {
        res = await axios.put(`/api/admin/offers/${editingOfferId}`, payload, { withCredentials: true });
      } else {
        res = await axios.post("/api/admin/offers", payload, { withCredentials: true });
      }

      if (res.data.success) {
        setSuccess(res.data.message);
        setShowCreateModal(false);
        fetchOffers(editingOfferId ? page : 1);
      } else {
        setError(res.data.message || "Failed to save offer.");
      }
    } catch (err) {
      console.error("Save offer error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Error saving offer.";
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Pause / Resume for Offer
  const handleTogglePause = async (offer) => {
    try {
      setActionLoading(true);
      const res = await axios.patch(
        `/api/admin/offers/${offer._id}/pause`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        setSuccess(res.data.message);
        fetchOffers(page);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update offer pause status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (offer) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await axios.patch(
        `/api/admin/offers/${offer._id}/status`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        setSuccess(res.data.message);
        fetchOffers(page);
      } else {
        setError(res.data.message || "Failed to update offer status.");
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      setError(err.response?.data?.message || "Error toggling status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Duplicate Offer
  const handleDuplicate = async (offer) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await axios.post(
        `/api/admin/offers/${offer._id}/duplicate`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        setSuccess(res.data.message);
        fetchOffers(1);
      } else {
        setError(res.data.message || "Failed to duplicate offer.");
      }
    } catch (err) {
      console.error("Duplicate error:", err);
      setError(err.response?.data?.message || "Error duplicating offer.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Archive
  const handleDelete = async () => {
    if (!deleteModalOffer) return;
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await axios.delete(`/api/admin/offers/${deleteModalOffer._id}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setSuccess(res.data.message);
        setDeleteModalOffer(null);
        fetchOffers(page);
      } else {
        setError(res.data.message || "Failed to delete offer.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.response?.data?.message || "Error deleting offer.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-7 h-7 text-emerald-600" />
            Offers & Promotions Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, schedule, and configure discount coupons and automatic farmer promotions without code edits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOffers(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Offer
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Offers</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalOffers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Offers</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{stats.activeOffers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Scheduled</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{stats.scheduledOffers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Expired</p>
          <p className="text-xl font-bold text-rose-700 mt-1">{stats.expiredOffers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Redemptions</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{stats.totalRedemptions || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Discount Given</p>
          <p className="text-xl font-bold text-purple-700 mt-1">{formatCurrency(stats.totalDiscountGiven)}</p>
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

      {/* Tabs & Search Filter Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4 space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto space-x-2 text-xs font-bold">
          {[
            { id: "all", label: "All Offers", count: stats.totalOffers },
            { id: "active", label: "Active", count: stats.activeOffers },
            { id: "scheduled", label: "Scheduled", count: stats.scheduledOffers },
            { id: "expired", label: "Expired", count: stats.expiredOffers },
            { id: "inactive", label: "Inactive", count: stats.inactiveOffers },
            { id: "analytics", label: "Analytics", count: "Insights" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
                {tab.count || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Service Filter */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, coupon code, or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Service:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="All">All Services</option>
              <option value="Machine">Machines</option>
              <option value="Labour">Labour</option>
              <option value="Transport">Transport</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Tab View */}
      {activeTab === "analytics" ? (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : analyticsData ? (
            <>
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Redemptions</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      {analyticsData.stats?.totalRedemptions || 0}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Bookings discounted</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Discount Given</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      ₹{(analyticsData.stats?.totalDiscountGiven || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-purple-600 font-medium mt-0.5">Farmer savings delivered</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Driver Payouts Protected</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      ₹{(analyticsData.stats?.totalDriverPayoutsProtected || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">100% Payout (₹0 Deductions)</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Promotional Budget</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                      ₹{(analyticsData.stats?.totalBudgetSpent || 0).toLocaleString("en-IN")}
                      <span className="text-xs text-gray-400 font-normal"> / ₹{(analyticsData.stats?.totalCampaignBudget || 0).toLocaleString("en-IN")}</span>
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                      ₹{(analyticsData.stats?.totalBudgetRemaining || 0).toLocaleString("en-IN")} Remaining
                    </p>
                  </div>
                </div>
              </div>

              {/* Leaderboard & Service Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Performing Offers */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Top Performing Promotions Leaderboard
                    </h3>
                    <span className="text-xs text-gray-400">Ranked by usage</span>
                  </div>

                  {analyticsData.topOffers && analyticsData.topOffers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 uppercase font-semibold text-[10px]">
                            <th className="py-2.5 px-3">Offer Title</th>
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-3">Discount</th>
                            <th className="py-2.5 px-3">Service</th>
                            <th className="py-2.5 px-3 text-center">Redemptions</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {analyticsData.topOffers.map((top, idx) => (
                            <tr key={top._id || idx} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-semibold text-gray-900">{top.title}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                  {top.code}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-700">
                                {top.discountType === "Percentage" ? `${top.discountValue}% OFF` : `₹${top.discountValue} FLAT`}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">{top.applicableService}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                {top.usedCount || 0}
                                {top.totalUsageLimit ? ` / ${top.totalUsageLimit}` : ""}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <UnifiedBadge
                                  label={top.status}
                                  variant={top.status === "Active" ? "success" : top.status === "Scheduled" ? "info" : "neutral"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-4 text-center">No promotions redeemed yet.</p>
                  )}
                </div>

                {/* Service Distribution Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" /> Redemptions by Service
                  </h3>

                  <div className="space-y-4">
                    {["Machine", "Labour", "Transport"].map((srv) => {
                      const match = (analyticsData.serviceBreakdown || []).find((s) => s._id === srv);
                      const count = match ? match.redemptions : 0;
                      const disc = match ? match.totalDiscount : 0;
                      const totalRed = analyticsData.stats?.totalRedemptions || 1;
                      const pct = Math.round((count / totalRed) * 100);

                      return (
                        <div key={srv} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60">
                          <div className="flex justify-between text-xs font-bold text-gray-800">
                            <span>{srv}</span>
                            <span>{count} bookings ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Discounts delivered: ₹{disc.toLocaleString("en-IN")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Regional City Breakdown & Status Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* City / Hub Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" /> Redemptions by Region / City
                  </h3>
                  {analyticsData.cityBreakdown && analyticsData.cityBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.cityBreakdown.map((city) => {
                        const totalRed = analyticsData.stats?.totalRedemptions || 1;
                        const pct = Math.round((city.redemptions / totalRed) * 100);
                        return (
                          <div key={city._id || "unknown"} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60">
                            <div className="flex justify-between text-xs font-bold text-gray-800">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-amber-600" />
                                {city._id || "All Locations / Unrestricted"}
                              </span>
                              <span>{city.redemptions} bookings ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Farmer savings: ₹{(city.totalDiscount || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-4 text-center">No location-specific redemptions yet.</p>
                  )}
                </div>

                {/* Booking Status Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Redemption Booking Status
                  </h3>
                  {analyticsData.statusBreakdown && analyticsData.statusBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.statusBreakdown.map((st) => {
                        const total = (analyticsData.statusBreakdown || []).reduce((acc, curr) => acc + curr.count, 0) || 1;
                        const pct = Math.round((st.count / total) * 100);
                        return (
                          <div key={st._id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60">
                            <div className="flex justify-between text-xs font-bold text-gray-800">
                              <span>{st._id}</span>
                              <span>{st.count} bookings ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Discounts allocated: ₹{(st.totalDiscount || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-4 text-center">No status breakdown data yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Redemptions Live Feed */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" /> Recent Offer Redemptions Activity Feed
                  </h3>
                  <button
                    onClick={fetchAnalytics}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Feed
                  </button>
                </div>

                {analyticsData.recentRedemptions && analyticsData.recentRedemptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 uppercase font-semibold text-[10px]">
                          <th className="py-2.5 px-3">Farmer / Customer</th>
                          <th className="py-2.5 px-3">Service</th>
                          <th className="py-2.5 px-3">Applied Coupon</th>
                          <th className="py-2.5 px-3">Base Price</th>
                          <th className="py-2.5 px-3">Savings Granted</th>
                          <th className="py-2.5 px-3">Final Amount</th>
                          <th className="py-2.5 px-3 text-right">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analyticsData.recentRedemptions.map((red) => (
                          <tr key={red._id} className="hover:bg-gray-50/80">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              {red.customerName || "Farmer Customer"}
                              <span className="block text-[10px] text-gray-400 font-normal">{red.customerPhone || "N/A"}</span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-medium">{red.requestType || "Machine"}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {red.offerCode || "PROMO"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-700 font-mono">
                              ₹{(red.basePrice || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              - ₹{(red.offerDiscount || red.discountAmount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-gray-900">
                              ₹{(red.finalPrice || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-500 text-[11px]">
                              {new Date(red.createdAt).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-6 text-center">No redemptions logged yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center py-10 text-gray-500">Failed to load analytics data.</p>
          )}
        </div>
      ) : (
        /* Offers Table */
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : offers.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No Offers Found"
            description={
              search || activeTab !== "all" || serviceFilter !== "All"
                ? "No promotional offers match your current filters. Try resetting search criteria."
                : "You have not created any promotions yet. Create your first offer to incentivize farmers!"
            }
            actionText="Create New Offer"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Offer & Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Scope & Service</th>
                  <th className="py-3 px-4">Eligibility / Limits</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offers.map((item) => {
                  const isPercent = item.discountType === "Percentage";
                  const discountDisplay = isPercent
                    ? `${item.discountValue}% OFF${item.maxDiscount ? ` (Up to ₹${item.maxDiscount})` : ""}`
                    : `₹${item.discountValue} FLAT OFF`;

                  return (
                    <tr key={item._id} className="hover:bg-gray-50/80 transition">
                      {/* Offer & Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.bannerUrl ? (
                            <img
                              src={item.bannerUrl}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white flex-shrink-0 shadow-xs"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                              <Tag className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900 text-sm leading-tight">{item.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.isAutomatic ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  <Sparkles className="w-3 h-3" /> Automatic
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {item.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 text-xs">
                        <span className="text-emerald-700 bg-emerald-50/80 px-2 py-1 rounded">
                          {discountDisplay}
                        </span>
                      </td>

                      {/* Scope & Service */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800 block">{item.applicableService}</span>
                        {item.applicableCategories && item.applicableCategories.length > 0 && (
                          <span className="text-[10px] text-gray-500 block truncate max-w-xs">
                            {item.applicableCategories.join(", ")}
                          </span>
                        )}
                        {item.applicableLocations && item.applicableLocations.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium mt-1" title={item.applicableLocations.join(", ")}>
                            <MapPin className="w-2.5 h-2.5" />
                            {item.applicableLocations.length === 1
                              ? item.applicableLocations[0]
                              : `${item.applicableLocations[0]} +${item.applicableLocations.length - 1} more`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium mt-1">
                            <Globe className="w-2.5 h-2.5" /> All Locations
                          </span>
                        )}
                      </td>

                      {/* Eligibility & Limits */}
                      <td className="py-3 px-4 text-gray-600 space-y-0.5">
                        <span className="block font-medium">{item.userEligibility}</span>
                        {item.minimumBookingAmount > 0 && (
                          <span className="block text-[10px] text-gray-400">
                            Min Order: ₹{item.minimumBookingAmount}
                          </span>
                        )}
                        {item.firstBookingOnly && (
                          <span className="inline-block text-[10px] text-amber-700 font-semibold">
                            First Order Only
                          </span>
                        )}
                      </td>

                      {/* Redemptions */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-gray-900">{item.usedCount || 0}</span>
                        {item.totalUsageLimit && (
                          <span className="text-gray-400"> / {item.totalUsageLimit}</span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-4 text-[11px] text-gray-500 whitespace-nowrap">
                        <p>{new Date(item.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        <p className="text-gray-400">to {new Date(item.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <UnifiedBadge status={item.liveStatus || item.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOffer(item)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Offer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={actionLoading}
                            className={`p-1.5 rounded-lg transition ${
                              item.isActive
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={item.isActive ? "Deactivate Offer" : "Activate Offer"}
                          >
                            {item.isActive ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleTogglePause(item)}
                            disabled={actionLoading}
                            className={`p-1.5 rounded-lg transition ${
                              (item.liveStatus || item.status) === "Paused"
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-amber-600 hover:bg-amber-50"
                            }`}
                            title={(item.liveStatus || item.status) === "Paused" ? "Resume Paused Offer" : "Pause Offer"}
                          >
                            {(item.liveStatus || item.status) === "Paused" ? (
                              <PlayCircle className="w-4 h-4" />
                            ) : (
                              <PauseCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDuplicate(item)}
                            disabled={actionLoading}
                            className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                            title="Duplicate Offer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModalOffer(item)}
                            className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Delete / Archive Offer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && offers.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={10}
            onPageChange={(newPage) => fetchOffers(newPage)}
          />
        )}
        </div>
      )}

      {/* CREATE / EDIT OFFER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingOfferId ? "Edit Promotion Offer" : "Create New Promotion Offer"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure promotional rules, discount amount, applicability, and schedule.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* Error banner inside modal */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* SECTION 1: Offer Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  1. Offer Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Offer Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Monsoon Tractor Discount 2026"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Description / Terms
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. Get ₹500 off on all tractor bookings above 5 Bigha."
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Banner / Thumbnail Photo</span>
                      <span className="text-[11px] text-gray-400 font-normal">Upload photo OR enter image URL</span>
                    </label>

                    {/* Image Preview if bannerUrl is present */}
                    {formData.bannerUrl ? (
                      <div className="relative rounded-xl border border-gray-200 bg-gray-50 p-2.5 overflow-hidden mb-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={formData.bannerUrl}
                            alt="Banner Preview"
                            className="w-24 h-16 rounded-lg object-cover border border-gray-200 bg-white"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800">Banner photo selected</p>
                            <p className="text-[11px] text-gray-400 truncate font-mono mt-0.5">{formData.bannerUrl}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                              >
                                <Upload className="w-3 h-3" /> Change Photo
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, bannerUrl: "" })}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drag & drop or click upload area */
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition mb-2.5 ${
                          uploadingImage
                            ? "border-emerald-400 bg-emerald-50/50"
                            : "border-gray-200 hover:border-emerald-400 hover:bg-gray-50/70"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            {uploadingImage ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <Upload className="w-5 h-5" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-800">
                            {uploadingImage ? "Uploading photo to Cloudinary..." : "Click to upload banner photo from device"}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Supports JPG, PNG, WEBP (Max 5MB)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hidden file input for photo upload */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />

                    {/* Direct Image URL input + Upload button */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          value={formData.bannerUrl}
                          onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 text-gray-500" />
                        <span>Upload Photo</span>
                      </button>
                    </div>

                    {uploadError && (
                      <p className="text-xs font-semibold text-rose-600 mt-1.5">{uploadError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Discount & Funding */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    2. Discount & Funding
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    WorkShetu-Funded
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Flat">Flat Amount (₹)</option>
                      <option value="Percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        placeholder={formData.discountType === "Percentage" ? "e.g. 10" : "e.g. 50"}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {formData.discountType === "Percentage" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Maximum Discount Cap (₹)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        placeholder="e.g. 50"
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        ₹
                      </span>
                    </div>
                  </div>

                  {/* Funding Source Selector */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Funding Source *
                    </label>
                    <select
                      value={formData.fundingSource}
                      onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="WorkShetu">WorkShetu-funded (Platform promotional budget)</option>
                      <option value="Driver" disabled>Driver-voluntary contribution (Requires explicit agreement)</option>
                      <option value="Shared" disabled>Shared funding (Coming soon)</option>
                    </select>
                  </div>

                  {/* Driver Protection Callout Banner */}
                  <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-2.5 text-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900">Protected Driver Payout Guarantee</p>
                      <p className="text-[11px] text-emerald-950/80 leading-relaxed mt-0.5">
                        Platform discounts are funded 100% by WorkShetu promotional budget. The Driver receives their full agreed payout without deduction (Driver payout reduction: ₹0). Mandatory surcharges (such as small land area charge below 5 Bigha) remain strictly intact.
                      </p>
                    </div>
                  </div>

                  {/* Automatic vs Coupon Code */}
                  <div className="md:col-span-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Offer Application Mode</span>
                        <span className="text-[11px] text-gray-500">
                          Automatic offers apply directly at checkout; Coupon codes require farmer input.
                        </span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-700">
                        <input
                          type="checkbox"
                          checked={formData.isAutomatic}
                          onChange={(e) => setFormData({ ...formData, isAutomatic: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                        />
                        Automatic Offer (No Code Needed)
                      </label>
                    </div>

                    {!formData.isAutomatic && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Coupon Code * (Uppercase)
                        </label>
                        <input
                          type="text"
                          required={!formData.isAutomatic}
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="e.g. FIRST50"
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono uppercase font-bold focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Service Applicability & User Eligibility */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    3. Service Applicability & User Eligibility
                  </h4>
                  <span className="text-[11px] text-gray-400">Target specific services and customer segments</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Applicable Service
                    </label>
                    <select
                      value={formData.applicableService}
                      onChange={(e) => {
                        const srv = e.target.value;
                        setFormData({
                          ...formData,
                          applicableService: srv,
                          applicableCategories:
                            srv === "Labour" || srv === "Transport"
                              ? []
                              : formData.applicableCategories,
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="All">All Services (Machines, Labour, Transport)</option>
                      <option value="Machine">Machines Only</option>
                      <option value="Labour">Labour Only</option>
                      <option value="Transport">Transport Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      User Eligibility Group
                    </label>
                    <select
                      value={formData.userEligibility}
                      onChange={(e) => setFormData({ ...formData, userEligibility: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="All">All Registered Users</option>
                      <option value="Farmers">Farmers Only</option>
                      <option value="New Users">New Users Only (Zero prior bookings)</option>
                      <option value="Existing Users">Existing Users Only (1+ prior bookings)</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Controls which customer accounts can redeem this offer.
                    </p>
                  </div>

                  {/* Dynamic Machine Categories Multi-Select Interface */}
                  {(formData.applicableService === "Machine" || formData.applicableService === "All") && (
                    <div className="md:col-span-2 space-y-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800">
                          Machine Categories Scope
                        </label>
                        <p className="text-[11px] text-gray-500">
                          Configure whether this promotion applies across all machine categories or is restricted to specific equipment types.
                        </p>
                      </div>

                      {/* Mode Selection Cards: All Available Machines vs Selected Categories */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          onClick={() => setFormData({ ...formData, categoryMode: "all", applicableCategories: [] })}
                          className={`cursor-pointer rounded-xl p-3 border-2 transition-all flex items-start gap-3 ${
                            formData.categoryMode === "all"
                              ? "border-emerald-600 bg-emerald-50/50 shadow-xs text-gray-900"
                              : "border-gray-200 hover:border-gray-300 bg-white text-gray-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="categoryMode"
                            value="all"
                            checked={formData.categoryMode === "all"}
                            onChange={() => setFormData({ ...formData, categoryMode: "all", applicableCategories: [] })}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>All Available Machines (Default)</span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              Applies to every currently eligible machine category and automatically includes categories added to the database later.
                            </p>
                          </div>
                        </div>

                        <div
                          onClick={() => setFormData({ ...formData, categoryMode: "selected" })}
                          className={`cursor-pointer rounded-xl p-3 border-2 transition-all flex items-start gap-3 ${
                            formData.categoryMode === "selected"
                              ? "border-emerald-600 bg-emerald-50/50 shadow-xs text-gray-900"
                              : "border-gray-200 hover:border-gray-300 bg-white text-gray-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="categoryMode"
                            value="selected"
                            checked={formData.categoryMode === "selected"}
                            onChange={() => setFormData({ ...formData, categoryMode: "selected" })}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                              <Layers className="w-3.5 h-3.5 text-amber-600" />
                              <span>Selected Categories</span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              Allows you to select only categories currently available in the database.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progressive Disclosure: Specific Machine Categories Selector */}
                      {formData.categoryMode === "selected" && (
                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                          {/* Warning for unavailable previously selected categories */}
                          {unavailableSelectedCategories.length > 0 && (
                            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Warning:</strong> The following selected categories are no longer available in the database:{" "}
                                  <span className="font-bold underline">{unavailableSelectedCategories.join(", ")}</span>.
                                  Please remove them before saving.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const availableSet = new Set(machineCategories.map((c) => c.toLowerCase()));
                                  setFormData((prev) => ({
                                    ...prev,
                                    applicableCategories: prev.applicableCategories.filter((c) => availableSet.has(c.toLowerCase())),
                                  }));
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 transition shrink-0"
                              >
                                Remove Unavailable
                              </button>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800">
                                Choose Applicable Categories:
                              </span>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {formData.applicableCategories.length} of {machineCategories.length} selected
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    applicableCategories: [...machineCategories],
                                  })
                                }
                                disabled={machineCategories.length === 0}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 transition shadow-2xs disabled:opacity-50"
                              >
                                Select All
                              </button>
                              {formData.applicableCategories.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, applicableCategories: [] })}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition"
                                >
                                  Clear Selection
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Selected Category Chips */}
                          {formData.applicableCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-gray-200">
                              {formData.applicableCategories.map((cat) => {
                                const isAvailable = machineCategories.some((mc) => mc.toLowerCase() === cat.toLowerCase());
                                return (
                                  <span
                                    key={cat}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                      isAvailable
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                        : "bg-amber-50 border-amber-300 text-amber-900"
                                    }`}
                                  >
                                    <span>{cat}</span>
                                    {!isAvailable && (
                                      <span className="text-[10px] bg-amber-200 text-amber-800 px-1 rounded font-normal">
                                        Unavailable
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCategory(cat)}
                                      className="text-gray-500 hover:text-rose-600 rounded-full transition"
                                      title={`Remove ${cat}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Search Bar */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              placeholder="Search machine categories (e.g. Tractor, Rotavator...)"
                              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                            {categorySearch && (
                              <button
                                type="button"
                                onClick={() => setCategorySearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                title="Clear search"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Dynamic States: Loading, Error, Empty, and Categories Grid */}
                          {categoriesLoading ? (
                            <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-center gap-2 text-xs text-gray-500">
                              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                              <span>Loading available machine categories from database...</span>
                            </div>
                          ) : categoriesError ? (
                            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-between text-xs text-rose-700">
                              <span>{categoriesError}</span>
                              <button
                                type="button"
                                onClick={fetchCategories}
                                className="text-xs font-bold text-rose-800 underline hover:no-underline"
                              >
                                Retry
                              </button>
                            </div>
                          ) : machineCategories.length === 0 ? (
                            <div className="p-4 rounded-xl border border-gray-200 bg-white text-center text-xs text-gray-500">
                              No machine categories are currently available.
                            </div>
                          ) : filteredCategories.length === 0 ? (
                            <div className="p-4 rounded-xl border border-gray-200 bg-white text-center text-xs text-gray-500">
                              No machine categories matching "{categorySearch}".
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-0.5">
                              {filteredCategories.map((cat) => {
                                const isSelected = formData.applicableCategories.includes(cat);
                                return (
                                  <button
                                    type="button"
                                    key={cat}
                                    onClick={() => handleToggleCategory(cat)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left flex items-center justify-between ${
                                      isSelected
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                    }`}
                                  >
                                    <span className="truncate">{cat}</span>
                                    {isSelected ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-white" />
                                    ) : (
                                      <span className="w-3.5 h-3.5 rounded border border-gray-300 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.firstBookingOnly}
                        onChange={(e) => setFormData({ ...formData, firstBookingOnly: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                      />
                      <span>First Booking Only <span className="text-[11px] font-normal text-gray-500">(Inaugural order)</span></span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.groupBookingOnly}
                        onChange={(e) => setFormData({ ...formData, groupBookingOnly: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                      />
                      <span>Group Booking Only <span className="text-[11px] font-normal text-gray-500">(Village pooling orders)</span></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Location Restrictions */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    4. Location Restrictions
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Optional Advanced Setting
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  By default, offers are nationwide across all operational WorkShetu hubs and farming areas. Restrict to specific cities only for targeted localized marketing campaigns.
                </p>

                {/* Progressive Mode Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, locationMode: "all" })}
                    className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex items-start gap-3 ${
                      formData.locationMode === "all"
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs text-gray-900"
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="locationMode"
                      value="all"
                      checked={formData.locationMode === "all"}
                      onChange={() => setFormData({ ...formData, locationMode: "all" })}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>All Locations (Default)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        No location restrictions. Valid across all supported service regions, hubs, and farming clusters.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, locationMode: "selected" })}
                    className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex items-start gap-3 ${
                      formData.locationMode === "selected"
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs text-gray-900"
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="locationMode"
                      value="selected"
                      checked={formData.locationMode === "selected"}
                      onChange={() => setFormData({ ...formData, locationMode: "selected" })}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>Restrict to Selected Cities</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        Limit redemption exclusively to bookings taking place in chosen cities/districts.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progressive Disclosure: City Multi-Select Panel */}
                {formData.locationMode === "selected" && (
                  <div className="mt-3 p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-800">
                        Targeted Cities / Hubs ({formData.selectedCities.length} selected)
                      </label>
                      {formData.selectedCities.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, selectedCities: [] })}
                          className="text-[11px] text-rose-600 hover:underline font-medium"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Selected City Chips */}
                    {formData.selectedCities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-amber-200 min-h-[42px] items-center">
                        {formData.selectedCities.map((city) => (
                          <span
                            key={city}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-medium"
                          >
                            <MapPin className="w-3 h-3 text-amber-700" />
                            {city}
                            <button
                              type="button"
                              onClick={() => handleRemoveCity(city)}
                              className="text-amber-700 hover:text-amber-900 hover:bg-amber-200 rounded-full p-0.5 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 italic bg-amber-50 p-2 rounded border border-dashed border-amber-200">
                        No cities selected yet. Click any quick-add hub below or type a city name.
                      </p>
                    )}

                    {/* Quick Add Presets */}
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                        Quick Add WorkShetu Hubs:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_HUBS.map((hub) => {
                          const isSelected = formData.selectedCities.some(
                            (c) => c.toLowerCase() === hub.toLowerCase()
                          );
                          return (
                            <button
                              type="button"
                              key={hub}
                              onClick={() => handleToggleHub(hub)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 border ${
                                isSelected
                                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              {isSelected ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {hub}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom City Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={cityInputText}
                        onChange={(e) => setCityInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCity();
                          }
                        }}
                        placeholder="Type city or district (e.g. Bareilly, Ghaziabad) and press Add"
                        className="flex-1 border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddCity}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                      >
                        Add City
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: Conditions & Usage Limits */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    5. Conditions & Usage Limits
                  </h4>
                  <span className="text-[11px] text-gray-400">Budget protection and frequency safeguards</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Min Booking Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minimumBookingAmount}
                      onChange={(e) => setFormData({ ...formData, minimumBookingAmount: e.target.value })}
                      placeholder="e.g. 1000 (0 = no min)"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Total Usage Limit (Campaign Cap)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalUsageLimit}
                      onChange={(e) => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                      placeholder="Empty = Unlimited"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Per User Usage Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.perUserUsageLimit}
                      onChange={(e) => setFormData({ ...formData, perUserUsageLimit: e.target.value })}
                      placeholder="Default: 1"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: Schedule & Validity */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  6. Schedule & Validity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toLocaleDateString("en-CA")}
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      min={formData.startDate || new Date().toLocaleDateString("en-CA")}
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 7: Budget & Redemption Controls */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    7. Budget & Redemption Controls
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    WorkShetu Auto-Protection
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Platform Campaign Budget (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.campaignBudget}
                        onChange={(e) => setFormData({ ...formData, campaignBudget: e.target.value })}
                        placeholder="e.g. 2000 (Empty = Unlimited)"
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Total promotional funds WorkShetu commits to sponsor for this campaign.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-center">
                    <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                      Estimated Full-Value Redemptions
                    </span>
                    <p className="text-xl font-black text-gray-900 mt-0.5 font-mono">
                      {formData.campaignBudget && (formData.maxDiscount || formData.discountValue)
                        ? `~${Math.floor(
                            Number(formData.campaignBudget) /
                              (Number(formData.maxDiscount) || Number(formData.discountValue) || 1)
                          )} farmers`
                        : "Unlimited / Open Budget"}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Calculated at max discount cap of ₹{formData.maxDiscount || formData.discountValue || 0}/booking
                    </p>
                  </div>

                  <div className="md:col-span-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      <strong>Automatic Budget Exhaustion Protection:</strong> When cumulative promotional spend reaches this campaign budget, the offer will automatically pause to prevent overspend. If a farmer cancels or a driver rejects a booking, the reserved budget is automatically restored and the offer will resume if budget remains available.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 8: Live Offer Preview */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    8. Live Offer Preview
                  </h4>
                  <span className="text-[11px] text-gray-400">How farmers will see this offer</span>
                </div>

                <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-gray-50 shadow-inner">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">
                          {formData.title || "Offer Title Preview"}
                        </h5>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {formData.description || "Offer terms and details will be displayed here."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs font-mono">
                        {formData.isAutomatic ? "Automatic Offer" : formData.code || "COUPON"}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-xs shadow-xs">
                        {formData.discountType === "Percentage"
                          ? `${formData.discountValue || 0}% OFF${formData.maxDiscount ? ` (Up to ₹${formData.maxDiscount})` : ""}`
                          : `₹${formData.discountValue || 0} FLAT OFF`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-[11px]">
                    <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Funding</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> WorkShetu
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Driver Payout</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ₹0 Deduction
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Location Scope</span>
                      <span className="font-semibold text-gray-800 truncate block mt-0.5" title={formData.locationMode === "selected" && formData.selectedCities.length > 0 ? formData.selectedCities.join(", ") : "All Locations"}>
                        {formData.locationMode === "selected" && formData.selectedCities.length > 0
                          ? `${formData.selectedCities.length} Cities`
                          : "All Locations"}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Target Users</span>
                      <span className="font-semibold text-gray-800 truncate block mt-0.5">
                        {formData.firstBookingOnly ? "1st Booking Only" : formData.userEligibility}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Offer...
                    </>
                  ) : editingOfferId ? (
                    "Update Promotion"
                  ) : (
                    "Publish Offer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOSSIER MODAL */}
      {viewingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">{viewingOffer.title}</h3>
              </div>
              <button
                onClick={() => setViewingOffer(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingOffer.bannerUrl && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-950 flex items-center justify-center p-2">
                <img
                  src={viewingOffer.bannerUrl}
                  alt={viewingOffer.title}
                  className="w-full h-auto max-h-56 object-contain rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase">Coupon & Discount</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-emerald-700">
                    {viewingOffer.isAutomatic ? "Automatic Offer" : viewingOffer.code}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {viewingOffer.discountType === "Percentage"
                      ? `${viewingOffer.discountValue}% OFF (Max ₹${viewingOffer.maxDiscount || "No cap"})`
                      : `₹${viewingOffer.discountValue} FLAT OFF`}
                  </span>
                </div>
              </div>

              {viewingOffer.description && (
                <p className="text-gray-600">{viewingOffer.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-gray-700">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Service</span>
                  <span className="font-semibold">{viewingOffer.applicableService}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Geographic Scope</span>
                  <span className="font-semibold text-xs flex items-center gap-1">
                    {viewingOffer.applicableLocations && viewingOffer.applicableLocations.length > 0 ? (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{viewingOffer.applicableLocations.join(", ")}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>All Locations (Nationwide)</span>
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">User Eligibility</span>
                  <span className="font-semibold">{viewingOffer.userEligibility}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Redemptions</span>
                  <span className="font-mono font-semibold">
                    {viewingOffer.usedCount || 0} / {viewingOffer.totalUsageLimit || "Unlimited"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Per User Limit</span>
                  <span className="font-mono font-semibold">{viewingOffer.perUserUsageLimit}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Valid From</span>
                  <span>{new Date(viewingOffer.startDate).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Valid Until</span>
                  <span>{new Date(viewingOffer.endDate).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewingOffer(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deleteModalOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {deleteModalOffer.usedCount > 0 ? "Archive & Deactivate Offer?" : "Delete Offer Permanently?"}
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              {deleteModalOffer.usedCount > 0 ? (
                <>
                  Offer <strong>&quot;{deleteModalOffer.title}&quot;</strong> has{" "}
                  <strong>{deleteModalOffer.usedCount} historical redemptions</strong>. To protect past booking audit trails,
                  it will be deactivated and archived instead of permanently deleted.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete offer{" "}
                  <strong>&quot;{deleteModalOffer.title}&quot;</strong>? This cannot be undone.
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteModalOffer(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : deleteModalOffer.usedCount > 0 ? "Archive Offer" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

