import { useState } from "react";
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
  FaReceipt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const Sidebar = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
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
      roles: ["admin", "superadmin", "accounts"],
    },
    {
      path: "/clients",
      icon: <FaUserTie />,
      label: "Clients",
      roles: ["admin", "superadmin", "accounts"],
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
      path: "/projects",
      icon: <FaProjectDiagram />,
      label: "Projects",
      roles: ["admin", "superadmin", "employee", "hod"],
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
        },
        {
          path: "/employees",
          icon: <FaUsers />,
          label: "Employees",
        },
        {
          path: "/departments",
          icon: <FaBuilding />,
          label: "Departments",
        },
      ],
    },
    {
      id: "leaves",
      icon: <FaCalendarAlt />,
      label: "Leaves",
      roles: ["employee", "admin", "superadmin", "hr", "hod"],
      isGroup: true,
      children: [
        {
          path: "/leaves/my-leaves",
          icon: <FaCalendarAlt />,
          label: "My Leaves",
          roles: ["employee", "admin", "hr", "hod"],
        },
        {
          path: "/leaves/requests",
          icon: <FaCalendarAlt />,
          label: "Leave Requests",
          roles: ["admin", "superadmin", "hr", "hod"],
        },
      ],
    },
    {
      id: "attendance",
      icon: <FaClock />,
      label: "Attendance",
      roles: ["employee", "admin", "superadmin", "hr", "hod"],
      isGroup: true,
      children: [
        {
          path: "/attendance/my-attendance",
          icon: <FaClock />,
          label: "My Attendance",
          roles: ["employee", "admin", "hr", "hod"],
        },
        {
          path: "/attendance/tracking",
          icon: <FaClock />,
          label: "Tracking",
          roles: ["admin", "superadmin", "hr", "hod"],
        },
      ],
    },
    {
      path: "/profile",
      icon: <FaUser />,
      label: "My Profile",
      roles: ["superadmin", "admin", "hr", "accounts", "employee", "client", "hod"],
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
            {collapsed ? (
              // Collapsed: Show only logo icon
              <img 
                src={new URL('./We-Alll-Logo.jpg', import.meta.url).href} 
                alt="WE ALLL" 
                className="logo-img-collapsed" 
              />
            ) : (
              // Expanded: Show logo + "Office" text
              <>
                <img 
                  src={new URL('./We-Alll-Logo.jpg', import.meta.url).href} 
                  alt="WE ALLL" 
                  className="logo-img" 
                />
                <span className="logo-text">Office</span>
              </>
            )}
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
                      <>
                        <span className="sidebar-label">{item.label}</span>
                        <span className="sidebar-arrow">
                          {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                        </span>
                      </>
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
