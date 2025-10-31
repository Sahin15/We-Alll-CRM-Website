import {
  Navbar as BSNavbar,
  Container,
  Nav,
  NavDropdown,
} from "react-bootstrap";
import { FaBars, FaBell, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

        <Nav className="ms-auto align-items-center">
          <Nav.Link href="#notifications" className="position-relative me-3">
            <FaBell size={20} />
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              3
            </span>
          </Nav.Link>

          <NavDropdown
            title={
              <span>
                <FaUserCircle size={24} className="me-2" />
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
