import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const userRole = String(user.role || "").trim().toLowerCase();
  const isUserAdmin = user.isAdmin === true || userRole === "admin";

  if (roles && !roles.some((role) => {
    const targetRole = String(role || "").trim().toLowerCase();
    if (targetRole === "admin") {
      return isUserAdmin;
    }
    if (targetRole === "driver") {
      if (isUserAdmin) return true;
      return userRole === "driver" && user.driverApplicationStatus === "Approved" && user.isActive !== false;
    }
    return userRole === targetRole;
  })) {
    return <Navigate to="/403" replace />;
  }
  return children;
}

export function FarmerBookingsRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Personal booking history is accessible to any authenticated account (including Admin)
  return children;
}

export function ChatRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const userRole = String(user.role || "").trim().toLowerCase();
  const isUserAdmin = user.isAdmin === true || userRole === "admin";
  if (isUserAdmin) {
    return <Navigate to="/admin/complaints" replace />;
  }

  return children;
}

export default ProtectedRoute;
