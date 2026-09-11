import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { RouteLoadingFallback } from "../components/RouteWrapper";
import AuthLayout from "../components/layout/AuthLayout";
import ProtectedRoute from "./ProtectedRoute";

// Auth pages — eager for first paint on /login
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

const PWAShell = lazy(() => import("../pages/app/PWAShell"));
const MobileAppShell = lazy(() => import("../pages/mobileapp/MobileAppShell"));
const GrowthSummitFinal = lazy(() => import("../pages/GrowthSummitFinal"));
const AuthenticatedRoutes = lazy(() => import("./authenticatedRoutes"));

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Public landing */}
      <Route
        path="/growth-summit-2026"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <GrowthSummitFinal />
          </Suspense>
        }
      />

      {/* PWA Mobile App Route - outside MainLayout */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <PWAShell />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Work Mobile App Route - outside MainLayout, handles its own auth */}
      <Route
        path="/mobileapp"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <MobileAppShell />
          </Suspense>
        }
      />

      {/* Registration - accessible from inside app by admins */}
      <Route path="/register" element={<Register />} />

      {/* Authenticated app — lazy chunk; not downloaded on /login */}
      <Route
        path="*"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <AuthenticatedRoutes />
          </Suspense>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
