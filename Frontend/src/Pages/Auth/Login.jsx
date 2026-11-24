import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login({
        phone: form.phone.trim(),
        password: form.password,
      });

      const profileStatus = user?.profileStatus || {};
      const role = String(user?.role || "").trim().toLowerCase();
      const isAdmin = Boolean(user?.isAdmin) || role === "admin" || profileStatus.isAdmin;
      const activeWorkspace = localStorage.getItem("workshetu_active_workspace");

      let defaultDest = "/";

      if (isAdmin) {
        defaultDest = "/admin/dashboard";
      } else if (profileStatus.hasBothProfiles) {
        if (activeWorkspace === "driver") {
          defaultDest = "/Drivers";
        } else if (activeWorkspace === "labour") {
          defaultDest = "/labour/dashboard";
        } else {
          defaultDest = "/work-with-workshetu";
        }
      } else if (profileStatus.hasDriverProfile || role === "driver") {
        if (user?.driverApplicationStatus === "Approved") {
          defaultDest = "/Drivers";
        } else if (user?.driverApplicationStatus === "Pending") {
          defaultDest = "/driver/application";
        } else {
          defaultDest = "/driver/apply";
        }
      } else if (profileStatus.hasLabourProfile || role === "labour") {
        if (profileStatus.hasIncompleteLabourRegistration) {
          defaultDest = "/labour/apply";
        } else {
          defaultDest = "/labour/dashboard";
        }
      } else {
        defaultDest = "/";
      }

      const fromPath = location.state?.from;
      const destination = (fromPath && fromPath !== "/login" && fromPath !== "/register" && fromPath !== "/403")
        ? fromPath
        : defaultDest;

      navigate(destination, {
        replace: true,
        state: location.state?.pendingReview ? { pendingReview: location.state.pendingReview } : undefined,
      });
    } catch (requestError) {
      if (!requestError.response) {
        setError(t("auth.connectionError", "Unable to connect to the server. Start the backend and try again."));
      } else if (requestError.response.status === 429) {
        setError(t("auth.tooManyAttempts", "Too many login attempts. Please wait 15 minutes and try again."));
      } else {
        setError(requestError.response.data?.message || t("auth.invalidCredentials", "Invalid phone or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f6f8f3] px-4 py-10 dark:bg-slate-950">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8">
          <h1 className="text-3xl font-black">{t("auth.welcomeBack", "Welcome back")}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("auth.loginSubtitle", "Log in to your WorkShetu account.")}</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <label className="mt-6 block text-sm font-bold">
            {t("auth.phone", "Phone")}
            <input
              required
              pattern="[6-9][0-9]{9}"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <label className="mt-4 block text-sm font-bold">
            {t("auth.password", "Password")}
            <div className="mt-2 flex rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 outline-none dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 text-xs font-bold"
              >
                {showPassword ? t("auth.hide", "Hide") : t("auth.show", "Show")}
              </button>
            </div>
          </label>
          <button
            disabled={loading}
            className="mt-6 h-12 w-full rounded-xl bg-green-700 font-black text-white disabled:opacity-50"
          >
            {loading ? t("auth.loggingIn", "Logging in...") : t("auth.loginTitle", "Login")}
          </button>
          <p className="mt-5 text-center text-sm text-slate-500">
            {t("auth.newUser", "New user?")}{" "}
            <Link className="font-bold text-green-700" to="/register">
              {t("auth.createAccount", "Create account")}
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}

export default Login;
