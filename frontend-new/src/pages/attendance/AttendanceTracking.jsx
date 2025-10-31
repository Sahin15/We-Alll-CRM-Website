import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Badge, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import {
  formatDate,
  formatDateTime,
  getStatusVariant,
} from "../../utils/helpers";

const AttendanceTracking = () => {
  const [attendances, setAttendances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    employee: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchAttendances();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      setUsers(response.data.filter((u) => u.role === "employee"));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.employee) params.employee = filters.employee;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await attendanceApi.getAllAttendance(params);
      setAttendances(response.data);
    } catch (error) {
      toast.error("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleApplyFilters = () => {
    fetchAttendances();
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Attendance Tracking</h2>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Employee</Form.Label>
                    <Form.Select
                      name="employee"
                      value={filters.employee}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Employees</option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="half-day">Half Day</option>
                      <option value="on-leave">On Leave</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>

                <Col md={3} className="d-flex align-items-end">
                  <Form.Group className="w-100">
                    <Form.Label className="invisible">Apply</Form.Label>
                    <div className="d-grid">
                      <button
                        className="btn btn-primary"
                        onClick={handleApplyFilters}
                      >
                        Apply Filters
                      </button>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Work Hours</th>
                      <th>Overtime</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length > 0 ? (
                      attendances.map((attendance) => (
                        <tr key={attendance._id}>
                          <td>{attendance.employee?.name || "N/A"}</td>
                          <td>{formatDate(attendance.date)}</td>
                          <td>{formatDateTime(attendance.clockIn)}</td>
                          <td>
                            {attendance.clockOut
                              ? formatDateTime(attendance.clockOut)
                              : "-"}
                          </td>
                          <td>{attendance.workHours || 0} hours</td>
                          <td>{attendance.overtime || 0} hours</td>
                          <td>
                            <Badge bg={getStatusVariant(attendance.status)}>
                              {attendance.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          No attendance records found
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
    </Container>
  );
};

export default AttendanceTracking;
