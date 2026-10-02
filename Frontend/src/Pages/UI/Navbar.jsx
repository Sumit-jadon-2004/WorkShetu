
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Menu,
  X,
  Search,
  Heart,
  UserRound,
  ChevronDown,
  Tractor,
  Home,
  Sprout,
  ClipboardList,
  MessageCircle,
  Plus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentLanguage =
    i18n.language?.split("-")[0] || "en";

  const languages = [
    {
      code: "en",
      label: "English",
      native: "English",
    },
    {
      code: "hi",
      label: "Hindi",
      native: "हिन्दी",
    },
    {
      code: "hinglish",
      label: "Hinglish",
      native: "Hinglish",
    },
  ];

  const selectedLanguage =
    languages.find(
      (language) => language.code === currentLanguage
    ) || languages[0];

  const dashboardPath =
    user?.isAdmin
      ? "/admin/dashboard"
      : user?.role === "Driver"
        ? "/Drivers"
        : "/machine";

  // --------------------------------------------------
  // LANGUAGE
  // --------------------------------------------------

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem("workshetu-language", language);
    setLanguageOpen(false);
  };

  // --------------------------------------------------
  // CLOSE MOBILE MENU
  // --------------------------------------------------

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setLanguageOpen(false);
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
      closeMobileMenu();
    }
  };

  // --------------------------------------------------
  // BODY SCROLL
  // --------------------------------------------------

  useEffect(() => {
    document.body.style.overflow =
      mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // --------------------------------------------------
  // NAV ITEMS
  // --------------------------------------------------

  const navItems = user?.role === "Driver"
    ? [
        { to: "/Drivers", label: "Dashboard", icon: Home },
        { to: "/driver/listings/new", label: "Add machine", icon: Plus },
        { to: "/machine", label: "Machinery", icon: Tractor },
        { to: "/bookings", label: "My bookings", icon: ClipboardList },
        { to: "/chat", label: "Chats", icon: MessageCircle },
      ]
    : [
        {
          to: "/",
          label: t("navbar.home", "Home"),
          icon: Home,
        },
        {
          to: "/machine",
          label: t("navbar.machinery", "Machinery"),
          icon: Tractor,
        },
        {
          to: "/services",
          label: t("navbar.services", "Services"),
          icon: Sprout,
        },
        {
          to: "/bookings",
          label: t("navbar.bookings", "My Bookings"),
          icon: ClipboardList,
        },
        {
          to: "/chat",
          label: "Chat",
          icon: MessageCircle,
        },
      ];

  return (
    <>
      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between gap-4">

            {/* =================================================
                LOGO
            ================================================= */}

            <Link
              to="/"
              onClick={closeMobileMenu}
              className="group flex shrink-0 items-center gap-3"
            >
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#176b3a] to-[#0e4f2a] text-white shadow-lg shadow-green-900/20 transition duration-300 group-hover:scale-105">
                <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />

                <Tractor
                  size={23}
                  strokeWidth={2.5}
                />
              </div>

              <div className="hidden sm:block">
                <p className="text-[19px] font-black leading-none tracking-tight text-[#123524]">
                  Work<span className="text-[#176b3a]">Shetu</span>
                </p>

                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {t("navbar.tagline", "Smart Farming")}
                </p>
              </div>
            </Link>

            {/* =================================================
                DESKTOP NAV
            ================================================= */}

            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        isActive
                          ? "bg-green-50 text-[#176b3a] dark:bg-green-950/60 dark:text-lime-300"
                          : "text-slate-600 hover:bg-slate-50 hover:text-[#176b3a] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-lime-300"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2.5 : 2}
                        />

                        {item.label}

                        {isActive && (
                          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#176b3a]" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* =================================================
                RIGHT ACTIONS
            ================================================= */}

            <div className="flex items-center gap-2">

              {/* SEARCH */}

              <Link
                to="/search"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#176b3a] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-lime-300 sm:flex"
                aria-label={t("navbar.search", "Search")}
              >
                <Search size={19} />
              </Link>

              {/* SAVED */}

              <Link
                to="/saved"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-300 dark:hover:bg-red-950/50 sm:flex"
                aria-label={t("navbar.saved", "Saved")}
              >
                <Heart size={19} />
              </Link>

              {/* LANGUAGE */}

              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() =>
                    setLanguageOpen((value) => !value)
                  }
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-green-700 dark:hover:bg-green-950/60"
                >
                  <span className="text-sm">🌐</span>

                  <span>
                    {selectedLanguage.native}
                  </span>

                  <ChevronDown
                    size={14}
                    className={`transition ${
                      languageOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {languageOpen && (
                  <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                    <div className="px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {t("navbar.language", "Language")}
                      </p>
                    </div>

                    {languages.map((language) => (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() =>
                          changeLanguage(language.code)
                        }
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                          currentLanguage === language.code
                            ? "bg-green-50 text-[#176b3a] dark:bg-green-950/60 dark:text-lime-300"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{language.native}</span>

                        {currentLanguage === language.code && (
                          <span className="h-2 w-2 rounded-full bg-[#176b3a]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* =================================================
                  DESKTOP AUTH
              ================================================= */}

              {isAuthenticated ? (
                <div className="hidden items-center gap-2 md:flex">

                  <Link
                    to={dashboardPath}
                    className="max-w-28 truncate text-xs font-black text-slate-700 dark:text-slate-200"
                  >
                    {user?.fullName || "Account"}
                  </Link>

                  <Link
                    to="/profile"
                    className="flex h-10 items-center gap-2 rounded-xl bg-[#123524] px-3.5 text-xs font-black text-white shadow-md shadow-green-900/10 transition hover:bg-[#176b3a]"
                  >
                    <UserRound size={16} />

                    <span>
                      {t("navbar.profile", "Profile")}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="text-xs font-black text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              ) : (
                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    to="/login"
                    className="text-xs font-black text-slate-700 dark:text-slate-200"
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="rounded-xl bg-[#123524] px-3.5 py-2.5 text-xs font-black text-white transition hover:bg-[#176b3a]"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              {/* =================================================
                  MOBILE MENU BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={() =>
                  setMobileOpen((value) => !value)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-green-200 hover:text-[#176b3a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-green-700 dark:hover:text-lime-300 lg:hidden"
                aria-label={
                  mobileOpen
                    ? t("navbar.closeMenu", "Close menu")
                    : t("navbar.openMenu", "Open menu")
                }
              >
                {mobileOpen ? (
                  <X size={21} />
                ) : (
                  <Menu size={21} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            MOBILE MENU
        ================================================= */}

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

              {/* Mobile Search */}

              <Link
                to="/search"
                onClick={closeMobileMenu}
                className="mb-4 flex h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300"
              >
                <Search size={18} />

                {t(
                  "navbar.searchPlaceholder",
                  "Search machines, services..."
                )}
              </Link>

              {/* Mobile Navigation */}

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-black transition ${
                          isActive
                            ? "bg-green-50 text-[#176b3a] dark:bg-green-950/60 dark:text-lime-300"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`
                      }
                    >
                      <Icon size={19} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>

              {/* Mobile Saved/Profile */}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to="/saved"
                  onClick={closeMobileMenu}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <Heart size={17} />
                  {t("navbar.saved", "Saved")}
                </Link>

                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#123524] text-sm font-black text-white"
                >
                  <UserRound size={17} />
                  {t("navbar.profile", "Profile")}
                </Link>
              </div>

              {/* =================================================
                  MOBILE AUTH
              ================================================= */}

              {isAuthenticated ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    to={dashboardPath}
                    onClick={closeMobileMenu}
                    className="flex min-h-12 items-center justify-center rounded-2xl bg-[#123524] text-sm font-black text-white"
                  >
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-red-200 text-sm font-black text-red-600 disabled:opacity-50"
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex min-h-12 items-center justify-center rounded-2xl bg-[#123524] text-sm font-black text-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile Language */}

              <div className="mt-5 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-sm">🌐</span>

                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {t("navbar.language", "Language")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() =>
                        changeLanguage(language.code)
                      }
                      className={`rounded-xl px-2 py-2.5 text-xs font-black transition ${
                        currentLanguage === language.code
                          ? "bg-[#176b3a] text-white"
                          : "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {language.native}
                    </button>
                  ))}
                </div>
              </div>

              {/* List Machine */}

              <Link
                to="/machine/add"
                onClick={closeMobileMenu}
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-lime-100 text-sm font-black text-green-900"
              >
                <Plus size={18} />

                {t(
                  "navbar.listMachine",
                  "List your machine"
                )}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =================================================
          MOBILE BACKDROP
      ================================================= */}

      {mobileOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
          aria-label={t(
            "navbar.closeMenu",
            "Close menu"
          )}
        />
      )}
    </>
  );
}

export default Navbar;
