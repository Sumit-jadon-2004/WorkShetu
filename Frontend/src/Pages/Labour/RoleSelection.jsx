import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowRight, Briefcase, CheckCircle2, Clock, HardHat, LoaderCircle, Tractor } from "lucide-react";
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

  const hasLabour = Boolean(status.hasLabourProfile);
  const isLabourPending = Boolean(status.pendingLabourProfile);
  const hasDriver = Boolean(status.hasDriverProfile);
  const isDriverPending = status.driverApplicationStatus === "Pending";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-green-800 dark:bg-green-950/60 dark:text-green-300">
              <Briefcase className="h-3.5 w-3.5" />
              Work Opportunities
            </span>
            <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
              Work with WorkShetu
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Apply for work opportunities or manage your existing profiles. Choose whether you want to work as skilled labour or register your vehicle as a driver.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* OPTION A: LABOUR */}
            <div className="flex flex-col justify-between rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-emerald-900/60 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <HardHat className="h-7 w-7" />
                  </div>
                  {hasLabour ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Profile Active
                    </span>
                  ) : isLabourPending ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Under Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Option A
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                  Labour / Skilled Worker
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Register as an agricultural worker, mason, carpenter, electrician, mechanic, technician, engineer, or general worker. Set your rates, skills, and get direct booking requests from farmers.
                </p>
              </div>

              <div className="mt-8">
                {hasLabour ? (
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem("workshetu_active_workspace", "labour"); } catch {}
                      navigate("/labour/dashboard");
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-800"
                  >
                    <span>Open Labour Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : isLabourPending ? (
                  <button
                    type="button"
                    onClick={() => navigate("/labour/dashboard")}
                    className="flex w-full items-center justify-between rounded-xl bg-amber-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-amber-800"
                  >
                    <span>View Application Status</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/labour/apply")}
                    className="flex w-full items-center justify-between rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-800"
                  >
                    <span>Apply as Labour Worker</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* OPTION B: DRIVER */}
            <div className="flex flex-col justify-between rounded-3xl border border-blue-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-blue-900/60 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Tractor className="h-7 w-7" />
                  </div>
                  {hasDriver ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      Driver Active
                    </span>
                  ) : isDriverPending ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Under Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Option B
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                  Driver & Machine Owner
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Register as an agricultural machine driver or owner. List your tractors, harvesters, rotavators, and receive direct booking requests from nearby farmers.
                </p>
              </div>

              <div className="mt-8">
                {hasDriver ? (
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem("workshetu_active_workspace", "driver"); } catch {}
                      navigate("/Drivers");
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-blue-800"
                  >
                    <span>Open Driver Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : isDriverPending ? (
                  <button
                    type="button"
                    onClick={() => navigate("/driver/apply")}
                    className="flex w-full items-center justify-between rounded-xl bg-amber-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-amber-800"
                  >
                    <span>View Driver Application</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/driver/apply")}
                    className="flex w-full items-center justify-between rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-blue-800"
                  >
                    <span>Apply as Driver</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
