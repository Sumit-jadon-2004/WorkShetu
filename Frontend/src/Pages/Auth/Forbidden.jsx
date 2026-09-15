function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f3] px-4 dark:bg-slate-950">
      <section className="rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-slate-900">
        <h1 className="text-3xl font-black">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">You are not authorized to view this page.</p>
      </section>
    </main>
  );
}

export default Forbidden;
