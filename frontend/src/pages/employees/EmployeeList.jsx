import { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  InputGroup,
  Badge,
  Spinner,
  Dropdown,
  Alert,
  OverlayTrigger,
  Tooltip,
  Table,
} from "react-bootstrap";
import {
  FaPlus,
  FaSearch,
  FaEye,
  FaTrash,
  FaFilter,
  FaDownload,
  FaUsers,
  FaClock,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaUserShield,
  FaBell,
  FaEnvelope,
  FaIdCard,
  FaTh,
  FaList,
  FaPhone,
  FaUser,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { useBreakpoint } from "../../context/BreakpointContext";
import api from "../../services/api";
import ProfilePictureDisplay from "../../components/profile/ProfilePictureDisplay";
import StatusBadge from "../../components/hr/StatusBadge";
import MobileFilterSheet from "../../components/shared/MobileFilterSheet";


const EmployeeList = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isCompact } = useBreakpoint();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [viewMode, setViewMode] = useState("cards"); // Default to cards view

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, statusFilter, departmentFilter]);

  useEffect(() => {
    if (isCompact) setViewMode("cards");
  }, [isCompact]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Fetch all employee-level users with a high limit to avoid pagination cutoff
      const response = await api.get("/users", { params: { limit: 1000 } });
      // Filter only employees (including all employee-level roles)
      // Exclude superadmin, admin, client, accounts roles
      const employeeData = response.data.filter(
        (u) =>
          (u.role === "employee" ||
            u.role === "hod" ||
            u.role === "hr" ||
            u.role === "manager") &&
          // Only include known statuses — exclude any with missing/unknown status
          (u.status === "active" ||
            u.status === "inactive" ||
            u.status === "terminated" ||
            u.status === "offboarded")
      );
      setEmployees(employeeData);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((emp) => emp.status === statusFilter);
    }

    // Department filter
    if (departmentFilter) {
      filtered = filtered.filter(
        (emp) => emp.department?._id === departmentFilter
      );
    }

    setFilteredEmployees(filtered);
  };

  // Three sections: active-only, inactive-only, and past members (terminated/offboarded)
  // Also check isActive flag — some users may have isActive:false but status still 'active'
  const activeEmployees = filteredEmployees.filter(
    (emp) => emp.status === "active" && emp.isActive !== false
  );
  const inactiveEmployees = filteredEmployees.filter(
    (emp) => emp.status === "inactive" || emp.isActive === false
  );
  const pastMembersSection = filteredEmployees.filter(
    (emp) => emp.status === "terminated" || emp.status === "offboarded"
  );

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success("Employee deleted successfully");
        fetchEmployees();
      } catch (error) {
        console.error("Error deleting employee:", error);
        toast.error("Failed to delete employee");
      }
    }
  };



  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading employees...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', minHeight: '100vh' }}>
      {/* Modern Header with Clean Background */}
      <Card className="border-0 shadow-lg mb-4" style={{ 
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                  <FaUsers size={24} className="text-primary" />
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-dark">Employee Management Hub</h2>
                  <p className="mb-0 text-muted">
                    Comprehensive employee management with advanced analytics and insights
                  </p>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-end">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/employees/add")}
                className="shadow-sm fw-semibold"
                style={{ borderRadius: '15px' }}
              >
                <FaPlus className="me-2" />
                Add New Employee
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Enhanced Info Alert */}
      <Row className="mb-4">
        <Col>
          <Alert 
            variant="info" 
            className="border-0 shadow-sm"
            style={{ 
              background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              borderRadius: '15px',
              border: '1px solid rgba(33, 150, 243, 0.2)'
            }}
          >
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-20 p-2 rounded-circle me-3">
                <FaUserShield className="text-primary" />
              </div>
              <div>
                <strong className="text-primary">Professional Employee Management:</strong>
                <p className="mb-0 mt-1 text-muted">
                  Access comprehensive employee profiles with personal details, documents, salary records, 
                  and complete HR management through the "Manage Profile" action.
                </p>
              </div>
            </div>
          </Alert>
        </Col>
      </Row>

      {/* Enhanced Stats Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-primary fw-semibold">Total Employees</p>
                  <h2 className="mb-0 text-dark fw-bold">{employees.length}</h2>
                  <small className="text-muted">Active workforce</small>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                  <FaUsers size={28} className="text-primary" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-success fw-semibold">Active Status</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {employees.filter((e) => e.status === "active").length}
                  </h2>
                  <small className="text-muted">Currently working</small>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                  <FaChartLine size={28} className="text-success" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-warning fw-semibold">Inactive Status</p>
                  <h2 className="mb-0 text-dark fw-bold">
                    {employees.filter((e) => e.status === "inactive").length}
                  </h2>
                  <small className="text-muted">On leave/inactive</small>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                  <FaClock size={28} className="text-warning" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-lg h-100" style={{ borderRadius: '20px', background: '#f8f9fa' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="mb-2 text-info fw-semibold">Departments</p>
                  <h2 className="mb-0 text-dark fw-bold">{departments.length}</h2>
                  <small className="text-muted">Active departments</small>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                  <FaBuilding size={28} className="text-info" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Filters and Search */}
      <Card className="border-0 shadow-lg mb-4" style={{ borderRadius: '20px' }}>
        <Card.Header className="bg-white border-0 pt-4 pb-0" style={{ borderRadius: '20px 20px 0 0' }}>
          <h5 className="mb-0 text-dark fw-bold">
            <FaFilter className="me-2 text-primary" />
            Advanced Search & Filters
          </h5>
        </Card.Header>
        <Card.Body className="p-4">
          <MobileFilterSheet
            title="Search & filters"
            activeFilterCount={[searchTerm, statusFilter, departmentFilter].filter(Boolean).length}
            onClear={() => {
              setSearchTerm("");
              setStatusFilter("");
              setDepartmentFilter("");
            }}
            showApply={false}
          >
          <Row className="g-3">
            <Col lg={4} md={6}>
              <Form.Label className="fw-semibold text-muted small">SEARCH EMPLOYEES</Form.Label>
              <InputGroup className="shadow-sm">
                <InputGroup.Text className="bg-light border-0">
                  <FaSearch className="text-primary" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-light"
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={3}>
              <Form.Label className="fw-semibold text-muted small">STATUS</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="shadow-sm border-0 bg-light"
                style={{ borderRadius: '10px' }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
                <option value="offboarded">Offboarded</option>
              </Form.Select>
            </Col>
            <Col lg={3} md={3}>
              <Form.Label className="fw-semibold text-muted small">DEPARTMENT</Form.Label>
              <Form.Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="shadow-sm border-0 bg-light"
                style={{ borderRadius: '10px' }}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={3} md={12}>
              <Form.Label className="fw-semibold text-muted small">ACTIONS</Form.Label>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary" 
                  className="flex-fill shadow-sm fw-semibold"
                  style={{ borderRadius: '10px' }}
                >
                  <FaDownload className="me-2" />
                  Export Data
                </Button>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>Clear all filters</Tooltip>}
                >
                  <Button 
                    variant="outline-secondary"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setDepartmentFilter('');
                    }}
                    style={{ borderRadius: '10px' }}
                  >
                    <FaFilter />
                  </Button>
                </OverlayTrigger>
              </div>
            </Col>
          </Row>
          </MobileFilterSheet>
        </Card.Body>
      </Card>

      {/* Modern Employee Cards/Table */}
      <Card className="border-0 shadow-lg employee-list-shell-card" style={{ borderRadius: '20px' }}>
        <Card.Header className="bg-white border-0 pt-4 pb-3 employee-list-card-header" style={{ borderRadius: '20px 20px 0 0' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3 w-100">
            <h5 className="mb-0 text-dark fw-bold">
              <FaUsers className="me-2 text-primary" />
              Active Employees ({activeEmployees.length})
            </h5>
            <div className="employee-list-view-controls w-100 w-md-auto">
              <div className="employee-view-toggle" role="group" aria-label="Employee view mode">
                <Button
                  variant={viewMode === "cards" ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  title="Card View"
                  className={`employee-view-toggle__btn fw-semibold ${viewMode === "cards" ? "active" : ""}`}
                  aria-pressed={viewMode === "cards"}
                >
                  <FaTh className="me-1" />
                  <span className="employee-view-toggle__label">Cards</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "primary" : "outline-primary"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  title="List View"
                  className={`employee-view-toggle__btn fw-semibold ${viewMode === "list" ? "active" : ""}`}
                  aria-pressed={viewMode === "list"}
                >
                  <FaList className="me-1" />
                  <span className="employee-view-toggle__label">List</span>
                </Button>
              </div>
              <Badge bg="primary" className="px-3 py-2 rounded-pill d-none d-md-inline-flex">
                {activeEmployees.length} Results
              </Badge>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-0" style={{ overflow: 'visible' }}>
          <style>{`
            .employee-card {
              transition: all 0.3s ease;
              border-radius: 15px;
              border: 1px solid rgba(0,0,0,0.05);
              position: relative;
              overflow: visible !important;
            }
            .employee-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.1);
              border-color: rgba(102, 126, 234, 0.3);
              z-index: 10;
            }
            .employee-avatar {
              width: 60px;
              height: 60px;
              border-radius: 15px;
              object-fit: cover;
              border: 3px solid #fff;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .employee-avatar-placeholder {
              width: 60px;
              height: 60px;
              border-radius: 15px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 1.2rem;
              border: 3px solid #fff;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .status-badge {
              border-radius: 20px;
              padding: 0.4rem 0.8rem;
              font-weight: 600;
              font-size: 0.75rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .action-btn {
              border-radius: 10px;
              padding: 0.5rem 1rem;
              font-weight: 600;
              transition: all 0.2s ease;
            }
            .action-btn:hover {
              transform: translateY(-1px);
            }
            .action-btn.btn-primary {
              background: #6366F1 !important;
              border-color: #6366F1 !important;
              color: #fff !important;
            }
            .action-btn.btn-primary:hover {
              background: #4F46E5 !important;
              border-color: #4F46E5 !important;
              box-shadow: 0 4px 12px rgba(99,102,241,0.35) !important;
            }
            .action-btn.btn-outline-primary {
              color: #6366F1 !important;
              border-color: #6366F1 !important;
              background: transparent !important;
            }
            .action-btn.btn-outline-primary:hover {
              background: #6366F1 !important;
              color: #fff !important;
              box-shadow: 0 4px 12px rgba(99,102,241,0.25) !important;
            }
            
            /* Smart Dropdown System - Auto-adjusts based on available space */
            .smart-dropdown-menu {
              z-index: 1060 !important;
              border: none !important;
              box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
              min-width: 200px;
              max-width: 250px;
              animation: dropdownFadeIn 0.15s ease-out;
              margin-top: 5px !important;
              margin-bottom: 5px !important;
            }
            
            @keyframes dropdownFadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            /* Ensure parent containers support dropdowns */
            .card, .card-body, .row, .container-fluid {
              overflow: visible !important;
            }
            
            /* Employee card hover effects */
            .employee-card {
              position: relative;
              z-index: 1;
            }
            
            .employee-card:hover {
              z-index: 10;
            }
            
            /* When dropdown is open, boost z-index */
            .employee-card .show {
              z-index: 1070 !important;
            }
            
            .employee-card .dropdown.show {
              z-index: 1070 !important;
            }
            .employee-info-item {
              display: flex;
              align-items: center;
              margin-bottom: 0.5rem;
              color: #6c757d;
              font-size: 0.85rem;
            }
            .employee-info-item .icon {
              width: 16px;
              margin-right: 8px;
              color: #667eea;
              flex-shrink: 0;
            }
            .employee-info-item span,
            .employee-info-text {
              min-width: 0;
              flex: 1;
            }
            
            /* Fix for profile picture wrapper sizing */
            .profile-picture-display {
              display: inline-block;
            }
            
            .profile-picture-container {
              display: inline-block;
              gap: 0;
            }
            
            /* Ensure text doesn't overflow */
            .min-width-0 {
              min-width: 0;
            }
            
            .text-truncate {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            /* Flex utilities for better layout */
            .flex-shrink-0 {
              flex-shrink: 0;
            }
          `}</style>
          
          {activeEmployees.length > 0 ? (
            <div className="p-2 p-md-4 employee-cards-grid" style={{ overflow: 'visible' }}>
              {viewMode === "cards" ? (
                // Card View (Original)
                <Row className="g-4" style={{ overflow: 'visible' }}>
                  {activeEmployees.map((employee) => (
                    <Col xs={12} md={6} xl={4} key={employee._id}>
                      <Card className="employee-card h-100 border-0 shadow-sm">
                        <Card.Body className="p-4">
                          {/* Employee Header */}
                          <div className="d-flex align-items-start mb-3">
                            <div className="me-3 flex-shrink-0">
                              <ProfilePictureDisplay
                                profilePicture={employee.profilePicture}
                                userName={employee.name}
                                size={60}
                                showViewButton={false}
                              />
                            </div>
                            <div className="flex-grow-1 min-width-0">
                              <h6 className="mb-1 fw-bold text-dark text-truncate">{employee.name}</h6>
                              <p className="mb-2 text-muted small text-truncate">{employee.designation || "N/A"}</p>
                              <StatusBadge status={employee.status} />
                              {employee.status === 'inactive' && employee.reactivationDate && (
                                <div className="mt-1">
                                  <small className="text-warning fw-semibold">
                                    <FaCalendarAlt className="me-1" size={10} />
                                    Reactivates: {formatDate(employee.reactivationDate)}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Employee Info */}
                          <div className="mb-3">
                            <div className="employee-info-item">
                              <FaIdCard className="icon" />
                              <span>ID: {employee.employeeId || "Not assigned"}</span>
                            </div>
                            <div className="employee-info-item">
                              <FaEnvelope className="icon" />
                              <span className="employee-info-text">{employee.email}</span>
                            </div>
                            <div className="employee-info-item">
                              <FaBuilding className="icon" />
                              <span>{employee.department?.name || "No department"}</span>
                            </div>
                            <div className="employee-info-item">
                              <FaCalendarAlt className="icon" />
                              <span>Joined: {formatDate(employee.joiningDate || employee.hireDate)}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="d-flex flex-column flex-sm-row gap-2 employee-card-actions">
                            <Button
                              variant="primary"
                              size="sm"
                              className="action-btn flex-fill"
                              onClick={() => navigate(`/employees/${employee._id}/profile`)}
                            >
                              <FaUserShield className="me-1" />
                              Manage Profile
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="action-btn flex-fill"
                              onClick={() => navigate(`/employees/${employee._id}/work`)}
                            >
                              <FaClock className="me-1" />
                              Work Details
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                // List View (New Table)
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th className="border-0">Employee</th>
                        <th className="border-0">Department</th>
                        <th className="border-0">Contact</th>
                        <th className="border-0">Status</th>
                        <th className="border-0">Joined</th>
                        <th className="border-0 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map((employee) => (
                        <tr key={employee._id} className="align-middle">
                          <td className="py-3">
                            <div className="d-flex align-items-center">
                              <div className="me-3 flex-shrink-0">
                                <ProfilePictureDisplay
                                  profilePicture={employee.profilePicture}
                                  userName={employee.name}
                                  size={40}
                                  showViewButton={false}
                                />
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{employee.name}</div>
                                <small className="text-muted">
                                  <FaIdCard className="me-1" size={10} />
                                  {employee.employeeId || "Not assigned"}
                                </small>
                                <div className="small text-muted">{employee.designation || "N/A"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="d-flex align-items-center">
                              <FaBuilding className="me-2 text-primary" size={12} />
                              <span>{employee.department?.name || "No department"}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="small">
                              <div className="mb-1">
                                <FaEnvelope className="me-1 text-primary" size={12} />
                                {employee.email}
                              </div>
                              {employee.phone && (
                                <div>
                                  <FaPhone className="me-1 text-primary" size={12} />
                                  {employee.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <StatusBadge status={employee.status} />
                            {employee.status === 'inactive' && employee.reactivationDate && (
                              <div className="mt-1">
                                <small className="text-warning fw-semibold">
                                  <FaCalendarAlt className="me-1" size={10} />
                                  Reactivates: {formatDate(employee.reactivationDate)}
                                </small>
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <small className="text-muted">
                              {formatDate(employee.joiningDate || employee.hireDate)}
                            </small>
                          </td>
                          <td className="py-3 text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => navigate(`/employees/${employee._id}/profile`)}
                                title="Manage Profile"
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <FaUserShield size={12} />
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => navigate(`/employees/${employee._id}/work`)}
                                title="Work Details"
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <FaClock size={12} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-4">
                <FaUsers size={64} className="text-muted opacity-50" />
              </div>
              <h5 className="text-muted mb-2">No Active Employees Found</h5>
              <p className="text-muted mb-4">
                {searchTerm || statusFilter || departmentFilter 
                  ? "Try adjusting your search criteria or filters"
                  : "Start by adding your first employee to the system"
                }
              </p>
              {!searchTerm && !statusFilter && !departmentFilter && (
                <Button
                  variant="primary"
                  onClick={() => navigate("/employees/add")}
                  className="action-btn"
                >
                  <FaPlus className="me-2" />
                  Add First Employee
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Inactive Employees Section */}
      {inactiveEmployees.length > 0 && (
        <Card className="border-0 shadow-lg mt-4" style={{ borderRadius: '20px', overflow: 'visible' }}>
          <Card.Header className="bg-white border-0 pt-4 pb-0" style={{ borderRadius: '20px 20px 0 0' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-dark fw-bold">
                <FaClock className="me-2 text-warning" />
                Inactive Employees ({inactiveEmployees.length})
              </h5>
              <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">
                {inactiveEmployees.length} Results
              </Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-0" style={{ overflow: 'visible' }}>
            {viewMode === "cards" ? (
              <div className="p-2 p-md-4 employee-cards-grid" style={{ overflow: 'visible' }}>
                <Row className="g-4" style={{ overflow: 'visible' }}>
                  {inactiveEmployees.map((employee) => (
                    <Col xs={12} md={6} xl={4} key={employee._id}>
                      <Card className="employee-card h-100 border-0 shadow-sm">
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-start mb-3">
                            <div className="me-3 flex-shrink-0">
                              <ProfilePictureDisplay
                                profilePicture={employee.profilePicture}
                                userName={employee.name}
                                size={60}
                                showViewButton={false}
                              />
                            </div>
                            <div className="flex-grow-1 min-width-0">
                              <h6 className="mb-1 fw-bold text-dark text-truncate">{employee.name}</h6>
                              <p className="mb-2 text-muted small text-truncate">{employee.designation || "N/A"}</p>
                              <StatusBadge status={employee.status} />
                              {employee.reactivationDate && (
                                <div className="mt-1">
                                  <small className="text-warning fw-semibold">
                                    <FaCalendarAlt className="me-1" size={10} />
                                    Reactivates: {formatDate(employee.reactivationDate)}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="employee-info-item">
                              <FaIdCard className="icon" />
                              <span>ID: {employee.employeeId || "Not assigned"}</span>
                            </div>
                            <div className="employee-info-item">
                              <FaEnvelope className="icon" />
                              <span className="employee-info-text">{employee.email}</span>
                            </div>
                            <div className="employee-info-item">
                              <FaBuilding className="icon" />
                              <span>{employee.department?.name || "No department"}</span>
                            </div>
                          </div>
                          <div className="d-flex flex-column flex-sm-row gap-2 employee-card-actions">
                            <Button
                              variant="primary"
                              size="sm"
                              className="action-btn flex-fill"
                              onClick={() => navigate(`/employees/${employee._id}/profile`)}
                            >
                              <FaUserShield className="me-1" />
                              Manage Profile
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-warning">
                    <tr>
                      <th className="border-0">Employee</th>
                      <th className="border-0">Department</th>
                      <th className="border-0">Status</th>
                      <th className="border-0">Reactivation Date</th>
                      <th className="border-0 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveEmployees.map((employee) => (
                      <tr key={employee._id} className="align-middle">
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <div className="me-3 flex-shrink-0">
                              <ProfilePictureDisplay
                                profilePicture={employee.profilePicture}
                                userName={employee.name}
                                size={40}
                                showViewButton={false}
                              />
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{employee.name}</div>
                              <small className="text-muted">
                                <FaIdCard className="me-1" size={10} />
                                {employee.employeeId || "Not assigned"}
                              </small>
                              <div className="small text-muted">{employee.designation || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="d-flex align-items-center">
                            <FaBuilding className="me-2 text-warning" size={12} />
                            <span>{employee.department?.name || "No department"}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={employee.status} />
                        </td>
                        <td className="py-3">
                          {employee.reactivationDate ? (
                            <small className="text-warning fw-semibold">
                              <FaCalendarAlt className="me-1" size={10} />
                              {formatDate(employee.reactivationDate)}
                            </small>
                          ) : (
                            <small className="text-muted">—</small>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate(`/employees/${employee._id}/profile`)}
                            title="Manage Profile"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <FaUserShield size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Past Members Section */}
      {pastMembersSection.length > 0 && (
        <Card className="border-0 shadow-lg mt-4" style={{ borderRadius: '20px', overflow: 'visible' }}>
          <Card.Header className="bg-light border-0 pt-4 pb-0" style={{ borderRadius: '20px 20px 0 0' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-dark fw-bold">
                <FaUsers className="me-2 text-secondary" />
                Past Members ({pastMembersSection.length})
              </h5>
              <Badge bg="secondary" className="px-3 py-2 rounded-pill">
                {pastMembersSection.length} Results
              </Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-0" style={{ overflow: 'visible' }}>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0">Employee</th>
                    <th className="border-0">Department</th>
                    <th className="border-0">Status</th>
                    <th className="border-0">Status Changed</th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastMembersSection.map((employee) => (
                    <tr key={employee._id} className="align-middle">
                      <td className="py-3">
                        <div className="fw-bold text-dark">{employee.name}</div>
                        <small className="text-muted">
                          <FaIdCard className="me-1" size={10} />
                          {employee.employeeId || "Not assigned"}
                        </small>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <FaBuilding className="me-2 text-secondary" size={12} />
                          <span>{employee.department?.name || "No department"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="py-3">
                        <small className="text-muted">
                          {employee.statusChangedAt ? formatDate(employee.statusChangedAt) : "N/A"}
                        </small>
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => navigate(`/employees/${employee._id}/profile`)}
                          title="View Profile"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <FaEye size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default EmployeeList;
