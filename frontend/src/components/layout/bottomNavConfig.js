import {
  FaHome,
  FaClock,
  FaCalendarAlt,
  FaReceipt,
  FaUsers,
  FaMoneyBillWave,
  FaTasks,
  FaEllipsisH,
  FaChartBar,
} from "react-icons/fa";

/**
 * Role-aware bottom navigation tabs (mobile shell ≤991px).
 * "more" opens the sidebar via onMore callback.
 */
export function getBottomNavTabs(role = "employee") {
  const normalized = (role || "employee").toLowerCase();

  const more = { id: "more", label: "More", action: "sidebar", Icon: FaEllipsisH };

  const configs = {
    superadmin: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "work", label: "Work", path: "/work-management", Icon: FaTasks },
      { id: "finance", label: "Finance", path: "/expenses/management", Icon: FaReceipt },
      { id: "team", label: "Team", path: "/employees", Icon: FaUsers },
      more,
    ],
    admin: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "work", label: "Work", path: "/work-management", Icon: FaTasks },
      { id: "finance", label: "Finance", path: "/expenses/management", Icon: FaReceipt },
      { id: "team", label: "Team", path: "/employees", Icon: FaUsers },
      more,
    ],
    hr: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "team", label: "Team", path: "/employees", Icon: FaUsers },
      { id: "leave", label: "Leave", path: "/leaves", Icon: FaCalendarAlt },
      { id: "payroll", label: "Payroll", path: "/salary-management", Icon: FaMoneyBillWave },
      more,
    ],
    accounts: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "expenses", label: "Expenses", path: "/expenses/management", Icon: FaReceipt },
      { id: "payroll", label: "Payroll", path: "/salary-management", Icon: FaMoneyBillWave },
      { id: "procurement", label: "Procure", path: "/procurement", Icon: FaChartBar },
      more,
    ],
    hod: [
      { id: "home", label: "Home", path: "/hod/dashboard", Icon: FaHome },
      { id: "team", label: "Team", path: "/employees", Icon: FaUsers },
      { id: "worklog", label: "Work log", path: "/worklog/hod-review", Icon: FaTasks },
      { id: "leave", label: "Leave", path: "/leaves/requests", Icon: FaCalendarAlt },
      more,
    ],
    manager: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "team", label: "Team", path: "/employees", Icon: FaUsers },
      { id: "worklog", label: "Work log", path: "/worklog/management", Icon: FaTasks },
      { id: "leave", label: "Leave", path: "/leaves/requests", Icon: FaCalendarAlt },
      more,
    ],
    client: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "projects", label: "Projects", path: "/client/projects", Icon: FaTasks },
      { id: "billing", label: "Billing", path: "/client/billing", Icon: FaReceipt },
      more,
    ],
    employee: [
      { id: "home", label: "Home", path: "/dashboard", Icon: FaHome },
      { id: "attendance", label: "Attendance", path: "/attendance/my-attendance", Icon: FaClock },
      { id: "leave", label: "Leave", path: "/leaves/my-leaves", Icon: FaCalendarAlt },
      { id: "expenses", label: "Expenses", path: "/expenses/my-expenses", Icon: FaReceipt },
      more,
    ],
  };

  return configs[normalized] || configs.employee;
}

export function isBottomNavActive(pathname, tab) {
  if (tab.action === "sidebar") return false;
  if (!tab.path) return false;
  if (tab.path === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/hod/dashboard";
  }
  return pathname === tab.path || pathname.startsWith(`${tab.path}/`);
}
