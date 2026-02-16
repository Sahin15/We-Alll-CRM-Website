import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Tab, Tabs, Alert, Spinner } from "react-bootstrap";
import { FaClock, FaCalendarAlt, FaDownload, FaChartBar, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import { formatDate, formatTimeShort, formatTime } from "../../utils/helpers";
import toast from "../../utils/toast";
import api from "../../services/api";
import { attendanceApi } from "../../api/attendanceApi";
import ConfirmModal from "../../components/common/ConfirmModal";

const MyAttendance = () => {
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

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendance();
  }, []);

  useEffect(() => {
    console.log('[MY-ATTENDANCE] ===== Status Update =====');
    console.log('[MY-ATTENDANCE] Current status:', status);
    console.log('[MY-ATTENDANCE] Today attendance:', todayAttendance);
    console.log('[MY-ATTENDANCE] Has clockIn:', !!todayAttendance?.clockIn);
    console.log('[MY-ATTENDANCE] Has clockOut:', !!todayAttendance?.clockOut);
    console.log('[MY-ATTENDANCE] ===========================');
  }, [status, todayAttendance]);

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
        status: record.status || "present",
        workHours: record.workHours || 0,
      }));
      
      setAttendanceRecords(formattedRecords);
      
      // Calculate stats
      const present = formattedRecords.filter(r => r.status === 'present').length;
      const absent = formattedRecords.filter(r => r.status === 'absent').length;
      const late = formattedRecords.filter(r => r.status === 'late').length;
      const totalHours = formattedRecords.reduce((sum, r) => sum + r.workHours, 0);
      
      setStats({
        totalDays: formattedRecords.length,
        present,
        absent,
        late,
        totalHours: totalHours.toFixed(1),
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
      toast.error(error.response?.data?.message || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOutClick = () => {
    console.log('[MY-ATTENDANCE] ===== Clock Out button clicked =====');
    console.log('[MY-ATTENDANCE] Current status:', status);
    console.log('[MY-ATTENDANCE] Today attendance:', todayAttendance);
    console.log('[MY-ATTENDANCE] Clocking in state:', clockingIn);
    alert('Clock Out button clicked! Check console for details.');
    setShowClockOutConfirm(true);
  };

  const handleClockOut = async () => {
    console.log('[MY-ATTENDANCE] Confirming clock out');
    setShowClockOutConfirm(false);
    
    try {
      setClockingIn(true);
      console.log('[MY-ATTENDANCE] Calling clockOut API');
      await attendanceApi.clockOut("End of day");
      console.log('[MY-ATTENDANCE] Clock out successful');
      toast.success("Clocked out successfully!");
      await fetchTodayAttendance();
      await fetchAttendance();
    } catch (error) {
      console.error('[MY-ATTENDANCE] Clock out error:', error);
      toast.error(error.response?.data?.message || "Failed to clock out");
    } finally {
      setClockingIn(false);
    }
  };

  const getCurrentStatus = () => {
    if (!todayAttendance) {
      console.log('[MY-ATTENDANCE] Status: not-clocked-in (no attendance record)');
      return "not-clocked-in";
    }
    
    if (todayAttendance.clockOut) {
      console.log('[MY-ATTENDANCE] Status: clocked-out (has clockOut)');
      return "clocked-out";
    }
    
    if (todayAttendance.clockIn) {
      console.log('[MY-ATTENDANCE] Status: clocked-in (has clockIn, no clockOut)');
      return "clocked-in";
    }
    
    console.log('[MY-ATTENDANCE] Status: not-clocked-in (fallback)');
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
    const headers = ['Date', 'Clock In', 'Clock Out', 'Hours Worked', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceRecords.map(record => 
        [
          new Date(record.date).toLocaleDateString(),
          record.clockIn,
          record.clockOut,
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
      const dateStr = date.toISOString().split('T')[0];
      const record = attendanceRecords.find(r => 
        new Date(r.date).toISOString().split('T')[0] === dateStr
      );
      
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
                    <Badge bg={todayAttendance.status === 'present' ? 'success' : todayAttendance.status === 'late' ? 'warning' : 'danger'} className="px-3 py-2">
                      Status: {todayAttendance.status.toUpperCase()}
                    </Badge>
                  </div>
                  <Row>
                    <Col>
                      <p className="mb-1 text-muted">Clock In</p>
                      <h6>{formatTime(todayAttendance.clockIn)}</h6>
                    </Col>
                    {todayAttendance.clockOut && (
                      <>
                        <Col>
                          <p className="mb-1 text-muted">Clock Out</p>
                          <h6>{formatTime(todayAttendance.clockOut)}</h6>
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

              <div className="d-grid gap-2" style={{ position: 'relative', zIndex: 1 }}>
                {/* Debug Info */}
                <div className="alert alert-secondary small mb-2">
                  <strong>Debug:</strong> Status = {status} | Clocking In = {clockingIn ? 'Yes' : 'No'} | Has Attendance = {todayAttendance ? 'Yes' : 'No'} | Has ClockIn = {todayAttendance?.clockIn ? 'Yes' : 'No'} | Has ClockOut = {todayAttendance?.clockOut ? 'Yes' : 'No'}
                </div>
                
                {status === "not-clocked-in" && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleClockInClick}
                    disabled={clockingIn}
                  >
                    <FaSignInAlt className="me-2" />
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
                <Col xs={6} className="mb-2">
                  <div className="border-end">
                    <h4 className="text-primary mb-0">{stats.totalHours}h</h4>
                    <small className="text-muted">Total Hours</small>
                  </div>
                </Col>
                <Col xs={6} className="mb-2">
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
    </Container>
  );
};

export default MyAttendance;
