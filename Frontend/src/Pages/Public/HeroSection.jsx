import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  ClipboardList,
  UserRound,
  ChevronRight,
  Clock3,
  Globe2,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Sun,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tractor,
  Truck,
  Users,
  Wheat,
  Wrench,
  X,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useUserLocation } from "../../context/LocationContext.jsx";
import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PromotionsBanner from "../Common/PromotionsBanner.jsx";

const languages = {
  hi: {
    name: "हिंदी",
    short: "हिंदी",
    welcome: "WorkShetu में आपका स्वागत है",
    choose: "अपनी भाषा चुनें",
    subtitle: "आप जिस भाषा में आसानी से समझें, वही चुनें।",
    badge: "किसानों के लिए बनाया गया",
    heroSmall: "खेती का काम",
    heroTitle: "अब और आसान।",
    heroText:
      "मशीन चाहिए, मजदूर चाहिए या फसल के लिए Transport — अपने आसपास की सुविधा खोजें और सीधे बात करें।",
    find: "मशीन खोजें",
    worker: "Sign In",
    location: "अपने गांव के आसपास",
    searchTitle: "आपको क्या चाहिए?",
    searchPlaceholder: "आपको क्या चाहिए? Machine, Worker या Driver",
    searchValue: "Machine • Worker • Driver",
    search: "खोजें",
    services: "हमारी सेवाएं",
    servicesTitle: "खेती के हर काम के लिए",
    servicesText:
      "आपकी ज़रूरत चाहे छोटी हो या बड़ी, WorkShetu पर अपने आसपास से solution खोजें।",
    machines: "खेती की मशीनें",
    machinesSub: "Tractor • Harvester • Rotavator",
    machinesDesc:
      "अपने गांव या आसपास उपलब्ध खेती की मशीन खोजें और मालिक से सीधे बात करें।",
    workers: "मजदूर / Worker",
    workersSub: "बुवाई • कटाई • Field Work",
    workersDesc:
      "खेती के काम के लिए अपने क्षेत्र के अनुभवी और भरोसेमंद workers से जुड़ें।",
    transport: "Transport & Driver",
    transportSub: "Farm • Mandi • Delivery",
    transportDesc:
      "फसल को खेत से मंडी तक पहुंचाने के लिए आसपास के drivers और transport खोजें।",
    view: "अभी देखें",
    how: "कैसे काम करता है",
    howTitle: "सिर्फ 3 आसान steps",
    step1: "अपनी ज़रूरत बताएं",
    step1Text: "Machine, Worker या Driver में से अपनी ज़रूरत चुनें।",
    step2: "अपने आसपास खोजें",
    step2Text: "अपने गांव और आसपास उपलब्ध options देखें।",
    step3: "सीधे बात करके बुक करें",
    step3Text: "Owner या worker को call करें और booking पक्की करें।",
    aboutTag: "Kisan First",
    aboutTitle: "आपका खेत। आपकी ज़रूरत। आपका फैसला।",
    aboutText:
      "WorkShetu किसानों को उनके आसपास उपलब्ध machines, workers और drivers से सीधे जोड़ने के लिए बनाया गया है।",
    verified: "Verified Profiles",
    nearby: "Nearby Services",
    direct: "Direct Contact",
    support: "24/7 Support",
    ctaTitle: "खेती का अगला काम आज ही आसान बनाएं।",
    ctaText:
      "Machine चाहिए? Worker चाहिए? Transport चाहिए? WorkShetu पर अपनी ज़रूरत से शुरू करें।",
    call: "Call Support",
    whatsapp: "WhatsApp",
    footer: "किसान के साथ, खेती के लिए",
    explore: "Explore",
  },

  en: {
    name: "English",
    short: "EN",
    welcome: "Welcome to WorkShetu",
    choose: "Choose your language",
    subtitle: "Select the language you are most comfortable with.",
    badge: "Built for Farmers",
    heroSmall: "Farming",
    heroTitle: "Made Easier.",
    heroText:
      "Need a machine, worker or transport? Find trusted services around your village and connect directly.",
    find: "Find Machines",
    worker: "Sign In",
    location: "Around your village",
    searchTitle: "What do you need?",
    searchPlaceholder: "What do you need? Machine, Worker or Driver",
    searchValue: "Machine • Worker • Driver",
    search: "Search",
    services: "Our Services",
    servicesTitle: "Everything your farm needs",
    servicesText:
      "From machines to skilled workers and transport, find practical solutions around you.",
    machines: "Farm Machines",
    machinesSub: "Tractor • Harvester • Rotavator",
    machinesDesc:
      "Find available farming machines near you and contact the owner directly.",
    workers: "Skilled Workers",
    workersSub: "Sowing • Harvesting • Field Work",
    workersDesc:
      "Connect with experienced and trusted workers from your local area.",
    transport: "Transport & Drivers",
    transportSub: "Farm • Mandi • Delivery",
    transportDesc:
      "Find nearby drivers and transport to move your harvest from farm to market.",
    view: "Explore Now",
    how: "How It Works",
    howTitle: "Three simple steps",
    step1: "Tell us what you need",
    step1Text: "Choose whether you need a machine, worker or driver.",
    step2: "Find nearby options",
    step2Text: "See available services around your village.",
    step3: "Connect & book",
    step3Text: "Call the owner or worker and confirm your booking.",
    aboutTag: "Kisan First",
    aboutTitle: "Your farm. Your need. Your choice.",
    aboutText:
      "WorkShetu is built to connect farmers directly with nearby machines, workers and drivers.",
    verified: "Verified Profiles",
    nearby: "Nearby Services",
    direct: "Direct Contact",
    support: "24/7 Support",
    ctaTitle: "Make your next farming job easier.",
    ctaText:
      "Need a machine, worker or transport? Start with WorkShetu today.",
    call: "Call Support",
    whatsapp: "WhatsApp",
    footer: "Built with farmers, for farming",
    explore: "Explore",
  },

  hinglish: {
    name: "Hinglish",
    short: "Hi-En",
    welcome: "WorkShetu par aapka swagat hai",
    choose: "Apni language choose karein",
    subtitle: "Jo language aapko sabse easy lage, woh select karein.",
    badge: "Farmers ke liye banaya gaya",
    heroSmall: "Kheti ka kaam",
    heroTitle: "Ab aur easy.",
    heroText:
      "Machine chahiye, worker chahiye ya crop ke liye transport — apne aas-paas service find karein aur directly baat karein.",
    find: "Machine Find Karein",
    worker: "SignIn",
    location: "Apne gaon ke aas-paas",
    searchTitle: "Aapko kya chahiye?",
    searchPlaceholder: "Aapko kya chahiye? Machine, Worker ya Driver",
    searchValue: "Machine • Worker • Driver",
    search: "Search Karein",
    services: "Our Services",
    servicesTitle: "Kheti ke har kaam ke liye",
    servicesText:
      "Machine, worker ya transport — apne area ke aas-paas solution easily find karein.",
    machines: "Farm Machines",
    machinesSub: "Tractor • Harvester • Rotavator",
    machinesDesc:
      "Apne gaon ke aas-paas available machines find karein aur owner se directly baat karein.",
    workers: "Skilled Workers",
    workersSub: "Bowaai • Kataai • Field Work",
    workersDesc:
      "Apne area ke experienced aur trusted workers se directly connect karein.",
    transport: "Transport & Drivers",
    transportSub: "Farm • Mandi • Delivery",
    transportDesc:
      "Harvest ko farm se mandi tak le jaane ke liye nearby driver aur transport find karein.",
    view: "Abhi Explore Karein",
    how: "How It Works",
    howTitle: "Sirf 3 easy steps",
    step1: "Apni need batayein",
    step1Text: "Machine, Worker ya Driver me se apni requirement choose karein.",
    step2: "Nearby options dekhein",
    step2Text: "Apne village ke aas-paas available services dekhein.",
    step3: "Direct baat karke book karein",
    step3Text: "Owner ya worker ko call karein aur booking confirm karein.",
    aboutTag: "Kisan First",
    aboutTitle: "Aapka farm. Aapki need. Aapka decision.",
    aboutText:
      "WorkShetu farmers ko nearby machines, workers aur drivers se directly connect karta hai.",
    verified: "Verified Profiles",
    nearby: "Nearby Services",
    direct: "Direct Contact",
    support: "24/7 Support",
    ctaTitle: "Kheti ka next kaam aaj hi easy banayein.",
    ctaText:
      "Machine chahiye? Worker chahiye? Transport chahiye? WorkShetu se start karein.",
    call: "Call Support",
    whatsapp: "WhatsApp",
    footer: "Farmers ke saath, farming ke liye",
    explore: "Explore",
  },
};

const SEARCH_SUGGESTIONS = [
  // Machines
  { id: "m-tractor", title: "Tractor", category: "Tractor", type: "machine", hindi: "ट्रैक्टर", keywords: ["tractor", "trektor", "traktor", "ट्रैक्टर", "farms", "खेती"] },
  { id: "m-rotavator", title: "Rotavator", category: "Rotavator", type: "machine", hindi: "रोटावेटर", keywords: ["rotavator", "rota", "rotavetor", "रोटावेटर", "जुताई"] },
  { id: "m-cultivator", title: "Cultivator", category: "Cultivator", type: "machine", hindi: "कल्टीवेटर", keywords: ["cultivator", "kaltivator", "कल्टीवेटर"] },
  { id: "m-harvester", title: "Harvester / Combine", category: "Harvester", type: "machine", hindi: "हार्वेस्टर / कंबाइन", keywords: ["harvester", "combine", "katai machine", "हार्वेस्टर", "कंबाइन"] },
  { id: "m-harrow", title: "Harrow", category: "Harrow", type: "machine", hindi: "हैरो (Harrow)", keywords: ["harrow", "disco", "हैरो", "डिस्क"] },
  { id: "m-trolley", title: "Tractor Trolley", category: "Trolley", type: "machine", hindi: "ट्रॉली", keywords: ["trolley", "trola", "ट्रॉली", "ट्रोला"] },
  { id: "m-sprayer", title: "Sprayer / Duster", category: "Sprayer", type: "machine", hindi: "स्प्रेयर मशीन", keywords: ["sprayer", "spray machine", "dawa spray", "स्प्रेयर"] },
  { id: "m-thresher", title: "Thresher", category: "Thresher", type: "machine", hindi: "थ्रेशर", keywords: ["thresher", "thrasher", "थ्रेशर"] },
  { id: "m-seeddrill", title: "Seed Drill", category: "Seed Drill", type: "machine", hindi: "सीड ड्रिल / बुवाई मशीन", keywords: ["seed drill", "buwai machine", "सीड ड्रिल"] },
  { id: "m-laser", title: "Laser Land Leveler", category: "Laser Leveler", type: "machine", hindi: "लेजर लेवलर", keywords: ["laser leveler", "leveler", "लेजर लेवलर", "कंप्यूटर मांझा"] },

  // Labour / Workers
  { id: "l-farmworker", title: "Farm Labour / Field Worker", category: "Farm Worker", type: "labour", hindi: "खेत मजदूर / लेबर", keywords: ["worker", "labour", "lebar", "khet majdoor", "majdoor", "mazdoor", "मजदूर", "लेबर", "worker"] },
  { id: "l-harvesting", title: "Harvesting Worker (कटाई)", category: "Harvesting", type: "labour", hindi: "कटाई मजदूर", keywords: ["harvesting", "katai", "fasal katai", "कटाई"] },
  { id: "l-sowing", title: "Sowing & Planting Worker (बुवाई)", category: "Sowing & Planting", type: "labour", hindi: "बुवाई और रोपाई मजदूर", keywords: ["sowing", "planting", "buwai", "ropai", "बुवाई", "रोपाई"] },
  { id: "l-weeding", title: "Weeding / Nindai Worker (निराई-गुड़ाई)", category: "Weeding", type: "labour", hindi: "निराई-गुड़ाई मजदूर", keywords: ["weeding", "nindai", "gudai", "घास सफाई", "निराई"] },
  { id: "l-loading", title: "Loading & Unloading Helper", category: "Loading & Unloading", type: "labour", hindi: "लोडिंग-अनलोडिंग मजदूर", keywords: ["loading", "unloading", "palladari", "बोरी उठाना", "लोडिंग"] },
  { id: "l-mechanic", title: "Tractor Mechanic", category: "Tractor mechanic", type: "labour", hindi: "ट्रैक्टर मैकेनिक", keywords: ["tractor mechanic", "mechanic", "mistri", "mistry", "मैकेनिक", "मिस्त्री"] },
  { id: "l-electrician", title: "Farm Electrician / Motor Mistry", category: "Electrician", type: "labour", hindi: "इलेक्ट्रीशियन / मोटर मिस्त्री", keywords: ["electrician", "bijli", "motor mistri", "इलेक्ट्रीशियन", "बिजली"] },
  { id: "l-plumber", title: "Plumber / Tube-well Fitting", category: "Plumber", type: "labour", hindi: "प्लम्बर / ट्यूबवेल फिटिंग", keywords: ["plumber", "tubewell", "pipe fitting", "प्लम्बर", "नल"] },

  // Drivers & Operators (Mapped under Labour in WorkShetu)
  { id: "d-tractor", title: "Tractor Driver", category: "Tractor Driver", type: "driver", hindi: "ट्रैक्टर ड्राइवर", keywords: ["tractor driver", "driver", "chalak", "ड्राइवर", "चालक", "tractor chalak"] },
  { id: "d-harvester", title: "Harvester Operator", category: "Harvester Operator", type: "driver", hindi: "हार्वेस्टर ऑपरेटर", keywords: ["harvester operator", "combine driver", "कंबाइन ड्राइवर", "हार्वेस्टर ऑपरेटर"] },
  { id: "d-spray", title: "Spray Machine Operator", category: "Spray Machine Operator", type: "driver", hindi: "स्प्रे मशीन ऑपरेटर", keywords: ["spray operator", "dawa spray driver", "स्प्रे ऑपरेटर"] },
  { id: "d-loader", title: "Loader / JCB Operator", category: "Loader Operator", type: "driver", hindi: "लोडर ऑपरेटर", keywords: ["loader operator", "jcb operator", "लोडर ऑपरेटर"] },

  // Transport
  { id: "t-transport", title: "Crop Transport / Goods Vehicle", category: "Transport", type: "transport", hindi: "फसल ट्रांसपोर्ट / मालवाहक", keywords: ["transport", "pickup", "canter", "dcm", "trolley transport", "गाड़ी", "ट्रांसपोर्ट"] },
];

function App() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [comingSoon, setComingSoon] = useState(false);
  const [language, setLanguage] = useState(null);
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  // Shared Location Context
  const {
    displayName: locationDisplayName,
    locality: locationLocality,
    city: locationCity,
    locationStatus,
    errorMessage: locationErrorMessage,
    refreshLocation,
  } = useUserLocation();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Authentication & Role Evaluation
  const { user, isAuthenticated, logout } = useAuth();

  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdmin = Boolean(user?.isAdmin) || userRole === "admin";
  const isDriver = !isAdmin && userRole === "driver";
  const isLabour = !isAdmin && userRole === "labour";
  const isEligibleDriver =
    isDriver &&
    user?.driverApplicationStatus === "Approved" &&
    user?.isActive !== false;

  const dashboardPath = isAdmin
    ? "/admin/dashboard"
    : isEligibleDriver
      ? "/Drivers"
      : isDriver
        ? "/driver/apply"
        : "/bookings";

  const dashboardLabel = isAdmin
    ? "Admin Dashboard"
    : isEligibleDriver
      ? "Driver Dashboard"
      : isDriver
        ? "Driver Application"
        : "My Bookings";

  useEffect(() => {
    const saved = localStorage.getItem("workshetu-language");

    if (saved && languages[saved]) {
      setLanguage(saved);
    }
  }, []);

  const selectLanguage = (lang) => {
    localStorage.setItem("workshetu-language", lang);
    i18n.changeLanguage(lang);
    setLanguage(lang);
    setLanguageOpen(false);
  };

  const t = language ? languages[language] : languages.hinglish;

  const handleFindServices = () => {
    document.getElementById("services")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter autocomplete suggestions based on user input
  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return SEARCH_SUGGESTIONS.slice(0, 6);
    }
    return SEARCH_SUGGESTIONS.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      if (item.hindi && item.hindi.toLowerCase().includes(q)) return true;
      if (
        item.keywords &&
        item.keywords.some((k) => k.toLowerCase().includes(q))
      )
        return true;
      return false;
    }).slice(0, 8);
  }, [searchQuery]);

  // Dynamic location label derived from GPS context
  const locationDisplayTitle = useMemo(() => {
    if (locationStatus === "requesting_location") {
      return language === "hi"
        ? "स्थान खोजा जा रहा है..."
        : "Detecting GPS location...";
    }
    if (locationStatus === "permission_denied") {
      return language === "hi"
        ? "GPS अनुमति नहीं मिली (Tap to retry)"
        : "GPS Denied (Tap to retry)";
    }
    if (locationStatus === "error") {
      return (
        locationErrorMessage ||
        (language === "hi"
          ? "स्थान त्रुटि (पुनः प्रयास करें)"
          : "Location unavailable (Retry)")
      );
    }
    if (locationLocality || locationCity || locationDisplayName) {
      const parts = [locationLocality, locationCity].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : locationDisplayName;
    }
    return t.location || "Around your village";
  }, [
    locationStatus,
    locationLocality,
    locationCity,
    locationDisplayName,
    locationErrorMessage,
    language,
    t.location,
  ]);

  const handleLocationClick = () => {
    if (locationStatus === "requesting_location") return;
    refreshLocation();
  };

  // Search execution handler for Machine, Labour, Driver, Transport
  const handleExecuteSearch = (rawQuery = "", explicitItem = null) => {
    const query = (rawQuery || searchQuery || "").trim();
    setShowSuggestions(false);

    if (explicitItem) {
      if (explicitItem.type === "transport") {
        setComingSoon(true);
        return;
      }
      if (explicitItem.type === "driver") {
        navigate(
          `/Labour?category=${encodeURIComponent(explicitItem.category || "Tractor Driver")}&search=${encodeURIComponent(explicitItem.title)}`
        );
        return;
      }
      if (explicitItem.type === "labour") {
        navigate(
          `/Labour?category=${encodeURIComponent(explicitItem.category)}&search=${encodeURIComponent(explicitItem.title)}`
        );
        return;
      }
      // machine
      navigate(
        `/machine?category=${encodeURIComponent(explicitItem.category)}&search=${encodeURIComponent(explicitItem.title)}`
      );
      return;
    }

    if (!query) {
      navigate("/machine");
      return;
    }

    const lower = query.toLowerCase();

    // 1. Transport check
    const isTransport = [
      "transport",
      "pickup",
      "canter",
      "trolley transport",
      "गाड़ी",
      "ट्रांसपोर्ट",
      "mandi delivery",
    ].some((k) => lower.includes(k));
    if (isTransport) {
      setComingSoon(true);
      return;
    }

    // 2. Driver check
    const isDriverKeyword = [
      "driver",
      "chalak",
      "चालक",
      "ड्राइवर",
      "operator",
    ].some((k) => lower.includes(k));
    if (isDriverKeyword) {
      navigate(
        `/Labour?category=Tractor%20Driver&search=${encodeURIComponent(query)}`
      );
      return;
    }

    // 3. Labour / Worker check
    const isLabourKeyword = [
      "worker",
      "labour",
      "labor",
      "lebar",
      "majdoor",
      "mazdoor",
      "मजदूर",
      "लेबर",
      "mechanic",
      "mistri",
      "mistry",
      "मिस्त्री",
      "मैकेनिक",
      "electrician",
      "bijli",
      "इलेक्ट्रीशियन",
      "बिजली",
      "plumber",
      "नल",
      "ट्यूबवेल",
      "welder",
      "helper",
      "sowing",
      "planting",
      "harvesting",
      "katai",
      "buwai",
      "weeding",
      "nindai",
      "gudai",
      "field work",
    ].some((k) => lower.includes(k));

    if (isLabourKeyword) {
      navigate(`/Labour?search=${encodeURIComponent(query)}`);
      return;
    }

    // 4. Match against defined machine / labour suggestions
    const matchedMachine = SEARCH_SUGGESTIONS.find(
      (s) =>
        s.type === "machine" &&
        (s.keywords.some((k) => lower.includes(k)) ||
          lower.includes(s.title.toLowerCase()))
    );

    if (matchedMachine) {
      navigate(
        `/machine?category=${encodeURIComponent(matchedMachine.category)}&search=${encodeURIComponent(query)}`
      );
      return;
    }

    const matchedLabour = SEARCH_SUGGESTIONS.find(
      (s) =>
        s.type === "labour" &&
        (s.keywords.some((k) => lower.includes(k)) ||
          lower.includes(s.title.toLowerCase()))
    );

    if (matchedLabour) {
      navigate(
        `/Labour?category=${encodeURIComponent(matchedLabour.category)}&search=${encodeURIComponent(query)}`
      );
      return;
    }

    // Default: Search in machine marketplace
    navigate(`/machine?search=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleExecuteSearch(searchQuery);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredSuggestions.length
      ) {
        const selected = filteredSuggestions[highlightedIndex];
        setSearchQuery(selected.title);
        handleExecuteSearch(selected.title, selected);
      } else {
        handleExecuteSearch(searchQuery);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  /* ==========================================================
     LANGUAGE SCREEN
  ========================================================== */

  if (!language) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#12351d] px-5 py-10">

        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=2000&q=90')",
          }}
        />

        <div className="absolute inset-0 bg-[#07160b]/75" />

        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-green-400/20 blur-[130px]" />

        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-orange-400/15 blur-[130px]" />

        {/* Language Card */}
        <div className="relative z-10 w-full max-w-[500px]">

          <div className="mb-7 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[25px] bg-green-500 shadow-2xl shadow-green-950/50">

              <Tractor className="h-10 w-10 text-white" />

            </div>

            <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">
              Work<span className="text-green-400">Shetu</span>
            </h1>

            <p className="mt-2 text-sm text-white/55">
              Kisan ke saath • Farming ke liye
            </p>

          </div>

          <div className="rounded-[32px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-7">

            <div className="mb-6 text-center">

              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Globe2 className="h-6 w-6 text-green-300" />
              </div>

              <h2 className="text-2xl font-black text-white">
                अपनी भाषा चुनें
              </h2>

              <p className="mt-2 text-sm text-white/50">
                Choose your preferred language
              </p>

            </div>

            <div className="space-y-3">

              {Object.entries(languages).map(([key, lang]) => (

                <button
                  key={key}
                  onClick={() => selectLanguage(key)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-green-400/40 hover:bg-green-500/10"
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-green-300">
                      {key === "hi" ? "अ" : key === "en" ? "A" : "Hi"}
                    </div>

                    <div>

                      <p className="font-bold text-white">
                        {lang.name}
                      </p>

                      <p className="mt-0.5 text-xs text-white/40">
                        {lang.welcome}
                      </p>

                    </div>

                  </div>

                  <ArrowRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-green-300" />

                </button>

              ))}

            </div>

            <p className="mt-6 text-center text-[11px] leading-5 text-white/35">
              You can change your language anytime from the top menu.
            </p>

          </div>

        </div>

      </div>
    );
  }

  /* ==========================================================
     MAIN WEBSITE
  ========================================================== */

  const services = [
    {
      icon: Tractor,
      title: t.machines,
      subtitle: t.machinesSub,
      description: t.machinesDesc,
      color: "green",
      link: "/machine",
    },
    {
      icon: Users,
      title: t.workers,
      subtitle: t.workersSub,
      description: t.workersDesc,
      color: "orange",
      link: "/Labour",
    },
    {
      icon: Truck,
      title: t.transport,
      subtitle: t.transportSub,
      description: t.transportDesc,
      color: "blue",
      comingSoon: true,
    },
  ];

  const steps = [
    {
      number: "01",
      icon: Search,
      title: t.step1,
      text: t.step1Text,
    },
    {
      number: "02",
      icon: MapPin,
      title: t.step2,
      text: t.step2Text,
    },
    {
      number: "03",
      icon: Phone,
      title: t.step3,
      text: t.step3Text,
    },
  ];

  const featureData = [
    {
      icon: ShieldCheck,
      title: t.verified,
      text: "Trusted profiles",
    },
    {
      icon: MapPin,
      title: t.nearby,
      text: "Find services nearby",
    },
    {
      icon: Phone,
      title: t.direct,
      text: "Connect directly",
    },
    {
      icon: Clock3,
      title: t.support,
      text: "Always available",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f5ed] text-[#18321f]">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        id="home"
        className="relative min-h-[720px] overflow-hidden lg:min-h-[760px]"
      >

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/bacgroundHero.png')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#07160b]/95 via-[#102716]/70 to-[#102716]/25" />

        <div className="absolute -left-48 top-32 h-[500px] w-[500px] rounded-full bg-green-400/15 blur-[130px]" />

        {/* =================================================
            NAVBAR
        ================================================== */}

        <header className="relative z-50 mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">

          <nav className="flex h-[82px] items-center justify-between">

            <a href="/" className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500 shadow-lg shadow-green-950/30">
                <Tractor className="h-6 w-6 text-white" />
              </div>

              <div>
                <div className="text-xl font-black text-white sm:text-2xl">
                  Work<span className="text-green-400">Shetu</span>
                </div>

                <p className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-white/45 sm:block">
                  {t.footer}
                </p>
              </div>

            </a>

            {/* Desktop menu */}
            <div className="hidden items-center gap-8 md:flex">

              <a
                href="#home"
                className="text-sm font-bold text-white"
              >
                Home
              </a>

              <button
                type="button"
                onClick={handleFindServices}
                className="text-sm font-medium text-white/60 transition hover:text-white"
              >
                {t.services}
              </button>

              <a
                href="#how"
                className="text-sm font-medium text-white/60 transition hover:text-white"
              >
                {t.how}
              </a>

              <a
                href="#about"
                className="text-sm font-medium text-white/60 transition hover:text-white"
              >
                About
              </a>

            </div>

            <div className="flex items-center gap-2">

              {/* Language switcher */}
              <div className="relative">

                <button
                  onClick={() => setLanguageOpen(!languageOpen)}
                  className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-xl transition hover:bg-white/15"
                >
                  <Globe2 className="h-4 w-4 text-green-300" />
                  {t.short}
                </button>

                {languageOpen && (
                  <div className="absolute right-0 top-12 w-40 rounded-2xl border border-white/10 bg-[#102216]/95 p-2 shadow-2xl backdrop-blur-xl">

                    {Object.entries(languages).map(([key, lang]) => (

                      <button
                        key={key}
                        onClick={() => selectLanguage(key)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          language === key
                            ? "bg-green-500 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {lang.name}

                        {language === key && (
                          <Check className="h-4 w-4" />
                        )}

                      </button>

                    ))}

                  </div>
                )}

              </div>

              {/* Authentication */}
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    to={dashboardPath}
                    className="max-w-32 truncate rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/15"
                  >
                    {user?.fullName || "Account"}
                  </Link>

                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#18321f] shadow-lg transition hover:bg-green-50"
                  >
                    {dashboardLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500/20"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#18321f] shadow-lg transition hover:bg-green-50 md:flex"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

                            {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-xl transition hover:bg-white/20"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Mobile menu */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-xl md:hidden"
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

            </div>

          </nav>

          {/* Mobile nav */}
          {menuOpen && (
            <div className="absolute left-5 right-5 top-[72px] rounded-2xl border border-white/10 bg-[#102216]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden">

              <div className="flex flex-col">

                <a
                  href="#home"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Home
                </a>

                <button
                  type="button"
                  onClick={() => {
                    handleFindServices();
                    setMenuOpen(false);
                  }}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  {t.services}
                </button>

                <a
                  href="#how"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  {t.how}
                </a>

                <a
                  href="#about"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  About
                </a>

                {isAuthenticated ? (
                  <>
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenuOpen(false)}
                      className="mt-2 rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-bold text-white"
                    >
                      {dashboardLabel}
                    </Link>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await logout();
                        } finally {
                          setMenuOpen(false);
                        }
                      }}
                      className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-100"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 rounded-xl bg-green-500 px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Sign In
                  </Link>
                )}

              </div>

            </div>
          )}

        </header>

        {/* =================================================
            HERO CONTENT
        ================================================== */}

        <div className="relative z-10 mx-auto flex min-h-[638px] max-w-[1400px] items-center px-5 pb-24 pt-12 sm:px-8 lg:px-12 lg:pt-0">

          <div className="max-w-[760px]">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-green-100 shadow-xl backdrop-blur-xl sm:text-sm">

              <Wheat className="h-4 w-4 text-green-300" />

              {t.badge}

            </div>

            {/* Heading */}
            <h1 className="text-[3.5rem] font-black leading-[0.92] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.8rem] xl:text-[6.3rem]">

              {t.heroSmall}

              <br />

              <span className="text-green-400">
                {t.heroTitle}
              </span>

            </h1>

            {/* Text */}
            <p className="mt-7 max-w-[650px] text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              {t.heroText}
            </p>

              {/* Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {/* 1. ADMIN USER */}
              {isAuthenticated && isAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl bg-green-500 px-5 py-3.5 font-bold text-white shadow-2xl shadow-green-950/40 transition duration-300 hover:-translate-y-1 hover:bg-green-400 sm:min-w-[260px]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      Admin Dashboard
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>

                  <Link
                    to="/machine"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:min-w-[240px]"
                  >
                    <span className="flex items-center gap-3">
                      <Tractor className="h-5 w-5 text-green-300" />
                      {t.find}
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>
                </>
              ) : isAuthenticated && isLabour ? (
                <>
                  <Link
                    to="/labour/dashboard"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl bg-green-500 px-5 py-3.5 font-bold text-white shadow-2xl shadow-green-950/40 transition duration-300 hover:-translate-y-1 hover:bg-green-400 sm:min-w-[260px]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                        <Users className="h-5 w-5" />
                      </span>
                      Labour Dashboard
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>

                  <Link
                    to="/machine"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:min-w-[240px]"
                  >
                    <span className="flex items-center gap-3">
                      <Tractor className="h-5 w-5 text-green-300" />
                      {t.find}
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>
                </>
              ) : isAuthenticated && isDriver ? (
                /* 2. DRIVER USER */
                isEligibleDriver ? (
                  <>
                    <Link
                      to="/Drivers"
                      className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl bg-green-500 px-5 py-3.5 font-bold text-white shadow-2xl shadow-green-950/40 transition duration-300 hover:-translate-y-1 hover:bg-green-400 sm:min-w-[250px]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                          <UserRound className="h-5 w-5" />
                        </span>
                        Driver Dashboard
                      </span>
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/machine"
                      className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:min-w-[240px]"
                    >
                      <span className="flex items-center gap-3">
                        <Tractor className="h-5 w-5 text-green-300" />
                        {t.find}
                      </span>
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/work"
                      className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl bg-green-500 px-6 py-3.5 font-bold text-white shadow-2xl shadow-green-950/40 transition duration-300 hover:-translate-y-1 hover:bg-green-400 sm:min-w-[200px]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                          <Briefcase className="h-5 w-5" />
                        </span>
                        Work
                      </span>
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </Link>

                    <Link
                      to="/machine"
                      className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:min-w-[200px]"
                    >
                      <span className="flex items-center gap-3">
                        <Tractor className="h-5 w-5 text-green-300" />
                        {t.find}
                      </span>
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </Link>
                  </>
                )
              ) : isAuthenticated ? (
                /* 3. FARMER / NORMAL AUTHENTICATED USER */
                <>
                  <Link
                    to="/work"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl bg-green-500 px-6 py-3.5 font-bold text-white shadow-2xl shadow-green-950/40 transition duration-300 hover:-translate-y-1 hover:bg-green-400 sm:min-w-[200px]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                        <Briefcase className="h-5 w-5" />
                      </span>
                      Work
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>

                  <Link
                    to="/machine"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:min-w-[200px]"
                  >
                    <span className="flex items-center gap-3">
                      <Tractor className="h-5 w-5 text-green-300" />
                      {t.find}
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>
                </>
              ) : (
                /* 4. GUEST / UNAUTHENTICATED */
                <>
                  <Link
                    to="/work"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl bg-green-500 px-6 py-3.5 font-bold text-white shadow-2xl shadow-green-950/40 transition duration-300 hover:-translate-y-1 hover:bg-green-400 sm:min-w-[200px]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                        <Briefcase className="h-5 w-5" />
                      </span>
                      Work
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>

                  <Link
                    to="/machine"
                    className="group flex min-h-[58px] items-center justify-between gap-7 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15 sm:min-w-[200px]"
                  >
                    <span className="flex items-center gap-3">
                      <Tractor className="h-5 w-5 text-green-300" />
                      {t.find}
                    </span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>
                </>
              )}
            </div>

            {/* Trust */}
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/60">

              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-300" />
                {t.verified}
              </span>

              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-300" />
                {t.nearby}
              </span>

              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-300" />
                {t.direct}
              </span>

            </div>

          </div>

        </div>

        {/* Hero Stats */}
        <div className="absolute bottom-0 left-0 right-0 hidden border-t border-white/10 bg-black/20 backdrop-blur-xl lg:block">

          <div className="mx-auto grid max-w-[1400px] grid-cols-4">

            {[
              ["500+", "Workers"],
              ["100+", "Machines"],
              ["12+", "Districts"],
              ["24/7", "Support"],
            ].map(([number, label], index) => (

              <div
                key={label}
                className={`px-10 py-4 ${
                  index !== 3 ? "border-r border-white/10" : ""
                }`}
              >

                <p className="text-xl font-black text-white">
                  {number}
                </p>

                <p className="mt-1 text-xs text-white/45">
                  {label}
                </p>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <section className="relative z-20 px-5 py-7 sm:px-8 lg:-mt-8 lg:px-12">

        <div className="mx-auto max-w-[1050px] rounded-[25px] border border-gray-200 bg-white p-5 shadow-[0_20px_70px_rgba(24,61,34,0.12)]">

          <div className="grid gap-3 lg:grid-cols-[1.1fr_1.5fr_auto]">

            {/* 1. Location Section - Automatic GPS with Retry */}
            <button
              type="button"
              onClick={handleLocationClick}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#f3f6ef] px-4 py-3.5 text-left transition hover:bg-[#e7eee1] focus:outline-none focus:ring-2 focus:ring-green-600/40"
              title="Click to refresh current GPS location"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                {locationStatus === "requesting_location" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-green-700" />
                ) : locationStatus === "permission_denied" ? (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                ) : (
                  <MapPin className="h-4 w-4 text-green-700" />
                )}
                {locationStatus === "location_ready" && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600"></span>
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Location (GPS)
                  </p>
                  <span className="text-[10px] font-semibold text-green-700 hover:underline">
                    {locationStatus === "requesting_location"
                      ? "Detecting..."
                      : locationStatus === "permission_denied"
                      ? "Retry GPS"
                      : "Refresh"}
                  </span>
                </div>

                <p className="truncate text-sm font-bold text-[#18321f]">
                  {locationDisplayTitle}
                </p>
              </div>
            </button>

            {/* 2. What Do You Need? - Functional Search Input & Autocomplete */}
            <div ref={searchContainerRef} className="relative">
              <div className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-[#f3f6ef] px-4 py-2 transition focus-within:bg-[#ebf2e4] focus-within:ring-2 focus-within:ring-green-600/40">
                <Search className="h-5 w-5 shrink-0 text-green-700" />

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="homepage-hero-search-input"
                    className="block text-[10px] font-bold uppercase tracking-wider text-gray-400"
                  >
                    {t.searchTitle}
                  </label>

                  <input
                    id="homepage-hero-search-input"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      setHighlightedIndex(-1);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      t.searchPlaceholder ||
                      "What do you need? Machine, Worker or Driver"
                    }
                    autoComplete="off"
                    className="w-full bg-transparent text-sm font-bold text-[#18321f] placeholder:text-gray-400 focus:outline-none"
                  />
                </div>

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setHighlightedIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    title="Clear"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {searchQuery.trim() ? "Matching Services" : "Popular Searches"}
                  </div>

                  {filteredSuggestions.map((item, index) => {
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          setSearchQuery(item.title);
                          handleExecuteSearch(item.title, item);
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition ${
                          isHighlighted
                            ? "bg-green-50 text-green-950"
                            : "hover:bg-gray-50 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.type === "machine" ? (
                            <Tractor className="h-4 w-4 shrink-0 text-green-700" />
                          ) : item.type === "transport" ? (
                            <Truck className="h-4 w-4 shrink-0 text-purple-700" />
                          ) : item.type === "driver" ? (
                            <Tractor className="h-4 w-4 shrink-0 text-amber-700" />
                          ) : (
                            <Users className="h-4 w-4 shrink-0 text-blue-700" />
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {item.title}
                            </p>
                            {item.hindi && (
                              <p className="truncate text-xs text-gray-500">
                                {item.hindi}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            item.type === "machine"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.type === "driver"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : item.type === "transport"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {item.type === "machine"
                            ? "Machine"
                            : item.type === "driver"
                            ? "Driver"
                            : item.type === "transport"
                            ? "Transport"
                            : "Labour"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Search Button */}
            <button
              type="button"
              onClick={() => handleExecuteSearch(searchQuery)}
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#183d22] px-7 font-bold text-white shadow-md transition hover:bg-green-700 active:scale-[0.99]"
            >
              <span>{t.search}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          SERVICES
      ====================================================== */}

      <section
        id="services"
        className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >

        <div className="mx-auto max-w-[1250px]">
          <PromotionsBanner service="All" title="🌾 Exclusive Platform Offers & Seasonal Discounts" />

          <div className="mx-auto mb-12 max-w-2xl text-center">

            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
              <Leaf className="h-4 w-4" />
              {t.services}
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#18321f] sm:text-4xl lg:text-5xl">
              {t.servicesTitle}
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">
              {t.servicesText}
            </p>

          </div>

          {comingSoon && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
    <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
      
      <button
        onClick={() => setComingSoon(false)}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
        <Truck className="h-8 w-8 text-blue-600" />
      </div>

      <h2 className="mt-5 text-2xl font-black text-[#18321f]">
        Coming Soon 🚚
      </h2>

      <p className="mt-3 text-sm leading-6 text-gray-500">
        Transport service जल्द ही WorkShetu पर available होगी।
      </p>

      <button
        onClick={() => setComingSoon(false)}
        className="mt-6 rounded-xl bg-[#183d22] px-6 py-3 text-sm font-bold text-white hover:bg-green-700"
      >
        Okay
      </button>

    </div>
  </div>
)}


          <div className="grid gap-5 md:grid-cols-3">

            {services.map((service) => {

              const Icon = service.icon;

              const styles = {
                green: {
                  icon: "bg-green-100 text-green-700",
                  button: "bg-green-700 hover:bg-green-800",
                },
                orange: {
                  icon: "bg-orange-100 text-orange-700",
                  button: "bg-orange-600 hover:bg-orange-700",
                },
                blue: {
                  icon: "bg-blue-100 text-blue-700",
                  button: "bg-blue-700 hover:bg-blue-800",
                },
              };

              const style = styles[service.color];

              return (
                <div
                  key={service.title}
                  className="group rounded-[28px] border border-gray-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                >

                  <div className="flex items-start justify-between">

                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style.icon}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-500" />

                  </div>

                  <p className="mt-6 text-xs font-bold uppercase tracking-wider text-gray-400">
                    {service.subtitle}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-[#18321f]">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {service.description}
                  </p>

                  {service.comingSoon ? (
                    <button
                      type="button"
                      onClick={() => setComingSoon(true)}
                      className={`mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition ${style.button}`}
                    >
                      {t.view}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      to={service.link}
                      className={`mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition ${style.button}`}
                    >
                      {t.view}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}

                </div>
              );
            })}

          </div>

        </div>

      </section>

      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        id="how"
        className="bg-[#183d22] px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28"
      >

        <div className="mx-auto max-w-[1250px]">

          <span className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
            {t.how}
          </span>

          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            {t.howTitle}
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">

            {steps.map((step) => {

              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="relative rounded-[26px] border border-white/10 bg-white/[0.06] p-7"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-400/10">
                      <Icon className="h-6 w-6 text-green-300" />
                    </div>

                    <span className="text-5xl font-black text-white/10">
                      {step.number}
                    </span>

                  </div>

                  <h3 className="mt-6 text-lg font-bold">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {step.text}
                  </p>

                </div>
              );
            })}

          </div>

        </div>

      </section>

      {/* =====================================================
          ABOUT
      ====================================================== */}

      <section
        id="about"
        className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >

        <div className="mx-auto grid max-w-[1250px] gap-12 lg:grid-cols-2 lg:items-center">

          {/* Image */}
          <div className="relative">

            <div className="overflow-hidden rounded-[32px]">

              <img
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=85"
                alt="Farmer working in field"
                className="h-[420px] w-full object-cover"
              />

            </div>

            <div className="absolute bottom-5 right-5 rounded-2xl bg-white p-4 shadow-xl sm:right-8">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <Wheat className="h-5 w-5 text-green-700" />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Built for
                  </p>

                  <p className="text-sm font-black text-[#18321f]">
                    Indian Farmers
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* Content */}
          <div>

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
              {t.aboutTag}
            </span>

            <h2 className="mt-3 text-3xl font-black leading-tight text-[#18321f] sm:text-4xl lg:text-5xl">
              {t.aboutTitle}
            </h2>

            <p className="mt-5 text-base leading-7 text-gray-500">
              {t.aboutText}
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">

              {featureData.map((item) => {

                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >

                    <Icon className="h-6 w-6 text-green-700" />

                    <h3 className="mt-3 text-sm font-bold text-[#18321f]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs text-gray-400">
                      {item.text}
                    </p>

                  </div>
                );
              })}

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          CTA
      ====================================================== */}

      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">

        <div className="relative mx-auto max-w-[1100px] overflow-hidden rounded-[32px] bg-[#183d22] px-7 py-12 text-center text-white sm:px-12 sm:py-16">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-green-400/15 blur-3xl" />

          <div className="relative">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-400/15">
              <Tractor className="h-7 w-7 text-green-300" />
            </div>

            <h2 className="mt-6 text-3xl font-black sm:text-4xl">
              {t.ctaTitle}
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
              {t.ctaText}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

              

              <a
                href="tel:+911234567890"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-7 py-3.5 text-sm font-bold transition hover:bg-white/15"
              >
                <Phone className="h-5 w-5" />
                {t.call}
              </a>

              <a
                href="https://wa.me/911234567890"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-7 py-3.5 text-sm font-bold transition hover:bg-white/15"
              >
                <MessageCircle className="h-5 w-5" />
                {t.whatsapp}
              </a>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default App;
