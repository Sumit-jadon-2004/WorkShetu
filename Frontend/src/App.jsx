import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import TractorList from "./Pages/Farmer/TractorList.jsx"
import MachineDetails from "./Pages/Farmer/MachineDetails.jsx";
import HeroSection from './Pages/Public/HeroSection.jsx';
import LabourSPage from './Pages/Labour/Labours.jsx';
import DriverDashboard from "./Pages/Driver/DriverDashboard.jsx";
import Login from "./Pages/Auth/Login.jsx";
import Registration from "./Pages/Auth/Registration.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Forbidden from "./Pages/Auth/Forbidden.jsx";
//languages//



function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("workshetu-theme") === "dark";
  });

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("workshetu-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <AuthProvider>
    <>
      <button
        type="button"
        onClick={() => setDarkMode((enabled) => !enabled)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xl transition hover:scale-105 dark:border-slate-700 dark:bg-slate-900 dark:text-yellow-300"
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <BrowserRouter>
        <Routes>
          <Route path={"/"} element={<HeroSection/>}/>
          <Route path={"/machine"} element={<TractorList/>}/>
          <Route path={"/machines/:id"} element={<MachineDetails/>}/>
          <Route path={"/Labour"} element={<LabourSPage/>}/>
          <Route path={"/Drivers"} element={<ProtectedRoute roles={["Driver", "Admin"]}><DriverDashboard/></ProtectedRoute>}/>
          <Route path={"/login"} element={<Login/>}/>
          <Route path={"/register"} element={<Registration/>}/>
          <Route path={"/403"} element={<Forbidden/>}/>
          <Route path={"/admin/dashboard"} element={<ProtectedRoute roles={["Admin"]}><Forbidden/></ProtectedRoute>}/>
        </Routes>
      </BrowserRouter>
    </>
    </AuthProvider>
  )
}

export default App
