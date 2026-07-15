import { useState, useEffect } from "react";
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
import { hasPermissionAccess } from "../../utils/authzAccess";
import { BRAND_LOGO_FULL, BRAND_NAME } from "../../constants/branding";
import "./Sidebar.css";

/** Shared fallback role lists aligned with backend authz pilot parity */
const ALL_APP_ROLES = [
  "superadmin",
  "admin",
  "hr",
  "accounts",
  "employee",
  "client",
  "hod",
  "manager",
];
const STAFF_ROLES = ["employee", "admin", "superadmin", "hr", "hod", "manager"];
const CRM_STAFF_ROLES = ["admin", "superadmin", "manager", "hr", "employee", "hod"];
const CRM_RAWDATA_ROLES = ["admin", "superadmin", "manager", "employee", "hod"];
const CRM_RAWDATA_ANALYTICS_ROLES = ["admin", "superadmin", "hr", "manager"];
const CRM_LEAD_ROLES = ["admin", "superadmin", "manager", "employee", "hod"];
const CRM_CLIENT_ROLES = ["admin", "superadmin", "hr", "employee", "hod", "manager"];
const BILLING_ROLES = ["admin", "superadmin", "accounts", "manager", "hod"];
const WORK_SELF_ROLES = ["employee", "admin", "superadmin", "hr", "hod", "manager"];
const WORKLOG_SELF_ROLES = ["employee", "admin", "superadmin", "hr", "hod", "manager"];
const PROJECT_VIEW_ROLES = ["admin", "superadmin", "hr", "employee", "hod", "manager"];
const RESOURCE_ROLES = ["admin", "superadmin", "hr", "manager", "employee", "hod"];
const PROCUREMENT_ALL_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "accounts",
  "employee",
  "hod",
  "manager",
];
const PROCUREMENT_ADMIN_ROLES = ["admin", "superadmin", "accounts"];
const PROCUREMENT_APPROVER_ROLES = ["hod", "admin", "superadmin", "accounts"];
const PROCUREMENT_READ_ROLES = ["admin", "superadmin", "accounts", "hr", "hod", "manager"];
const COMPANY_VIEW_ROLES = ["employee", "hod", "admin", "superadmin", "hr", "manager"];
const COMPANY_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const HIRING_PIPELINE_ROLES = ["admin", "superadmin", "hr", "manager"];
const TEAM_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const TEAM_USER_ADMIN_ROLES = ["admin", "superadmin", "manager"];
const COMPENSATION_SELF_ROLES = ["employee", "hod", "manager", "hr"];
const LEAVE_APPROVE_ROLES = ["admin", "superadmin", "hr", "manager"];
const ATTENDANCE_SELF_ROLES = ["employee", "manager", "hr", "hod"];
const ATTENDANCE_VIEW_ROLES = ["admin", "superadmin", "hr", "hod", "manager"];
const FINANCE_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const REPORTS_ROLES = ["admin", "superadmin", "hr", "manager"];

const Sidebar = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canPermission, checkPermission, authzEffective, authzLoading, canAccess } = useAuth();
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
      permission: "dashboard.view",
      fallbackRoles: ALL_APP_ROLES,
    },
    {
      id: "business-management",
      icon: <FaUserTie />,
      label: "Business Management",
      permission: "crm.lead.view",
      fallbackRoles: CRM_STAFF_ROLES,
      isGroup: true,
      children: [
        {
          path: "/raw-data",
          icon: <FaClipboardList />,
          label: "Raw Data Sheet",
          permission: "crm.rawdata.manage",
          fallbackRoles: CRM_RAWDATA_ROLES,
          departments: ["Sales", "Telecaller"],
        },
        {
          path: "/raw-data/queue",
          icon: <FaPhone />,
          label: "Calling Queue",
          permission: "crm.rawdata.manage",
          fallbackRoles: CRM_RAWDATA_ROLES,
          departments: ["Sales", "Telecaller"],
        },
        {
          path: "/raw-data/dashboard",
          icon: <FaChartBar />,
          label: "Raw Data Analytics",
          permission: "reports.analytics.view",
          fallbackRoles: CRM_RAWDATA_ANALYTICS_ROLES,
        },
        {
          path: "/leads",
          icon: <FaUserTie />,
          label: "Leads",
          permission: "crm.lead.view",
          fallbackRoles: CRM_LEAD_ROLES,
          departments: ["Sales"],
        },
        {
          path: "/clients",
          icon: <FaUsers />,
          label: "Clients",
          permission: "crm.client.view",
          fallbackRoles: CRM_CLIENT_ROLES,
          roleLabels: {
            employee: "My Clients",
            hod: "My Clients",
            default: "Clients",
          },
        },
      ],
    },
    {
      id: "billing",
      icon: <FaMoneyBillWave />,
      label: "Billing & Finance",
      permission: "billing.invoice.view",
      fallbackRoles: BILLING_ROLES,
      excludeDepartments: ["HR"],
      onlyForRoles: ["admin", "superadmin", "accounts", "manager"],
      hodDepartments: ["Sales"],
      isGroup: true,
      children: [
        {
          path: "/admin/billing",
          icon: <FaFileInvoiceDollar />,
          label: "Overview",
          permission: "billing.invoice.view",
          fallbackRoles: BILLING_ROLES,
        },
        {
          path: "/admin/services",
          icon: <FaBoxes />,
          label: "Services",
          permission: "billing.invoice.manage",
          fallbackRoles: BILLING_ROLES,
        },
        {
          path: "/admin/plans",
          icon: <FaClipboardList />,
          label: "Plans",
          permission: "billing.subscription.view",
          fallbackRoles: BILLING_ROLES,
        },
        {
          path: "/admin/subscriptions",
          icon: <FaReceipt />,
          label: "Subscriptions",
          permission: "billing.subscription.view",
          fallbackRoles: BILLING_ROLES,
        },
        {
          path: "/admin/invoices",
          icon: <FaFileInvoiceDollar />,
          label: "Invoices",
          permission: "billing.invoice.view",
          fallbackRoles: BILLING_ROLES,
        },
        {
          path: "/admin/payments",
          icon: <FaCreditCard />,
          label: "Payments",
          permission: "billing.payment.verify",
          fallbackRoles: BILLING_ROLES,
        },
      ],
    },
    {
      id: "work-management",
      icon: <FaTasks />,
      label: "Work Management",
      permission: "work.item.view",
      fallbackRoles: WORK_SELF_ROLES,
      defaultPath: "/employee/my-work",
      isGroup: true,
      children: [
        {
          path: "/employee/my-work",
          icon: <FaTasks />,
          label: "My Work Items",
          permission: "work.item.view",
          fallbackRoles: WORK_SELF_ROLES,
        },
        {
          path: "/employee/assigned-work",
          icon: <FaTasks />,
          label: "Assigned Work",
          permission: "work.item.view",
          fallbackRoles: WORK_SELF_ROLES,
        },
        {
          path: "/work-calendar/my-calendar",
          icon: <FaCalendarAlt />,
          label: "My Work Calendar",
          permission: "work.item.view",
          fallbackRoles: WORK_SELF_ROLES,
        },
        {
          path: "/work-calendar/enhanced-admin-overview",
          icon: <FaChartBar />,
          label: "Work Dashboard",
          permission: "reports.analytics.view",
          fallbackRoles: REPORTS_ROLES,
        },
      ],
    },
    {
      id: "daily-work-log",
      icon: <FaClipboardList />,
      label: "Daily Work Log",
      permission: "worklog.entry.view_self",
      fallbackRoles: WORKLOG_SELF_ROLES,
      defaultPath: "/worklog/today",
      isGroup: true,
      children: [
        {
          path: "/worklog/today",
          icon: <FaClock />,
          label: "Today's Log",
          permission: "worklog.entry.view_self",
          fallbackRoles: WORKLOG_SELF_ROLES,
        },
        {
          path: "/worklog/history",
          icon: <FaCalendarAlt />,
          label: "Log History",
          permission: "worklog.entry.view_self",
          fallbackRoles: WORKLOG_SELF_ROLES,
        },
        {
          path: "/hod/worklog-review",
          icon: <FaClipboardList />,
          label: "Department Review",
          permission: "worklog.entry.review",
          fallbackRoles: ["hod"],
          requiresDepartmentHead: true,
        },
        {
          path: "/hod/hiring/requests",
          icon: <FaUserPlus />,
          label: "Hiring Requests",
          permission: "hiring.request.view",
          fallbackRoles: ["hod"],
          requiresDepartmentHead: true,
        },
      ],
    },
    {
      path: "/projects",
      icon: <FaProjectDiagram />,
      label: "Projects",
      permission: "projects.project.view",
      fallbackRoles: PROJECT_VIEW_ROLES,
    },
    {
      id: "resources",
      icon: <FaLaptop />,
      label: "Resources",
      permission: "assets.asset.view",
      fallbackRoles: RESOURCE_ROLES,
      isGroup: true,
      children: [
        {
          path: "/assets/management",
          icon: <FaLaptop />,
          label: "Assets",
          permission: "assets.asset.view",
          fallbackRoles: RESOURCE_ROLES,
        },
        {
          path: "/licenses/management",
          icon: <FaFileCode />,
          label: "Software Licenses",
          permission: "licenses.license.view",
          fallbackRoles: RESOURCE_ROLES,
        },
      ],
    },
    {
      id: "procurement",
      icon: <FaShoppingCart />,
      label: "Procurement",
      permission: "procurement.pr.create",
      fallbackRoles: PROCUREMENT_ALL_ROLES,
      isGroup: true,
      children: [
        {
          path: "/procurement",
          icon: <FaChartBar />,
          label: "Dashboard",
          permission: "procurement.pr.view",
          fallbackRoles: PROCUREMENT_ADMIN_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts"],
        },
        {
          path: "/procurement/purchase-requests/my",
          icon: <FaFileAlt />,
          label: "My Requests",
          permission: "procurement.pr.create",
          fallbackRoles: PROCUREMENT_ALL_ROLES,
        },
        {
          path: "/procurement/purchase-requests/approvals",
          icon: <FaCheckSquare />,
          label: "PR Approvals",
          permission: "procurement.pr.approve_hod",
          fallbackRoles: PROCUREMENT_APPROVER_ROLES,
          onlyForRoles: ["hod", "admin", "superadmin", "accounts"],
        },
        {
          path: "/procurement/vendors",
          icon: <FaBuilding />,
          label: "Vendors",
          permission: "procurement.vendor.manage",
          fallbackRoles: PROCUREMENT_ADMIN_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts"],
        },
        {
          path: "/procurement/purchase-orders",
          icon: <FaClipboardList />,
          label: "Purchase Orders",
          permission: "procurement.pr.view_self",
          fallbackRoles: PROCUREMENT_READ_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        {
          path: "/procurement/goods-receipts",
          icon: <FaBoxOpen />,
          label: "Goods Receipts",
          permission: "procurement.pr.view_self",
          fallbackRoles: PROCUREMENT_READ_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        {
          path: "/procurement/invoices",
          icon: <FaFileInvoiceDollar />,
          label: "Invoices",
          permission: "procurement.pr.view_self",
          fallbackRoles: PROCUREMENT_READ_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        {
          path: "/procurement/payments",
          icon: <FaMoneyBillWave />,
          label: "Payments",
          permission: "procurement.pr.view_self",
          fallbackRoles: PROCUREMENT_READ_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts", "hr", "hod", "manager"],
        },
        {
          path: "/procurement/reports",
          icon: <FaChartBar />,
          label: "Reports",
          permission: "procurement.pr.view",
          fallbackRoles: PROCUREMENT_ADMIN_ROLES,
          onlyForRoles: ["admin", "superadmin", "accounts"],
        },
      ],
    },
    {
      id: "company",
      icon: <FaHandshake />,
      label: "Company",
      permission: "company.meeting.view",
      fallbackRoles: COMPANY_VIEW_ROLES,
      isGroup: true,
      children: [
        {
          path: "/meetings",
          icon: <FaCalendarAlt />,
          label: "Meetings",
          permission: "company.meeting.view",
          fallbackRoles: COMPANY_VIEW_ROLES,
        },
        {
          path: "/employee/policies",
          icon: <FaShieldAlt />,
          label: "Policies",
          permission: "company.policy.view",
          fallbackRoles: COMPANY_VIEW_ROLES,
        },
        {
          path: "/employee/announcements",
          icon: <FaBullhorn />,
          label: "News & Alerts",
          permission: "company.announcement.view",
          fallbackRoles: COMPANY_VIEW_ROLES,
        },
        {
          path: "/policies",
          icon: <FaShieldAlt />,
          label: "Policy Management",
          permission: "company.policy.manage",
          fallbackRoles: COMPANY_MANAGE_ROLES,
          onlyForRoles: ["admin", "superadmin", "hr", "manager"],
        },
      ],
    },
    {
      id: "hiring",
      icon: <FaUserPlus />,
      label: "Hiring",
      permission: "hiring.pipeline.manage",
      fallbackRoles: HIRING_PIPELINE_ROLES,
      onlyForRoles: ["admin", "superadmin", "hr", "manager"],
      isGroup: true,
      children: [
        {
          path: "/hr/hiring",
          icon: <FaTachometerAlt />,
          label: "Overview",
          permission: "hiring.pipeline.manage",
          fallbackRoles: HIRING_PIPELINE_ROLES,
        },
        {
          path: "/hr/hiring/requests",
          icon: <FaClipboardList />,
          label: "Requests & Pipeline",
          permission: "hiring.pipeline.manage",
          fallbackRoles: HIRING_PIPELINE_ROLES,
        },
        {
          path: "/hr/hiring/applicants",
          icon: <FaFileAlt />,
          label: "CV Bank",
          permission: "hiring.pipeline.manage",
          fallbackRoles: HIRING_PIPELINE_ROLES,
        },
        {
          path: "/hr/hiring/offer-letters",
          icon: <FaFileInvoiceDollar />,
          label: "Offer Letters",
          permission: "hiring.pipeline.manage",
          fallbackRoles: HIRING_PIPELINE_ROLES,
        },
      ],
    },
    {
      id: "team",
      icon: <FaUsers />,
      label: "Team",
      permission: "team.user.view",
      fallbackRoles: TEAM_MANAGE_ROLES,
      onlyForRoles: ["admin", "superadmin", "hr", "manager"],
      isGroup: true,
      children: [
        {
          path: "/users",
          icon: <FaUsers />,
          label: "Users",
          permission: "team.user.view",
          fallbackRoles: TEAM_USER_ADMIN_ROLES,
        },
        {
          path: "/employees",
          icon: <FaUsers />,
          label: "Employees",
          permission: "team.user.view",
          fallbackRoles: TEAM_MANAGE_ROLES,
        },
        {
          path: "/departments",
          icon: <FaBuilding />,
          label: "Departments",
          permission: "team.department.view",
          fallbackRoles: TEAM_MANAGE_ROLES,
        },
        {
          path: "/admin/worklog-management",
          icon: <FaClipboardList />,
          label: "Work Log Management",
          permission: "worklog.entry.review",
          fallbackRoles: TEAM_MANAGE_ROLES,
        },
      ],
    },
    {
      path: "/employee/leaves",
      icon: <FaCalendarAlt />,
      label: "My Leaves",
      permission: "leave.request.view_self",
      fallbackRoles: COMPENSATION_SELF_ROLES,
    },
    {
      id: "my-compensation",
      icon: <FaMoneyBillWave />,
      label: "My Compensation",
      permission: "payroll.slip.view_self",
      fallbackRoles: COMPENSATION_SELF_ROLES,
      isGroup: true,
      children: [
        {
          path: "/employee/salary-slips",
          icon: <FaFileInvoiceDollar />,
          label: "Salary Slips",
          permission: "payroll.slip.view_self",
          fallbackRoles: COMPENSATION_SELF_ROLES,
        },
        {
          path: "/employee/salary-preview",
          icon: <FaMoneyBillWave />,
          label: "Salary Breakdown",
          permission: "payroll.slip.view_self",
          fallbackRoles: COMPENSATION_SELF_ROLES,
        },
        {
          path: "/expenses/my-expenses",
          icon: <FaReceipt />,
          label: "Expenses",
          permission: "expense.claim.create",
          fallbackRoles: COMPENSATION_SELF_ROLES,
        },
      ],
    },
    {
      id: "leave-management",
      icon: <FaCalendarAlt />,
      label: "Leave Management",
      permission: "leave.request.view",
      fallbackRoles: LEAVE_APPROVE_ROLES,
      onlyForRoles: ["admin", "superadmin", "hr", "manager"],
      isGroup: true,
      children: [
        {
          path: "/leaves",
          icon: <FaCalendarAlt />,
          label: "All Leaves",
          permission: "leave.request.view",
          fallbackRoles: LEAVE_APPROVE_ROLES,
        },
        {
          path: "/leaves/requests",
          icon: <FaCheck />,
          label: "Approve Leaves",
          permission: "leave.request.approve",
          fallbackRoles: LEAVE_APPROVE_ROLES,
        },
      ],
    },
    {
      path: "/attendance/my-attendance",
      icon: <FaClock />,
      label: "My Attendance",
      permission: "attendance.record.view_self",
      fallbackRoles: ATTENDANCE_SELF_ROLES,
    },
    {
      path: "/attendance/tracking",
      icon: <FaClock />,
      label: "Attendance",
      permission: "attendance.record.view",
      fallbackRoles: ATTENDANCE_VIEW_ROLES,
    },
    {
      id: "finance-management",
      icon: <FaMoneyBillWave />,
      label: "Finance Management",
      permission: "expense.claim.approve",
      fallbackRoles: FINANCE_MANAGE_ROLES,
      onlyForRoles: ["admin", "superadmin", "hr", "manager"],
      isGroup: true,
      children: [
        {
          path: "/expenses/management",
          icon: <FaReceipt />,
          label: "Expense Management",
          permission: "expense.claim.approve",
          fallbackRoles: FINANCE_MANAGE_ROLES,
        },
        {
          path: "/expenses/budget-management",
          icon: <FaMoneyBillWave />,
          label: "Budget Management",
          permission: "expense.claim.approve",
          fallbackRoles: ["admin", "superadmin"],
        },
        {
          path: "/salary-management",
          icon: <FaMoneyBillWave />,
          label: "Salary Management",
          permission: "payroll.slip.manage",
          fallbackRoles: FINANCE_MANAGE_ROLES,
        },
      ],
    },
    {
      path: "/reports",
      icon: <FaChartBar />,
      label: "Reports & Analytics",
      permission: "reports.analytics.view",
      fallbackRoles: REPORTS_ROLES,
    },
    {
      path: "/profile",
      icon: <FaUser />,
      label: "My Profile",
      permission: "profile.view",
      fallbackRoles: ALL_APP_ROLES,
    },
    {
      path: "/admin/support-management",
      icon: <FaPhone />,
      label: "Support Contacts",
      permission: "support.manage",
      fallbackRoles: ["admin", "superadmin"],
    },
    {
      path: "/admin/permission-assignments",
      icon: <FaShieldAlt />,
      label: "Permission Assignment",
      permission: "auth.permission.assign",
      fallbackRoles: ["admin", "superadmin"],
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    const hasAccess = (menuItem) => {
      if (!user) return false;

      let permitted = false;

      if (menuItem.permission) {
        permitted = hasPermissionAccess({
          user,
          canPermission,
          checkPermission,
          authzEffective,
          authzLoading,
          permission: menuItem.permission,
          fallbackRoles: menuItem.fallbackRoles || [],
          requiresDepartmentHead: menuItem.requiresDepartmentHead,
        });
      } else {
        permitted = false;
      }

      if (!permitted) return false;

      if (menuItem.onlyForRoles?.length > 0) {
        if (menuItem.onlyForRoles.includes(user.role)) {
          // allowed
        } else if (
          user.role === "hod" &&
          menuItem.hodDepartments?.length > 0 &&
          menuItem.hodDepartments.some(
            (d) => d.toLowerCase() === user?.department?.name?.toLowerCase()
          )
        ) {
          // HoD of allowed department
        } else {
          return false;
        }
      }

      const isPrivilegedRole = canAccess('team.user.update', ['admin', 'superadmin', 'manager']);

      if (menuItem.departments?.length > 0 && !isPrivilegedRole) {
        if (!user?.department?.name) return false;

        const hasDepartmentAccess = menuItem.departments.some(
          (dept) => dept.toLowerCase() === user.department.name.toLowerCase()
        );
        if (!hasDepartmentAccess) return false;
      }

      if (menuItem.excludeDepartments?.length > 0 && user?.department?.name && !isPrivilegedRole) {
        const isExcluded = menuItem.excludeDepartments.some(
          (dept) => dept.toLowerCase() === user.department.name.toLowerCase()
        );
        if (isExcluded) return false;
      }

      return true;
    };

    if (item.isGroup) {
      item.children = item.children.filter((child) => hasAccess(child));
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
              <div className="sidebar-logo-full-container">
                <img
                  src={BRAND_LOGO_FULL}
                  alt={BRAND_NAME}
                  className="sidebar-logo-full-img"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-nav flex-column">
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
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`sidebar-link sidebar-sublink ${
                            location.pathname === child.path ? "active" : ""
                          }`}
                          onClick={handleLinkClick}
                        >
                          <span className="sidebar-icon">{child.icon}</span>
                          <span className="sidebar-label">{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Link
                key={item.path}
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
              </Link>
            );
          })}
        </div>
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

