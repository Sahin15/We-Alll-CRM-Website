import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Debug logging
  console.log("RoleBasedRoute Debug:", {
    allowedRoles,
    userRole: user?.role,
    hasAllowedRoles: !!allowedRoles,
    isIncluded: allowedRoles ? allowedRoles.includes(user?.role) : "N/A"
  });

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    console.warn("Access denied - user role not in allowed roles", {
      userRole: user?.role,
      allowedRoles
    });
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleBasedRoute;
