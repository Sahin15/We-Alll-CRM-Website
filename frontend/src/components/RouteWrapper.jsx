import { Suspense } from "react";

// Loading Fallback Component
export const RouteLoadingFallback = () => (
  <div
    className="d-flex justify-content-center align-items-center py-5"
    style={{ minHeight: "200px" }}
  >
    <div className="text-center">
      <div
        className="spinner-border text-primary mb-2"
        role="status"
        style={{ width: "2rem", height: "2rem" }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-muted small mb-0">Loading page...</p>
    </div>
  </div>
);

// Wrapper component for lazy-loaded routes
export const LazyRouteWrapper = ({ children }) => (
  <Suspense fallback={<RouteLoadingFallback />}>
    {children}
  </Suspense>
);
