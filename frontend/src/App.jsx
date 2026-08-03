import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { CompanyProvider } from "./context/CompanyContext";
import { NotificationProvider } from "./context/NotificationContext";
import AppRoutes from "./routes";
import SkipToMain from "./components/common/SkipToMain";
import NotificationInitializer from "./components/common/NotificationInitializer";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { initializeIndexedDBCleanup } from "./utils/indexedDBCleanup";
import "./styles/toast.css";
import "./styles/accessibility.css";

function AppContent() {
  const { theme } = useTheme();

  useEffect(() => {
    initializeIndexedDBCleanup();
  }, []);

  return (
    <>
      <NotificationInitializer />
      <SkipToMain />
      <div className="app-container">
        <main id="main-content" role="main" tabIndex="-1">
          <AppRoutes />
        </main>
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
          theme={theme === "dark" ? "dark" : "light"}
          limit={3}
          role="alert"
          aria-live="polite"
        />
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <CompanyProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
