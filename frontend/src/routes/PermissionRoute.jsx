import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasPermissionAccess } from "../utils/authzAccess";

/**
 * Permission-based route guard (Authorization V2).
 * Uses effective permissions (role + direct grants) when loaded.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.permission - Required permission key
 * @param {string} [props.module] - Module flag name (legacy, optional)
 * @param {string[]} [props.fallbackRoles] - Legacy role fallback
 */
const PermissionRoute = ({ children, permission, fallbackRoles }) => {
  const {
    user,
    isAuthenticated,
    loading,
    authzLoading,
    canPermission,
    checkPermission,
    authzEffective,
  } = useAuth();

  if (loading || authzLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "40vh" }}
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

  if (permission) {
    const allowed = hasPermissionAccess({
      user,
      canPermission,
      checkPermission,
      authzEffective,
      authzLoading,
      permission,
      fallbackRoles,
    });

    if (!allowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  } else if (fallbackRoles?.length && !checkPermission(fallbackRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PermissionRoute;
