import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  Filter,
  Layers,
  MapPin,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function UsersManagement() {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Pagination
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") || "all");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam) {
      setRoleFilter(roleParam);
    }
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  // Modals state
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    role: "Farmer",
    location: "",
  });

  const [statusModalUser, setStatusModalUser] = useState(null);
  const [deleteModalUser, setDeleteModalUser] = useState(null);

  // Fetch users with query params
  const fetchUsers = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: targetPage,
        limit: 10,
        search: search.trim() || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      const response = await axios.get("/api/admin/users", {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setUsers(response.data.users || []);
        setPagination(response.data.pagination || { total: 0, pages: 1, limit: 10 });
        setPage(targetPage);
      } else {
        setError(response.data.message || "Failed to load users.");
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setError(err.response?.data?.message || "Failed to connect to users service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  // View user details
  const handleOpenView = async (user) => {
    setViewingUser(user);
    setViewLoading(true);
    try {
      const response = await axios.get(`/api/admin/users/${user._id}`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setViewingDetails(response.data);
      }
    } catch (err) {
      console.error("View user error:", err);
    } finally {
      setViewLoading(false);
    }
  };

  // Edit user modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      fullName: user.fullName || "",
      phone: user.phone || "",
      email: user.email || "",
      role: user.isAdmin ? "Admin" : user.role || "Farmer",
      location: user.location || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.put(
        `/api/admin/users/${editingUser._id}`,
        editFormData,
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "User updated successfully.");
        setEditingUser(null);
        fetchUsers(page);
      } else {
        setError(response.data.message || "Failed to update user.");
      }
    } catch (err) {
      console.error("Update user error:", err);
      setError(err.response?.data?.message || "Failed to update user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Block / Unblock user
  const handleToggleStatus = async () => {
    if (!statusModalUser) return;
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const nextStatus = statusModalUser.status !== "Active";
      const response = await axios.patch(
        `/api/admin/users/${statusModalUser._id}/status`,
        { isActive: nextStatus },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setStatusModalUser(null);
        fetchUsers(page);
      } else {
        setError(response.data.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Status toggle error:", err);
      setError(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.delete(`/api/admin/users/${deleteModalUser._id}`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setDeleteModalUser(null);
        fetchUsers(page);
      } else {
        setError(response.data.message || "Failed to delete user.");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      setError(err.response?.data?.message || "Failed to delete user.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              User Management
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {pagination.total} Users
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Search, filter, inspect profiles, update roles, and manage account statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUsers(page)}
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

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or village…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-600"
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Roles</option>
              <option value="Farmer">Farmers</option>
              <option value="Driver">Drivers</option>
              <option value="Labour">Labour Providers</option>
              <option value="Admin">Administrators</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">User</th>
                <th scope="col" className="px-5 py-3.5">Role</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5 text-center">Listings</th>
                <th scope="col" className="px-5 py-3.5 text-center">Bookings</th>
                <th scope="col" className="px-5 py-3.5">Joined Date</th>
                <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                    Loading user records…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentAdmin = currentUser?._id === u._id;
                  const initials = (u.fullName || "User")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={u._id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Name & Contact */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-xs font-bold text-white shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {u.fullName}
                              </p>
                              {isCurrentAdmin && (
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              <Phone size={10} className="mr-1 inline" />
                              {u.phone} {u.email ? `· ${u.email}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        {u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            <Shield size={10} /> Admin
                          </span>
                        ) : u.role === "Driver" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            <Truck size={10} /> Driver
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Farmer
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            u.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {u.status === "Active" ? (
                            <CheckCircle2 size={10} />
                          ) : (
                            <Ban size={10} />
                          )}
                          {u.status}
                        </span>
                      </td>

                      {/* Listings count */}
                      <td className="px-5 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {u.listingsCount}
                      </td>

                      {/* Bookings count */}
                      <td className="px-5 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {u.bookingsCount}
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(u)}
                            title="View details"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit user */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit user"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Block/Unblock toggle */}
                          <button
                            type="button"
                            onClick={() => setStatusModalUser(u)}
                            disabled={isCurrentAdmin}
                            title={
                              isCurrentAdmin
                                ? "Cannot block your own account"
                                : u.status === "Active"
                                ? "Block/Suspend user"
                                : "Unblock user"
                            }
                            className={`rounded-lg border p-1.5 transition disabled:opacity-40 ${
                              u.status === "Active"
                                ? "border-amber-200/80 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                : "border-emerald-200/80 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            }`}
                          >
                            {u.status === "Active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                          </button>

                          {/* Delete user */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalUser(u)}
                            disabled={isCurrentAdmin}
                            title={isCurrentAdmin ? "Cannot delete yourself" : "Delete user"}
                            className="rounded-lg border border-rose-200/80 p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-white">{users.length}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> users
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchUsers(page - 1)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
              Page {page} of {pagination.pages}
            </span>

            <button
              type="button"
              onClick={() => fetchUsers(page + 1)}
              disabled={page >= pagination.pages || loading}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. VIEW USER DETAILS MODAL ── */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">
                  {viewingUser.fullName?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {viewingUser.fullName}
                  </h3>
                  <p className="text-xs text-slate-400">User ID: {viewingUser._id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingUser(null);
                  setViewingDetails(null);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {viewLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                Fetching activity details…
              </div>
            ) : (
              <div className="mt-5 space-y-6 text-xs">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {viewingUser.phone}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                      {viewingUser.email || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Role</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {viewingUser.role}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {viewingUser.status}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200 truncate">
                      {viewingUser.location || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Joined</span>
                    <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-200">
                      {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Counts summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <Layers size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Listings</p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">
                        {viewingDetails?.activity?.listings?.total ?? viewingUser.listingsCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Bookings</p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">
                        {viewingUser.bookingsCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingUser(null);
                      setViewingDetails(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. EDIT USER MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit User: {editingUser.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Phone (Mobile Number)</label>
                <input
                  type="text"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
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
                <label className="block font-bold text-slate-700 dark:text-slate-300">Account Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Farmer">Farmer (Standard)</option>
                  <option value="Driver">Driver (Equipment Provider)</option>
                  <option value="Labour">Labour (Skilled Worker Provider)</option>
                  <option value="Admin">Admin (Full Administrative Privileges)</option>
                </select>
                {editingUser.isAdmin && editFormData.role !== "Admin" && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    ⚠️ Demoting an Administrator requires at least one other active Admin in the database.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. BLOCK / UNBLOCK CONFIRMATION MODAL ── */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  statusModalUser.status === "Active"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {statusModalUser.status === "Active" ? <Ban size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {statusModalUser.status === "Active" ? "Suspend Account" : "Unblock Account"}
                </h3>
                <p className="text-xs text-slate-500">{statusModalUser.fullName}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {statusModalUser.status === "Active"
                ? `Suspending ${statusModalUser.fullName} will prevent them from logging in, booking equipment, or receiving requests.`
                : `Unblocking will immediately restore normal platform login and access for ${statusModalUser.fullName}.`}
            </p>

            {statusModalUser.isAdmin && (
              <p className="mt-2 rounded-xl bg-amber-50 p-2 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                ⚠️ Safeguard: You cannot suspend the last active administrator on the system.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${
                  statusModalUser.status === "Active"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading
                  ? "Processing…"
                  : statusModalUser.status === "Active"
                  ? "Confirm Suspension"
                  : "Confirm Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. DELETE USER CONFIRMATION MODAL ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-900/40 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete User
                </h3>
                <p className="text-xs text-slate-500">{deleteModalUser.fullName}</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900 dark:text-white">{deleteModalUser.fullName}</strong>?
              This action is irreversible.
            </p>

            {deleteModalUser.isAdmin && (
              <p className="mt-2 rounded-xl bg-rose-50 p-2 text-[11px] font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                🛡️ Critical Guard: The system will reject deletion if this is the last administrator account.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

