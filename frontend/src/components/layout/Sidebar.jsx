import { useState, useEffect } from "react";
import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaBuilding,
  FaCalendarAlt,
  FaClock,
  FaUserTie,
  FaProjectDiagram,
  FaUser,
  FaMoneyBillWave,
  FaChevronDown,
  FaChevronRight,
  FaFileInvoiceDollar,
  FaBoxes,
  FaClipboardList,
  FaCreditCard,
  FaCheck,
  FaTasks,
  FaReceipt,
  FaBullhorn,
  FaChartBar,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const Sidebar = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 991);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Auto-close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (isMobile && !collapsed) {
      toggleSidebar();
    }
  };

  const menuItems = [
    {
      path: "/dashboard",
      icon: <FaTachometerAlt />,
      label: "Dashboard",
      roles: ["superadmin", "admin", "hr", "accounts", "employee", "client", "hod"],
    },
    {
      path: "/leads",
      icon: <FaUserTie />,
      label: "Leads",
      roles: ["admin", "superadmin", "accounts", "hr", "employee", "hod"],
    },
    {
      id: "billing",
      icon: <FaMoneyBillWave />,
      label: "Billing & Finance",
      roles: ["admin", "superadmin", "accounts"],
      isGroup: true,
      children: [
        {
          path: "/admin/billing",
          icon: <FaFileInvoiceDollar />,
          label: "Overview",
        },
        {
          path: "/admin/services",
          icon: <FaBoxes />,
          label: "Services",
        },
        {
          path: "/admin/plans",
          icon: <FaClipboardList />,
          label: "Plans",
        },
        {
          path: "/admin/subscriptions",
          icon: <FaReceipt />,
          label: "Subscriptions",
        },
        {
          path: "/admin/invoices",
          icon: <FaFileInvoiceDollar />,
          label: "Invoices",
        },
        {
          path: "/admin/payments",
          icon: <FaCreditCard />,
          label: "Payments",
        },
      ],
    },
    {
      id: "work-management",
      icon: <FaTasks />,
      label: "Work Management",
      roles: ["employee", "admin", "superadmin", "hr", "hod"],
      isGroup: true,
      children: [
        {
          path: "/employee/my-work",
          icon: <FaTasks />,
          label: "My Work Items",
          roles: ["employee", "admin", "superadmin", "hr", "hod"],
        },
        {
          path: "/work-calendar/my-calendar",
          icon: <FaCalendarAlt />,
          label: "My Work Calendar",
          roles: ["employee", "admin", "hr", "hod"],
        },
        {
          path: "/work-calendar/enhanced-admin-overview",
          icon: <FaChartBar />,
          label: "Work Dashboard",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      path: "/projects",
      icon: <FaProjectDiagram />,
      label: "Projects",
      roles: ["admin", "superadmin", "hr", "employee", "hod"],
    },
    {
      id: "team",
      icon: <FaUsers />,
      label: "Team",
      roles: ["superadmin", "admin", "hr"],
      isGroup: true,
      children: [
        {
          path: "/users",
          icon: <FaUsers />,
          label: "Users",
          roles: ["admin", "superadmin"],
        },
        {
          path: "/employees",
          icon: <FaUsers />,
          label: "Employees",
        },
        {
          path: "/clients",
          icon: <FaUserTie />,
          label: "Clients",
        },
        {
          path: "/departments",
          icon: <FaBuilding />,
          label: "Departments",
        },
      ],
    },
    {
      path: "/leaves",
      icon: <FaCalendarAlt />,
      label: "My Leaves",
      roles: ["employee", "hod"],
    },
    {
      id: "leave-management",
      icon: <FaCalendarAlt />,
      label: "Leave Management",
      roles: ["admin", "superadmin", "hr"],
      isGroup: true,
      children: [
        {
          path: "/leaves",
          icon: <FaCalendarAlt />,
          label: "All Leaves",
        },
        {
          path: "/leaves/requests",
          icon: <FaCheck />,
          label: "Approve Leaves",
        },
      ],
    },
    {
      path: "/attendance/my-attendance",
      icon: <FaClock />,
      label: "My Attendance",
      roles: ["employee"],
    },
    {
      id: "attendance",
      icon: <FaClock />,
      label: "Attendance",
      roles: ["admin", "superadmin", "hr", "hod"],
      isGroup: true,
      children: [
        {
          path: "/attendance/my-attendance",
          icon: <FaClock />,
          label: "My Attendance",
        },
        {
          path: "/attendance/tracking",
          icon: <FaClock />,
          label: "Tracking",
        },
      ],
    },
    {
      path: "/profile",
      icon: <FaUser />,
      label: "My Profile",
      roles: ["superadmin", "admin", "hr", "accounts", "employee", "client", "hod"],
    },
    {
      path: "/employee/announcements",
      icon: <FaBullhorn />,
      label: "News & Alerts",
      roles: ["employee", "admin", "superadmin", "hr", "hod"],
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    if (item.isGroup) {
      // Filter children based on roles
      item.children = item.children.filter(child => 
        !child.roles || child.roles.includes(user?.role)
      );
      return item.roles.includes(user?.role) && item.children.length > 0;
    }
    return item.roles.includes(user?.role);
  });

  return (
    <>
      <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-container">
              {collapsed ? (
                /* Collapsed: Show only mini logo */
                <div className="logo-mini-container">
                  <img 
                    src="/Wealll_mini.png" 
                    alt="We Alll Office" 
                    className="logo-img-mini"
                  />
                </div>
              ) : (
                /* Expanded: Show full We Alll Office logo */
                <div className="logo-full-container">
                  <img 
                    src="/We Alll Office Logo.png" 
                    alt="We Alll Office" 
                    className="logo-img-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <Nav className="flex-column">
          {filteredMenu.map((item) => {
            if (item.isGroup) {
              const isExpanded = expandedGroups[item.id];
              const hasActiveChild = item.children.some(child => location.pathname === child.path);
              
              return (
                <div key={item.id} className="sidebar-group">
                  <div
                    className={`sidebar-link sidebar-group-header ${hasActiveChild ? 'active' : ''}`}
                    onClick={() => !collapsed && toggleGroup(item.id)}
                    style={{ cursor: collapsed ? 'default' : 'pointer' }}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    {!collapsed && (
                      <span className="sidebar-label">{item.label}</span>
                    )}
                  </div>
                  {!collapsed && isExpanded && (
                    <div className="sidebar-submenu">
                      {item.children.map((child) => (
                        <Nav.Link
                          key={child.path}
                          as={Link}
                          to={child.path}
                          className={`sidebar-link sidebar-sublink ${
                            location.pathname === child.path ? "active" : ""
                          }`}
                          onClick={handleLinkClick}
                        >
                          <span className="sidebar-icon">{child.icon}</span>
                          <span className="sidebar-label">{child.label}</span>
                        </Nav.Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Nav.Link
                key={item.path}
                as={Link}
                to={item.path}
                className={`sidebar-link ${
                  location.pathname === item.path ? "active" : ""
                }`}
                onClick={handleLinkClick}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {!collapsed && (
                  <span className="sidebar-label">{item.label}</span>
                )}
              </Nav.Link>
            );
          })}
        </Nav>
      </div>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="sidebar-overlay d-md-none"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
