import {
  Navbar as BSNavbar,
  Container,
  Nav,
  NavDropdown,
  Image,
} from "react-bootstrap";
import { FaBars, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import CompanySwitcher from "../admin/CompanySwitcher";
import NotificationBell from "../admin/NotificationBell";

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user has permission to see company switcher
  const canSwitchCompany =
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.role === "accounts";

  // Define billing-related routes where company switcher should appear
  const BILLING_ROUTES = [
    "/admin/billing",
    "/admin/services",
    "/admin/plans",
    "/admin/subscriptions",
    "/admin/invoices",
    "/admin/payments",
  ];

  // Check if current page is a billing-related page
  const isBillingPage = BILLING_ROUTES.some((route) =>
    location.pathname.startsWith(route)
  );

  // Show company switcher only on billing pages for authorized users
  const showCompanySwitcher = canSwitchCompany && isBillingPage;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <BSNavbar bg="white" className="shadow-sm py-3">
      <Container fluid>
        <button className="btn btn-link text-dark" onClick={toggleSidebar}>
          <FaBars size={20} />
        </button>

        {/* Company Switcher - visible only on billing pages for authorized users */}
        {showCompanySwitcher && (
          <div className="mx-auto">
            <CompanySwitcher />
          </div>
        )}

        <Nav className="ms-auto align-items-center">
          {/* Notification Bell */}
          <div className="me-3">
            <NotificationBell />
          </div>

          <NavDropdown
            title={
              <span className="d-flex align-items-center">
                {user?.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={user.name}
                    roundedCircle
                    width={32}
                    height={32}
                    className="me-2"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <FaUserCircle size={24} className="me-2" />
                )}
                {user?.name || "User"}
              </span>
            }
            id="user-dropdown"
            align="end"
          >
            <div className="px-3 py-2 border-bottom bg-light">
              <div className="fw-bold">{user?.name || "User"}</div>
              <div className="small text-muted">
                {user?.email || "No email"}
              </div>
              <div className="mt-1">
                <span className="badge bg-primary text-capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
            <NavDropdown.Item onClick={() => navigate("/profile")}>
              My Profile
            </NavDropdown.Item>
            <NavDropdown.Item onClick={() => navigate("/settings")}>
              Settings
            </NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
