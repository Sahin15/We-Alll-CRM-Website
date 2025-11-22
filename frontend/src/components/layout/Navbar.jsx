import {
  Navbar as BSNavbar,
  Container,
  Nav,
  NavDropdown,
  Image,
  Form,
  InputGroup,
  Button,
  Badge,
  ListGroup,
  Spinner,
} from "react-bootstrap";
import { 
  FaBars, 
  FaUserCircle, 
  FaSearch, 
  FaClock, 
  FaPlus,
  FaHome,
  FaUsers,
  FaTasks,
  FaCalendarAlt,
  FaFileAlt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import CompanySwitcher from "../admin/CompanySwitcher";
import NotificationBell from "../admin/NotificationBell";
import QuickClockInOut from "../attendance/QuickClockInOut";
import api from "../../services/api";

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const searchRef = useRef(null);

  // Reset image load error when user profile picture changes
  useEffect(() => {
    setImageLoadError(false);
  }, [user?.profilePicture]);

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

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsSearching(true);
    try {
      const results = [];

      // Search Users (for HR, Admin, SuperAdmin)
      if (['hr', 'admin', 'superadmin'].includes(user?.role)) {
        try {
          const usersRes = await api.get(`/users?search=${query}`);
          const users = usersRes.data.slice(0, 3);
          users.forEach(u => {
            results.push({
              type: 'user',
              icon: <FaUsers className="text-primary" />,
              title: u.name,
              subtitle: u.email,
              path: `/users/${u._id}`,
            });
          });
        } catch (err) {
          console.error('Error searching users:', err);
        }
      }

      // Search Tasks (for all users)
      try {
        const tasksRes = await api.get(`/tasks/my-tasks`);
        const tasks = tasksRes.data
          .filter(t => t.title?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);
        tasks.forEach(t => {
          results.push({
            type: 'task',
            icon: <FaTasks className="text-info" />,
            title: t.title,
            subtitle: `Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}`,
            path: user?.role === 'employee' ? '/employee/tasks' : '/tasks',
          });
        });
      } catch (err) {
        console.error('Error searching tasks:', err);
      }

      // Search Policies
      try {
        const policiesRes = await api.get(`/policies`);
        const policies = policiesRes.data
          .filter(p => p.title?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 2);
        policies.forEach(p => {
          results.push({
            type: 'policy',
            icon: <FaFileAlt className="text-success" />,
            title: p.title,
            subtitle: p.category || 'Policy',
            path: user?.role === 'employee' ? '/employee/policies' : '/policies',
          });
        });
      } catch (err) {
        console.error('Error searching policies:', err);
      }

      // Quick navigation suggestions
      const quickNav = [
        { keyword: 'dashboard', title: 'Dashboard', path: '/dashboard', icon: <FaHome className="text-warning" /> },
        { keyword: 'profile', title: 'My Profile', path: user?.role === 'employee' ? '/employee/profile' : '/profile', icon: <FaUserCircle className="text-secondary" /> },
        { keyword: 'leave', title: 'My Leaves', path: user?.role === 'employee' ? '/employee/leaves' : '/leaves/my-leaves', icon: <FaCalendarAlt className="text-danger" /> },
        { keyword: 'attendance', title: 'My Attendance', path: user?.role === 'employee' ? '/employee/attendance' : '/attendance/my-attendance', icon: <FaClock className="text-primary" /> },
        { keyword: 'task', title: 'My Tasks', path: user?.role === 'employee' ? '/employee/tasks' : '/tasks', icon: <FaTasks className="text-info" /> },
      ].filter(nav => nav.keyword.includes(query.toLowerCase()) || nav.title.toLowerCase().includes(query.toLowerCase()));

      quickNav.forEach(nav => {
        results.push({
          type: 'navigation',
          icon: nav.icon,
          title: nav.title,
          subtitle: 'Quick Navigation',
          path: nav.path,
        });
      });

      setSearchResults(results.slice(0, 8)); // Limit to 8 results
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      // Navigate to first result
      navigate(searchResults[0].path);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  const handleResultClick = (path) => {
    navigate(path);
    setSearchQuery("");
    setShowSearchResults(false);
  };



  // Quick action based on role
  const getQuickActions = () => {
    if (user?.role === 'hr') {
      return [
        { label: 'Add Employee', icon: <FaPlus />, action: () => navigate('/employees/add') },
        { label: 'Approve Leaves', icon: <FaClock />, action: () => navigate('/leaves/requests') },
      ];
    } else if (user?.role === 'admin' || user?.role === 'superadmin') {
      return [
        { label: 'Add Employee', icon: <FaPlus />, action: () => navigate('/employees/add') },
        { label: 'View Reports', icon: <FaClock />, action: () => navigate('/dashboard') },
      ];
    }
    return [];
  };

  const quickActions = getQuickActions();

  return (
    <BSNavbar 
      className="shadow-sm py-2" 
      sticky="top"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '70px',
        zIndex: 1030
      }}
    >
      <Container fluid>
        {/* Left Section: Menu Toggle */}
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-link text-white p-2" 
            onClick={toggleSidebar}
            style={{ fontSize: '1.2rem' }}
          >
            <FaBars />
          </button>
        </div>

        {/* Center Section: Search Bar */}
        {!showCompanySwitcher && (
          <div className="mx-auto d-none d-lg-block position-relative" style={{ maxWidth: '500px', width: '100%' }} ref={searchRef}>
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search users, tasks, policies... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  className="border-0"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Button 
                  variant="light" 
                  type="submit"
                  disabled={isSearching}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white'
                  }}
                >
                  {isSearching ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                </Button>
              </InputGroup>
            </Form>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div 
                className="position-absolute w-100 mt-2 shadow-lg rounded"
                style={{
                  backgroundColor: 'white',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1050,
                }}
              >
                <ListGroup variant="flush">
                  {searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <ListGroup.Item
                        key={index}
                        action
                        onClick={() => handleResultClick(result.path)}
                        className="d-flex align-items-center py-3"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="me-3" style={{ fontSize: '1.2rem' }}>
                          {result.icon}
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{result.title}</div>
                          <small className="text-muted">{result.subtitle}</small>
                        </div>
                        <Badge bg="light" text="dark" className="text-capitalize">
                          {result.type}
                        </Badge>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item className="text-center text-muted py-3">
                      No results found
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            )}
          </div>
        )}

        {/* Company Switcher - visible only on billing pages for authorized users */}
        {showCompanySwitcher && (
          <div className="mx-auto">
            <CompanySwitcher />
          </div>
        )}

        {/* Right Section: Quick Actions, Notifications, User Menu */}
        <Nav className="ms-auto align-items-center">
          {/* Clock In/Out for Employees, HR, HOD, and Accounts */}
          {['employee', 'hr', 'hod', 'accounts'].includes(user?.role) && (
            <div className="d-none d-xl-flex me-3">
              <QuickClockInOut />
            </div>
          )}

          {/* Quick Actions for other roles */}
          {quickActions.length > 0 && (
            <div className="d-none d-xl-flex me-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="light"
                  size="sm"
                  className="me-2 d-flex align-items-center"
                  onClick={action.action}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontWeight: '500'
                  }}
                >
                  <span className="me-2">{action.icon}</span>
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Notification Bell */}
          <div className="me-3">
            <NotificationBell />
          </div>

          {/* User Dropdown */}
          <NavDropdown
            title={
              <div className="d-flex align-items-center">
                <div className="profile-avatar-wrapper">
                  {user?.profilePicture && !imageLoadError ? (
                    <Image
                      key={user.profilePicture}
                      src={user.profilePicture}
                      alt={user.name}
                      roundedCircle
                      width={42}
                      height={42}
                      className="profile-avatar"
                      style={{ 
                        objectFit: "cover"
                      }}
                      onError={() => {
                        setImageLoadError(true);
                      }}
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      <span className="profile-initials">
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="profile-status-indicator"></span>
                </div>
                <div className="d-none d-lg-flex flex-column ms-2 text-start">
                  <span className="text-white fw-medium" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                    {user?.name?.split(' ')[0] || "User"}
                  </span>
                  <span className="text-white-50" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                    {user?.role?.toUpperCase()}
                  </span>
                </div>
              </div>
            }
            id="user-dropdown"
            align="end"
            className="user-dropdown"
          >
            <div className="px-3 py-2 border-bottom bg-light">
              <div className="fw-bold">{user?.name || "User"}</div>
              <div className="small text-muted">
                {user?.email || "No email"}
              </div>
              <div className="mt-1">
                <Badge bg="primary" className="text-capitalize">
                  {user?.role}
                </Badge>
              </div>
            </div>
            <NavDropdown.Item onClick={() => navigate(user?.role === 'employee' ? '/employee/profile' : '/profile')}>
              My Profile
            </NavDropdown.Item>
            <NavDropdown.Item onClick={() => {
              const settingsRoutes = {
                'employee': '/employee/settings',
                'hr': '/hr/settings',
                'admin': '/admin/settings',
                'superadmin': '/admin/settings',
                'hod': '/hod/settings',
                'accounts': '/employee/settings'
              };
              navigate(settingsRoutes[user?.role] || '/employee/settings');
            }}>
              Settings
            </NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Container>

      {/* Custom CSS for dropdown styling */}
      <style>{`
        /* User Dropdown Toggle Button */
        .user-dropdown .dropdown-toggle {
          background: rgba(255, 255, 255, 0.15) !important;
          border-radius: 30px !important;
          padding: 6px 16px 6px 6px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          display: flex !important;
          align-items: center !important;
          backdrop-filter: blur(10px) !important;
        }
        
        .user-dropdown .dropdown-toggle:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
        }
        
        .user-dropdown .dropdown-toggle:active {
          transform: translateY(0);
        }
        
        .user-dropdown .dropdown-toggle::after {
          color: white !important;
          margin-left: 10px !important;
          vertical-align: middle !important;
          transition: transform 0.3s ease !important;
        }
        
        .user-dropdown.show .dropdown-toggle::after {
          transform: rotate(180deg);
        }
        
        /* Dropdown Menu */
        .user-dropdown .dropdown-menu {
          font-family: 'Inter', sans-serif !important;
          border: none !important;
          border-radius: 16px !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
          padding: 0 !important;
          margin-top: 12px !important;
          min-width: 280px !important;
          overflow: hidden !important;
          animation: dropdownSlideIn 0.3s ease-out !important;
        }
        
        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Dropdown Header */
        .user-dropdown .dropdown-menu .border-bottom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          padding: 20px !important;
          border: none !important;
        }
        
        .user-dropdown .dropdown-menu .border-bottom .fw-bold {
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          margin-bottom: 4px !important;
          color: white !important;
        }
        
        .user-dropdown .dropdown-menu .border-bottom .text-muted {
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: 0.875rem !important;
        }
        
        .user-dropdown .dropdown-menu .border-bottom .badge {
          margin-top: 8px !important;
          padding: 6px 12px !important;
          font-weight: 500 !important;
          background: rgba(255, 255, 255, 0.25) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
        }
        
        /* Dropdown Items */
        .user-dropdown .dropdown-item {
          padding: 14px 20px !important;
          font-size: 0.95rem !important;
          font-weight: 500 !important;
          color: #374151 !important;
          transition: all 0.2s ease !important;
          border-left: 3px solid transparent !important;
        }
        
        .user-dropdown .dropdown-item:hover {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, rgba(102, 126, 234, 0.02) 100%) !important;
          border-left-color: #667eea !important;
          color: #667eea !important;
          padding-left: 24px !important;
        }
        
        .user-dropdown .dropdown-item:active {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.12) 0%, rgba(102, 126, 234, 0.04) 100%) !important;
        }
        
        /* Dropdown Divider */
        .user-dropdown .dropdown-divider {
          margin: 8px 0 !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
        }
        
        /* Logout Item */
        .user-dropdown .dropdown-item:last-child {
          color: #ef4444 !important;
          font-weight: 600 !important;
        }
        
        .user-dropdown .dropdown-item:last-child:hover {
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%) !important;
          border-left-color: #ef4444 !important;
        }
        
        /* Search Bar */
        .form-control::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        
        /* Profile Avatar Styling */
        .profile-avatar-wrapper {
          position: relative;
          display: inline-block;
        }
        
        .profile-avatar {
          border: 3px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .profile-avatar:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
          border-color: white;
        }
        
        .profile-avatar-placeholder {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border: 3px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .profile-avatar-placeholder:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
          border-color: white;
        }
        
        .profile-initials {
          color: white;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          font-family: 'Inter', sans-serif;
        }
        
        .profile-status-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          animation: pulse-status 2s ease-in-out infinite;
        }
        
        @keyframes pulse-status {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </BSNavbar>
  );
};

export default Navbar;
