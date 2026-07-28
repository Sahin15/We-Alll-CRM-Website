import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  ListGroup,
  Alert,
  Dropdown,
  Modal,
  Form,
} from "react-bootstrap";
import { FaArrowLeft, FaEdit, FaUsers, FaChartBar, FaCrown, FaUserShield, FaUserMinus } from "react-icons/fa";
import { toast } from "react-toastify";
import { departmentApi } from "../../api/departmentApi";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";

const DepartmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();
  const isAdmin = checkPageAccess(canAccess, PAGE_ACCESS.departmentAdmin);
  const isHOD = user?.role === "hod";
  const isEmployee = user?.role === "employee";
  const [department, setDepartment] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssignHoDModal, setShowAssignHoDModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    fetchDepartmentData();
  }, [id]);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);

      // Check permissions before fetching
      const [deptRes, analyticsRes] = await Promise.all([
        departmentApi.getDepartmentById(id),
        departmentApi.getDepartmentAnalytics(id),
      ]);

      // getDepartmentById already returns response.data, so deptRes IS the department
      const dept = deptRes.data || deptRes;

      // Employees can only view their own department
      if (isEmployee && user.department !== id) {
        toast.error("You can only view your assigned department");
        navigate("/departments");
        return;
      }

      // HODs can only view departments they head
      if (isHOD && dept.head?._id !== user.id) {
        toast.error("You can only view departments you head");
        navigate("/departments");
        return;
      }

      setDepartment(dept);
      setAnalytics(analyticsRes.data || analyticsRes);
    } catch (error) {
      console.error('❌ Error fetching department data:', error);
      toast.error("Failed to fetch department details");
      navigate("/departments");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHoD = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    try {
      await departmentApi.assignHoD(id, selectedEmployee);
      toast.success("Head of Department assigned successfully");
      setShowAssignHoDModal(false);
      setSelectedEmployee("");
      fetchDepartmentData(); // Refresh data
    } catch (error) {
      console.error("Error assigning HoD:", error);
      toast.error(error.response?.data?.message || "Failed to assign Head of Department");
    }
  };

  const handleRemoveEmployee = async (employee) => {
    if (
      !window.confirm(
        `Remove ${employee.name} from ${department?.name || "this department"}? They can then be assigned to another department.`
      )
    ) {
      return;
    }

    try {
      await departmentApi.removeEmployeeFromDepartment(id, employee._id);
      toast.success(`${employee.name} removed from department`);
      fetchDepartmentData();
    } catch (error) {
      console.error("Error removing employee from department:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to remove employee from department"
      );
    }
  };

  const handleRemoveHoD = async () => {
    if (!window.confirm("Are you sure you want to remove the current Head of Department?")) {
      return;
    }

    try {
      await departmentApi.removeHoD(id);
      toast.success("Head of Department removed successfully");
      fetchDepartmentData(); // Refresh data
    } catch (error) {
      console.error("Error removing HoD:", error);
      toast.error(error.response?.data?.message || "Failed to remove Head of Department");
    }
  };

  if (loading) {
    return (
      <Container fluid className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  if (!department || !analytics) {
    return null;
  }

  return (
    <Container fluid>
      {/* Permission Notice for Employees */}
      {isEmployee && (
        <Alert variant="info" className="mb-4">
          <strong>Employee View:</strong> You are viewing your assigned
          department. Only admins can make changes.
        </Alert>
      )}
      {isHOD && (
        <Alert variant="primary" className="mb-4">
          <strong>Department Head View:</strong> You can view employees in your
          department. Contact admin to make changes.
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate("/departments")}
            className="mb-2"
          >
            <FaArrowLeft className="me-2" />
            Back to Departments
          </Button>
          <h2>{department.name}</h2>
          <p className="text-muted">
            {department.description || "No description"}
          </p>
        </Col>
        <Col className="text-end">
          <Badge
            bg={department.status === "active" ? "success" : "secondary"}
            className="fs-6"
          >
            {department.status}
          </Badge>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{analytics.stats.totalEmployees}</h3>
              <p className="text-muted mb-0">Total Employees</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">
                {analytics.stats.activeEmployees}
              </h3>
              <p className="text-muted mb-0">Active Employees</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">
                {analytics.stats.inactiveEmployees}
              </h3>
              <p className="text-muted mb-0">Inactive Employees</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3
                className={
                  analytics.stats.hasHead ? "text-success" : "text-danger"
                }
              >
                {analytics.stats.hasHead ? "Assigned" : "Not Assigned"}
              </h3>
              <p className="text-muted mb-0">Department Head</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Department Information */}
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <strong>Department Information</strong>
            </Card.Header>
            <Card.Body>
              <p>
                <strong>Name:</strong> {department.name}
              </p>
              <p>
                <strong>Description:</strong> {department.description || "N/A"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge
                  bg={department.status === "active" ? "success" : "secondary"}
                >
                  {department.status}
                </Badge>
              </p>
              <p className="mb-0">
                <strong>Department Head:</strong>{" "}
                {department.head ? (
                  <div className="mt-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="d-flex align-items-center">
                          <FaCrown className="text-warning me-2" />
                          <span className="fw-semibold">{department.head.name}</span>
                        </div>
                        <small className="text-muted ms-4">
                          {department.head.email}
                        </small>
                      </div>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={handleRemoveHoD}
                          title="Remove HoD"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <span className="text-muted d-block mb-2">Not Assigned</span>
                    {console.log('🔍 HoD Button Check:', { isAdmin, employeeCount: analytics?.employees?.length })}
                    {isAdmin && analytics?.employees?.length > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setShowAssignHoDModal(true)}
                      >
                        <FaUserShield className="me-2" />
                        Assign Head
                      </Button>
                    )}
                    {!isAdmin && (
                      <small className="text-muted d-block mt-1">
                        (Only admins/HR can assign)
                      </small>
                    )}
                    {isAdmin && (!analytics?.employees || analytics.employees.length === 0) && (
                      <small className="text-muted d-block mt-1">
                        (No employees to assign as head)
                      </small>
                    )}
                  </div>
                )}
              </p>
            </Card.Body>
          </Card>

          {/* Role Distribution */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Role Distribution</strong>
            </Card.Header>
            <Card.Body>
              {console.log('🔍 Role Distribution:', analytics?.roleDistribution)}
              {analytics?.roleDistribution && Object.keys(analytics.roleDistribution).length > 0 ? (
                <ListGroup variant="flush">
                  {Object.entries(analytics.roleDistribution).map(
                    ([role, count]) => (
                      <ListGroup.Item
                        key={role}
                        className="d-flex justify-content-between px-0"
                      >
                        <span className="text-capitalize">{role}</span>
                        <Badge bg="primary">{count}</Badge>
                      </ListGroup.Item>
                    )
                  )}
                </ListGroup>
              ) : (
                <p className="text-muted text-center mb-0">No role data available</p>
              )}
            </Card.Body>
          </Card>

          {/* Position Distribution */}
          <Card>
            <Card.Header>
              <strong>Position Distribution</strong>
            </Card.Header>
            <Card.Body>
              {console.log('🔍 Position Distribution:', analytics?.positionDistribution)}
              {analytics?.positionDistribution && Object.keys(analytics.positionDistribution).length > 0 ? (
                <ListGroup variant="flush">
                  {Object.entries(analytics.positionDistribution).map(
                    ([position, count]) => (
                      <ListGroup.Item
                        key={position}
                        className="d-flex justify-content-between px-0"
                      >
                        <span>{position}</span>
                        <Badge bg="info">{count}</Badge>
                      </ListGroup.Item>
                    )
                  )}
                </ListGroup>
              ) : (
                <p className="text-muted text-center mb-0">No position data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Employee List */}
        <Col lg={8}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Employees ({analytics.stats.totalEmployees})</strong>
            </Card.Header>
            <Card.Body>
              {analytics?.employees && analytics.employees.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Position</th>
                      <th>Status</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.employees.map((employee) => (
                      <tr key={employee._id}>
                        <td>
                          <strong>{employee.name}</strong>
                        </td>
                        <td>{employee.email}</td>
                        <td>
                          <Badge bg="primary" className="text-capitalize">
                            {employee.role}
                          </Badge>
                        </td>
                        <td>{employee.position || "N/A"}</td>
                        <td>
                          <Badge
                            bg={
                              employee.status === "active"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {employee.status || "active"}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              title="Remove from department"
                              onClick={() => handleRemoveEmployee(employee)}
                            >
                              <FaUserMinus className="me-1" />
                              Remove
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted">
                  <div>No employees assigned to this department</div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Assign HoD Modal */}
      <Modal show={showAssignHoDModal} onHide={() => setShowAssignHoDModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCrown className="text-warning me-2" />
            Assign Head of Department
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Select Employee from {department?.name}</Form.Label>
              <Form.Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
              >
                <option value="">-- Select an employee --</option>
                {analytics?.employees?.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.email}) - {emp.role}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Only employees from this department can be assigned as Head of Department
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignHoDModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssignHoD}
            disabled={!selectedEmployee}
          >
            <FaUserShield className="me-2" />
            Assign as HoD
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DepartmentDetails;
