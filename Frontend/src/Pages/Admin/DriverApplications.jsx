
import { useEffect, useState } from "react";
import axios from "axios";

import {
    CheckCircle,
    XCircle,
    Clock,
    Phone,
    MapPin,
    Truck,
    Briefcase,
    CalendarDays,
    Image as ImageIcon,
    RefreshCw,
} from "lucide-react";


export default function DriverApplications() {

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [selectedApplication, setSelectedApplication] =
        useState(null);

    const [showRejectModal, setShowRejectModal] =
        useState(false);

    const [rejectReason, setRejectReason] =
        useState("");


    // ==========================================
    // FETCH APPLICATIONS
    // ==========================================

    const fetchApplications = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await axios.get(
                "/api/admin/driver-applications"
            );

            if (response.data.success) {

                setApplications(
                    response.data.applications || []
                );

            }

        } catch (err) {

            console.error(
                "FETCH DRIVER APPLICATIONS:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to load Driver applications."
            );

        } finally {

            setLoading(false);

        }
    };


    // ==========================================
    // INITIAL LOAD
    // ==========================================

    useEffect(() => {

        fetchApplications();

    }, []);


    // ==========================================
    // APPROVE
    // ==========================================

    const handleApprove = async (application) => {

        const confirmed = window.confirm(
            `Are you sure you want to accept ${application.fullName} as a Driver?`
        );

        if (!confirmed) return;


        try {

            setActionLoading(application._id);
            setError("");
            setSuccess("");


            const response = await axios.put(
                `/api/admin/driver-applications/${application._id}/approve`
            );


            if (response.data.success) {

                setSuccess(
                    response.data.message
                );

                setApplications((previous) =>
                    previous.filter(
                        (item) =>
                            item._id !== application._id
                    )
                );
            }

        } catch (err) {

            console.error(
                "APPROVE DRIVER:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to approve application."
            );

        } finally {

            setActionLoading("");

        }
    };


    // ==========================================
    // OPEN REJECT MODAL
    // ==========================================

    const openRejectModal = (application) => {

        setSelectedApplication(application);
        setRejectReason("");
        setError("");
        setShowRejectModal(true);

    };


    // ==========================================
    // REJECT
    // ==========================================

    const handleReject = async () => {

        if (!selectedApplication) return;


        if (!rejectReason.trim()) {

            setError(
                "Please enter a rejection reason."
            );

            return;
        }


        try {

            setActionLoading(
                selectedApplication._id
            );

            setError("");
            setSuccess("");


            const response = await axios.put(
                `/api/admin/driver-applications/${selectedApplication._id}/reject`,
                {
                    reason: rejectReason.trim(),
                }
            );


            if (response.data.success) {

                setSuccess(
                    response.data.message
                );


                setApplications((previous) =>
                    previous.filter(
                        (item) =>
                            item._id !==
                            selectedApplication._id
                    )
                );


                setSelectedApplication(null);
                setShowRejectModal(false);
                setRejectReason("");

            }

        } catch (err) {

            console.error(
                "REJECT DRIVER:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to reject application."
            );

        } finally {

            setActionLoading("");

        }
    };


    return (

        <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">

            <div className="mx-auto max-w-7xl">


                {/* ==================================
                    HEADER
                ================================== */}

                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div>

                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-400">

                            ADMIN PANEL

                        </span>


                        <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">

                            Driver Applications

                        </h1>


                        <p className="mt-1 text-slate-500 dark:text-slate-400">

                            Review and approve users who want to become Drivers.

                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={fetchApplications}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >

                        <RefreshCw
                            size={18}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Refresh

                    </button>

                </div>


                {/* ==================================
                    SUCCESS
                ================================== */}

                {success && (

                    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">

                        <CheckCircle size={20} />

                        <span className="font-medium">
                            {success}
                        </span>

                    </div>

                )}


                {/* ==================================
                    ERROR
                ================================== */}

                {error && (

                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">

                        {error}

                    </div>

                )}


                {/* ==================================
                    LOADING
                ================================== */}

                {loading ? (

                    <div className="rounded-3xl bg-white p-12 text-center shadow-lg dark:bg-slate-900">

                        <RefreshCw
                            size={36}
                            className="mx-auto mb-4 animate-spin text-green-600"
                        />

                        <p className="font-semibold text-slate-700 dark:text-slate-200">

                            Loading applications...

                        </p>

                    </div>

                ) : applications.length === 0 ? (

                    /* ==================================
                       EMPTY
                    ================================== */

                    <div className="rounded-3xl bg-white p-12 text-center shadow-lg dark:bg-slate-900">

                        <CheckCircle
                            size={52}
                            className="mx-auto mb-4 text-green-500"
                        />


                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">

                            No Pending Applications

                        </h2>


                        <p className="mt-2 text-slate-500 dark:text-slate-400">

                            There are currently no Driver applications waiting for review.

                        </p>

                    </div>

                ) : (

                    /* ==================================
                       APPLICATIONS
                    ================================== */

                    <div className="grid gap-6 lg:grid-cols-2">

                        {applications.map((application) => (

                            <article
                                key={application._id}
                                className="overflow-hidden rounded-3xl bg-white shadow-lg dark:bg-slate-900"
                            >

                                {/* Equipment Image */}

                                <div className="relative h-64 bg-slate-100 dark:bg-slate-800">

                                    {application.driverEquipmentImage?.url ? (

                                        <img
                                            src={
                                                application
                                                    .driverEquipmentImage
                                                    .url
                                            }
                                            alt={`${application.fullName} equipment`}
                                            className="h-full w-full object-cover"
                                        />

                                    ) : (

                                        <div className="flex h-full items-center justify-center text-slate-400">

                                            <ImageIcon
                                                size={50}
                                            />

                                        </div>

                                    )}


                                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-amber-700 shadow backdrop-blur">

                                        <Clock size={14} />

                                        Pending

                                    </div>

                                </div>


                                {/* Application Content */}

                                <div className="p-6">


                                    {/* Applicant */}

                                    <div className="mb-5">

                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">

                                            {application.fullName}

                                        </h2>


                                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">

                                            <Phone size={15} />

                                            {application.phone}

                                        </p>

                                    </div>


                                    {/* Details */}

                                    <div className="grid gap-3 sm:grid-cols-2">


                                        <InfoItem
                                            icon={
                                                <Truck size={17} />
                                            }
                                            label="Equipment"
                                            value={
                                                application.driverVehicleType ||
                                                "Not provided"
                                            }
                                        />


                                        <InfoItem
                                            icon={
                                                <Briefcase size={17} />
                                            }
                                            label="Experience"
                                            value={`${application.driverExperience || 0} years`}
                                        />


                                        <InfoItem
                                            icon={
                                                <Truck size={17} />
                                            }
                                            label="Vehicle Number"
                                            value={
                                                application.driverVehicleNumber ||
                                                "Not provided"
                                            }
                                        />


                                        <InfoItem
                                            icon={
                                                <CalendarDays size={17} />
                                            }
                                            label="Applied"
                                            value={
                                                application.driverApplicationDate
                                                    ? new Date(
                                                        application.driverApplicationDate
                                                    ).toLocaleDateString(
                                                        "en-IN"
                                                    )
                                                    : "N/A"
                                            }
                                        />

                                    </div>


                                    {/* Address */}

                                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">

                                        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">

                                            <MapPin size={16} />

                                            Address

                                        </div>


                                        <p className="text-sm text-slate-500 dark:text-slate-400">

                                            {
                                                application.driverAddress ||
                                                "Not provided"
                                            }

                                        </p>

                                    </div>


                                    {/* Message */}

                                    {application.driverMessage && (

                                        <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">

                                            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">

                                                Applicant Message

                                            </p>


                                            <p className="text-sm text-slate-600 dark:text-slate-300">

                                                {
                                                    application.driverMessage
                                                }

                                            </p>

                                        </div>

                                    )}


                                    {/* Actions */}

                                    <div className="mt-6 grid grid-cols-2 gap-3">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleApprove(
                                                    application
                                                )
                                            }
                                            disabled={
                                                actionLoading ===
                                                application._id
                                            }
                                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >

                                            <CheckCircle
                                                size={18}
                                            />

                                            {actionLoading ===
                                            application._id
                                                ? "Processing..."
                                                : "Accept"}

                                        </button>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                openRejectModal(
                                                    application
                                                )
                                            }
                                            disabled={
                                                actionLoading ===
                                                application._id
                                            }
                                            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >

                                            <XCircle
                                                size={18}
                                            />

                                            Reject

                                        </button>

                                    </div>

                                </div>

                            </article>

                        ))}

                    </div>

                )}

            </div>


            {/* ======================================
                REJECT MODAL
            ====================================== */}

            {showRejectModal &&
                selectedApplication && (

                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">

                        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">

                            <h2 className="text-xl font-black text-slate-900 dark:text-white">

                                Reject Driver Application

                            </h2>


                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">

                                Please provide a reason for rejecting{" "}

                                <strong>
                                    {
                                        selectedApplication.fullName
                                    }
                                </strong>.

                            </p>


                            <textarea
                                value={rejectReason}
                                onChange={(event) =>
                                    setRejectReason(
                                        event.target.value
                                    )
                                }
                                rows={5}
                                maxLength={500}
                                placeholder="Enter rejection reason..."
                                className="mt-5 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />


                            <p className="mt-1 text-right text-xs text-slate-400">

                                {rejectReason.length}/500

                            </p>


                            <div className="mt-5 flex gap-3">

                                <button
                                    type="button"
                                    onClick={() => {

                                        setShowRejectModal(
                                            false
                                        );

                                        setSelectedApplication(
                                            null
                                        );

                                        setRejectReason("");

                                    }}
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                                >

                                    Cancel

                                </button>


                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={
                                        !rejectReason.trim() ||
                                        actionLoading ===
                                        selectedApplication._id
                                    }
                                    className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    {actionLoading ===
                                    selectedApplication._id
                                        ? "Rejecting..."
                                        : "Confirm Reject"}

                                </button>

                            </div>

                        </div>

                    </div>

                )}

        </main>
    );
}


// ==========================================
// INFO ITEM
// ==========================================

function InfoItem({
    icon,
    label,
    value
}) {

    return (

        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">

            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">

                {icon}

                {label}

            </div>


            <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">

                {value}

            </p>

        </div>

    );
}

