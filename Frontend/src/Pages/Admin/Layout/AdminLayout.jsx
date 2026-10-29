import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";
import AdminNavbar from "./AdminNavbar.jsx";
import AdminFooter from "./AdminFooter.jsx";

export default function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex">
      {/* Sidebar (Desktop Persistent & Mobile Drawer) */}
      <AdminSidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <AdminNavbar onToggleMobile={() => setIsMobileOpen((prev) => !prev)} />

        {/* Dynamic Nested Content & Admin Footer */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto">
          <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
          <AdminFooter />
        </div>
      </div>
    </div>
  );
}
