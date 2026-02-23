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

  // Auto-expand groups based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Auto-expand Business Management if on leads or clients page
    if (currentPath.includes('/leads') || currentPath.includes('/clients')) {
      setExpandedGroups(prev => ({
        ...prev,
        'business-management': true
      }));
    }
  }, [location.pathname]);

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
      id: "business-management",
      icon: <FaUserTie />,
      label: "Business Management",
      roles: ["admin", "superadmin", "manager", "hr", "employee", "hod"],
      departments: ["Sales", "Accounts"],
      isGroup: true,
      children: [
        {
          path: "/leads",
          icon: <FaUserTie />,
          label: "Leads",
          roles: ["admin", "superadmin", "manager"],
          departments: ["Sales", "Accounts"],
        },
        {
          path: "/clients",
          icon: <FaUsers />,
          label: "Clients",
          roles: ["admin", "superadmin", "hr", "employee", "hod", "manager"],
          departments: ["Sales", "Accounts"],
          roleLabels: {
            employee: "My Clients",
            hod: "My Clients",
            default: "Clients"
          }
        },
      ],
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
      excludeDepartments: ["Sales"], // Sales department should not see this
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
          path: "/departments",
          icon: <FaBuilding />,
          label: "Departments",
        },
      ],
    },
    {
      path: "/employee/leaves",
      icon: <FaCalendarAlt />,
      label: "My Leaves",
      roles: ["employee", "hod"],
    },
    {
      path: "/employee/salary-slips",
      icon: <FaFileInvoiceDollar />,
      label: "My Salary Slips",
      roles: ["employee", "hod"],
    },
    {
      path: "/employee/salary-preview",
      icon: <FaMoneyBillWave />,
      label: "Salary Preview",
      roles: ["employee", "hod"],
    },
    {
      id: "leave-management",
      icon: <FaCalendarAlt />,
      label: "Leave Management",
      roles: ["admin", "superadmin", "hr"],
      excludeDepartments: ["Sales"], // Sales department should not see this
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
      excludeDepartments: ["Sales"], // Sales department should not see this
    },
    {
      id: "attendance",
      icon: <FaClock />,
      label: "Attendance",
      roles: ["admin", "superadmin", "hr", "hod"],
      excludeDepartments: ["Sales"], // Sales department should not see this
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
      path: "/salary-management",
      icon: <FaMoneyBillWave />,
      label: "Salary Management",
      roles: ["admin", "superadmin", "hr"],
      excludeDepartments: ["Sales"], // Sales department should not see this
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
    // Helper function to check if user has access
    const hasAccess = (menuItem) => {
      // Check role-based access
      const hasRoleAccess = !menuItem.roles || menuItem.roles.includes(user?.role);
      
      // Check department-based access (for items that specify allowed departments)
      let hasDepartmentAccess = true;
      if (menuItem.departments && user?.department?.name) {
        hasDepartmentAccess = menuItem.departments.some(
          dept => dept.toLowerCase() === user.department.name.toLowerCase()
        );
      }
      
      // Check if user's department is excluded
      if (menuItem.excludeDepartments && user?.department?.name) {
        const isExcluded = menuItem.excludeDepartments.some(
          dept => dept.toLowerCase() === user.department.name.toLowerCase()
        );
        if (isExcluded) {
          return false; // Explicitly exclude this department
        }
      }
      
      // User needs either role access OR department access (or both)
      return hasRoleAccess || hasDepartmentAccess;
    };

    if (item.isGroup) {
      // Filter children based on roles and departments
      item.children = item.children.filter(child => hasAccess(child));
      return hasAccess(item) && item.children.length > 0;
    }
    return hasAccess(item);
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
                  <span className="sidebar-label">
                    {item.roleLabels ? (item.roleLabels[user?.role] || item.roleLabels.default || item.label) : item.label}
                  </span>
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
