import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAuthzV2ModuleEnabled } from "../utils/authzFlags";

/**
 * Permission-based route guard (Authorization V2).
 * When module flag is off, renders children (legacy ProtectedRoute handles auth).
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.permission - Required permission key
 * @param {string} [props.module] - Module flag name (e.g. profile, support)
 * @param {string[]} [props.fallbackRoles] - Legacy role fallback when V2 off
 */
const PermissionRoute = ({ children, permission, module = "profile", fallbackRoles }) => {
  const {
    user,
    isAuthenticated,
    loading,
    authzLoading,
    canPermission,
    checkPermission,
  } = useAuth();

  const v2Enabled = isAuthzV2ModuleEnabled(module);

  if (loading || (v2Enabled && authzLoading)) {
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

  if (v2Enabled && permission) {
    if (!canPermission(permission)) {
      return <Navigate to="/unauthorized" replace />;
    }
    return children;
  }

  if (fallbackRoles?.length && !checkPermission(fallbackRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PermissionRoute;
