
function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f3] px-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900">
        
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <span className="text-4xl">🚜</span>
        </div>

        {/* Title */}
        <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
          You are not a Driver
        </h1>

        {/* Message */}
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          You are currently registered as a user, but you don't have a
          Driver Profile yet.
        </p>

        {/* Action Message */}
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-bold text-green-800 dark:text-green-300">
            Want to list your machine or offer your services?
          </p>

          <p className="mt-1 text-xs text-green-700 dark:text-green-400">
            Please create your Driver Profile first.
          </p>
        </div>

        {/* Button */}
        <button
          type="button"
          onClick={() => {
            window.location.href = "/driver/apply";
          }}
          className="mt-6 w-full rounded-2xl bg-[#176b3a] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-green-900/20 transition hover:bg-[#125a31] active:scale-[0.98]"
        >
          Create Driver Profile
        </button>

        {/* Back */}
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Go Back
        </button>

      </section>
    </main>
  );
}

export default Forbidden;
