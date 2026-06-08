import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  ListGroup,
  Tabs,
  Tab,
  InputGroup,
  Dropdown,
  ProgressBar,
  OverlayTrigger,
  Tooltip,
  Spinner,
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaChartBar,
  FaEye,
  FaSearch,
  FaFilter,
  FaBuilding,
  FaUserTie,
  FaChartLine,
  FaUserCheck,
  FaCrown,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaProjectDiagram,
  FaDownload,
  FaExpandArrowsAlt,
  FaStar,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { departmentApi } from "../../api/departmentApi";
import { userApi } from "../../api/userApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./DepartmentList.css";

const DepartmentList = () => {
  const { user, checkPermission } = useAuth();
  const isAdmin = checkPermission(["admin", "superadmin"]);
  const isHOD = user?.role === "hod";
  const isEmployee = user?.role === "employee";
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [selectedDeptAnalytics, setSelectedDeptAnalytics] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    head: "",
    status: "active",
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    filterAndSortDepartments();
  }, [departments, searchTerm, statusFilter, sortBy]);

  const filterAndSortDepartments = () => {
    let filtered = [...departments];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.head?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(dept => dept.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'employees':
          return (b.employeeCount || b.employees?.length || 0) - (a.employeeCount || a.employees?.length || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'head':
          return (a.head?.name || '').localeCompare(b.head?.name || '');
        default:
          return 0;
      }
    });

    setFilteredDepartments(filtered);
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getAllDepartments();
      // The API returns the array directly, not wrapped in { data: [] }
      let deptData = Array.isArray(response) ? response : (response.data || []);

      // Filter departments based on user role
      if (isEmployee && user.department) {
        // Employees see only their department
        deptData = deptData.filter((d) => d._id === user.department);
      } else if (isHOD) {
        // HODs see departments they head
        deptData = deptData.filter((d) => d.head?._id === user.id);
      }
      // Admins/SuperAdmins see all departments

      setDepartments(deptData);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      toast.error("Failed to fetch departments");
      setDepartments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAllUsers({ status: 'active', limit: 1000 });
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Check if the function exists before calling
      if (typeof departmentApi.getAllDepartmentsAnalytics === 'function') {
        const response = await departmentApi.getAllDepartmentsAnalytics();
        // The API already returns response.data, so use it directly
        setAnalytics(response);
      } else {
        console.warn('getAllDepartmentsAnalytics function not available');
        // Set fallback analytics data
        setAnalytics({
          overallStats: {
            totalDepartments: 0,
            activeDepartments: 0,
            totalEmployees: 0,
            departmentsWithHead: 0
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      // Set fallback analytics data on error
      setAnalytics({
        overallStats: {
          totalDepartments: 0,
          activeDepartments: 0,
          totalEmployees: 0,
          departmentsWithHead: 0
        }
      });
    }
  };

  const fetchDepartmentAnalytics = async (id) => {
    try {
      setShowAnalyticsModal(true); // Show modal immediately with loading state
      const response = await departmentApi.getDepartmentAnalytics(id);
      // The API returns response.data from axios, which should contain the analytics
      console.log('Analytics response:', response);
      setSelectedDeptAnalytics(response.data || response);
    } catch (error) {
      console.error("Failed to fetch department analytics:", error);
      toast.error("Failed to fetch department analytics");
      setShowAnalyticsModal(false); // Close modal on error
    }
  };

  const handleShowModal = (department = null) => {
    if (department) {
      setEditMode(true);
      setCurrentDepartment(department);
      setFormData({
        name: department.name,
        description: department.description || "",
        head: department.head?._id || "",
        status: department.status,
      });
    } else {
      setEditMode(false);
      setCurrentDepartment(null);
      setFormData({
        name: "",
        description: "",
        head: "",
        status: "active",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentDepartment(null);
  };

  const handleShowEmployeeModal = (department) => {
    setCurrentDepartment(department);
    setSelectedEmployees(department.employees?.map((e) => e._id) || []);
    setShowEmployeeModal(true);
  };

  const handleCloseEmployeeModal = () => {
    setShowEmployeeModal(false);
    setCurrentDepartment(null);
    setSelectedEmployees([]);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmployeeToggle = (userId) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await departmentApi.updateDepartment(currentDepartment._id, formData);
        toast.success("Department updated successfully");
      } else {
        await departmentApi.createDepartment(formData);
        toast.success("Department created successfully");
      }
      handleCloseModal();
      fetchDepartments();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save department");
    }
  };

  const handleSaveEmployees = async () => {
    try {
      await departmentApi.bulkAssignEmployees(
        currentDepartment._id,
        selectedEmployees
      );
      toast.success("Employees assigned successfully");
      handleCloseEmployeeModal();
      fetchDepartments();
      fetchAnalytics();
    } catch (error) {
      toast.error("Failed to assign employees");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        await departmentApi.deleteDepartment(id);
        toast.success("Department deleted successfully");
        fetchDepartments();
        fetchAnalytics();
      } catch (error) {
        toast.error("Failed to delete department");
      }
    }
  };

  const handleSetHead = async (departmentId, userId) => {
    try {
      await departmentApi.setDepartmentHead(departmentId, userId);
      toast.success("Department head set successfully");
      fetchDepartments();
      fetchAnalytics();
    } catch (error) {
      toast.error("Failed to set department head");
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-2 d-flex align-items-center">
            <FaBuilding className="me-3 text-primary" />
            Department Management
          </h1>
          <p className="text-muted mb-0">
            {isEmployee
              ? "View your department information and team members"
              : isHOD
              ? "Manage your department and team performance"
              : "Comprehensive department oversight and analytics"}
          </p>
        </div>
        {isAdmin && (
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={() => {}}>
              <FaDownload className="me-2" />
              Export
            </Button>
            <Button variant="primary" onClick={() => handleShowModal()}>
              <FaPlus className="me-2" />
              Add Department
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Analytics Dashboard */}
      {analytics && analytics.overallStats && (
        <Row className="mb-4">
          <Col lg={3} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                    <FaBuilding className="text-primary fs-4" />
                  </div>
                </div>
                <div className="flex-grow-1">
                  <h3 className="mb-1 text-primary fw-bold">
                    {analytics.overallStats.totalDepartments || 0}
                  </h3>
                  <p className="text-muted mb-0 small">Total Departments</p>
                  <div className="mt-1">
                    <small className="text-success">
                      <FaCheckCircle className="me-1" />
                      All systems operational
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-success bg-opacity-10 rounded-circle p-3">
                    <FaCheckCircle className="text-success fs-4" />
                  </div>
                </div>
                <div className="flex-grow-1">
                  <h3 className="mb-1 text-success fw-bold">
                    {analytics.overallStats.activeDepartments || 0}
                  </h3>
                  <p className="text-muted mb-0 small">Active Departments</p>
                  <div className="mt-1">
                    <ProgressBar 
                      now={analytics.overallStats.totalDepartments > 0 ? (analytics.overallStats.activeDepartments / analytics.overallStats.totalDepartments) * 100 : 0} 
                      size="sm" 
                      variant="success"
                    />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-info bg-opacity-10 rounded-circle p-3">
                    <FaUsers className="text-info fs-4" />
                  </div>
                </div>
                <div className="flex-grow-1">
                  <h3 className="mb-1 text-info fw-bold">
                    {analytics.overallStats.totalEmployees || 0}
                  </h3>
                  <p className="text-muted mb-0 small">Total Employees</p>
                  <div className="mt-1">
                    <small className="text-info">
                      Avg: {analytics.overallStats.totalDepartments > 0 ? Math.round(analytics.overallStats.totalEmployees / analytics.overallStats.totalDepartments) : 0} per dept
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                    <FaCrown className="text-warning fs-4" />
                  </div>
                </div>
                <div className="flex-grow-1">
                  <h3 className="mb-1 text-warning fw-bold">
                    {analytics.overallStats.departmentsWithHead || 0}
                  </h3>
                  <p className="text-muted mb-0 small">With Department Head</p>
                  <div className="mt-1">
                    {(analytics.overallStats.departmentsWithHead || 0) === (analytics.overallStats.totalDepartments || 0) ? (
                      <small className="text-success">
                        <FaCheckCircle className="me-1" />
                        All assigned
                      </small>
                    ) : (
                      <small className="text-warning">
                        <FaExclamationTriangle className="me-1" />
                        {(analytics.overallStats.totalDepartments || 0) - (analytics.overallStats.departmentsWithHead || 0)} pending
                      </small>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Search and Filter Controls */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col lg={4} md={6} className="mb-3 mb-lg-0">
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search departments, heads, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={3} className="mb-3 mb-lg-0">
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col lg={2} md={3} className="mb-3 mb-lg-0">
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="employees">Sort by Size</option>
                <option value="status">Sort by Status</option>
                <option value="head">Sort by Head</option>
              </Form.Select>
            </Col>
            <Col lg={4} className="text-lg-end">
              <div className="d-flex gap-2 justify-content-lg-end">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <FaExpandArrowsAlt className="me-1" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <FaChartBar className="me-1" />
                  Table
                </Button>
                <span className="text-muted small align-self-center ms-2">
                  {filteredDepartments.length} of {departments.length} departments
                </span>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Department Display */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading departments...</p>
          </Card.Body>
        </Card>
      ) : viewMode === 'grid' ? (
        <Row>
          {filteredDepartments.length > 0 ? (
            filteredDepartments.map((dept) => (
              <Col lg={4} md={6} className="mb-4" key={dept._id}>
                <Card className="border-0 shadow-sm h-100 department-card">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="flex-grow-1">
                        <h5 className="mb-2 text-primary fw-bold">{dept.name}</h5>
                        <p className="text-muted small mb-0">
                          {dept.description || "No description available"}
                        </p>
                      </div>
                      <Badge
                        bg={dept.status === "active" ? "success" : "secondary"}
                        className="ms-2"
                      >
                        {dept.status}
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <FaUserTie className="text-muted me-2" />
                        <span className="small">
                          <strong>Head:</strong>{" "}
                          {dept.head ? (
                            <span className="text-primary">{dept.head.name}</span>
                          ) : (
                            <span className="text-muted">Not Assigned</span>
                          )}
                        </span>
                      </div>
                      <div className="d-flex align-items-center">
                        <FaUsers className="text-muted me-2" />
                        <span className="small">
                          <strong>{dept.employeeCount ?? dept.employees?.length ?? 0}</strong> employees
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="d-flex gap-2">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View Details</Tooltip>}
                        >
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => navigate(`/departments/${dept._id}`)}
                            className="flex-fill"
                          >
                            <FaEye />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View Analytics</Tooltip>}
                        >
                          <Button
                            size="sm"
                            variant="outline-info"
                            onClick={() => fetchDepartmentAnalytics(dept._id)}
                            className="flex-fill"
                          >
                            <FaChartLine />
                          </Button>
                        </OverlayTrigger>
                        {(isAdmin || (isHOD && dept.head?._id === user.id)) && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Manage Employees</Tooltip>}
                          >
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleShowEmployeeModal(dept)}
                              className="flex-fill"
                            >
                              <FaUsers />
                            </Button>
                          </OverlayTrigger>
                        )}
                        {isAdmin && (
                          <>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Edit Department</Tooltip>}
                            >
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleShowModal(dept)}
                                className="flex-fill"
                              >
                                <FaEdit />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Delete Department</Tooltip>}
                            >
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(dept._id)}
                                className="flex-fill"
                              >
                                <FaTrash />
                              </Button>
                            </OverlayTrigger>
                          </>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          ) : (
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-5">
                  <FaBuilding className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                  <h5 className="text-muted">No departments found</h5>
                  <p className="text-muted">
                    {searchTerm || statusFilter !== 'all'
                      ? "Try adjusting your search or filter criteria"
                      : "Get started by creating your first department"}
                  </p>
                  {isAdmin && !searchTerm && statusFilter === 'all' && (
                    <Button variant="primary" onClick={() => handleShowModal()}>
                      <FaPlus className="me-2" />
                      Create Department
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <div className="table-responsive">
              <Table hover className="align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 fw-semibold">Department</th>
                    <th className="border-0 fw-semibold">Head</th>
                    <th className="border-0 fw-semibold">Team Size</th>
                    <th className="border-0 fw-semibold">Status</th>
                    <th className="border-0 fw-semibold">Performance</th>
                    <th className="border-0 fw-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.length > 0 ? (
                    filteredDepartments.map((dept) => (
                      <tr key={dept._id} className="border-bottom">
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                              <FaBuilding className="text-primary" />
                            </div>
                            <div>
                              <h6 className="mb-1 fw-semibold">{dept.name}</h6>
                              <small className="text-muted">
                                {dept.description || "No description"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {dept.head ? (
                            <div className="d-flex align-items-center">
                              <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-2">
                                <FaCrown className="text-warning small" />
                              </div>
                              <div>
                                <div className="fw-medium">{dept.head.name}</div>
                                <small className="text-muted">{dept.head.email}</small>
                              </div>
                            </div>
                          ) : (
                            <div className="d-flex align-items-center text-muted">
                              <FaExclamationTriangle className="me-2" />
                              <span>Not Assigned</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaUsers className="text-info me-2" />
                            <span className="fw-semibold">
                              {dept.employeeCount ?? dept.employees?.length ?? 0}
                            </span>
                            <span className="text-muted ms-1">employees</span>
                          </div>
                        </td>
                        <td>
                          <Badge
                            bg={dept.status === "active" ? "success" : "secondary"}
                            className="px-3 py-2"
                          >
                            {dept.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="flex-grow-1 me-2">
                              <ProgressBar
                                now={dept.head ? 85 : 60}
                                size="sm"
                                variant={dept.head ? "success" : "warning"}
                              />
                            </div>
                            <small className="text-muted">
                              {dept.head ? "85%" : "60%"}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Details</Tooltip>}
                            >
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => navigate(`/departments/${dept._id}`)}
                              >
                                <FaEye />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Analytics</Tooltip>}
                            >
                              <Button
                                size="sm"
                                variant="outline-info"
                                onClick={() => fetchDepartmentAnalytics(dept._id)}
                              >
                                <FaChartLine />
                              </Button>
                            </OverlayTrigger>
                            {(isAdmin || (isHOD && dept.head?._id === user.id)) && (
                              <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Manage Team</Tooltip>}
                              >
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => handleShowEmployeeModal(dept)}
                                >
                                  <FaUsers />
                                </Button>
                              </OverlayTrigger>
                            )}
                            {isAdmin && (
                              <Dropdown>
                                <Dropdown.Toggle
                                  size="sm"
                                  variant="outline-secondary"
                                  className="no-caret"
                                >
                                  <FaEye />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => handleShowModal(dept)}>
                                    <FaEdit className="me-2" />
                                    Edit Department
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    className="text-danger"
                                    onClick={() => handleDelete(dept._id)}
                                  >
                                    <FaTrash className="me-2" />
                                    Delete Department
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <FaBuilding className="text-muted mb-3" style={{ fontSize: '2rem' }} />
                        <div className="text-muted">
                          <h6>No departments found</h6>
                          <p className="mb-0">
                            {searchTerm || statusFilter !== 'all'
                              ? "Try adjusting your search or filter criteria"
                              : "Get started by creating your first department"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}



      {/* Add/Edit Department Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Department" : "Add New Department"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter department name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter department description"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Department Head</Form.Label>
              <Form.Select
                name="head"
                value={formData.head}
                onChange={handleChange}
              >
                <option value="">Select Department Head</option>
                {(editMode && currentDepartment
                  ? users.filter(u => {
                      const userDeptId = u.department?._id?.toString() || u.department?.toString();
                      return userDeptId === currentDepartment._id.toString();
                    })
                  : users.filter(u =>
                      ["employee", "hod", "hr", "manager"].includes(u.role)
                    )
                ).map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update Department" : "Create Department"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Employee Management Modal */}
      <Modal
        show={showEmployeeModal}
        onHide={handleCloseEmployeeModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {isAdmin ? "Manage Employees" : "View Employees"} -{" "}
            {currentDepartment?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            {isAdmin
              ? "Select employees to assign to this department"
              : "Employees assigned to this department"}
          </p>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <ListGroup>
              {users.map((user) => {
                const isSelected = selectedEmployees.includes(user._id);
                return (
                  <ListGroup.Item
                    key={user._id}
                    action={isAdmin}
                    active={isSelected}
                    onClick={
                      isAdmin ? () => handleEmployeeToggle(user._id) : undefined
                    }
                    style={{ cursor: isAdmin ? "pointer" : "default" }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{user.name}</strong>
                        <br />
                        <small className="text-muted">
                          {user.email} • {user.role}
                          {user.position && ` • ${user.position}`}
                        </small>
                      </div>
                      {isSelected && <Badge bg="success">Assigned</Badge>}
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </div>
          <div className="mt-3">
            <strong>
              {isAdmin ? "Selected" : "Total"}: {selectedEmployees.length}{" "}
              employees
            </strong>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEmployeeModal}>
            {isAdmin ? "Cancel" : "Close"}
          </Button>
          {isAdmin && (
            <Button variant="primary" onClick={handleSaveEmployees}>
              Save Changes
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        show={showAnalyticsModal}
        onHide={() => setShowAnalyticsModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Department Analytics - {selectedDeptAnalytics?.department?.name || 'Loading...'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDeptAnalytics && selectedDeptAnalytics.stats ? (
            <>
              {/* Statistics Cards */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-primary">
                        {selectedDeptAnalytics.stats.totalEmployees || 0}
                      </h4>
                      <small className="text-muted">Total Employees</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-success">
                        {selectedDeptAnalytics.stats.activeEmployees || 0}
                      </h4>
                      <small className="text-muted">Active</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-warning">
                        {selectedDeptAnalytics.stats.inactiveEmployees || 0}
                      </h4>
                      <small className="text-muted">Inactive</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4
                        className={
                          selectedDeptAnalytics.stats.hasHead
                            ? "text-success"
                            : "text-danger"
                        }
                      >
                        {selectedDeptAnalytics.stats.hasHead ? "Yes" : "No"}
                      </h4>
                      <small className="text-muted">Has Head</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Department Info */}
              <Card className="mb-3">
                <Card.Header>
                  <strong>Department Information</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p>
                        <strong>Name:</strong>{" "}
                        {selectedDeptAnalytics.department?.name || 'N/A'}
                      </p>
                      <p>
                        <strong>Description:</strong>{" "}
                        {selectedDeptAnalytics.department?.description || "N/A"}
                      </p>
                    </Col>
                    <Col md={6}>
                      <p>
                        <strong>Head:</strong>{" "}
                        {selectedDeptAnalytics.department?.head?.name ||
                          "Not Assigned"}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <Badge
                          bg={
                            selectedDeptAnalytics.department?.status === "active"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {selectedDeptAnalytics.department?.status || 'N/A'}
                        </Badge>
                      </p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Distribution Charts */}
              <Tabs defaultActiveKey="roles" className="mb-3">
                <Tab eventKey="roles" title="Role Distribution">
                  <Card>
                    <Card.Body>
                      <h6>Employees by Role</h6>
                      <ListGroup>
                        {selectedDeptAnalytics.roleDistribution && Object.entries(
                          selectedDeptAnalytics.roleDistribution
                        ).map(([role, count]) => (
                          <ListGroup.Item
                            key={role}
                            className="d-flex justify-content-between"
                          >
                            <span className="text-capitalize">{role}</span>
                            <Badge bg="primary">{count}</Badge>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Tab>
                <Tab eventKey="positions" title="Position Distribution">
                  <Card>
                    <Card.Body>
                      <h6>Employees by Position</h6>
                      <ListGroup>
                        {selectedDeptAnalytics.positionDistribution && Object.entries(
                          selectedDeptAnalytics.positionDistribution
                        ).map(([position, count]) => (
                          <ListGroup.Item
                            key={position}
                            className="d-flex justify-content-between"
                          >
                            <span>{position}</span>
                            <Badge bg="info">{count}</Badge>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Tab>
                <Tab eventKey="employees" title="Employee List">
                  <Card>
                    <Card.Body>
                      <Table striped hover>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Position</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDeptAnalytics.employees.map((emp) => (
                            <tr key={emp._id}>
                              <td>{emp.name}</td>
                              <td>{emp.email}</td>
                              <td>
                                <Badge bg="primary" className="text-capitalize">
                                  {emp.role}
                                </Badge>
                              </td>
                              <td>{emp.position || "N/A"}</td>
                              <td>
                                <Badge
                                  bg={
                                    emp.status === "active"
                                      ? "success"
                                      : "secondary"
                                  }
                                >
                                  {emp.status || "active"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Tab>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading analytics...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowAnalyticsModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DepartmentList;
