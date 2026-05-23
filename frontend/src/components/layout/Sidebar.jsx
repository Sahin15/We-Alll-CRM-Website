import { useState, useEffect } from "react";
import { Nav } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  FaPhone,
  FaLaptop,
  FaFileCode,
  FaShoppingCart,
  FaFileAlt,
  FaCheckSquare,
  FaBoxOpen,
  FaUserPlus,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const Sidebar = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
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
    if (currentPath.includes('/leads') || currentPath.includes('/clients') || currentPath.includes('/raw-data')) {
      setExpandedGroups(prev => ({
        ...prev,
        'business-management': true
      }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId, defaultPath) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleGroupClick = (groupId, defaultPath, navigate) => {
    // If there's a default path (like dashboard), navigate to it
    if (defaultPath) {
      navigate(defaultPath);
    }
    // Toggle the group expansion
    toggleGroup(groupId);
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
          path: "/raw-data",
          icon: <FaClipboardList />,
          label: "Raw Data Sheet",
          roles: ["admin", "superadmin", "manager", "employee", "hod"],
          departments: ["Sales", "Telecaller"],
        },
        {
          path: "/raw-data/queue",
          icon: <FaPhone />,
          label: "Calling Queue",
          roles: ["admin", "superadmin", "manager", "employee", "hod"],
          departments: ["Sales", "Telecaller"],
        },
        {
          path: "/raw-data/dashboard",
          icon: <FaChartBar />,
          label: "Raw Data Analytics",
          roles: ["admin", "superadmin", "manager"],
        },
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
      roles: ["admin", "superadmin", "accounts", "manager", "hod"],
      excludeDepartments: ["HR"], // HR department employees should not see this
      onlyForRoles: ["admin", "superadmin", "accounts", "manager"], // hod handled separately via department check
      hodDepartments: ["Sales"], // Only HoDs of these departments can see this
      isGroup: true,
      children: [
        {
          path: "/admin/billing",
          icon: <FaFileInvoiceDollar />,
          label: "Overview",
          roles: ["admin", "superadmin", "accounts", "manager", "hod"],
        },
        {
          path: "/admin/services",
          icon: <FaBoxes />,
          label: "Services",
          roles: ["admin", "superadmin", "accounts", "manager", "hod"],
        },
        {
          path: "/admin/plans",
          icon: <FaClipboardList />,
          label: "Plans",
          roles: ["admin", "superadmin", "accounts", "manager", "hod"],
        },
        {
          path: "/admin/subscriptions",
          icon: <FaReceipt />,
          label: "Subscriptions",
          roles: ["admin", "superadmin", "accounts", "manager", "hod"],
        },
        {
          path: "/admin/invoices",
          icon: <FaFileInvoiceDollar />,
          label: "Invoices",
          roles: ["admin", "superadmin", "accounts", "manager", "hod"],
        },
        {
          path: "/admin/payments",
          icon: <FaCreditCard />,
          label: "Payments",
          roles: ["admin", "superadmin", "accounts", "manager", "hod"],
        },
      ],
    },
    {
      id: "work-management",
      icon: <FaTasks />,
      label: "Work Management",
      roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
      defaultPath: "/employee/my-work",
      isGroup: true,
      children: [
        {
          path: "/employee/my-work",
          icon: <FaTasks />,
          label: "My Work Items",
          roles: ["employee", "admin", "superadmin", "hr", "hod", "manager"],
        },
        {
          path: "/employee/assigned-work",
          icon: <FaTasks />,
          label: "Assigned Work",
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
      defaultPath: "/worklog/today",
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
        {
          path: "/hod/hiring/requests",
          icon: <FaUserPlus />,
          label: "Hiring Requests",
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
      id: "resources",
      icon: <FaLaptop />,
      label: "Resources",
      roles: ["admin", "superadmin", "hr", "manager", "employee", "hod"],
      isGroup: true,
      children: [
        {
          path: "/assets/management",
          icon: <FaLaptop />,
          label: "Assets",
          roles: ["admin", "superadmin", "hr", "manager", "employee", "hod"],
        },
        {
          path: "/licenses/management",
          icon: <FaFileCode />,
          label: "Software Licenses",
          roles: ["admin", "superadmin", "hr", "manager", "employee", "hod"],
        },
      ],
    },
    {
      id: "procurement",
      icon: <FaShoppingCart />,
      label: "Procurement",
      roles: ["admin", "superadmin", "hr", "accounts", "employee", "hod", "manager"],
      isGroup: true,
      children: [
        // Dashboard — admin/superadmin/accounts only (calls restricted analytics endpoints)
        {
          path: "/procurement",
          icon: <FaChartBar />,
          label: "Dashboard",
          roles: ["admin", "superadmin", "accounts"],
          onlyForRoles: ["admin", "superadmin", "accounts"],
        },
        // My Purchase Requests — ALL roles can raise and track their own PRs
        {
          path: "/procurement/purchase-requests/my",
          icon: <FaFileAlt />,
          label: "My Requests",
          roles: ["admin", "superadmin", "hr", "accounts", "employee", "hod", "manager"],
        },
        // PR Approvals — HoD approves pending_hod; admin/accounts approve pending_admin
        // manager is NOT an approver per the backend APPROVER_ROLES
        {
          path: "/procurement/purchase-requests/approvals",
          icon: <FaCheckSquare />,
          label: "PR Approvals",
          roles: ["hod", "admin", "superadmin", "accounts"],
          onlyForRoles: ["hod", "admin", "superadmin", "accounts"],
        },
        // Vendors — admin/superadmin/accounts only (write + read)
        {
          path: "/procurement/vendors",
          icon: <FaBuilding />,
          label: "Vendors",
          roles: ["admin", "superadmin", "accounts"],
          onlyForRoles: ["admin", "superadmin", "accounts"],
        },
        // Purchase Orders — admin/superadmin/accounts create; hr/hod/manager view only
        // employee does NOT see POs (spec: employees only see their own PRs)
        {
          path: "/procurement/purchase-orders",
          icon: <FaClipboardList />,
          label: "Purchase Orders",
          roles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        // Goods Receipts — admin/superadmin/accounts/hr/manager can create; hod view only
        // employee does NOT see GRs
        {
          path: "/procurement/goods-receipts",
          icon: <FaBoxOpen />,
          label: "Goods Receipts",
          roles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        // Invoices — admin/superadmin/accounts create; hr/hod/manager view only
        // employee does NOT see invoices
        {
          path: "/procurement/invoices",
          icon: <FaFileInvoiceDollar />,
          label: "Invoices",
          roles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        // Payments — admin/superadmin/accounts create; hr/hod/manager view only
        // employee does NOT see payments
        {
          path: "/procurement/payments",
          icon: <FaMoneyBillWave />,
          label: "Payments",
          roles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        // Reports — admin/superadmin/accounts only
        {
          path: "/procurement/reports",
          icon: <FaChartBar />,
          label: "Reports",
          roles: ["admin", "superadmin", "accounts"],
          onlyForRoles: ["admin", "superadmin", "accounts"],
        },
      ],
    },
    {
      id: "company",
      icon: <FaHandshake />,
      label: "Company",
      roles: ["admin", "superadmin", "hr", "employee", "hod", "manager"],
      isGroup: true,
      children: [
        {
          path: "/meetings",
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
          label: "News & Alerts",
          roles: ["employee", "hod", "admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/policies",
          icon: <FaShieldAlt />,
          label: "Policy Management",
          roles: ["admin", "superadmin", "hr", "manager"],
          onlyForRoles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      id: "hiring",
      icon: <FaUserPlus />,
      label: "Hiring",
      roles: ["admin", "superadmin", "hr", "manager"],
      onlyForRoles: ["admin", "superadmin", "hr", "manager"],
      isGroup: true,
      children: [
        {
          path: "/hr/hiring",
          icon: <FaTachometerAlt />,
          label: "Overview",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/hr/hiring/requests",
          icon: <FaClipboardList />,
          label: "Requests & Pipeline",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/hr/hiring/applicants",
          icon: <FaFileAlt />,
          label: "CV Bank",
          roles: ["admin", "superadmin", "hr", "manager"],
        },
        {
          path: "/hr/hiring/offer-letters",
          icon: <FaFileInvoiceDollar />,
          label: "Offer Letters",
          roles: ["admin", "superadmin", "hr", "manager"],
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
    {
      path: "/admin/support-management",
      icon: <FaPhone />,
      label: "Support Contacts",
      roles: ["admin", "superadmin"],
      onlyForRoles: ["admin", "superadmin"],
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    // Helper function to check if user has access
    const hasAccess = (menuItem) => {
      // If onlyForRoles is specified, ONLY those roles can see it
      // Exception: hod role is checked separately via hodDepartments
      if (menuItem.onlyForRoles && menuItem.onlyForRoles.length > 0) {
        if (menuItem.onlyForRoles.includes(user?.role)) return true;
        // Allow hod if their department is in hodDepartments
        if (user?.role === 'hod' && menuItem.hodDepartments?.length > 0) {
          return menuItem.hodDepartments.some(
            d => d.toLowerCase() === user?.department?.name?.toLowerCase()
          );
        }
        return false;
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
                  <img loading="lazy" src="/Wealll_mini.png" 
                    alt="We Alll Office" 
                    className="logo-img-mini"
                  />
                </div>
              ) : (
                /* Expanded: Show full We Alll Office logo */
                <div className="logo-full-container">
                  <img loading="lazy" src="/We Alll Office Logo.png" 
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
                    onClick={() => !collapsed && handleGroupClick(item.id, item.defaultPath, navigate)}
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

