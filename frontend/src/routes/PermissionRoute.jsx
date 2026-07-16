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
 * @param {string[]} [props.alternatePermissions] - Additional permission keys (OR)
 * @param {string} [props.module] - Module flag name (legacy, optional)
 * @param {string[]} [props.fallbackRoles] - Legacy role fallback
 * @param {boolean} [props.requiresDepartmentHead] - HoD-only routes (not managers with review permission)
 */
const PermissionRoute = ({ children, permission, alternatePermissions, fallbackRoles, requiresDepartmentHead }) => {
  const {
    user,
    isAuthenticated,
    loading,
    authzLoading,
    canPermission,
    checkPermission,
    authzEffective,
  } = useAuth();

  if (loading) {
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
      alternatePermissions: alternatePermissions || [],
      fallbackRoles,
      requiresDepartmentHead,
    });

    if (!allowed) {
      // Wait only on first authz resolution when no legacy fallback applies
      if (authzLoading && !authzEffective) {
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
      return <Navigate to="/unauthorized" replace />;
    }
  } else if (fallbackRoles?.length && !checkPermission(fallbackRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PermissionRoute;
