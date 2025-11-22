import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Tab, Tabs } from "react-bootstrap";
import { FaClock, FaCalendarAlt, FaDownload, FaChartBar } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

const MyAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
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
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get("/attendance/my-attendance");
      
      // Format the attendance records
      const formattedRecords = response.data.map(record => ({
        date: record.date,
        clockIn: record.clockIn ? new Date(record.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-",
        clockOut: record.clockOut ? new Date(record.clockOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-",
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
                            <td>{new Date(record.date).toLocaleDateString()}</td>
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
    </Container>
  );
};

export default MyAttendance;
