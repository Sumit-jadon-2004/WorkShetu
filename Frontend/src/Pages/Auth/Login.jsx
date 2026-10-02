import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../UI/Navbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate(user.isAdmin ? "/admin/dashboard" : user.role === "Driver" ? "/Drivers" : "/machine", { replace: true });
    } catch (requestError) {
      if (!requestError.response) {
        setError("Server se connection nahi ho pa raha. Backend server start karke dobara try karein.");
      } else if (requestError.response.status === 429) {
        setError("Too many login attempts. Please wait 15 minutes and try again.");
      } else {
        setError(requestError.response.data?.message || "Invalid phone or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <><Navbar /><main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#f6f8f3] px-4 py-10 dark:bg-slate-950"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8"><h1 className="text-3xl font-black">Welcome back</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Log in to your WorkShetu account.</p>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<label className="mt-6 block text-sm font-bold">Phone<input required pattern="[6-9][0-9]{9}" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" /></label><label className="mt-4 block text-sm font-bold">Password<div className="mt-2 flex rounded-xl border border-slate-200 dark:border-slate-700"><input required type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 outline-none dark:bg-slate-800" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="px-3 text-xs font-bold">{showPassword ? "Hide" : "Show"}</button></div></label><button disabled={loading} className="mt-6 h-12 w-full rounded-xl bg-green-700 font-black text-white disabled:opacity-50">{loading ? "Logging in..." : "Login"}</button><p className="mt-5 text-center text-sm text-slate-500">New user? <Link className="font-bold text-green-700" to="/register">Create account</Link></p></form></main></>;
}

export default Login;
