import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// Configure production API base URL if provided in environment or production mode
const rawApiUrl = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? "https://workshetu.onrender.com" : "")
)
    .trim()
    .replace(/\/+$/, "");

const serverOrigin = rawApiUrl.replace(/\/api$/, "");
if (serverOrigin) {
    axios.defaults.baseURL = serverOrigin;
}
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
    config.withCredentials = true;
    try {
        const token = localStorage.getItem("workshetu_session_token");
        if (token) {
            config.headers = config.headers || {};
            config.headers["X-Session-ID"] = token;
            config.headers["Authorization"] = `Bearer ${token}`;
        }
    } catch {}
    return config;
});

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