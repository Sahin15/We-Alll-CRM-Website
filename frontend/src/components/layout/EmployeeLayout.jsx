import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { 
  FaHome, 
  FaClock, 
  FaCalendarAlt,
  FaTasks,
  FaProjectDiagram, 
  FaUsers, 
  FaBullhorn,
  FaUser
} from 'react-icons/fa';

const EmployeeLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <Container fluid className="p-0">
      <Row className="g-0">
        {/* Sidebar */}
        <Col 
          md={collapsed ? 1 : 2} 
          className="bg-light border-end vh-100 position-sticky top-0"
          style={{ transition: 'all 0.3s' }}
        >
          <div className="p-3">
            <button
              className="btn btn-sm btn-outline-secondary w-100 mb-3"
              onClick={() => setCollapsed(!collapsed)}
            >
              <i className={`bi bi-${collapsed ? 'chevron-right' : 'chevron-left'}`}></i>
            </button>

            <Nav className="flex-column">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center py-2 px-3 mb-1 rounded ${
                      isActive ? 'bg-primary text-white' : 'text-dark'
                    }`
                  }
                  title={item.label}
                >
                  <item.icon className="me-2" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </Nav>
          </div>
        </Col>

        {/* Main Content */}
        <Col md={collapsed ? 11 : 10} className="p-0">
          <Outlet />
        </Col>
      </Row>
    </Container>
  );
};

export default EmployeeLayout;
