import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const rawApiUrl = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://workshetu.onrender.com" : "")
)
  .trim()
  .replace(/\/+$/, "");

const serverOrigin = rawApiUrl.replace(/\/api$/, "");
const apiBaseUrl = serverOrigin ? `${serverOrigin}/api` : "/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspaceState] = useState(() => {
    try {
      return localStorage.getItem("workshetu_active_workspace") || null;
    } catch {
      return null;
    }
  });

  const switchWorkspace = useCallback((workspace) => {
    setActiveWorkspaceState(workspace);
    try {
      if (workspace) {
        localStorage.setItem("workshetu_active_workspace", workspace);
      } else {
        localStorage.removeItem("workshetu_active_workspace");
      }
    } catch {}
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");

      if (response.data?.authenticated && response.data?.user) {
        const token = response.data?.token || response.data?.sessionId;
        if (token) {
          try {
            localStorage.setItem("workshetu_session_token", token);
          } catch {}
        }
        setUser(response.data.user);
        return response.data.user;
      }

      try {
        localStorage.removeItem("workshetu_session_token");
      } catch {}
      setUser(null);
      return null;
    } catch (error) {
      console.error("Failed to restore authentication:", error);
      try {
        localStorage.removeItem("workshetu_session_token");
      } catch {}
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login
  const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);

    if (!response.data?.user) {
      throw new Error("Login response did not contain user data.");
    }

    const token = response.data?.token || response.data?.sessionId;
    if (token) {
      try {
        localStorage.setItem("workshetu_session_token", token);
      } catch {}
    }

    setUser(response.data.user);

    return response.data.user;
  };

  // IMPORTANT:
  // Registration backend already calls req.login(),
  // so this function immediately updates frontend auth state.
  const register = async (formData) => {
    const response = await api.post("/auth/register", formData, {
      headers: formData instanceof FormData ? undefined : { "Content-Type": "application/json" },
    });

    if (!response.data?.user) {
      throw new Error("Registration response did not contain user data.");
    }

    const token = response.data?.token || response.data?.sessionId;
    if (token) {
      try {
        localStorage.setItem("workshetu_session_token", token);
      } catch {}
    }

    setUser(response.data.user);

    return response.data.user;
  };

  // Logout
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      try {
        localStorage.removeItem("workshetu_session_token");
      } catch {}
      // Immediately update frontend even if server request fails.
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        activeWorkspace,
        switchWorkspace,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
      activeWorkspace: null,
      switchWorkspace: () => {},
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      refreshUser: async () => null,
    };
  }

  return context;
}

export { api };