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
import "../../styles/pages-mobile.css";
import "../../styles/table-mobile.css";

const AttendanceTracking = () => {
  const [attendances, setAttendances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Get today's date
  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState({
    employee: "",
    status: "",
    startDate: getTodayDate(), // Default to today
    endDate: getTodayDate(),
  });
  
  const [activeFilter, setActiveFilter] = useState('today'); // Track active filter
  
  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Reset active filter when manually changing dates
    if (name === 'startDate' || name === 'endDate') {
      setActiveFilter(null);
    }
    
    // Auto-fetch when employee changes
    if (name === 'employee') {
      try {
        setLoading(true);
        const params = {};
        if (value) params.employee = value; // Use the new value directly
        if (newFilters.status) params.status = newFilters.status;
        if (newFilters.startDate) params.startDate = newFilters.startDate;
        if (newFilters.endDate) params.endDate = newFilters.endDate;

        const response = await attendanceApi.getAllAttendance(params);
        setAttendances(response.data);
      } catch (error) {
        toast.error("Failed to fetch attendance records");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApplyFilters = () => {
    fetchAttendances();
  };

  const handleQuickFilter = (type) => {
    const now = new Date();
    let startDate, endDate;

    switch (type) {
      case 'today':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Saturday
        startDate = weekStart.toISOString().split('T')[0];
        endDate = weekEnd.toISOString().split('T')[0];
        break;
      case 'month':
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastMonthEnd.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setActiveFilter(type); // Set active filter
    setFilters({ ...filters, startDate, endDate });
    // Auto-apply after setting
    setTimeout(() => fetchAttendances(), 100);
  };

  // Calculate statistics for selected employee
  const calculateStats = () => {
    if (!filters.employee) return null;

    const selectedEmployee = users.find(u => u._id === filters.employee);
    
    // If no attendance records, show as absent
    if (attendances.length === 0) {
      // Calculate expected working days in the date range
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        employeeName: selectedEmployee?.name || "Unknown",
        present: 0,
        late: 0,
        halfDay: 0,
        absent: daysDiff,
        onLeave: 0,
        totalHours: "0.00",
        totalOvertime: "0.00",
        totalDays: 0,
        avgHoursPerDay: 0,
      };
    }

    const present = attendances.filter((a) => a.status === "present").length;
    const late = attendances.filter((a) => a.status === "late").length;
    const halfDay = attendances.filter((a) => a.status === "half-day").length;
    const absent = attendances.filter((a) => a.status === "absent").length;
    const onLeave = attendances.filter((a) => a.status === "on-leave").length;
    const totalHours = attendances.reduce((sum, a) => sum + (a.workHours || 0), 0);
    const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);
    const totalDays = attendances.length;

    return {
      employeeName: selectedEmployee?.name || "Unknown",
      present,
      late,
      halfDay,
      absent,
      onLeave,
      totalHours: totalHours.toFixed(2),
      totalOvertime: totalOvertime.toFixed(2),
      totalDays,
      avgHoursPerDay: totalDays > 0 ? (totalHours / totalDays).toFixed(2) : 0,
    };
  };

  const stats = calculateStats();

  // Calculate absent employees (not clocked in today)
  const getAbsentEmployees = () => {
    // Only show for today's date AND when no specific employee is selected
    const today = getTodayDate();
    if (filters.startDate !== today || filters.endDate !== today || filters.employee) {
      return [];
    }

    // Get list of employees who clocked in today
    const clockedInEmployeeIds = attendances.map(a => a.employee?._id || a.employee);
    
    // Find employees who haven't clocked in
    const absentEmployees = users.filter(user => !clockedInEmployeeIds.includes(user._id));
    
    return absentEmployees;
  };

  const absentEmployees = getAbsentEmployees();

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
              {/* Quick Filter Buttons */}
              <Row className="mb-3">
                <Col>
                  <div className="d-flex gap-2 flex-wrap">
                    <button 
                      className={`btn btn-sm ${activeFilter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleQuickFilter('today')}
                    >
                      Today
                    </button>
                    <button 
                      className={`btn btn-sm ${activeFilter === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleQuickFilter('week')}
                    >
                      This Week
                    </button>
                    <button 
                      className={`btn btn-sm ${activeFilter === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleQuickFilter('month')}
                    >
                      This Month
                    </button>
                    <button 
                      className={`btn btn-sm ${activeFilter === 'lastMonth' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => handleQuickFilter('lastMonth')}
                    >
                      Last Month
                    </button>
                  </div>
                </Col>
              </Row>
              <hr />
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Employee</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="text"
                        placeholder={
                          filters.employee 
                            ? users.find(u => u._id === filters.employee)?.name 
                            : "All Employees - Type to search..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        autoComplete="off"
                      />
                      {showDropdown && (
                        <div 
                          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" 
                          style={{ 
                            maxHeight: '300px', 
                            overflowY: 'auto', 
                            zIndex: 1000 
                          }}
                        >
                          <div 
                            className="p-2 border-bottom bg-light cursor-pointer hover-bg-primary"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setFilters({ ...filters, employee: '' });
                              setSearchTerm("");
                              setShowDropdown(false);
                              handleFilterChange({ target: { name: 'employee', value: '' } });
                            }}
                          >
                            <strong>All Employees</strong>
                          </div>
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                              <div
                                key={user._id}
                                className="p-2 border-bottom cursor-pointer"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setFilters({ ...filters, employee: user._id });
                                  setSearchTerm("");
                                  setShowDropdown(false);
                                  handleFilterChange({ target: { name: 'employee', value: user._id } });
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                              >
                                <div className="fw-semibold">{user.name}</div>
                                <small className="text-muted">{user.email}</small>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-muted text-center">
                              No employees found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {filters.employee && (
                      <Form.Text className="text-muted d-block mt-1">
                        Selected: <strong>{users.find(u => u._id === filters.employee)?.name}</strong>
                        {" "}
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 ms-1 text-decoration-none"
                          onClick={() => {
                            setFilters({ ...filters, employee: '' });
                            setSearchTerm("");
                            handleFilterChange({ target: { name: 'employee', value: '' } });
                          }}
                        >
                          ✕ Clear
                        </button>
                      </Form.Text>
                    )}
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
              </Row>
              <Row className="g-3 mt-2">
                <Col md={12} className="d-flex justify-content-end gap-2">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({
                        employee: "",
                        status: "",
                        startDate: getTodayDate(),
                        endDate: getTodayDate(),
                      });
                      setActiveFilter('today');
                      fetchAttendances();
                    }}
                  >
                    Clear Filters
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleApplyFilters}
                  >
                    Apply Filters
                  </button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Employee Statistics Summary */}
      {stats && (
        <Row className="mb-4">
          <Col>
            <Card className="border-primary">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  📊 Attendance Summary: {stats.employeeName}
                </h5>
                <small>
                  Period: {formatDate(filters.startDate)} to {formatDate(filters.endDate)}
                </small>
              </Card.Header>
              <Card.Body>
                {stats.totalDays === 0 && stats.absent > 0 && (
                  <div className="alert alert-danger mb-3">
                    <strong>⚠️ No Attendance Records Found</strong>
                    <p className="mb-0">
                      {stats.employeeName} has not clocked in during this period ({stats.absent} day(s) absent).
                    </p>
                  </div>
                )}
                <Row className="text-center">
                  <Col xs={6} md={3} className="mb-3">
                    <Card className="border-success h-100">
                      <Card.Body>
                        <h2 className="text-success mb-1">{stats.present}</h2>
                        <small className="text-muted">On Time</small>
                        <div className="mt-2">
                          <Badge bg="success">Present</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <Card className="border-warning h-100">
                      <Card.Body>
                        <h2 className="text-warning mb-1">{stats.late}</h2>
                        <small className="text-muted">Late Arrivals</small>
                        <div className="mt-2">
                          <Badge bg="warning">10:31 AM - 11:59 AM</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <Card className="border-info h-100">
                      <Card.Body>
                        <h2 className="text-info mb-1">{stats.halfDay}</h2>
                        <small className="text-muted">Half Day</small>
                        <div className="mt-2">
                          <Badge bg="info">After 12:00 PM</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <Card className="border-danger h-100">
                      <Card.Body>
                        <h2 className="text-danger mb-1">{stats.absent}</h2>
                        <small className="text-muted">Absent</small>
                        <div className="mt-2">
                          <Badge bg="danger">No Clock-in</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <hr />
                <Row className="text-center">
                  <Col xs={6} md={3}>
                    <div className="p-2">
                      <h5 className="text-primary mb-0">{stats.totalDays}</h5>
                      <small className="text-muted">Total Days</small>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="p-2">
                      <h5 className="text-success mb-0">{stats.totalHours}</h5>
                      <small className="text-muted">Total Hours</small>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="p-2">
                      <h5 className="text-info mb-0">{stats.avgHoursPerDay}</h5>
                      <small className="text-muted">Avg Hours/Day</small>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="p-2">
                      <h5 className="text-warning mb-0">{stats.totalOvertime}</h5>
                      <small className="text-muted">Total Overtime</small>
                    </div>
                  </Col>
                </Row>
                {stats.onLeave > 0 && (
                  <>
                    <hr />
                    <div className="text-center">
                      <Badge bg="secondary" className="px-3 py-2">
                        On Leave: {stats.onLeave} days
                      </Badge>
                    </div>
                  </>
                )}
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

      {/* Absent Employees (Not Clocked In Today) */}
      {absentEmployees.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card className="border-danger">
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0">
                  ⚠️ Absent Today - Not Clocked In ({absentEmployees.length})
                </h5>
                <small>Employees who haven't clocked in yet today</small>
              </Card.Header>
              <Card.Body>
                <Row>
                  {absentEmployees.map((employee) => (
                    <Col xs={12} sm={6} md={4} lg={3} key={employee._id} className="mb-3">
                      <Card className="h-100 border-danger">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center">
                            <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-2">
                              <span className="text-danger fw-bold">
                                {employee.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold text-truncate">{employee.name}</div>
                              <small className="text-muted text-truncate d-block">{employee.email}</small>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge bg="danger" className="w-100">Absent</Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default AttendanceTracking;
