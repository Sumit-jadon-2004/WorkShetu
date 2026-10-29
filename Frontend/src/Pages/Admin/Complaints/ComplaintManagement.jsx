import { useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  User,
  X,
} from "lucide-react";

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0,
  });

  const [activeTab, setActiveTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updatePriority, setUpdatePriority] = useState("");
  const [updateNote, setUpdateNote] = useState("");

  const [deleteModalComplaint, setDeleteModalComplaint] = useState(null);

  const fetchComplaints = async (targetPage = page) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: targetPage,
        limit: 10,
        status: activeTab !== "all" ? activeTab : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        search: search.trim() || undefined,
      };

      const response = await axios.get("/api/admin/complaints", {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setComplaints(response.data.complaints || []);
        if (response.data.counts) setCounts(response.data.counts);
        if (response.data.pagination) setPagination(response.data.pagination);
        setPage(targetPage);
      } else {
        setError(response.data.message || "Failed to load complaints.");
      }
    } catch (err) {
      console.error("Fetch complaints error:", err);
      setError(err.response?.data?.message || "Failed to connect to complaints service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints(1);
  }, [activeTab, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints(1);
  };

  const handleOpenDetailModal = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateStatus(complaint.status || "Pending");
    setUpdatePriority(complaint.priority || "Medium");
    setUpdateNote(complaint.resolutionNote || "");
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `/api/admin/complaints/${selectedComplaint._id}`,
        {
          status: updateStatus,
          priority: updatePriority,
          resolutionNote: updateNote,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Complaint ticket updated successfully.");
        setSelectedComplaint(null);
        fetchComplaints(page);
      } else {
        setError(response.data.message || "Failed to update complaint ticket.");
      }
    } catch (err) {
      console.error("Update complaint error:", err);
      setError(err.response?.data?.message || "Error updating complaint ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!deleteModalComplaint) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await axios.delete(
        `/api/admin/complaints/${deleteModalComplaint._id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setSuccess(response.data.message || "Complaint deleted successfully.");
        setDeleteModalComplaint(null);
        fetchComplaints(page);
      } else {
        setError(response.data.message || "Failed to delete complaint.");
      }
    } catch (err) {
      console.error("Delete complaint error:", err);
      setError(err.response?.data?.message || "Error deleting complaint.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending" || s === "open") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    }
    if (s === "under review" || s === "in progress") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <RefreshCw className="w-3.5 h-3.5" />
          Under Review
        </span>
      );
    }
    if (s === "resolved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Resolved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <X className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3" />
          High
        </span>
      );
    }
    if (p === "medium") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        Low
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-emerald-600" />
            Complaints & Dispute Resolution
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Investigate farmer grievances, driver misconduct reports, and booking dispute tickets.
          </p>
        </div>
        <button
          onClick={() => fetchComplaints(page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div
          onClick={() => setActiveTab("all")}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm ${
            activeTab === "all" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Tickets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{counts.all || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab("pending")}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm ${
            activeTab === "pending" ? "border-amber-500 ring-2 ring-amber-100" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{counts.pending || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab("under review")}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm ${
            activeTab === "under review" ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Under Review</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{counts.underReview || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab("resolved")}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm ${
            activeTab === "resolved" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.resolved || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab("rejected")}
          className={`cursor-pointer bg-white p-4 rounded-xl border transition shadow-sm ${
            activeTab === "rejected" ? "border-rose-500 ring-2 ring-rose-100" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{counts.rejected || 0}</p>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Controls & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, description, complainant name, or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-gray-500">Loading complaint tickets...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Complaints Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {search || activeTab !== "all" || priorityFilter !== "all"
                ? "No dispute tickets match your current filters. Try resetting your search."
                : "Great news! There are currently no grievance tickets submitted on the platform."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Reported Driver / User</th>
                  <th className="py-3 px-4">Subject & Reason</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {complaints.map((item) => {
                  const complainantName = item.userName || item.user?.fullName || "Anonymous";
                  const complainantPhone = item.userPhone || item.user?.phone || "N/A";
                  const driverName = item.targetDriver?.fullName || "N/A";
                  const driverVehicle = item.targetDriver?.driverVehicleType
                    ? `${item.targetDriver.driverVehicleType} (${item.targetDriver.driverVehicleNumber || "No Reg"})`
                    : null;

                  return (
                    <tr key={item._id} className="hover:bg-gray-50/80 transition">
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                        #{item._id.slice(-6).toUpperCase()}
                      </td>

                      {/* Complainant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {complainantName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{complainantName}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {complainantPhone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Reported User / Driver */}
                      <td className="py-3.5 px-4">
                        {item.targetDriver ? (
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              {driverName}
                            </p>
                            {driverVehicle && (
                              <p className="text-xs text-gray-500">{driverVehicle}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not specified</span>
                        )}
                      </td>

                      {/* Reason & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{item.subject}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                        {item.category && (
                          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {item.category}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">{getPriorityBadge(item.priority)}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(item)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Inspect & Resolve Ticket"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModalComplaint(item)}
                            className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Complaint"
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
        {!loading && complaints.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600 bg-gray-50/50">
            <p>
              Showing <span className="font-semibold text-gray-900">{(page - 1) * 10 + 1}</span> to{" "}
              <span className="font-semibold text-gray-900">
                {Math.min(page * 10, pagination.total)}
              </span>{" "}
              of <span className="font-semibold text-gray-900">{pagination.total}</span> tickets
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchComplaints(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="text-xs font-semibold px-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchComplaints(page + 1)}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resolution & Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Dispute Ticket #{selectedComplaint._id.slice(-6).toUpperCase()}
                  </h3>
                  {getStatusBadge(selectedComplaint.status)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reported on {new Date(selectedComplaint.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-6">
              {/* Complainant & Accused Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Complainant</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {selectedComplaint.userName || selectedComplaint.user?.fullName}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {selectedComplaint.userPhone || selectedComplaint.user?.phone || "No phone"}
                  </p>
                  {selectedComplaint.user?.email && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedComplaint.user.email}</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reported Driver / Booking</p>
                  {selectedComplaint.targetDriver ? (
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{selectedComplaint.targetDriver.fullName}</p>
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {selectedComplaint.targetDriver.phone || "No phone"}
                      </p>
                      {selectedComplaint.targetDriver.driverVehicleNumber && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Vehicle: {selectedComplaint.targetDriver.driverVehicleType} (
                          {selectedComplaint.targetDriver.driverVehicleNumber})
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No specific driver assigned.</p>
                  )}

                  {selectedComplaint.targetBooking && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700">
                        Booking Ref: #{selectedComplaint.targetBooking._id?.slice(-6).toUpperCase() || selectedComplaint.targetBooking.slice(-6).toUpperCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject & Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                    Category: {selectedComplaint.category || "General"}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {selectedComplaint.subject}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Description of Grievance</span>
                <p className="text-sm text-gray-700 p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Resolution Form Section */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  Admin Action & Resolution Note
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Update Status</label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                    <select
                      value={updatePriority}
                      onChange={(e) => setUpdatePriority(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Internal Resolution / Action Note
                  </label>
                  <textarea
                    rows={3}
                    value={updateNote}
                    onChange={(e) => setUpdateNote(e.target.value)}
                    placeholder="Enter details of settlement, actions taken against driver, refund notes, or reasons for closure..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    This note is logged internally for administrative dispute audit trails.
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
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
                      Saving...
                    </>
                  ) : (
                    "Save & Update Ticket"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Complaint Ticket?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to permanently remove ticket #{deleteModalComplaint._id.slice(-6).toUpperCase()}?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteModalComplaint(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteComplaint}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

