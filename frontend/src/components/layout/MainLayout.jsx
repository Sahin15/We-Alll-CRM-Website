import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import RoleAwareBottomNav from "./RoleAwareBottomNav";
import { useState, useEffect } from "react";
import { useBreakpoint } from "../../context/BreakpointContext";
import "./RoleAwareBottomNav.css";

const MainLayout = () => {
  const { isAppMobile } = useBreakpoint();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(!isAppMobile ? false : true);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);

  useEffect(() => {
    if (isAppMobile) {
      setSidebarCollapsed(true);
    }
  }, [isAppMobile]);

  useEffect(() => {
    if (isAppMobile) {
      setSidebarCollapsed(true);
    }
  }, [location.pathname, isAppMobile]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingToggle(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const openSidebarFromMore = () => {
    setSidebarCollapsed(false);
  };

  const showFloatingFab = showFloatingToggle && !isAppMobile;

  return (
    <div
      className="d-flex flex-column main-layout-root"
      style={{ minHeight: "100dvh", overflowX: "hidden" }}
    >
      <div className="d-flex flex-grow-1">
        <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
        <div
          className="flex-grow-1 d-flex flex-column"
          style={{
            marginLeft: isAppMobile ? "0" : sidebarCollapsed ? "70px" : "250px",
            transition: "margin-left 0.3s ease",
            minWidth: 0,
            flex: 1,
          }}
        >
          <Navbar toggleSidebar={toggleSidebar} />
          <main className="p-2 p-sm-3 p-md-4 flex-grow-1 main-layout-content">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isAppMobile}
        className={isAppMobile ? "footer--shell-mobile" : ""}
      />
      <RoleAwareBottomNav onMore={openSidebarFromMore} />

      {showFloatingFab && (
        <button
          onClick={toggleSidebar}
          className="touch-target"
          style={{
            position: "fixed",
            bottom: isAppMobile
              ? "calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 12px)"
              : "30px",
            left: isAppMobile ? "20px" : sidebarCollapsed ? "20px" : "270px",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)",
            border: "2px solid rgba(255,255,255,0.3)",
            color: "white",
            fontSize: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(79, 70, 229, 0.4)",
            zIndex: 1050,
            transition: "all 0.3s ease",
          }}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (isAppMobile ? "☰" : "→") : "←"}
        </button>
      )}
    </div>
  );
};

export default MainLayout;
