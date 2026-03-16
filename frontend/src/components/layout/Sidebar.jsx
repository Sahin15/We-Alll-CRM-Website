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
  FaShieldAlt,
  FaHandshake,
  FaPlus,
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
      roles: ["superadmin", "admin", "hr", "accounts", "employee", "client", "hod", "manager"],
    },
    {
      id: "business-management",
      icon: <FaUserTie />,
      label: "Business Management",
      roles: ["admin", "superadmin", "manager", "hr", "employee", "hod"],
      isGroup: true,
      children: [
        {
          path: "/leads",
          icon: <FaUserTie />,
          label: "Leads",
          roles: ["admin", "superadmin", "manager", "employee", "hod"],
          departments: ["Sales"], // Only Sales department employees can see Leads
        },
        {
          path: "/clients",
          icon: <FaUsers />,
          label: "Clients",
          roles: ["admin", "superadmin", "hr", "employee", "hod", "manager"],
          // No department restriction - all employees can see their assigned clients
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
      roles: ["admin", "superadmin", "accounts", "manager"],
      excludeDepartments: ["Sales", "HR"], // Sales and HR department employees should not see this
      onlyForRoles: ["admin", "superadmin", "accounts", "manager"], // Only these roles can see it, regardless of department
      isGroup: true,
      children: [
        {
          path: "/admin/billing",
          icon: <FaFileInvoiceDollar />,
          label: "Overview",
          roles: ["admin", "superadmin", "accounts", "manager"],
        },
        {
          path: "/admin/services",
          icon: <FaBoxes />,
          label: "Services",
          roles: ["admin", "superadmin", "accounts", "manager"],
        },
        {
          path: "/admin/plans",
          icon: <FaClipboardList />,
          label: "Plans",
          roles: ["admin", "superadmin", "accounts", "manager"],
        },
        {
          path: "/admin/subscriptions",
          icon: <FaReceipt />,
          label: "Subscriptions",
          roles: ["admin", "superadmin", "accounts", "manager"],
        },
        {
          path: "/admin/invoices",
          icon: <FaFileInvoiceDollar />,
          label: "Invoices",
          roles: ["admin", "superadmin", "accounts", "manager"],
        },
        {
          path: "/admin/payments",
          icon: <FaCreditCard />,
          label: "Payments",
          roles: ["admin", "superadmin", "accounts", "manager"],
        },
      ],
    },
    {
      id: "work-management",
      icon: <FaTasks />,
      label: "Work Management",
      roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
      isGroup: true,
      children: [
        {
          path: "/employee/my-work",
          icon: <FaTasks />,
          label: "My Work Items",
          roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
        },
        {
          path: "/work-calendar/my-calendar",
          icon: <FaCalendarAlt />,
          label: "My Work Calendar",
          roles: ["employee", "admin", "hr", "hod", "manager"],
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
      id: "daily-work-log",
      icon: <FaClipboardList />,
      label: "Daily Work Log",
      roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
      isGroup: true,
      children: [
        {
          path: "/worklog/today",
          icon: <FaClock />,
          label: "Today's Log",
          roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
        },
        {
          path: "/worklog/history",
          icon: <FaCalendarAlt />,
          label: "Log History",
          roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
        },
        {
          path: "/hod/worklog-review",
          icon: <FaClipboardList />,
          label: "Department Review",
          roles: ["hod"],
        },
      ],
    },
    {
      path: "/projects",
      icon: <FaProjectDiagram />,
      label: "Projects",
      roles: ["admin", "superadmin", "hr", "employee", "hod", "manager"],
    },
    {
      id: "company",
      icon: <FaHandshake />,
      label: "Company",
      roles: ["admin", "superadmin", "hr", "employee", "hod", "manager"],
      isGroup: true,
      children: [
        {
          path: "/employee/meetings",
          icon: <FaCalendarAlt />,
          label: "Meetings",
          roles: ["employee", "hod", "admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/employee/policies",
          icon: <FaShieldAlt />,
          label: "Policies",
          roles: ["employee", "hod", "admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/employee/announcements",
          icon: <FaBullhorn />,
          label: "Announcements",
          roles: ["employee", "hod", "admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/policies",
          icon: <FaShieldAlt />,
          label: "Policy Management",
          roles: ["admin", "superadmin", "hr", "manager"],
          onlyForRoles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/announcements",
          icon: <FaBullhorn />,
          label: "Announcement Management",
          roles: ["admin", "superadmin", "hr", "manager"],
          onlyForRoles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      id: "team",
      icon: <FaUsers />,
      label: "Team",
      roles: ["superadmin", "admin", "hr", "manager"],
      onlyForRoles: ["admin", "superadmin", "hr", "manager"], // Manager has full access
      isGroup: true,
      children: [
        {
          path: "/users",
          icon: <FaUsers />,
          label: "Users",
          roles: ["admin", "superadmin", "manager"],
        },
        {
          path: "/employees",
          icon: <FaUsers />,
          label: "Employees",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/departments",
          icon: <FaBuilding />,
          label: "Departments",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/admin/worklog-management",
          icon: <FaClipboardList />,
          label: "Work Log Management",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      path: "/employee/leaves",
      icon: <FaCalendarAlt />,
      label: "My Leaves",
      roles: ["employee", "hod", "manager", "hr"],
    },
    {
      id: "my-compensation",
      icon: <FaMoneyBillWave />,
      label: "My Compensation",
      roles: ["employee", "hod", "manager", "hr"],
      isGroup: true,
      children: [
        {
          path: "/employee/salary-slips",
          icon: <FaFileInvoiceDollar />,
          label: "Salary Slips",
          roles: ["employee", "hod", "manager", "hr"],
        },
        {
          path: "/employee/salary-preview",
          icon: <FaMoneyBillWave />,
          label: "Salary Breakdown",
          roles: ["employee", "hod", "manager", "hr"],
        },
        {
          path: "/expenses/my-expenses",
          icon: <FaReceipt />,
          label: "Expenses",
          roles: ["employee", "hod", "manager", "hr"],
        },
      ],
    },
    {
      id: "leave-management",
      icon: <FaCalendarAlt />,
      label: "Leave Management",
      roles: ["admin", "superadmin", "hr", "manager"],
      onlyForRoles: ["admin", "superadmin", "hr", "manager"], // Manager has full access
      isGroup: true,
      children: [
        {
          path: "/leaves",
          icon: <FaCalendarAlt />,
          label: "All Leaves",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/leaves/requests",
          icon: <FaCheck />,
          label: "Approve Leaves",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      path: "/attendance/my-attendance",
      icon: <FaClock />,
      label: "My Attendance",
      roles: ["employee", "manager", "hr", "hod"], // Manager, HR, HoD can access their own attendance
    },
    {
      path: "/attendance/tracking",
      icon: <FaClock />,
      label: "Attendance",
      roles: ["admin", "superadmin", "hr", "hod", "manager"],
    },
    {
      id: "finance-management",
      icon: <FaMoneyBillWave />,
      label: "Finance Management",
      roles: ["admin", "superadmin", "hr", "manager"],
      onlyForRoles: ["admin", "superadmin", "hr", "manager"],
      isGroup: true,
      children: [
        {
          path: "/expenses/management",
          icon: <FaReceipt />,
          label: "Expense Management",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/expenses/budget-management",
          icon: <FaMoneyBillWave />,
          label: "Budget Management",
          roles: ["admin", "superadmin"],
        },
        {
          path: "/salary-management",
          icon: <FaMoneyBillWave />,
          label: "Salary Management",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      path: "/reports",
      icon: <FaChartBar />,
      label: "Reports & Analytics",
      roles: ["admin", "superadmin", "hr", "manager"],
    },
    {
      path: "/profile",
      icon: <FaUser />,
      label: "My Profile",
      roles: ["superadmin", "admin", "hr", "accounts", "employee", "client", "hod", "manager"],
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    // Helper function to check if user has access
    const hasAccess = (menuItem) => {
      // If onlyForRoles is specified, ONLY those roles can see it
      if (menuItem.onlyForRoles && menuItem.onlyForRoles.length > 0) {
        return menuItem.onlyForRoles.includes(user?.role);
      }
      
      // Check role-based access
      const hasRoleAccess = !menuItem.roles || menuItem.roles.includes(user?.role);
      
      // If no role access, return false immediately
      if (!hasRoleAccess) {
        return false;
      }
      
      // Privileged roles (admin, superadmin, manager) bypass department restrictions
      const isPrivilegedRole = ['admin', 'superadmin', 'manager'].includes(user?.role);
      
      // Check department-based access (for items that specify allowed departments)
      if (menuItem.departments && menuItem.departments.length > 0 && !isPrivilegedRole) {
        // For non-privileged roles, check if user's department is in the allowed list
        if (!user?.department?.name) {
          return false; // No department assigned
        }
        
        const hasDepartmentAccess = menuItem.departments.some(
          dept => dept.toLowerCase() === user.department.name.toLowerCase()
        );
        
        if (!hasDepartmentAccess) {
          return false; // User's department not in allowed list
        }
      }
      
      // Check if user's department is excluded
      if (menuItem.excludeDepartments && user?.department?.name && !isPrivilegedRole) {
        const isExcluded = menuItem.excludeDepartments.some(
          dept => dept.toLowerCase() === user.department.name.toLowerCase()
        );
        if (isExcluded) {
          return false; // Explicitly exclude this department
        }
      }
      
      return true;
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
                data-sidebar-item={item.dataAttr}
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
