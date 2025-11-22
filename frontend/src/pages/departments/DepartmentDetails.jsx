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
} from "react-bootstrap";
import { FaArrowLeft, FaEdit, FaUsers, FaChartBar } from "react-icons/fa";
import { toast } from "react-toastify";
import { departmentApi } from "../../api/departmentApi";
import { useAuth } from "../../context/AuthContext";

const DepartmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, checkPermission } = useAuth();
  const isAdmin = checkPermission(["admin", "superadmin"]);
  const isHOD = user?.role === "hod";
  const isEmployee = user?.role === "employee";
  const [department, setDepartment] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

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

      const dept = deptRes.data;

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
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error("Failed to fetch department details");
      navigate("/departments");
    } finally {
      setLoading(false);
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
              <p>
                <strong>Department Head:</strong>{" "}
                {department.head ? (
                  <div className="mt-1">
                    <div>{department.head.name}</div>
                    <small className="text-muted">
                      {department.head.email}
                    </small>
                  </div>
                ) : (
                  <span className="text-muted">Not Assigned</span>
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
            </Card.Body>
          </Card>

          {/* Position Distribution */}
          <Card>
            <Card.Header>
              <strong>Position Distribution</strong>
            </Card.Header>
            <Card.Body>
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
              {analytics.employees.length > 0 ? (
                <Table responsive hover>
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
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted">
                  No employees assigned to this department
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DepartmentDetails;
