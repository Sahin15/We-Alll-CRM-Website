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
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaChartBar,
  FaEye,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { departmentApi } from "../../api/departmentApi";
import { userApi } from "../../api/userApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const DepartmentList = () => {
  const { user, checkPermission } = useAuth();
  const isAdmin = checkPermission(["admin", "superadmin"]);
  const isHOD = user?.role === "hod";
  const isEmployee = user?.role === "employee";
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [selectedDeptAnalytics, setSelectedDeptAnalytics] = useState(null);
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

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getAllDepartments();
      let deptData = response.data;

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
      toast.error("Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await departmentApi.getAllDepartmentsAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const fetchDepartmentAnalytics = async (id) => {
    try {
      const response = await departmentApi.getDepartmentAnalytics(id);
      setSelectedDeptAnalytics(response.data);
      setShowAnalyticsModal(true);
    } catch (error) {
      toast.error("Failed to fetch department analytics");
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
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Department Management</h2>
          <p className="text-muted">
            {isEmployee
              ? "View your department information"
              : isHOD
              ? "Manage your department"
              : "Manage departments, employees, and analytics"}
          </p>
        </Col>
        {isAdmin && (
          <Col className="text-end">
            <Button variant="primary" onClick={() => handleShowModal()}>
              <FaPlus className="me-2" />
              Add Department
            </Button>
          </Col>
        )}
      </Row>

      {/* Analytics Summary Cards */}
      {analytics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">
                  {analytics.overallStats.totalDepartments}
                </h3>
                <p className="text-muted mb-0">Total Departments</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">
                  {analytics.overallStats.activeDepartments}
                </h3>
                <p className="text-muted mb-0">Active Departments</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">
                  {analytics.overallStats.totalEmployees}
                </h3>
                <p className="text-muted mb-0">Total Employees</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">
                  {analytics.overallStats.departmentsWithHead}
                </h3>
                <p className="text-muted mb-0">With Department Head</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Head</th>
                      <th>Employees</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <tr key={dept._id}>
                          <td>
                            <strong>{dept.name}</strong>
                          </td>
                          <td>{dept.description || "N/A"}</td>
                          <td>
                            {dept.head ? (
                              <div>
                                <div>{dept.head.name}</div>
                                <small className="text-muted">
                                  {dept.head.email}
                                </small>
                              </div>
                            ) : (
                              <span className="text-muted">Not Assigned</span>
                            )}
                          </td>
                          <td>
                            <Badge bg="info">
                              {dept.employees?.length || 0} employees
                            </Badge>
                          </td>
                          <td>
                            <Badge
                              bg={
                                dept.status === "active"
                                  ? "success"
                                  : "secondary"
                              }
                            >
                              {dept.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <Button
                                size="sm"
                                variant="outline-info"
                                onClick={() =>
                                  fetchDepartmentAnalytics(dept._id)
                                }
                                title="View Analytics"
                              >
                                <FaChartBar />
                              </Button>
                              {(isAdmin ||
                                (isHOD && dept.head?._id === user.id)) && (
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  onClick={() => handleShowEmployeeModal(dept)}
                                  title="Manage Employees"
                                >
                                  <FaUsers />
                                </Button>
                              )}
                              {isAdmin && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline-success"
                                    onClick={() => handleShowModal(dept)}
                                    title="Edit"
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => handleDelete(dept._id)}
                                    title="Delete"
                                  >
                                    <FaTrash />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          No departments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email}) - {user.role}
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
            Department Analytics - {selectedDeptAnalytics?.department.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDeptAnalytics && (
            <>
              {/* Statistics Cards */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-primary">
                        {selectedDeptAnalytics.stats.totalEmployees}
                      </h4>
                      <small className="text-muted">Total Employees</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-success">
                        {selectedDeptAnalytics.stats.activeEmployees}
                      </h4>
                      <small className="text-muted">Active</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-warning">
                        {selectedDeptAnalytics.stats.inactiveEmployees}
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
                        {selectedDeptAnalytics.department.name}
                      </p>
                      <p>
                        <strong>Description:</strong>{" "}
                        {selectedDeptAnalytics.department.description || "N/A"}
                      </p>
                    </Col>
                    <Col md={6}>
                      <p>
                        <strong>Head:</strong>{" "}
                        {selectedDeptAnalytics.department.head?.name ||
                          "Not Assigned"}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <Badge
                          bg={
                            selectedDeptAnalytics.department.status === "active"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {selectedDeptAnalytics.department.status}
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
                        {Object.entries(
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
                        {Object.entries(
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
