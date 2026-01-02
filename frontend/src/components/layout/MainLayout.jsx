import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import GrowthSummitFloatingButton from "../common/GrowthSummitFloatingButton";
import { useState, useEffect } from "react";

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);
  const [showFloatingToggle, setShowFloatingToggle] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 991;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true); // Collapse on mobile/tablet by default
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show floating toggle when scrolled down more than 100px
      setShowFloatingToggle(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <div className="d-flex flex-grow-1">
        <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
        <div
          className="flex-grow-1 d-flex flex-column"
          style={{ 
            marginLeft: isMobile ? "0" : (sidebarCollapsed ? "70px" : "250px"),
            transition: "margin-left 0.3s ease",
            minWidth: 0,
            flex: 1
          }}
        >
          <Navbar toggleSidebar={toggleSidebar} />
          <main className="p-2 p-sm-3 p-md-4 flex-grow-1">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer sidebarCollapsed={sidebarCollapsed} isMobile={isMobile} />
      
      {/* Growth Summit 2026 Floating Button */}
      <GrowthSummitFloatingButton />
      
      {/* Floating Sidebar Toggle Button - Shows on scroll for both mobile and desktop */}
      {showFloatingToggle && (
        <button
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            bottom: '30px',
            left: isMobile ? '20px' : (sidebarCollapsed ? '20px' : '270px'),
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
            border: '2px solid rgba(255,255,255,0.3)',
            color: 'white',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)',
            zIndex: 1050,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(79, 70, 229, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(79, 70, 229, 0.4)';
          }}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (isMobile ? '☰' : '→') : '←'}
        </button>
      )}
    </div>
  );
};

export default MainLayout;
