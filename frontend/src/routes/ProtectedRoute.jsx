import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "react-bootstrap";
import { BRAND_LOGO_FULL, BRAND_NAME } from "../constants/branding";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ 
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}
      >
        <div className="text-center">
          {/* Logo */}
          <img loading="lazy" src={BRAND_LOGO_FULL}
            alt={BRAND_NAME}
            style={{ 
              width: "200px", 
              marginBottom: "2rem",
              filter: "brightness(0) invert(1)" // Make logo white
            }}
          />
          
          {/* Spinner */}
          <Spinner 
            animation="border" 
            variant="light"
            style={{ 
              width: "3rem", 
              height: "3rem",
              borderWidth: "0.3rem"
            }}
          />
          
          {/* Loading text */}
          <p className="text-white mt-3 mb-0" style={{ fontSize: "1.1rem" }}>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass the current path as `from` so Login can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;

