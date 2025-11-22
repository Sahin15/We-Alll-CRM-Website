import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Form,
  Alert,
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  FaClock,
  FaSignOutAlt,
  FaCalendar,
  FaDownload,
  FaChartLine,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { attendanceApi } from "../../api/attendanceApi";
import { formatDate, formatDateTime, getStatusVariant } from "../../utils/helpers";
import * as XLSX from "xlsx";

const MyAttendance = () => {
  const [attendances, setAttendances] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [stats, setStats] = useState(null);
  const [calendarView, setCalendarView] = useState([]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendance();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [dateRange]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceApi.getTodayAttendance();
      setTodayAttendance(response.data);
    } catch (error) {
      // No attendance today
      setTodayAttendance(null);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getMyAttendance(dateRange);
      const data = response.data;
      setAttendances(data);

      // Calculate statistics
      const present = data.filter((a) => a.status === "present").length;
      const absent = data.filter((a) => a.status === "absent").length;
      const late = data.filter((a) => a.status === "late").length;
      const totalHours = data.reduce((sum, a) => sum + (a.workHours || 0), 0);
      const overtime = data.reduce((sum, a) => sum + (a.overtime || 0), 0);

      setStats({
        present,
        absent,
        late,
        totalHours: totalHours.toFixed(2),
        overtime: overtime.toFixed(2),
        total: data.length,
      });

      // Generate calendar view
      generateCalendarView(data);
    } catch (error) {
      toast.error("Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarView = (data) => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const calendar = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const record = data.find(
        (a) => new Date(a.date).toISOString().split("T")[0] === dateStr
      );

      calendar.push({
        date: new Date(d),
        record,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }

    setCalendarView(calendar);
  };

  const handleClockIn = async () => {
    try {
      setClockingIn(true);
      await attendanceApi.clockIn({
        latitude: 0,
        longitude: 0,
        address: "Office",
      });
      toast.success("Clocked in successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockingIn(true);
      await attendanceApi.clockOut("End of day");
      toast.success("Clocked out successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock out");
    } finally {
      setClockingIn(false);
    }
  };

  const handleExport = () => {
    try {
      const exportData = attendances.map((a) => ({
        Date: formatDate(a.date),
        "Clock In": formatDateTime(a.clockIn),
        "Clock Out": a.clockOut ? formatDateTime(a.clockOut) : "N/A",
        "Work Hours": a.workHours || 0,
        Overtime: a.overtime || 0,
        Status: a.status,
        Notes: a.notes || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `My_Attendance_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      toast.success("Attendance exported successfully!");
    } catch (error) {
      toast.error("Failed to export attendance");
    }
  };

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const getCurrentStatus = () => {
    if (!todayAttendance) return "not-clocked-in";
    if (todayAttendance.clockOut) return "clocked-out";
    return "clocked-in";
  };

  const status = getCurrentStatus();

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>My Attendance</h2>
          <p className="text-muted">Track your daily attendance and work hours</p>
        </Col>
      </Row>

      {/* Today's Status Card */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3">
                <FaClock className="me-2 text-primary" />
                Today's Status
              </h5>

              {status === "not-clocked-in" && (
                <Alert variant="warning">
                  You haven't clocked in today. Click below to start your workday.
                </Alert>
              )}

              {status === "clocked-in" && (
                <Alert variant="success">
                  You are currently working. Remember to clock out at the end of your day.
                </Alert>
              )}

              {status === "clocked-out" && (
                <Alert variant="info">
                  You have completed your work for today. Great job!
                </Alert>
              )}

              {todayAttendance && (
                <div className="mb-3">
                  <Row>
                    <Col>
                      <p className="mb-1 text-muted">Clock In</p>
                      <h6>{formatDateTime(todayAttendance.clockIn)}</h6>
                    </Col>
                    {todayAttendance.clockOut && (
                      <>
                        <Col>
                          <p className="mb-1 text-muted">Clock Out</p>
                          <h6>{formatDateTime(todayAttendance.clockOut)}</h6>
                        </Col>
                        <Col>
                          <p className="mb-1 text-muted">Hours Worked</p>
                          <h6 className="text-success">
                            {todayAttendance.workHours} hrs
                          </h6>
                        </Col>
                      </>
                    )}
                  </Row>
                </div>
              )}

              <div className="d-grid gap-2">
                {status === "not-clocked-in" && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleClockIn}
                    disabled={clockingIn}
                  >
                    <FaClock className="me-2" />
                    {clockingIn ? "Clocking in..." : "Clock In"}
                  </Button>
                )}

                {status === "clocked-in" && (
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={handleClockOut}
                    disabled={clockingIn}
                  >
                    <FaSignOutAlt className="me-2" />
                    {clockingIn ? "Clocking out..." : "Clock Out"}
                  </Button>
                )}

                {status === "clocked-out" && (
                  <Button variant="success" size="lg" disabled>
                    Completed for Today
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Statistics Card */}
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">
                <FaChartLine className="me-2 text-success" />
                This Period Summary
              </h5>
              {stats && (
                <Row className="text-center">
                  <Col xs={6} className="mb-3">
                    <div className="border-end">
                      <h3 className="text-success mb-0">{stats.present}</h3>
                      <small className="text-muted">Present</small>
                    </div>
                  </Col>
                  <Col xs={6} className="mb-3">
                    <div>
                      <h3 className="text-danger mb-0">{stats.absent}</h3>
                      <small className="text-muted">Absent</small>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div className="border-end">
                      <h3 className="text-warning mb-0">{stats.late}</h3>
                      <small className="text-muted">Late</small>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div>
                      <h3 className="text-info mb-0">{stats.totalHours}</h3>
                      <small className="text-muted">Total Hours</small>
                    </div>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-3">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
          </Form.Group>
        </Col>
        <Col md={3} className="d-flex align-items-end">
          <Button variant="outline-success" onClick={handleExport} className="w-100">
            <FaDownload className="me-2" />
            Export to Excel
          </Button>
        </Col>
      </Row>

      {/* Tabs: Table View and Calendar View */}
      <Tabs defaultActiveKey="table" className="mb-3">
        <Tab eventKey="table" title="Table View">
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
                          <td>{formatDate(attendance.date)}</td>
                          <td>{formatDateTime(attendance.clockIn)}</td>
                          <td>
                            {attendance.clockOut
                              ? formatDateTime(attendance.clockOut)
                              : <Badge bg="warning">In Progress</Badge>}
                          </td>
                          <td>{attendance.workHours || 0} hrs</td>
                          <td>{attendance.overtime || 0} hrs</td>
                          <td>
                            <Badge bg={getStatusVariant(attendance.status)}>
                              {attendance.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          No attendance records found for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="calendar" title="Calendar View">
          <Card>
            <Card.Body>
              <div className="attendance-calendar">
                <Row className="g-2">
                  {calendarView.map((day, index) => (
                    <Col key={index} xs={6} sm={4} md={3} lg={2}>
                      <Card
                        className={`text-center ${
                          day.isWeekend ? "bg-light" : ""
                        } ${
                          day.record
                            ? day.record.status === "present"
                              ? "border-success"
                              : day.record.status === "absent"
                              ? "border-danger"
                              : "border-warning"
                            : "border-secondary"
                        }`}
                        style={{ borderWidth: "2px" }}
                      >
                        <Card.Body className="p-2">
                          <div className="fw-bold">{day.date.getDate()}</div>
                          <small className="text-muted">
                            {day.date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </small>
                          <div className="mt-1">
                            {day.record ? (
                              <Badge
                                bg={getStatusVariant(day.record.status)}
                                className="w-100"
                              >
                                {day.record.status}
                              </Badge>
                            ) : day.isWeekend ? (
                              <Badge bg="secondary" className="w-100">
                                Weekend
                              </Badge>
                            ) : (
                              <Badge bg="light" text="dark" className="w-100">
                                No data
                              </Badge>
                            )}
                          </div>
                          {day.record && day.record.workHours && (
                            <small className="text-muted d-block mt-1">
                              {day.record.workHours}hrs
                            </small>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default MyAttendance;
