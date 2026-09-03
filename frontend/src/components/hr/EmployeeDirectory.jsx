import { useState, useEffect } from "react";
import { Card, Form, InputGroup, Table, Badge, Button, Spinner, Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaSearch, FaUser, FaEnvelope, FaPhone, FaEye, FaTh, FaList, FaBuilding, FaCalendarAlt, FaIdBadge } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../api/userApi";
import toast from "../../utils/toast";
import { formatDate } from "../../utils/helpers";

const EmployeeDirectory = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // Default to cards view

  // CSS styles for employee cards
  const cardStyles = `
    .employee-card {
      transition: all 0.3s ease;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.05);
    }
    .employee-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      border-color: rgba(13, 110, 253, 0.3);
    }
  `;

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployeeList();
  }, [searchTerm, filterDepartment, filterStatus, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAllUsers({ excludePast: true, limit: 1000 });
      const employeeList = response.data?.filter((u) => u.role === "employee" || u.role === "hod" || u.role === "hr") || [];
      setEmployees(employeeList);
      setFilteredEmployees(employeeList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const filterEmployeeList = () => {
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

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(
        (emp) => emp.department?.name === filterDepartment
      );
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter((emp) => emp.status === filterStatus);
    }

    setFilteredEmployees(filtered);
  };

  const departments = [...new Set(employees.map((e) => e.department?.name).filter(Boolean))];

  return (
    <>
      <style>{cardStyles}</style>
      <Card className="shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <FaUser className="me-2 text-primary" />
              Employee Directory
            </h5>
            <small className="text-muted">
              {filteredEmployees.length} of {employees.length} employees
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            {/* View Toggle */}
            <div className="btn-group" role="group">
              <Button
                variant={viewMode === "cards" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setViewMode("cards")}
                title="Card View"
              >
                <FaTh className="me-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === "list" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <FaList className="me-1" />
                List
              </Button>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => navigate("/employees")}
            >
              View All
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Search and Filters */}
        <div className="mb-3">
          <InputGroup className="mb-2">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              size="sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </div>
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <FaUser size={40} className="mb-2 opacity-50" />
            <p>No employees found</p>
          </div>
        ) : (
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            {viewMode === "cards" ? (
              // Card View
              <Row className="g-3">
                {filteredEmployees.slice(0, 10).map((emp) => (
                  <Col lg={6} xl={4} key={emp._id}>
                    <Card className="h-100 border-0 shadow-sm employee-card" style={{ transition: 'all 0.3s ease' }}>
                      <Card.Body className="p-3">
                        {/* Employee Header */}
                        <div className="d-flex align-items-start mb-3">
                          <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                            <FaUser size={20} className="text-primary" />
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold text-dark">{emp.name}</h6>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <Badge bg="secondary" className="rounded-pill px-2 py-1">
                                <FaIdBadge size={10} className="me-1" />
                                {emp.employeeId}
                              </Badge>
                              <Badge 
                                bg={emp.status === "active" ? "success" : "secondary"} 
                                className="rounded-pill px-2 py-1"
                              >
                                {emp.status || "active"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Employee Info */}
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2 text-muted small">
                            <FaBuilding className="me-2 text-primary" style={{ width: '14px' }} />
                            <span>{emp.department?.name || "No Department"}</span>
                          </div>
                          <div className="d-flex align-items-center mb-2 text-muted small">
                            <FaEnvelope className="me-2 text-primary" style={{ width: '14px' }} />
                            <span className="text-truncate">{emp.email}</span>
                          </div>
                          {emp.phone && (
                            <div className="d-flex align-items-center mb-2 text-muted small">
                              <FaPhone className="me-2 text-primary" style={{ width: '14px' }} />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                          <div className="d-flex align-items-center text-muted small">
                            <FaCalendarAlt className="me-2 text-primary" style={{ width: '14px' }} />
                            <span>Joined: {formatDate(emp.createdAt)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-fill"
                            onClick={() => navigate(`/employees/${emp._id}`)}
                            style={{ borderRadius: '8px', fontWeight: '600' }}
                          >
                            <FaEye className="me-1" />
                            View Details
                          </Button>
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Manage Profile</Tooltip>}
                          >
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate(`/employees/${emp._id}/profile`)}
                              style={{ borderRadius: '8px' }}
                            >
                              <FaUser />
                            </Button>
                          </OverlayTrigger>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              // List View (Original Table)
              <Table hover responsive className="mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.slice(0, 10).map((emp) => (
                    <tr key={emp._id} className="align-middle">
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                            <FaUser size={14} className="text-primary" />
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <small className="text-muted">
                              <FaIdBadge className="me-1" />
                              {emp.employeeId}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <FaBuilding className="me-2 text-primary" size={12} />
                          <span>{emp.department?.name || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="small">
                          <div className="mb-1">
                            <FaEnvelope className="me-1 text-primary" size={12} />
                            {emp.email}
                          </div>
                          {emp.phone && (
                            <div>
                              <FaPhone className="me-1 text-primary" size={12} />
                              {emp.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge bg={emp.status === "active" ? "success" : "secondary"} className="rounded-pill">
                          {emp.status || "active"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <small className="text-muted">{formatDate(emp.createdAt)}</small>
                      </td>
                      <td className="py-3">
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/employees/${emp._id}`)}
                            title="View Details"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <FaEye size={12} />
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => navigate(`/employees/${emp._id}/profile`)}
                            title="Manage Profile"
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <FaUser size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
    </>
  );
};

export default EmployeeDirectory;
