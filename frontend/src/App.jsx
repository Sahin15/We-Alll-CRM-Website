import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";
import { NotificationProvider } from "./context/NotificationContext";
import AppRoutes from "./routes";
import SkipToMain from "./components/common/SkipToMain";
import RouteDocumentMeta from "./components/common/RouteDocumentMeta";
import NotificationInitializer from "./components/common/NotificationInitializer";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { initializeIndexedDBCleanup } from "./utils/indexedDBCleanup";
import "./styles/toast.css";
import "./styles/accessibility.css";

function App() {
  useEffect(() => {
    const runCleanup = () => initializeIndexedDBCleanup();
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(runCleanup, { timeout: 5000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timerId = setTimeout(runCleanup, 2000);
    return () => clearTimeout(timerId);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <CompanyProvider>
            <NotificationProvider>
              <NotificationInitializer />
              <SkipToMain />
              <RouteDocumentMeta />
              <div className="app-container">
                <AppRoutes />
                <ToastContainer
                  position="top-center"
                  autoClose={3000}
                  hideProgressBar={false}
                  newestOnTop={true}
                  closeOnClick={true}
                  rtl={false}
                  pauseOnFocusLoss={false}
                  draggable={true}
                  pauseOnHover={false}
                  theme="light"
                  limit={3}
                  role="alert"
                  aria-live="polite"
                />
              </div>
            </NotificationProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
