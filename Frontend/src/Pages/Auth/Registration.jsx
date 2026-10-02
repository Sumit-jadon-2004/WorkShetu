import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

function Registration() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Farmer",
    location: "",
    latitude: "",
    longitude: "",
  });

  const [locationStatus, setLocationStatus] = useState("detecting");
  const [locationMessage, setLocationMessage] = useState(
    t("auth.locationFinding", "Finding your location...")
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --------------------------------------------------
  // AUTO LOCATION
  // --------------------------------------------------

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("failed");
      setLocationMessage(
        t("auth.locationUnavailable", "Location is unavailable. You can enter it manually.")
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;

        setForm((current) => ({
          ...current,
          latitude,
          longitude,
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Reverse geocoding failed");
          }

          const address = (await response.json()).address || {};

          const locality =
            address.village ||
            address.locality ||
            address.town ||
            address.suburb ||
            address.city ||
            "";

          const location = [
            locality,
            address.district || address.county,
            address.state,
            address.country,
          ]
            .filter(Boolean)
            .join(", ")
            .slice(0, 200);

          setForm((current) => ({
            ...current,
            location,
          }));

          setLocationStatus("success");
          setLocationMessage(
            `${t("auth.locationFound", "Location detected")}${location ? `\n${location}` : ""}`
          );
        } catch {
          setLocationStatus("failed");
          setLocationMessage(
            t("auth.coordinatesAddressError", "Coordinates found, but address lookup failed. You can enter your location manually.")
          );
        }
      },
      (positionError) => {
        setLocationStatus("failed");

        if (positionError.code === positionError.PERMISSION_DENIED) {
          setLocationMessage(
            t("auth.locationDenied", "Location permission denied. You can enter your location manually.")
          );
        } else {
          setLocationMessage(
            t("auth.locationNotDetected", "Location could not be detected. You can enter your location manually.")
          );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // --------------------------------------------------
  // FORM UPDATE
  // --------------------------------------------------

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // REGISTER
  // --------------------------------------------------

  const submit = async (event) => {
    event.preventDefault();

    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("auth.passwordsMatch", "Passwords must match."));
      return;
    }

    setLoading(true);

    try {
      /*
       * Backend /auth/register already does:
       *
       * req.login(user)
       *
       * Therefore registration automatically creates
       * the Passport session.
       */
      const user = await register(form);

      // Automatically redirect after successful signup.
      navigate("/machine", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          t("auth.registerError", "Registration could not be completed.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f6f8f3] px-4 py-10 dark:bg-slate-950">
        <form
          onSubmit={submit}
          className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8"
        >
          <h1 className="text-3xl font-black">{t("auth.createAccount", "Create account")}</h1>

          <p
            className={`mt-3 whitespace-pre-line rounded-xl p-3 text-sm font-semibold ${
              locationStatus === "success"
                ? "bg-green-50 text-green-800"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {locationMessage}
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <label className="mt-6 block text-sm font-bold">
            {t("auth.fullName", "Full name")}

            <input
              name="fullName"
              required
              minLength="3"
              value={form.fullName}
              onChange={updateField}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="mt-4 block text-sm font-bold">
            {t("auth.phone", "Phone")}

            <input
              name="phone"
              required
              pattern="[6-9][0-9]{9}"
              value={form.phone}
              onChange={updateField}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              {t("auth.password", "Password")}

              <div className="mt-2 flex rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  name="password"
                  required
                  minLength="6"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField}
                  className="h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 outline-none dark:bg-slate-800"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="px-2 text-xs"
                >
                  {showPassword ? t("auth.hide", "Hide") : t("auth.show", "Show")}
                </button>
              </div>
            </label>

            <label className="text-sm font-bold">
              {t("auth.confirmPassword", "Confirm password")}

              <input
                name="confirmPassword"
                required
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={updateField}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-bold">
            {t("auth.location", "Location")}

            <input
              name="location"
              value={form.location}
              onChange={updateField}
              placeholder={t("auth.locationPlaceholder", "Village, District, State")}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-12 w-full rounded-xl bg-green-700 font-black text-white disabled:opacity-50"
          >
            {loading ? t("auth.creatingAccount", "Creating account...") : t("auth.createAccount", "Create account")}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            {t("auth.alreadyRegistered", "Already registered?")}{" "}
            <Link
              className="font-bold text-green-700"
              to="/login"
            >
              {t("auth.loginTitle", "Login")}
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}

export default Registration;
