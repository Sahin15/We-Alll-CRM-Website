import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Tab, Tabs, Alert, Spinner, Modal, Form } from "react-bootstrap";
import { FaClock, FaCalendarAlt, FaDownload, FaChartBar, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import { formatDate, formatTimeShort, formatTime } from "../../utils/helpers";
import { formatWorkHours } from "../../utils/attendanceHelpers";
import toast from "../../utils/toast";
import api from "../../services/api";
import { attendanceApi } from "../../api/attendanceApi";
import { workOnLeaveDayApi } from "../../api/workOnLeaveDayApi";
import ConfirmModal from "../../components/common/ConfirmModal";

const MyAttendance = () => {
  console.log('[MY-ATTENDANCE] Component loaded!');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [showClockInConfirm, setShowClockInConfirm] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [currentMonth] = useState(new Date().toLocaleString("default", { month: "long", year: "numeric" }));
  const [activeTab, setActiveTab] = useState('list');
  const [stats, setStats] = useState({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    totalHours: 0,
  });
  
  // Break details modal state
  const [showBreakDetailsModal, setShowBreakDetailsModal] = useState(false);
  const [selectedBreakDetails, setSelectedBreakDetails] = useState(null);

  // Work on leave day modal state
  const [showWorkOnLeaveModal, setShowWorkOnLeaveModal] = useState(false);
  const [leaveRequestInfo, setLeaveRequestInfo] = useState(null);
  const [workOnLeaveReason, setWorkOnLeaveReason] = useState("");

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendance();
  }, []);

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
      const response = await api.get("/attendance/my-attendance");
      
      // Format the attendance records
      const formattedRecords = response.data.map(record => ({
        date: record.date,
        clockIn: record.clockIn ? formatTimeShort(record.clockIn) : "-",
        clockOut: record.clockOut ? formatTimeShort(record.clockOut) : "-",
        hours: record.workHours ? `${Math.floor(record.workHours)}h ${Math.round((record.workHours % 1) * 60)}m` : "-",
        breakTime: record.totalBreakTime || 0,
        breaks: record.breaks || [],
        status: record.status || "present",
        workHours: record.workHours || 0,
      }));
      
      setAttendanceRecords(formattedRecords);
      
      // Calculate stats
      const present = formattedRecords.filter(r => r.status === 'present').length;
      const absent = formattedRecords.filter(r => r.status === 'absent').length;
      const late = formattedRecords.filter(r => r.status === 'late').length;
      const totalHours = formattedRecords.reduce((sum, r) => sum + r.workHours, 0);
      const totalBreakMinutes = response.data.reduce((sum, r) => sum + (r.totalBreakTime || 0), 0);
      
      setStats({
        totalDays: formattedRecords.length,
        present,
        absent,
        late,
        totalHours: totalHours.toFixed(1),
        totalBreakTime: totalBreakMinutes.toFixed(0),
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      
      if (error.response?.status === 404) {
        toast.info("No attendance records found");
      } else if (error.response?.status === 401) {
        toast.error("Please login again");
      } else {
        toast.error(error.response?.data?.message || "Failed to load attendance records");
      }
      
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
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
      console.error('[CLOCK-IN] Error:', error);
      const errorType = error.response?.data?.type;
      
      if (errorType === "on_leave_need_approval") {
        // Employee is on leave and needs to request approval
        setLeaveRequestInfo(error.response.data.leaveRequest);
        setShowWorkOnLeaveModal(true);
        toast.info("You are on approved leave today. Please submit a request to work on this day.");
      } else if (errorType === "work_on_leave_pending") {
        toast.warning("Your request to work on this leave day is pending HR approval.");
      } else if (errorType === "work_on_leave_rejected") {
        toast.error("Your request to work on this leave day was rejected.");
      } else {
        toast.error(error.response?.data?.message || "Failed to clock in");
      }
    } finally {
      setClockingIn(false);
    }
  };

  const handleSubmitWorkOnLeaveRequest = async () => {
    if (!workOnLeaveReason.trim()) {
      toast.error("Please provide a reason for working on your leave day");
      return;
    }

    try {
      await workOnLeaveDayApi.createRequest({
        date: new Date().toISOString(),
        leaveRequestId: leaveRequestInfo._id,
        reason: workOnLeaveReason,
      });
      
      toast.success("Request submitted successfully! Waiting for HR approval.");
      setShowWorkOnLeaveModal(false);
      setWorkOnLeaveReason("");
      setLeaveRequestInfo(null);
    } catch (error) {
      console.error('[WORK ON LEAVE] Error:', error);
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  const handleClockOutClick = () => {
    console.log('[CLOCK-OUT] Button clicked');
    console.log('[CLOCK-OUT] Current status:', getCurrentStatus());
    console.log('[CLOCK-OUT] Today attendance:', todayAttendance);
    setShowClockOutConfirm(true);
  };

  const handleClockOut = async () => {
    console.log('[CLOCK-OUT] Confirming clock out');
    setShowClockOutConfirm(false);
    
    try {
      setClockingIn(true);
      console.log('[CLOCK-OUT] Calling API...');
      await attendanceApi.clockOut("End of day");
      console.log('[CLOCK-OUT] API call successful');
      toast.success("Clocked out successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
    } catch (error) {
      console.error('[CLOCK-OUT] Error:', error);
      toast.error(error.response?.data?.message || "Failed to clock out");
    } finally {
      setClockingIn(false);
    }
  };

  const getCurrentStatus = () => {
    if (!todayAttendance) {
      return "not-clocked-in";
    }
    
    if (todayAttendance.clockOut) {
      return "clocked-out";
    }
    
    if (todayAttendance.clockIn) {
      return "clocked-in";
    }
    
    return "not-clocked-in";
  };

  const getStatusBadge = (status) => {
    const variants = {
      Present: "success",
      Late: "warning",
      Absent: "danger",
      Leave: "info",
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Clock In', 'Clock Out', 'Break Time', 'Hours Worked', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceRecords.map(record => 
        [
          new Date(record.date).toLocaleDateString(),
          record.clockIn,
          record.clockOut,
          record.breakTime > 0 
            ? `${Math.floor(record.breakTime / 60)}h ${Math.round(record.breakTime % 60)}m`
            : "No breaks",
          record.hours,
          record.status
        ].join(',')
      )
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${currentMonth.replace(' ', '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Attendance report exported!");
  };

  const status = getCurrentStatus();

  const renderCalendarView = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Create a consistent date string for comparison (YYYY-MM-DD format)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const record = attendanceRecords.find(r => {
        // Convert the record date to the same format for comparison
        const recordDate = new Date(r.date);
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        return recordDateStr === dateStr;
      });
      
      const isToday = date.toDateString() === today.toDateString();
      const isFuture = date > today;
      
      days.push(
        <div
          key={day}
          className={`p-2 border rounded text-center ${
            isToday ? 'bg-primary text-white' : 
            isFuture ? 'bg-light text-muted' :
            record ? 
              record.status === 'present' ? 'bg-success bg-opacity-10' :
              record.status === 'late' ? 'bg-warning bg-opacity-10' :
              'bg-danger bg-opacity-10'
            : 'bg-light'
          }`}
          style={{ minHeight: '60px' }}
        >
          <div className="fw-bold">{day}</div>
          {record && (
            <div className="small">
              <div>{record.clockIn}</div>
              <div>{record.hours}</div>
              {record.breakTime > 0 && (
                <div className="text-info">
                  ☕ {Math.floor(record.breakTime / 60)}h {Math.round(record.breakTime % 60)}m
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center fw-bold p-2">{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>My Attendance</h2>
              <p className="text-muted mb-0">{currentMonth}</p>
            </div>
            <Button variant="primary" onClick={handleExport}>
              <FaDownload className="me-2" />
              Export Report
            </Button>
          </div>
        </Col>
      </Row>

      {/* Today's Clock In/Out Section */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3 mb-lg-0">
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
                    <Badge bg={todayAttendance.status === 'present' ? 'success' : todayAttendance.status === 'late' ? 'warning' : 'danger'} className="px-3 py-2 me-2">
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
                          {formatWorkHours(todayAttendance.workHours)}
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

              <div className="d-grid gap-2" style={{ position: 'relative', zIndex: 1000 }}>
                {status === "not-clocked-in" && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={(e) => {
                      handleClockInClick();
                    }}
                    disabled={clockingIn}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    <FaSignInAlt className="me-2" />
                    {clockingIn ? "Clocking in..." : "Clock In"}
                  </Button>
                )}

                {status === "clocked-in" && (
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={(e) => {
                      console.log('[BUTTON] Clock Out clicked!', e);
                      alert('Clock Out button was clicked!');
                      handleClockOutClick();
                    }}
                    disabled={clockingIn}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
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
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">
                <FaChartBar className="me-2 text-success" />
                Quick Stats
              </h5>
              <Row className="text-center">
                <Col xs={6} className="mb-3">
                  <div className="border-end">
                    <h3 className="text-success mb-0">{stats.present}</h3>
                    <small className="text-muted">Present</small>
                  </div>
                </Col>
                <Col xs={6} className="mb-3">
                  <div>
                    <h3 className="text-warning mb-0">{stats.late}</h3>
                    <small className="text-muted">Late</small>
                  </div>
                </Col>
                <Col xs={6} className="mb-3">
                  <div className="border-end">
                    <h4 className="text-primary mb-0">{stats.totalHours}h</h4>
                    <small className="text-muted">Total Hours</small>
                  </div>
                </Col>
                <Col xs={6} className="mb-3">
                  <div>
                    <h4 className="text-info mb-0">
                      {Math.floor(stats.totalBreakTime / 60)}h {Math.round(stats.totalBreakTime % 60)}m
                    </h4>
                    <small className="text-muted">Total Breaks</small>
                  </div>
                </Col>
                <Col xs={12} className="mb-2">
                  <div>
                    <h4 className="text-secondary mb-0">{stats.totalDays}</h4>
                    <small className="text-muted">Total Days</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaCalendarAlt className="text-primary fs-3 mb-2" />
              <h6 className="text-muted">Total Days</h6>
              <h2 className="mb-0">{stats.totalDays}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaClock className="text-success fs-3 mb-2" />
              <h6 className="text-muted">Present</h6>
              <h2 className="mb-0 text-success">{stats.present}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaChartBar className="text-danger fs-3 mb-2" />
              <h6 className="text-muted">Absent/Late</h6>
              <h2 className="mb-0 text-danger">{stats.absent + stats.late}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaClock className="text-info fs-3 mb-2" />
              <h6 className="text-muted">Total Break Time</h6>
              <h2 className="mb-0 text-info">
                {Math.floor(stats.totalBreakTime / 60)}h {Math.round(stats.totalBreakTime % 60)}m
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaClock className="text-info fs-3 mb-2" />
              <h6 className="text-muted">Total Hours</h6>
              <h2 className="mb-0 text-info">{stats.totalHours}h</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Attendance Records */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                <Tab eventKey="list" title="List View">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : attendanceRecords.length === 0 ? (
                    <div className="text-center py-5">
                      <FaClock className="text-muted fs-1 mb-3" />
                      <p className="text-muted">No attendance records found</p>
                    </div>
                  ) : (
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Clock In</th>
                          <th>Clock Out</th>
                          <th>Break Time</th>
                          <th>Hours Worked</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.map((record, index) => (
                          <tr key={index}>
                            <td>{formatDate(record.date)}</td>
                            <td>{record.clockIn}</td>
                            <td>{record.clockOut}</td>
                            <td>
                              {record.breakTime > 0 ? (
                                <div 
                                  className="d-flex align-items-center gap-1"
                                  onClick={() => {
                                    setSelectedBreakDetails({
                                      date: record.date,
                                      breaks: record.breaks || [],
                                      totalBreakTime: record.breakTime
                                    });
                                    setShowBreakDetailsModal(true);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  title="Click to view break details"
                                >
                                  <Badge bg="info" className="d-flex align-items-center gap-1">
                                    <span>☕</span>
                                    <span>{Math.floor(record.breakTime / 60)}h {Math.round(record.breakTime % 60)}m</span>
                                  </Badge>
                                  {record.breaks && record.breaks.length > 0 && 
                                   record.breaks[record.breaks.length - 1].startTime && 
                                   !record.breaks[record.breaks.length - 1].endTime && (
                                    <Badge bg="warning" style={{ fontSize: '0.7em' }}>
                                      Active
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>{record.hours}</td>
                            <td>{getStatusBadge(record.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab>
                
                <Tab eventKey="calendar" title="Calendar View">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" />
                    </div>
                  ) : (
                    <div className="py-3">
                      {renderCalendarView()}
                      <div className="mt-3 d-flex gap-3 justify-content-center">
                        <span><span className="badge bg-success me-1">■</span> Present</span>
                        <span><span className="badge bg-warning me-1">■</span> Late</span>
                        <span><span className="badge bg-danger me-1">■</span> Absent</span>
                        <span><span className="badge bg-primary me-1">■</span> Today</span>
                      </div>
                    </div>
                  )}
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Clock In Confirmation Modal */}
      <ConfirmModal
        show={showClockInConfirm}
        onHide={() => setShowClockInConfirm(false)}
        onConfirm={handleClockIn}
        title="Clock In"
        message="Are you ready to start your workday? This will record your clock-in time."
        confirmText="Clock In"
        confirmVariant="success"
        loading={clockingIn}
      />

      {/* Clock Out Confirmation Modal */}
      <ConfirmModal
        show={showClockOutConfirm}
        onHide={() => setShowClockOutConfirm(false)}
        onConfirm={handleClockOut}
        title="Clock Out"
        message="Are you done for the day? This will record your clock-out time and calculate your work hours."
        confirmText="Clock Out"
        confirmVariant="danger"
        loading={clockingIn}
      />

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

      {/* Work on Leave Day Request Modal */}
      <Modal show={showWorkOnLeaveModal} onHide={() => setShowWorkOnLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Request to Work on Leave Day</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            You are currently on approved leave today. To work on this day, you need HR approval.
          </Alert>
          
          {leaveRequestInfo && (
            <div className="mb-3">
              <p className="mb-1"><strong>Leave Type:</strong> {leaveRequestInfo.leaveType}</p>
              <p className="mb-1"><strong>Leave Period:</strong> {formatDate(leaveRequestInfo.startDate)} to {formatDate(leaveRequestInfo.endDate)}</p>
            </div>
          )}

          <Form.Group>
            <Form.Label>Reason for Working on Leave Day *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="Please explain why you need to work on this leave day..."
              value={workOnLeaveReason}
              onChange={(e) => setWorkOnLeaveReason(e.target.value)}
              required
            />
            <Form.Text className="text-muted">
              Your request will be reviewed by HR. You can clock in once approved.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWorkOnLeaveModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitWorkOnLeaveRequest}
            disabled={!workOnLeaveReason.trim()}
          >
            Submit Request
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyAttendance;
