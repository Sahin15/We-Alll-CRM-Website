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
  Modal,
} from "react-bootstrap";
import { 
  FaBars, 
  FaUserCircle, 
  FaSearch, 
  FaClock, 
  FaHome,
  FaUsers,
  FaTasks,
  FaCalendarAlt,
  FaFileAlt,
  FaSignOutAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { checkPageAccess, PAGE_ACCESS } from "../../constants/pageAccess";
import { resolveProfilePictureUrl } from "../../utils/profilePictureUrl";

const withCacheBust = (url) => {
  if (!url || !url.includes(".amazonaws.com")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
};
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import api from "../../services/api";
import workItemApi from "../../api/workItemApi";

const CompanySwitcher = lazy(() => import("../admin/CompanySwitcher"));
const NotificationBell = lazy(() => import("../notifications/NotificationBell"));
const QuickClockInOut = lazy(() => import("../attendance/QuickClockInOut"));

const NavbarLazy = ({ children }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

const Navbar = ({ toggleSidebar }) => {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [profileImgSrc, setProfileImgSrc] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setImageLoadError(false);
    setProfileImgSrc(
      user?.profilePicture ? resolveProfilePictureUrl(user.profilePicture) : null
    );
  }, [user?.profilePicture]);

  // Check if user has permission to see company switcher
  const canSwitchCompany = canAccess('billing.invoice.view', ['admin', 'superadmin', 'accounts']);

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

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
    navigate("/login");
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
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
      if (checkPageAccess(canAccess, PAGE_ACCESS.profileHrView)) {
        try {
          const usersRes = await api.get(`/users`);
          const users = usersRes.data
            .filter(u => 
              u.name?.toLowerCase().includes(query.toLowerCase()) ||
              u.email?.toLowerCase().includes(query.toLowerCase()) ||
              u.employeeId?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 3);
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
        const tasksRes = await workItemApi.getMyWork({ type: 'task' });
        const tasks = (tasksRes.data || [])
          .filter(t => t.title?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);
        tasks.forEach(t => {
          results.push({
            type: 'task',
            icon: <FaTasks className="text-info" />,
            title: t.title,
            subtitle: `Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}`,
            path: '/employee/my-work',
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
        { keyword: 'task', title: 'My Tasks', path: user?.role === 'employee' ? '/employee/my-work' : '/tasks', icon: <FaTasks className="text-info" /> },
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
      return []; // Removed Add Employee and Approve Leaves buttons from navbar
    }
    return [];
  };

  const quickActions = getQuickActions();
  const showStaffNavbarActions =
    user?.role !== "admin" &&
    user?.role !== "superadmin" &&
    checkPageAccess(canAccess, PAGE_ACCESS.navbarStaffMenu);

  return (
    <BSNavbar 
      className="shadow-sm py-2 mobile-navbar" 
      sticky="top"
      style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
        minHeight: '70px',
        zIndex: 1030,
        borderRadius: '0 0 0 16px',
        overflow: 'visible',
      }}
    >
      <Container fluid className="px-2 px-md-3" style={{ overflow: 'visible' }}>
        {/* Left Section: Menu Toggle */}
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-link text-white p-2 touch-target" 
            onClick={toggleSidebar}
            style={{ fontSize: '1.2rem' }}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>
        </div>

        {/* Center Section: Search Bar */}
        {!showCompanySwitcher && (
          <div className="mx-auto d-none d-lg-block position-relative" style={{ maxWidth: '500px', width: '100%' }} ref={searchRef}>
            <Form onSubmit={handleSearch}>
              <InputGroup 
                className="search-bar-container"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(15px)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.25) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)';
                }}
              >
                <Form.Control
                  type="text"
                  placeholder="🔍 Search anything... users, tasks, policies"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  className="border-0"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'white',
                    fontSize: '14px',
                    paddingLeft: '20px',
                    paddingRight: '8px',
                    fontWeight: '400',
                  }}
                />
                {searchQuery && (
                  <Button 
                    variant="link"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.7)',
                      padding: '0 8px',
                      fontSize: '18px',
                    }}
                  >
                    ✕
                  </Button>
                )}
                <Button 
                  variant="link" 
                  type="submit"
                  disabled={isSearching}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    paddingRight: '16px',
                    fontSize: '16px',
                  }}
                >
                  {isSearching ? <Spinner animation="border" size="sm" style={{ color: 'white' }} /> : <FaSearch />}
                </Button>
              </InputGroup>
            </Form>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div 
                className="position-absolute w-100 mt-2 shadow-lg rounded"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 10000,
                  position: 'absolute',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  backdropFilter: 'blur(10px)',
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
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="me-3" style={{ fontSize: '1.2rem' }}>
                          {result.icon}
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{result.title}</div>
                          <small className="text-muted">{result.subtitle}</small>
                        </div>
                        <Badge 
                          className="text-capitalize"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                          }}
                        >
                          {result.type}
                        </Badge>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item 
                      className="text-center text-muted py-3"
                      style={{ backgroundColor: 'transparent' }}
                    >
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
            <NavbarLazy>
              <CompanySwitcher />
            </NavbarLazy>
          </div>
        )}

        {/* Right Section: Quick Actions, Notifications, User Menu */}
        <Nav className="ms-auto align-items-center gap-1 gap-md-2" style={{ overflow: 'visible' }}>
          {/* Clock In/Out for Employees, HR, HOD, Accounts, and Manager */}
          {showStaffNavbarActions && (
            <>
              {/* Desktop version with labels */}
              <div className="d-none d-lg-flex me-2" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <NavbarLazy>
                    <QuickClockInOut showLabel={true} />
                  </NavbarLazy>
                </div>
              </div>
              {/* Mobile/Tablet version without labels (icon only) */}
              <div className="d-flex d-lg-none me-1" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <NavbarLazy>
                    <QuickClockInOut showLabel={false} size="sm" />
                  </NavbarLazy>
                </div>
              </div>
            </>
          )}

          {/* Quick Actions for other roles */}
          {quickActions.length > 0 && (
            <div className="d-none d-xl-flex me-2">
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
          <div className="me-1 me-md-2">
            <NavbarLazy>
              <NotificationBell />
            </NavbarLazy>
          </div>

          {/* Work Mobile App Icon */}
          <div className="me-1 me-md-2">
            <button
              onClick={() => navigate('/mobileapp')}
              title="Work App - Clock In/Out, Work Log, Leave, Expenses"
              aria-label="Open Work App"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                cursor: 'pointer',
                padding: '8px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              📱
            </button>
          </div>

          {/* User Dropdown */}
          <NavDropdown
            title={
              <div className="d-flex align-items-center">
                <div className="profile-avatar-wrapper">
                  {user?.profilePicture && !imageLoadError && profileImgSrc ? (
                    <Image
                      key={profileImgSrc}
                      src={profileImgSrc}
                      alt={user.name}
                      roundedCircle
                      width={42}
                      height={42}
                      className="profile-avatar"
                      style={{ 
                        objectFit: "cover"
                      }}
                      onError={() => {
                        if (
                          user.profilePicture?.includes(".amazonaws.com") &&
                          !profileImgSrc.includes("v=")
                        ) {
                          setProfileImgSrc(
                            withCacheBust(resolveProfilePictureUrl(user.profilePicture))
                          );
                          return;
                        }
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
                    {user?.role === 'employee' ? (user?.funBadge || 'Team Member').toUpperCase() : user?.role?.toUpperCase()}
                  </span>
                </div>
              </div>
            }
            id="user-dropdown"
            align="end"
            className="user-dropdown"
          >
            <div className="user-dropdown-header px-3 py-2 border-bottom" style={{ maxWidth: "280px" }}>
              <div className="fw-bold text-truncate" style={{ maxWidth: "100%" }} title={user?.name || "User"}>
                {user?.name || "User"}
              </div>
              <div className="small text-muted text-truncate" style={{ maxWidth: "100%" }}>
                {user?.email || "No email"}
              </div>
              <div className="mt-1">
                <Badge bg="primary" className="user-role-badge">
                  {user?.role === 'employee'
                    ? (user?.funBadge || 'Team Member')
                    : (user?.role || 'User').toUpperCase()}
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
            <NavDropdown.Item className="user-dropdown-logout" onClick={handleLogoutClick}>
              Logout
            </NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Container>

      {/* Logout Confirmation Modal */}
      <Modal 
        show={showLogoutModal} 
        onHide={handleLogoutCancel}
        centered
        backdrop="static"
        className="logout-confirm-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div 
              className="rounded-circle p-3 me-3"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              <FaSignOutAlt className="text-white" size={24} />
            </div>
            <span>Confirm Logout</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-4">
          <p className="mb-0 logout-confirm-message" style={{ fontSize: '1.05rem' }}>
            Are you sure you want to logout? You'll need to sign in again to access your account.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button 
            variant="light" 
            onClick={handleLogoutCancel}
            className="px-4"
            style={{
              fontWeight: '500',
              borderRadius: '8px'
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleLogoutConfirm}
            className="px-4"
            style={{
              fontWeight: '600',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            <FaSignOutAlt className="me-2" />
            Logout
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom CSS for dropdown styling and mobile responsiveness */}
      <style>{`
        .logout-confirm-modal .modal-content,
        .logout-confirm-modal .modal-header,
        .logout-confirm-modal .modal-body,
        .logout-confirm-modal .modal-footer {
          background-color: #ffffff !important;
          color: #212529 !important;
        }

        .logout-confirm-modal .modal-title,
        .logout-confirm-modal .modal-title span {
          color: #212529 !important;
        }

        .logout-confirm-modal .logout-confirm-message {
          color: #495057 !important;
        }

        .logout-confirm-modal .btn-close {
          filter: none !important;
          opacity: 0.55;
        }

        /* Mobile Navbar Adjustments */
        @media (max-width: 575.98px) {
          .mobile-navbar {
            min-height: 60px !important;
            padding: 8px 0 !important;
          }
          
          .mobile-navbar .container-fluid {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          
          .mobile-navbar .btn-link {
            padding: 8px !important;
            font-size: 1.1rem !important;
          }
          
          .mobile-navbar .nav {
            gap: 4px !important;
          }
        }
        

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
        
        /* Mobile adjustments for user dropdown */
        @media (max-width: 575.98px) {
          .user-dropdown .dropdown-toggle {
            padding: 4px 8px 4px 4px !important;
            border-radius: 25px !important;
          }
          
          .profile-avatar,
          .profile-avatar-placeholder {
            width: 36px !important;
            height: 36px !important;
          }
          
          .profile-initials {
            font-size: 14px !important;
          }
          
          .profile-status-indicator {
            width: 10px !important;
            height: 10px !important;
          }
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
        
        /* User Dropdown - Higher z-index to appear above other elements */
        .user-dropdown {
          position: relative !important;
          z-index: 99999 !important;
        }
        
        /* Ensure navbar doesn't clip dropdown */
        .mobile-navbar,
        .mobile-navbar .container-fluid,
        .mobile-navbar .navbar-nav {
          overflow: visible !important;
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
          max-height: 420px !important;
          overflow-y: auto !important;
          animation: dropdownSlideIn 0.3s ease-out !important;
          z-index: 99999 !important;
          position: absolute !important;
          top: 100% !important;
          right: 0 !important;
          left: auto !important;
        }
        
        /* Mobile dropdown adjustments */
        @media (max-width: 575.98px) {
          .user-dropdown .dropdown-menu {
            min-width: 260px !important;
            margin-top: 8px !important;
            border-radius: 12px !important;
            right: 0 !important;
            left: auto !important;
          }
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
        .user-dropdown .dropdown-menu .user-dropdown-header,
        .user-dropdown .dropdown-menu .border-bottom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          padding: 16px 20px !important;
          border: none !important;
        }
        
        .user-dropdown .dropdown-menu .user-dropdown-header .fw-bold,
        .user-dropdown .dropdown-menu .border-bottom .fw-bold {
          font-size: 1rem !important;
          font-weight: 600 !important;
          margin-bottom: 4px !important;
          color: white !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 240px !important;
        }
        
        .user-dropdown .dropdown-menu .user-dropdown-header .text-muted,
        .user-dropdown .dropdown-menu .border-bottom .text-muted {
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: 0.875rem !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 240px !important;
        }
        
        .user-dropdown .dropdown-menu .user-dropdown-header .badge,
        .user-dropdown .dropdown-menu .border-bottom .badge,
        .user-dropdown .dropdown-menu .user-role-badge {
          margin-top: 8px !important;
          padding: 6px 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.02em !important;
          background: rgba(255, 255, 255, 0.25) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          color: #fff !important;
          text-transform: uppercase !important;
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
        .user-dropdown .dropdown-item.user-dropdown-logout,
        .user-dropdown .dropdown-item:last-child {
          color: #ef4444 !important;
          font-weight: 600 !important;
        }
        
        .user-dropdown .dropdown-item.user-dropdown-logout:hover,
        .user-dropdown .dropdown-item:last-child:hover {
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%) !important;
          border-left-color: #ef4444 !important;
          color: #ef4444 !important;
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
