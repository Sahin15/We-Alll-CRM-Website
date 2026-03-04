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
  Modal,
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
import { formatDate, formatDateTime, formatTime, getStatusVariant } from "../../utils/helpers";
import ConfirmModal from "../../components/common/ConfirmModal";
import WorkLogSubmissionModal from "../../components/worklog/WorkLogSubmissionModal";
import MyOvertimeHistory from "../../components/attendance/MyOvertimeHistory";
import { workLogApi } from "../../api/workLogApi";
import * as XLSX from "xlsx";
import "../../styles/table-mobile.css";
import "../../styles/modal-mobile.css";

const MyAttendance = () => {
  const [attendances, setAttendances] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [showClockInConfirm, setShowClockInConfirm] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [stats, setStats] = useState(null);
  const [calendarView, setCalendarView] = useState([]);
  
  // Break details modal state
  const [showBreakDetailsModal, setShowBreakDetailsModal] = useState(false);
  const [selectedBreakDetails, setSelectedBreakDetails] = useState(null);
  
  // Work log modal state
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);

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
      const halfDay = data.filter((a) => a.status === "half-day").length;
      const totalHours = data.reduce((sum, a) => sum + (a.workHours || 0), 0);
      const overtime = data.reduce((sum, a) => sum + (a.overtime || 0), 0);
      const totalBreakMinutes = data.reduce((sum, a) => sum + (a.totalBreakTime || 0), 0);

      setStats({
        present,
        absent,
        late,
        halfDay,
        totalHours: totalHours.toFixed(2),
        overtime: overtime.toFixed(2),
        totalBreakTime: totalBreakMinutes.toFixed(0),
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

  const handleClockInClick = () => {
    setShowClockInConfirm(true);
  };

  const handleClockIn = async () => {
    setShowClockInConfirm(false);
    
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

  const handleClockOutClick = () => {
    setShowClockOutConfirm(true);
  };

  const handleClockOut = async () => {
    setShowClockOutConfirm(false);
    
    try {
      setClockingIn(true);
      await attendanceApi.clockOut("End of day");
      toast.success("Clocked out successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
    } catch (error) {
      // Check if work log is required
      if (error.response?.data?.workLogRequired) {
        setShowWorkLogModal(true);
        // Modal will guide user - no need for toast
      } else {
        toast.error(error.response?.data?.message || "Failed to clock out");
      }
    } finally {
      setClockingIn(false);
    }
  };

  const handleWorkLogSubmit = async (workLog) => {
    // After work log is submitted, proceed with clock-out
    try {
      setClockingIn(true);
      await attendanceApi.clockOut("End of day");
      toast.success("Clocked out successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
      setShowWorkLogModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock out");
    } finally {
      setClockingIn(false);
    }
  };

  const handleWorkLogSkip = async () => {
    // Manager skip - proceed with clock-out without work log
    try {
      setClockingIn(true);
      await attendanceApi.clockOut("End of day");
      toast.success("Clocked out successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
      setShowWorkLogModal(false);
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
        "Break Time": a.totalBreakTime > 0 
          ? `${Math.floor(a.totalBreakTime / 60)}h ${Math.round(a.totalBreakTime % 60)}m`
          : "No breaks",
        "Work Hours": a.workHours || 0,
        Overtime: a.overtime || 0,
        Status: a.status,
        "Work From Home": a.isWFH ? "Yes" : "No",
        "WFH Reason": a.isWFH && a.wfhReason ? a.wfhReason : "",
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
        <Col xs={12} lg={6} className="mb-3 mb-lg-0">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3">
                <FaClock className="me-2 text-primary" />
                Today's Status
              </h5>

              {status === "not-clocked-in" && (
                <>
                  <Alert variant="warning">
                    You haven't clocked in today. Click below to start your workday.
                  </Alert>
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>Current Time:</strong> {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      <br />
                      <strong>Note:</strong> Clock-in after 10:30 AM = Late | After 12:00 PM = Half Day
                    </small>
                  </Alert>
                </>
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
                  <div className="mb-2">
                    <Badge bg={getStatusVariant(todayAttendance.status)} className="px-3 py-2 me-2">
                      Status: {todayAttendance.status.toUpperCase()}
                    </Badge>
                    {todayAttendance.breaks && todayAttendance.breaks.length > 0 && 
                     todayAttendance.breaks[todayAttendance.breaks.length - 1].startTime && 
                     !todayAttendance.breaks[todayAttendance.breaks.length - 1].endTime && (
                      <Badge bg="warning" className="px-3 py-2">
                        ☕ ON BREAK
                      </Badge>
                    )}
                  </div>
                  
                  <Row>
                    <Col xs={6} md={3}>
                      <p className="mb-1 text-muted">Clock In</p>
                      <h6>{formatTime(todayAttendance.clockIn)}</h6>
                    </Col>
                    {todayAttendance.clockOut && (
                      <Col xs={6} md={3}>
                        <p className="mb-1 text-muted">Clock Out</p>
                        <h6>{formatTime(todayAttendance.clockOut)}</h6>
                      </Col>
                    )}
                    <Col xs={6} md={3}>
                      <p className="mb-1 text-muted">Break Time</p>
                      <h6 className="text-info">
                        {todayAttendance.totalBreakTime > 0 
                          ? `${Math.floor(todayAttendance.totalBreakTime / 60)}h ${Math.round(todayAttendance.totalBreakTime % 60)}m`
                          : "No breaks"}
                      </h6>
                    </Col>
                    {todayAttendance.clockOut && (
                      <Col xs={6} md={3}>
                        <p className="mb-1 text-muted">Hours Worked</p>
                        <h6 className="text-success">
                          {todayAttendance.workHours} hrs
                        </h6>
                      </Col>
                    )}
                  </Row>
                  
                  {/* Break Details */}
                  {todayAttendance.breaks && todayAttendance.breaks.length > 0 && (
                    <div className="mt-3 pt-3 border-top">
                      <p className="mb-2 text-muted small">
                        <strong>Break Details:</strong>
                      </p>
                      {todayAttendance.breaks.map((breakPeriod, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small">
                            ☕ Break {index + 1}: {formatTime(breakPeriod.startTime)} - {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : "In Progress"}
                          </span>
                          {breakPeriod.endTime && (
                            <Badge bg="secondary" className="small">
                              {Math.round((new Date(breakPeriod.endTime) - new Date(breakPeriod.startTime)) / 60000)}m
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="d-grid gap-2">
                {status === "not-clocked-in" && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleClockInClick}
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
                    onClick={handleClockOutClick}
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
        <Col xs={12} lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">
                <FaChartLine className="me-2 text-success" />
                This Period Summary
              </h5>
              {stats && (
                <Row className="text-center">
                  <Col xs={6} md={3} className="mb-3">
                    <div className="border-end">
                      <h3 className="text-success mb-0">{stats.present}</h3>
                      <small className="text-muted">Present</small>
                    </div>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <div className="border-end">
                      <h3 className="text-warning mb-0">{stats.late}</h3>
                      <small className="text-muted">Late</small>
                    </div>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <div className="border-end">
                      <h3 className="text-info mb-0">{stats.halfDay}</h3>
                      <small className="text-muted">Half Day</small>
                    </div>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <div>
                      <h3 className="text-danger mb-0">{stats.absent}</h3>
                      <small className="text-muted">Absent</small>
                    </div>
                  </Col>
                  <Col xs={6} md={4} className="mb-2">
                    <div className="border-end">
                      <h4 className="text-primary mb-0">{stats.totalHours}</h4>
                      <small className="text-muted">Total Hours</small>
                    </div>
                  </Col>
                  <Col xs={6} md={4} className="mb-2">
                    <div className="border-end">
                      <h4 className="text-info mb-0">
                        {Math.floor(stats.totalBreakTime / 60)}h {Math.round(stats.totalBreakTime % 60)}m
                      </h4>
                      <small className="text-muted">Total Breaks</small>
                    </div>
                  </Col>
                  <Col xs={12} md={4} className="mb-2">
                    <div>
                      <h4 className="text-secondary mb-0">{stats.total}</h4>
                      <small className="text-muted">Total Days</small>
                    </div>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-3 filter-controls">
        <Col xs={12} sm={6} md={3} className="mb-2 mb-md-0">
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
        <Col xs={12} sm={6} md={3} className="mb-2 mb-md-0">
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
        <Col xs={12} md={3} className="d-flex align-items-end">
          <Button variant="outline-success" onClick={handleExport} className="w-100 w-mobile-100">
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
                <Table responsive hover className="attendance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th className="hide-mobile">Break Time</th>
                      <th>Work Hours</th>
                      <th className="hide-mobile">Overtime</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length > 0 ? (
                      attendances.map((attendance) => (
                        <tr key={attendance._id} className={attendance.isWFH ? 'table-info' : ''}>
                          <td className="date-cell">
                            <div className="d-flex align-items-center gap-2">
                              <span>{formatDate(attendance.date)}</span>
                              {attendance.isWFH && (
                                <span 
                                  title={`Work From Home${attendance.wfhReason ? ': ' + attendance.wfhReason : ''}`}
                                  style={{ fontSize: '1.1em' }}
                                >
                                  🏠
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatTime(attendance.clockIn)}</td>
                          <td>
                            {attendance.clockOut
                              ? formatTime(attendance.clockOut)
                              : <Badge bg="warning">In Progress</Badge>}
                          </td>
                          <td className="hide-mobile">
                            {attendance.totalBreakTime > 0 ? (
                              <div 
                                className="d-flex align-items-center gap-1"
                                onClick={() => {
                                  setSelectedBreakDetails({
                                    date: attendance.date,
                                    breaks: attendance.breaks || [],
                                    totalBreakTime: attendance.totalBreakTime
                                  });
                                  setShowBreakDetailsModal(true);
                                }}
                                style={{ cursor: 'pointer' }}
                                title="Click to view break details"
                              >
                                <Badge bg="info" className="d-flex align-items-center gap-1">
                                  <span>☕</span>
                                  <span>{Math.floor(attendance.totalBreakTime / 60)}h {Math.round(attendance.totalBreakTime % 60)}m</span>
                                </Badge>
                                {attendance.breaks && attendance.breaks.length > 0 && 
                                 attendance.breaks[attendance.breaks.length - 1].startTime && 
                                 !attendance.breaks[attendance.breaks.length - 1].endTime && (
                                  <Badge bg="warning" style={{ fontSize: '0.7em' }}>
                                    Active
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>{attendance.workHours || 0} hrs</td>
                          <td className="hide-mobile">{attendance.overtime || 0} hrs</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg={getStatusVariant(attendance.status)}>
                                {attendance.status}
                              </Badge>
                              {attendance.isWFH && (
                                <Badge bg="info">WFH</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
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
                          {day.record && (
                            <>
                              {day.record.isWFH && (
                                <div style={{ fontSize: '1.5em' }} title={`Work From Home${day.record.wfhReason ? ': ' + day.record.wfhReason : ''}`}>
                                  🏠
                                </div>
                              )}
                              {day.record.workHours && (
                                <small className="text-muted d-block mt-1">
                                  {day.record.workHours}hrs
                                </small>
                              )}
                              {day.record.totalBreakTime > 0 && (
                                <small className="text-info d-block">
                                  ☕ {Math.floor(day.record.totalBreakTime / 60)}h {Math.round(day.record.totalBreakTime % 60)}m
                                </small>
                              )}
                            </>
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

        <Tab eventKey="overtime" title="Overtime History">
          <MyOvertimeHistory />
        </Tab>
      </Tabs>

      {/* Break Details Modal */}
      <Modal 
        show={showBreakDetailsModal} 
        onHide={() => setShowBreakDetailsModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            ☕ Break Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBreakDetails && (
            <>
              <div className="mb-3 p-3 bg-light rounded">
                <p className="mb-0"><strong>Date:</strong> {formatDate(selectedBreakDetails.date)}</p>
              </div>

              <div className="mb-3">
                <h6 className="mb-3">Break Periods</h6>
                {selectedBreakDetails.breaks && selectedBreakDetails.breaks.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {selectedBreakDetails.breaks.map((breakPeriod, index) => {
                      const isOngoing = breakPeriod.startTime && !breakPeriod.endTime;
                      const duration = breakPeriod.startTime && breakPeriod.endTime 
                        ? Math.round((new Date(breakPeriod.endTime) - new Date(breakPeriod.startTime)) / (1000 * 60))
                        : null;
                      
                      return (
                        <Card key={index} className={`border-${isOngoing ? 'warning' : 'secondary'}`}>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="w-100">
                                <h6 className="mb-1">
                                  Break {index + 1}
                                  {isOngoing && (
                                    <Badge bg="warning" className="ms-2">
                                      Active
                                    </Badge>
                                  )}
                                </h6>
                                <div className="text-muted small">
                                  <div>
                                    <strong>Start:</strong> {formatTime(breakPeriod.startTime)}
                                  </div>
                                  <div>
                                    <strong>End:</strong> {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : <span className="text-warning">Ongoing</span>}
                                  </div>
                                  {duration && (
                                    <div className="mt-1">
                                      <Badge bg="info">{duration} minutes</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted">No breaks recorded</p>
                )}
              </div>

              <div className="p-3 bg-primary bg-opacity-10 rounded">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Total Break Time:</span>
                  <Badge bg="primary" className="fs-6">
                    {Math.floor(selectedBreakDetails.totalBreakTime / 60)}h {Math.round(selectedBreakDetails.totalBreakTime % 60)}m
                  </Badge>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBreakDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Clock In Confirmation Modal */}
      <ConfirmModal
        show={showClockInConfirm}
        onHide={() => setShowClockInConfirm(false)}
        onConfirm={handleClockIn}
        title="Clock In Confirmation"
        message="Are you ready to start your workday?"
        subMessage="This will record your clock-in time."
        confirmText="Clock In"
        confirmVariant="success"
        icon="clock"
        loading={clockingIn}
      />

      {/* Clock Out Confirmation Modal */}
      <ConfirmModal
        show={showClockOutConfirm}
        onHide={() => setShowClockOutConfirm(false)}
        onConfirm={handleClockOut}
        title="Clock Out Confirmation"
        message="Are you done for the day?"
        subMessage="This will record your clock-out time and calculate your work hours."
        confirmText="Clock Out"
        confirmVariant="danger"
        icon="clock"
        loading={clockingIn}
        additionalInfo={todayAttendance?.clockIn && (
          <><strong>Clock In Time:</strong> {formatTime(todayAttendance.clockIn)}</>
        )}
      />

      {/* Work Log Submission Modal */}
      <WorkLogSubmissionModal
        show={showWorkLogModal}
        onHide={() => setShowWorkLogModal(false)}
        onSubmit={handleWorkLogSubmit}
        onSkip={handleWorkLogSkip}
      />
    </Container>
  );
};

export default MyAttendance;
