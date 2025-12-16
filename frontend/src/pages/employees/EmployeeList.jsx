import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  InputGroup,
  Badge,
  Spinner,
  Dropdown,
  Alert,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  FaPlus,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaFilter,
  FaDownload,
  FaUsers,
  FaClock,
  FaUserTie,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaFileAlt,
  FaUserShield,
  FaBell,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaStar,
  FaIdCard,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { notifyEmployeeJoined, notifyEmployeePromotion, sendCustomNotification } from "../../services/notificationHelpers";

const EmployeeList = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, statusFilter, departmentFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      // Filter only employees
      const employeeData = response.data.filter(
        (u) => u.role === "employee" || u.role === "hod"
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

  const handleSendNotification = (employee) => {
    // Navigate to notification creation with pre-filled employee data
    navigate('/admin/notifications/create', {
      state: {
        prefilledData: {
          title: `Message for ${employee.name}`,
          message: `Important update for ${employee.name} (${employee.designation || employee.role})`,
          type: 'employee_update',
          recipients: [employee._id]
        }
      }
    });
  };

  const handlePromoteEmployee = (employee) => {
    // For now, navigate to edit employee page
    // In a full implementation, you could create a promotion modal
    navigate(`/employees/${employee._id}/edit`, {
      state: {
        promotionMode: true,
        currentRole: employee.role
      }
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      suspended: "danger",
    };
    return (
      <Badge bg={variants[status] || "secondary"} className="text-capitalize">
        {status}
      </Badge>
    );
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
                <option value="suspended">Suspended</option>
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
        </Card.Body>
      </Card>

      {/* Modern Employee Cards/Table */}
      <Card className="border-0 shadow-lg" style={{ borderRadius: '20px' }}>
        <Card.Header className="bg-white border-0 pt-4 pb-0" style={{ borderRadius: '20px 20px 0 0' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 text-dark fw-bold">
              <FaUsers className="me-2 text-primary" />
              Employee Directory ({filteredEmployees.length})
            </h5>
            <Badge bg="primary" className="px-3 py-2 rounded-pill">
              {filteredEmployees.length} Results
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <style>{`
            .employee-card {
              transition: all 0.3s ease;
              border-radius: 15px;
              border: 1px solid rgba(0,0,0,0.05);
            }
            .employee-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.1);
              border-color: rgba(102, 126, 234, 0.3);
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
            }
          `}</style>
          
          {filteredEmployees.length > 0 ? (
            <div className="p-4">
              <Row className="g-4">
                {filteredEmployees.map((employee) => (
                  <Col lg={6} xl={4} key={employee._id}>
                    <Card className="employee-card h-100 border-0 shadow-sm">
                      <Card.Body className="p-4">
                        {/* Employee Header */}
                        <div className="d-flex align-items-start mb-3">
                          <div className="me-3">
                            {employee.profilePicture ? (
                              <img
                                src={employee.profilePicture}
                                alt={employee.name}
                                className="employee-avatar"
                              />
                            ) : (
                              <div className="employee-avatar-placeholder">
                                {employee.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold text-dark">{employee.name}</h6>
                            <p className="mb-2 text-muted small">{employee.designation || "N/A"}</p>
                            <Badge 
                              bg={employee.status === 'active' ? 'success' : employee.status === 'inactive' ? 'secondary' : 'danger'} 
                              className="status-badge"
                            >
                              {employee.status}
                            </Badge>
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
                            <span className="text-truncate">{employee.email}</span>
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
                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="action-btn flex-fill"
                            onClick={() => navigate(`/employees/${employee._id}/profile`)}
                          >
                            <FaUserShield className="me-1" />
                            Manage Profile
                          </Button>
                          <Dropdown align="end">
                            <Dropdown.Toggle
                              variant="outline-secondary"
                              size="sm"
                              className="action-btn"
                              style={{ minWidth: '40px' }}
                            >
                              <FaEye />
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="shadow-lg border-0" style={{ borderRadius: '10px' }}>
                              <Dropdown.Item
                                onClick={() => navigate(`/employees/${employee._id}`)}
                                className="py-2"
                              >
                                <FaUsers className="me-2 text-primary" />
                                Basic Details
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => navigate(`/employees/${employee._id}/work`)}
                                className="py-2"
                              >
                                <FaClock className="me-2 text-success" />
                                Work Details
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item
                                onClick={() => handleSendNotification(employee)}
                                className="py-2"
                              >
                                <FaBell className="me-2 text-info" />
                                Send Notification
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handlePromoteEmployee(employee)}
                                className="py-2"
                              >
                                <FaUserShield className="me-2 text-warning" />
                                Promote/Update Role
                              </Dropdown.Item>
                              {/* Only admin and superadmin can delete employees */}
                              {(currentUser?.role === "admin" || currentUser?.role === "superadmin") && employee.role !== "superadmin" && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    className="py-2 text-danger"
                                    onClick={() => handleDelete(employee._id)}
                                  >
                                    <FaTrash className="me-2" />
                                    Delete Employee
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-4">
                <FaUsers size={64} className="text-muted opacity-50" />
              </div>
              <h5 className="text-muted mb-2">No Employees Found</h5>
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
    </Container>
  );
};

export default EmployeeList;
