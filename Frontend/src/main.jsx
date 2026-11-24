import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// Configure production API base URL if provided in environment
const apiBase = import.meta.env.VITE_API_URL;
if (apiBase) {
    axios.defaults.baseURL = apiBase.replace(/\/+$/, "");
}
axios.defaults.withCredentials = true;

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LocationProvider } from "./context/LocationContext.jsx";

import "leaflet/dist/leaflet.css";
import "./index.css";
import "./i18n/i18n.js";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <AuthProvider>
            <ThemeProvider>
                <LocationProvider>
                    <App />
                </LocationProvider>
            </ThemeProvider>
        </AuthProvider>
    </StrictMode>
);