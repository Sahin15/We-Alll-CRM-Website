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
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const Sidebar = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      path: "/dashboard",
      icon: <FaTachometerAlt />,
      label: "Dashboard",
      roles: [
        "superadmin",
        "admin",
        "hr",
        "accounts",
        "employee",
        "client",
        "hod",
      ],
    },
    {
      path: "/users",
      icon: <FaUsers />,
      label: "Users",
      roles: ["superadmin", "admin", "hr"],
    },
    {
      path: "/departments",
      icon: <FaBuilding />,
      label: "Departments",
      roles: ["superadmin", "admin", "hr"],
    },
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
    {
      path: "/attendance/my-attendance",
      icon: <FaClock />,
      label: "My Attendance",
      roles: ["employee", "admin", "hr", "hod"],
    },
    {
      path: "/attendance/tracking",
      icon: <FaClock />,
      label: "Attendance Tracking",
      roles: ["admin", "superadmin", "hr", "hod"],
    },
    {
      path: "/clients",
      icon: <FaUserTie />,
      label: "Clients",
      roles: ["admin", "superadmin"],
    },
    {
      path: "/projects",
      icon: <FaProjectDiagram />,
      label: "Projects",
      roles: ["admin", "superadmin", "employee", "hod"],
    },
    {
      path: "/profile",
      icon: <FaUser />,
      label: "My Profile",
      roles: [
        "superadmin",
        "admin",
        "hr",
        "accounts",
        "employee",
        "client",
        "hod",
      ],
    },
  ];

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <>
      <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header p-4">
          <h4 className="text-white mb-0">
            {collapsed ? "CRM" : "CRM System"}
          </h4>
        </div>

        <Nav className="flex-column">
          {filteredMenu.map((item) => (
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
          ))}
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
