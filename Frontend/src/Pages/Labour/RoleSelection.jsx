import { useEffect, useState } from "react";
import axios from "axios";
import { HardHat, LoaderCircle, Tractor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../UI/Navbar.jsx";

export default function RoleSelection() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    axios
      .get("/api/labour/profile-status", { withCredentials: true })
      .then((response) => {
        if (active) setStatus(response.data?.profileStatus || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Could not resolve your WorkShetu profile.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!status) return;
    if (status.hasBothProfiles) return;
    if (status.hasLabourProfile || status.pendingLabourProfile) {
      navigate("/labour/dashboard", { replace: true });
    } else if (status.hasDriverProfile) {
      navigate("/Drivers", { replace: true });
    } else if (status.hasIncompleteLabourRegistration) {
      navigate("/labour/apply", { replace: true });
    }
  }, [navigate, status]);

  if (error) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="font-semibold text-red-700">{error}</p>
        </main>
      </>
    );
  }

  if (!status) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-[50vh] items-center justify-center">
          <LoaderCircle className="animate-spin text-green-700" />
        </main>
      </>
    );
  }

  if (status.hasBothProfiles) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
          <section className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">WorkShetu</p>
              <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                Choose your dashboard
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
                You have both Labour and Driver profiles. Choose which workspace to open.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem("workshetu_active_workspace", "labour"); } catch {}
                  navigate("/labour/dashboard");
                }}
                className="rounded-3xl border border-emerald-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-emerald-900 dark:bg-slate-900"
              >
                <HardHat className="h-10 w-10 text-emerald-700" />
                <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">Labour Dashboard</h2>
                <p className="mt-2 text-sm text-slate-500">Manage worker profiles and work requests.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem("workshetu_active_workspace", "driver"); } catch {}
                  navigate("/Drivers");
                }}
                className="rounded-3xl border border-blue-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-blue-900 dark:bg-slate-900"
              >
                <Tractor className="h-10 w-10 text-blue-700" />
                <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">Driver Dashboard</h2>
                <p className="mt-2 text-sm text-slate-500">Manage machine listings and driver bookings.</p>
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">WorkShetu</p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
              How would you like to work with WorkShetu?
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
              Choose the path that matches how you want to use the platform.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate("/labour/apply")}
              className="rounded-3xl border border-emerald-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-emerald-900 dark:bg-slate-900"
            >
              <HardHat className="h-10 w-10 text-emerald-700" />
              <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">Register as a Worker</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create a professional profile as an engineer, technician, mechanic, mistri, agricultural worker, or other professional.
              </p>
              <span className="mt-6 inline-block rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
                Continue as Labour
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/driver/apply")}
              className="rounded-3xl border border-blue-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-blue-900 dark:bg-slate-900"
            >
              <Tractor className="h-10 w-10 text-blue-700" />
              <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">Register as a Driver</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                List your agricultural machines and receive booking requests from farmers through the existing driver flow.
              </p>
              <span className="mt-6 inline-block rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
                Continue as Driver
              </span>
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
