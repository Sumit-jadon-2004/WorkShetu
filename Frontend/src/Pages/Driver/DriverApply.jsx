import {
    useEffect,
    useState
} from "react";

import axios from "axios";

import {
    Camera,
    X,
    Upload,
    CheckCircle,
    Clock,
    XCircle,
    User,
    Phone,
    MapPin,
    Truck,
    Briefcase
} from "lucide-react";


export default function DriverApply() {

    const [form, setForm] = useState({

        fullName: "",
        phone: "",
        address: "",
        vehicleType: "",
        vehicleNumber: "",
        experience: "",
        message: ""
    });


    const [equipmentImage, setEquipmentImage] =
        useState(null);

    const [imagePreview, setImagePreview] =
        useState("");


    const [loading, setLoading] =
        useState(false);

    const [success, setSuccess] =
        useState("");

    const [error, setError] =
        useState("");

    const [application, setApplication] =
        useState(null);

    const [applicationLoading, setApplicationLoading] =
        useState(true);

    const fetchApplication = async () => {
        try {
            const response = await axios.get("/api/driver/application");
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


    // ==================================================
    // INPUT CHANGE
    // ==================================================

    const handleChange = (event) => {

        const {
            name,
            value
        } = event.target;


        setForm((previous) => ({

            ...previous,

            [name]: value
        }));
    };


    // ==================================================
    // IMAGE CHANGE
    // ==================================================

    const handleImageChange = (event) => {

        const file =
            event.target.files?.[0];


        if (!file) return;


        // Image type
        if (!file.type.startsWith("image/")) {

            setError(
                "Please upload a valid image."
            );

            return;
        }


        // 5 MB
        if (file.size > 5 * 1024 * 1024) {

            setError(
                "Image size must be less than 5 MB."
            );

            return;
        }


        setError("");

        setEquipmentImage(file);


        const previewUrl =
            URL.createObjectURL(file);


        setImagePreview(previewUrl);
    };


    // ==================================================
    // REMOVE IMAGE
    // ==================================================

    const removeImage = () => {

        if (imagePreview) {

            URL.revokeObjectURL(
                imagePreview
            );
        }


        setEquipmentImage(null);

        setImagePreview("");
    };


    // ==================================================
    // CLEANUP
    // ==================================================

    useEffect(() => {

        return () => {

            if (imagePreview) {

                URL.revokeObjectURL(
                    imagePreview
                );
            }
        };

    }, [imagePreview]);


    // ==================================================
    // SUBMIT
    // ==================================================

    const handleSubmit = async (event) => {

        event.preventDefault();


        setLoading(true);

        setError("");

        setSuccess("");


        try {

            // Image required
            if (!equipmentImage) {

                setError(
                    "Please upload agricultural equipment photo."
                );

                setLoading(false);

                return;
            }


            const formData =
                new FormData();


            formData.append(
                "fullName",
                form.fullName
            );

            formData.append(
                "phone",
                form.phone
            );

            formData.append(
                "address",
                form.address
            );

            formData.append(
                "vehicleType",
                form.vehicleType
            );

            formData.append(
                "vehicleNumber",
                form.vehicleNumber
            );

            formData.append(
                "experience",
                form.experience
            );

            formData.append(
                "message",
                form.message
            );


            formData.append(
                "equipmentImage",
                equipmentImage
            );


            const response =
                await axios.post(
                    "/api/driver/apply",
                    formData
                );


            if (response.data.success) {

                setSuccess(
                    response.data.message
                );


                // Clear form
                setForm({

                    fullName: "",
                    phone: "",
                    address: "",
                    vehicleType: "",
                    vehicleNumber: "",
                    experience: "",
                    message: ""
                });


                removeImage();
                await fetchApplication();
            }


        } catch (err) {

            console.error(
                "DRIVER APPLY ERROR:",
                err
            );


            setError(
                err.response?.data?.message ||
                "Something went wrong. Please try again."
            );


        } finally {

            setLoading(false);
        }
    };


    return (

        <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">

            <div className="mx-auto max-w-3xl">

                {/* Header */}

                <div className="mb-8 text-center">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg">

                        <Truck size={32} />

                    </div>


                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">

                        Become a Driver

                    </h1>


                    <p className="mt-2 text-slate-500 dark:text-slate-400">

                        Create your Driver profile and start offering your equipment and services.

                    </p>

                </div>


                {/* Messages */}

                {success && (

                    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">

                        <CheckCircle size={22} />

                        <span>{success}</span>

                    </div>

                )}


                {error && (

                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">

                        {error}

                    </div>

                )}


                {!applicationLoading && application?.driverApplicationStatus !== "None" && (
                    <ApplicationStatus application={application} />
                )}

                {(!application || application.driverApplicationStatus === "None" || application.driverApplicationStatus === "Rejected") && (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-6 rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 md:p-8"
                >

                    {/* ============================
                        PERSONAL DETAILS
                    ============================ */}

                    <div>

                        <h2 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">

                            Personal Details

                        </h2>


                        <div className="grid gap-5 md:grid-cols-2">

                            <div>

                                <label className="mb-2 block text-sm font-semibold">

                                    Full Name

                                </label>

                                <div className="relative">

                                    <User
                                        className="absolute left-3 top-3.5 text-slate-400"
                                        size={18}
                                    />

                                    <input
                                        name="fullName"
                                        value={form.fullName}
                                        onChange={handleChange}
                                        required
                                        minLength={3}
                                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                                        placeholder="Enter your full name"
                                    />

                                </div>

                            </div>


                            <div>

                                <label className="mb-2 block text-sm font-semibold">

                                    Phone

                                </label>

                                <div className="relative">

                                    <Phone
                                        className="absolute left-3 top-3.5 text-slate-400"
                                        size={18}
                                    />

                                    <input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        required
                                        pattern="[6-9][0-9]{9}"
                                        maxLength={10}
                                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                                        placeholder="10 digit mobile number"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* Address */}

                    <div>

                        <label className="mb-2 block text-sm font-semibold">

                            Address

                        </label>

                        <div className="relative">

                            <MapPin
                                className="absolute left-3 top-3.5 text-slate-400"
                                size={18}
                            />

                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                required
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                                placeholder="Enter your complete address"
                            />

                        </div>

                    </div>


                    {/* ============================
                        EQUIPMENT DETAILS
                    ============================ */}

                    <div>

                        <h2 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">

                            Equipment Details

                        </h2>


                        <div className="grid gap-5 md:grid-cols-2">

                            <div>

                                <label className="mb-2 block text-sm font-semibold">

                                    Vehicle / Equipment Type

                                </label>

                                <select
                                    name="vehicleType"
                                    value={form.vehicleType}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                                >

                                    <option value="">
                                        Select equipment
                                    </option>

                                    <option value="Tractor">
                                        Tractor
                                    </option>

                                    <option value="Harvester">
                                        Harvester
                                    </option>

                                    <option value="Cultivator">
                                        Cultivator
                                    </option>

                                    <option value="Rotavator">
                                        Rotavator
                                    </option>

                                    <option value="Harrow">
                                        Harrow
                                    </option>

                                    <option value="Loader">
                                        Loader
                                    </option>

                                    <option value="Truck">
                                        Truck
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>

                                </select>

                            </div>


                            <div>

                                <label className="mb-2 block text-sm font-semibold">

                                    Vehicle Number

                                </label>

                                <input
                                    name="vehicleNumber"
                                    value={form.vehicleNumber}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 uppercase outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                                    placeholder="e.g. UP80AB1234"
                                />

                            </div>


                            <div>

                                <label className="mb-2 block text-sm font-semibold">

                                    Experience (Years)

                                </label>

                                <div className="relative">

                                    <Briefcase
                                        className="absolute left-3 top-3.5 text-slate-400"
                                        size={18}
                                    />

                                    <input
                                        type="number"
                                        name="experience"
                                        value={form.experience}
                                        onChange={handleChange}
                                        min="0"
                                        max="70"
                                        required
                                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                                        placeholder="Years"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ============================
                        EQUIPMENT PHOTO
                    ============================ */}

                    <div>

                        <label className="mb-2 block text-sm font-semibold">

                            Agricultural Equipment Photo

                        </label>


                        {!imagePreview ? (

                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-green-500 hover:bg-green-50 dark:border-slate-700 dark:hover:bg-green-950/20">

                                <Camera
                                    size={36}
                                    className="mb-3 text-slate-400"
                                />


                                <span className="font-semibold text-slate-700 dark:text-slate-200">

                                    Upload Equipment Photo

                                </span>


                                <span className="mt-1 text-sm text-slate-500">

                                    JPG, PNG, WEBP • Maximum 5 MB

                                </span>


                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />

                            </label>

                        ) : (

                            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">

                                <img
                                    src={imagePreview}
                                    alt="Equipment preview"
                                    className="h-72 w-full object-cover"
                                />


                                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-3 text-white">

                                    <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold backdrop-blur">

                                        <Upload size={16} />

                                        Change

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
                                        className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold"
                                    >

                                        <X size={16} />

                                        Remove

                                    </button>

                                </div>

                            </div>

                        )}

                    </div>


                    {/* Message */}

                    <div>

                        <label className="mb-2 block text-sm font-semibold">

                            Additional Message

                        </label>

                        <textarea
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            rows={4}
                            maxLength={1000}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800"
                            placeholder="Tell us anything else about your equipment or experience..."
                        />

                    </div>


                    {/* Submit */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                        {loading
                            ? "Submitting..."
                            : "Submit Driver Application"
                        }

                    </button>

                    <p className="text-center text-xs text-slate-500">

                        Your application will be reviewed by the WorkShetu admin team before Driver access is granted.

                    </p>

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
            title: "Application under review",
            message: "Your Driver application has been sent to the admin. You can check this page again for the final decision.",
            classes: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        },
        Approved: {
            icon: <CheckCircle size={24} />,
            title: "Application accepted",
            message: "Congratulations. Your Driver application was accepted by the admin.",
            classes: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200"
        },
        Rejected: {
            icon: <XCircle size={24} />,
            title: "Application rejected",
            message: application.driverRejectionReason || "The admin rejected your Driver application. You can submit a new application below.",
            classes: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        }
    }[status];

    if (!statusDetails) return null;

    return (
        <section className={`mb-6 rounded-2xl border p-5 ${statusDetails.classes}`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5">{statusDetails.icon}</div>
                <div>
                    <h2 className="font-black">{statusDetails.title}</h2>
                    <p className="mt-1 text-sm">{statusDetails.message}</p>
                    {application.driverApplicationDate && (
                        <p className="mt-2 text-xs opacity-75">
                            Applied on {new Date(application.driverApplicationDate).toLocaleDateString("en-IN")}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}