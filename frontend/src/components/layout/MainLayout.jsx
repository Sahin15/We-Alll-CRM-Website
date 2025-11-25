import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useState, useEffect } from "react";

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-grow-1">
        <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
        <div
          className={`flex-grow-1 d-flex flex-column ${
            isMobile ? "" : sidebarCollapsed ? "ms-70" : "ms-250"
          }`}
          style={{ width: isMobile ? "100%" : "auto" }}
        >
          <Navbar toggleSidebar={toggleSidebar} />
          <main className="p-2 p-sm-3 p-md-4 flex-grow-1">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MainLayout;
