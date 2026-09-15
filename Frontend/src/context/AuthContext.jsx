import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");

      if (response.data?.authenticated && response.data?.user) {
        setUser(response.data.user);
        return response.data.user;
      }

      setUser(null);
      return null;
    } catch (error) {
      console.error("Failed to restore authentication:", error);
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

    setUser(response.data.user);

    return response.data.user;
  };

  // IMPORTANT:
  // Registration backend already calls req.login(),
  // so this function immediately updates frontend auth state.
  const register = async (formData) => {
    const response = await api.post("/auth/register", formData);

    if (!response.data?.user) {
      throw new Error("Registration response did not contain user data.");
    }

    setUser(response.data.user);

    return response.data.user;
  };

  // Logout
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
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
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export { api };