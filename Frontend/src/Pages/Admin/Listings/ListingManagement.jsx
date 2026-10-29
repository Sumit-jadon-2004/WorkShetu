import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  HardHat,
  Layers,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Tractor,
  Trash2,
  Truck,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

const machineCategories = [
  "All Categories",
  "Tractor",
  "Cultivator",
  "Rotavator",
  "Harrow",
  "Harvester",
];

export default function ListingManagement() {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    machines: 0,
    labour: 0,
    transport: 0,
  });
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab")?.toLowerCase();
    return ["all", "machines", "labour", "transport"].includes(t) ? t : "all";
  });
  const [selectedCategory, setSelectedCategory] = useState(
    () => searchParams.get("category") || "All Categories"
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const t = tabParam.toLowerCase();
      if (["all", "machines", "labour", "transport"].includes(t)) {
        setActiveTab(t);
      }
    }
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(catParam);
    }
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals state
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    price: "",
    unit: "",
    category: "",
    location: "",
    phone: "",
    description: "",
  });

  const [visibilityItem, setVisibilityItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        tab: activeTab,
        category:
          activeTab === "machines" && selectedCategory !== "All Categories"
            ? selectedCategory
            : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      };

      const response = await axios.get("/api/admin/listings", {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setListings(response.data.listings || []);
        if (response.data.counts) {
          setCounts(response.data.counts);
        }
      } else {
        setError(response.data.message || "Failed to load listings.");
      }
    } catch (err) {
      console.error("Fetch listings error:", err);
      setError(err.response?.data?.message || "Failed to connect to listings service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [activeTab, selectedCategory, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchListings();
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditFormData({
      title: item.title || "",
      price: item.price != null ? String(item.price) : "",
      unit: item.unit || "",
      category: item.category || "",
      location: item.location || "",
      phone: item.phone || "",
      description: item.description || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setActionLoading(editingItem._id);
      setError("");
      setSuccess("");

      const response = await axios.put(
        `/api/admin/listings/${editingItem.type}/${editingItem._id}`,
        editFormData,
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Listing updated successfully.");
        setEditingItem(null);
        fetchListings();
      } else {
        setError(response.data.message || "Failed to update listing.");
      }
    } catch (err) {
      console.error("Update listing error:", err);
      setError(err.response?.data?.message || "Failed to update listing.");
    } finally {
      setActionLoading("");
    }
  };

  // Toggle Visibility (Hide / Restore)
  const handleToggleVisibility = async () => {
    if (!visibilityItem) return;
    try {
      setActionLoading(visibilityItem._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/listings/${visibilityItem.type}/${visibilityItem._id}/availability`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setVisibilityItem(null);
        fetchListings();
      } else {
        setError(response.data.message || "Failed to toggle visibility.");
      }
    } catch (err) {
      console.error("Visibility toggle error:", err);
      setError(err.response?.data?.message || "Failed to update visibility.");
    } finally {
      setActionLoading("");
    }
  };

  // Delete Listing
  const handleDeleteListing = async () => {
    if (!deleteItem) return;
    try {
      setActionLoading(deleteItem._id);
      setError("");
      setSuccess("");

      const response = await axios.delete(
        `/api/admin/listings/${deleteItem.type}/${deleteItem._id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Listing deleted.");
        setDeleteItem(null);
        fetchListings();
      } else {
        setError(response.data.message || "Failed to delete listing.");
      }
    } catch (err) {
      console.error("Delete listing error:", err);
      setError(err.response?.data?.message || "Failed to delete listing.");
    } finally {
      setActionLoading("");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Available":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 size={10} /> Available
          </span>
        );
      case "Booked":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            <Clock size={10} /> Booked
          </span>
        );
      case "Hidden":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <EyeOff size={10} /> Hidden
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Machine":
        return <Tractor size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case "Labour":
        return <UserCheck size={16} className="text-cyan-600 dark:text-cyan-400" />;
      case "Transport":
        return <Truck size={16} className="text-orange-600 dark:text-orange-400" />;
      default:
        return <Layers size={16} className="text-slate-600" />;
    }
  };

  const tabs = [
    { id: "all", label: "All Listings", count: counts.all, icon: Layers },
    { id: "machines", label: "Machines & Tractors", count: counts.machines, icon: Tractor },
    { id: "labour", label: "Labour Services", count: counts.labour, icon: UserCheck },
    { id: "transport", label: "Transport Vehicles", count: counts.transport, icon: Truck },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Listing Catalog Management
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {counts.all} Total Supply
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Inspect machinery, agricultural equipment, labour, and transport listings. Manage prices, hide, or restore items.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchListings}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-slate-50 focus:outline-hidden disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-600 hover:text-rose-800">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Category Tabs ── */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 gap-2 pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedCategory("All Categories");
              }}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Machine Sub-categories Bar (Only active when in Machines tab) ── */}
      {activeTab === "machines" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Machine Type:
          </span>
          {machineCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search & Status Filters ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, vehicle plate, owner name, or city…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[11px] font-bold text-slate-500">Visibility:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All States</option>
            <option value="Available">Available Only</option>
            <option value="Booked">Currently Booked</option>
            <option value="Hidden">Hidden (Archived)</option>
          </select>
        </div>
      </div>

      {/* ── Listings Table ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">Item & Photo</th>
                <th scope="col" className="px-5 py-3.5">Category</th>
                <th scope="col" className="px-5 py-3.5">Owner / Driver</th>
                <th scope="col" className="px-5 py-3.5">Rate / Pricing</th>
                <th scope="col" className="px-5 py-3.5">Location</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                    Loading catalog listings…
                  </td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    No listings found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                listings.map((item) => (
                  <tr
                    key={item._id}
                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    {/* Item & Photo */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                            {getTypeIcon(item.type)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {item.title}
                          </p>
                          {item.vehicleNumber && (
                            <p className="text-[10px] font-mono text-slate-400">
                              {item.vehicleNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(item.type)}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{item.type}</span>
                    </td>

                    {/* Owner */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {item.owner?.fullName || "Verified Owner"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        <Phone size={9} className="mr-1 inline" />
                        {item.owner?.phone || item.phone || "N/A"}
                      </p>
                    </td>

                    {/* Pricing */}
                    <td className="px-5 py-3.5">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(item.price || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {" "}
                        / {item.unit}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        <span className="truncate max-w-[130px]">{item.location}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">{getStatusBadge(item.availability)}</td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View */}
                        <button
                          type="button"
                          onClick={() => setViewingItem(item)}
                          title="View Details"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Listing"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Hide / Restore */}
                        <button
                          type="button"
                          onClick={() => setVisibilityItem(item)}
                          title={item.availability === "Hidden" ? "Restore Listing" : "Hide Listing"}
                          className={`rounded-lg border p-1.5 transition ${
                            item.availability === "Hidden"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                          }`}
                        >
                          {item.availability === "Hidden" ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteItem(item)}
                          title="Delete Listing"
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 1. VIEW LISTING DETAILS MODAL ── */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  {getTypeIcon(viewingItem.type)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {viewingItem.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewingItem.type} · {viewingItem.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs">
              {viewingItem.image && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <img
                    src={viewingItem.image}
                    alt={viewingItem.title}
                    className="max-h-56 w-full object-cover"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rate</span>
                  <p className="mt-0.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{viewingItem.price} / {viewingItem.unit}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Availability</span>
                  <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                    {viewingItem.availability}
                  </p>
                </div>
                {viewingItem.vehicleNumber && (
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Plate</span>
                    <p className="mt-0.5 font-bold font-mono text-slate-800 dark:text-slate-200">
                      {viewingItem.vehicleNumber}
                    </p>
                  </div>
                )}
                {viewingItem.power && (
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Engine Power</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {viewingItem.power} HP
                    </p>
                  </div>
                )}
                {viewingItem.fuelType && (
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Fuel</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {viewingItem.fuelType}
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                    {viewingItem.location}
                  </p>
                </div>
              </div>

              {/* Owner card */}
              <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Listing Owner</span>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {viewingItem.owner?.fullName || "Driver"}
                </p>
                <p className="text-slate-500">
                  <Phone size={10} className="mr-1 inline" />
                  {viewingItem.owner?.phone || viewingItem.phone}
                </p>
              </div>

              {viewingItem.description && (
                <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Description</span>
                  <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {viewingItem.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. EDIT LISTING MODAL ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Listing ({editingItem.type})
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Title / Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Unit</label>
                  <input
                    type="text"
                    required
                    value={editFormData.unit}
                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Location / Village</label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Contact Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editingItem._id}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading === editingItem._id ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. HIDE / RESTORE CONFIRMATION MODAL ── */}
      {visibilityItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  visibilityItem.availability === "Hidden"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {visibilityItem.availability === "Hidden" ? <Eye size={20} /> : <EyeOff size={20} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {visibilityItem.availability === "Hidden" ? "Restore Listing" : "Hide Listing"}
                </h3>
                <p className="text-xs text-slate-500">{visibilityItem.title}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {visibilityItem.availability === "Hidden"
                ? "Restoring will make this item immediately visible again to farmers searching for equipment."
                : "Hiding this item will archive it from search results while preserving its history and bookings."}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVisibilityItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={actionLoading === visibilityItem._id}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${
                  visibilityItem.availability === "Hidden"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {actionLoading === visibilityItem._id
                  ? "Updating…"
                  : visibilityItem.availability === "Hidden"
                  ? "Confirm Restore"
                  : "Confirm Hide"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. DELETE LISTING CONFIRMATION MODAL ── */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/40 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Listing
                </h3>
                <p className="text-xs text-slate-500">{deleteItem.title}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900 dark:text-white">{deleteItem.title}</strong>? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteListing}
                disabled={actionLoading === deleteItem._id}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading === deleteItem._id ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

