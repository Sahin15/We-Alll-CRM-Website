import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Container, Row, Col, Nav, Offcanvas, Button } from 'react-bootstrap';
import { 
  FaHome, 
  FaClock, 
  FaCalendarAlt,
  FaTasks,
  FaProjectDiagram, 
  FaUsers, 
  FaBullhorn,
  FaUser,
  FaBars
} from 'react-icons/fa';
import Footer from './Footer';

const EmployeeLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 991;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileMenu(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    { path: '/employee/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/employee/attendance', icon: FaClock, label: 'Attendance' },
    { path: '/employee/leaves', icon: FaCalendarAlt, label: 'Leaves' },
    { path: '/employee/tasks', icon: FaTasks, label: 'Tasks' },
    { path: '/employee/time-tracking', icon: FaClock, label: 'Time Tracking' },
    { path: '/employee/projects', icon: FaProjectDiagram, label: 'Projects' },
    { path: '/employee/team', icon: FaUsers, label: 'Team' },
    { path: '/employee/announcements', icon: FaBullhorn, label: 'Announcements' },
    { path: '/employee/profile', icon: FaUser, label: 'My Profile' },
  ];

  const handleMenuItemClick = () => {
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  const renderMenuItems = () => (
    <Nav className="flex-column">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={handleMenuItemClick}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center py-2 px-3 mb-1 rounded touch-target ${
              isActive ? 'bg-primary text-white' : 'text-dark'
            }`
          }
          title={item.label}
        >
          <item.icon className="me-2" />
          {(!collapsed || isMobile) && <span>{item.label}</span>}
        </NavLink>
      ))}
    </Nav>
  );

  return (
    <Container fluid className="p-0">
      <Row className="g-0">
        {/* Mobile Menu Button */}
        {isMobile && (
          <div className="d-lg-none position-fixed top-0 start-0 p-3" style={{ zIndex: 1050 }}>
            <Button
              variant="primary"
              onClick={() => setShowMobileMenu(true)}
              className="shadow-sm"
              aria-label="Open menu"
            >
              <FaBars />
            </Button>
          </div>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <Col 
            md={collapsed ? 1 : 2} 
            className="bg-light border-end vh-100 position-sticky top-0"
            style={{ transition: 'all 0.3s' }}
          >
            <div className="p-3">
              <button
                className="btn btn-sm btn-outline-secondary w-100 mb-3"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <i className={`bi bi-${collapsed ? 'chevron-right' : 'chevron-left'}`}></i>
              </button>
              {renderMenuItems()}
            </div>
          </Col>
        )}

        {/* Mobile Offcanvas Menu */}
        <Offcanvas 
          show={showMobileMenu} 
          onHide={() => setShowMobileMenu(false)}
          placement="start"
          className="d-lg-none"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            {renderMenuItems()}
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content */}
        <Col 
          xs={12}
          md={collapsed ? 11 : 10} 
          className="p-0 d-flex flex-column"
          style={{ minHeight: '100vh' }}
        >
          <div className="p-2 p-sm-3 p-md-4 flex-grow-1">
            <Outlet />
          </div>
          <Footer />
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeLayout;
