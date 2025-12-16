import { useState, useEffect } from 'react';
import { Modal, Card, Row, Col, Badge, Table, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { attendanceApi } from '../../api/attendanceApi';
import { formatDate, formatTime, getStatusVariant } from '../../utils/helpers';

const EmployeeAttendanceDetails = ({ show, onHide, employee }) => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (show && employee) {
      // Set default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      setDateRange({
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      });
      
      loadAttendance(employee._id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]);
    }
  }, [show, employee]);

  const loadAttendance = async (employeeId, startDate, endDate) => {
    try {
      setLoading(true);
      const params = {
        employee: employeeId,
        startDate,
        endDate
      };
      const response = await attendanceApi.getAllAttendance(params);
      setAttendances(response.data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    loadAttendance(employee._id, dateRange.startDate, dateRange.endDate);
  };

  const handleQuickSelect = (type) => {
    const now = new Date();
    let startDate, endDate;

    switch (type) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        return;
    }

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    setDateRange({ startDate: start, endDate: end });
    loadAttendance(employee._id, start, end);
  };

  const handleDownloadPDF = () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        employee: employee._id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/download-pdf?${params.toString()}`;
      
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Attendance Report - ${employee.name}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; }
                .loading { text-align: center; }
              </style>
            </head>
            <body>
              <div class="loading">
                <h2>📄 Generating PDF...</h2>
                <p>Loading attendance report for ${employee.name}</p>
                <p>${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}</p>
              </div>
              <script>
                fetch('${url}', {
                  headers: { 'Authorization': 'Bearer ${token}' }
                })
                .then(response => {
                  if (!response.ok) throw new Error('Failed to generate PDF');
                  return response.text();
                })
                .then(html => {
                  document.open();
                  document.write(html);
                  document.close();
                })
                .catch(error => {
                  document.body.innerHTML = '<div style="text-align: center; padding: 50px;"><h2>❌ Error Loading PDF</h2><p>' + error.message + '</p><button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Close Window</button></div>';
                });
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        toast.error("Please allow popups to view the PDF");
      }
    } catch (error) {
      console.error("Error opening PDF:", error);
      toast.error("Failed to open PDF");
    }
  };

  // Calculate statistics
  const stats = {
    present: attendances.filter(a => a.status === 'present').length,
    late: attendances.filter(a => a.status === 'late').length,
    halfDay: attendances.filter(a => a.status === 'half-day').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    onLeave: attendances.filter(a => a.status === 'on-leave').length,
    totalHours: attendances.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(2),
    totalOvertime: attendances.reduce((sum, a) => sum + (a.overtime || 0), 0).toFixed(2),
    totalDays: attendances.length
  };

  if (!employee) return null;

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="xl" 
      centered
      backdrop="static"
      dialogClassName="modal-90w"
    >
      <Modal.Header closeButton className="bg-primary text-white border-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <span>👤</span>
          <div>
            <div>Attendance Details</div>
            <small className="fw-normal opacity-75">{employee.name}</small>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto', padding: '1.5rem' }}>
        {/* Date Range Selector */}
        <Card className="mb-3 border-0 shadow-sm bg-light">
          <Card.Body className="p-3">
            <div className="d-flex align-items-center mb-3">
              <h6 className="mb-0 text-primary">📅 Select Date Range</h6>
            </div>
            <Row className="align-items-end g-2">
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateRangeChange}
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold mb-1">End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateRangeChange}
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleQuickSelect('thisMonth')}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleQuickSelect('lastMonth')}
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => handleQuickSelect('last3Months')}
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyDateRange}
                  >
                    ✓ Apply
                  </Button>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Statistics Cards */}
        <Row className="g-2 mb-3">
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #198754' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-success mb-0 fw-bold">{stats.present}</h5>
                <small className="text-muted d-block">Present</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #ffc107' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-warning mb-0 fw-bold">{stats.late}</h5>
                <small className="text-muted d-block">Late</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0dcaf0' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-info mb-0 fw-bold">{stats.halfDay}</h5>
                <small className="text-muted d-block">Half Day</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #dc3545' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-danger mb-0 fw-bold">{stats.absent}</h5>
                <small className="text-muted d-block">Absent</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #6c757d' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-secondary mb-0 fw-bold">{stats.onLeave}</h5>
                <small className="text-muted d-block">On Leave</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0d6efd' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-primary mb-0 fw-bold">{stats.totalHours}</h5>
                <small className="text-muted d-block">Total Hrs</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Attendance Table */}
        <Card className="border-0 shadow">
          <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
            <h6 className="mb-0 fw-semibold">
              <span className="me-2">📋</span>
              Attendance Records 
              <Badge bg="secondary" className="ms-2">{attendances.length}</Badge>
            </h6>
            <Button
              variant="success"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={attendances.length === 0}
              className="d-flex align-items-center gap-1 shadow-sm"
            >
              <span>📄</span>
              <span>Download PDF</span>
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <Table hover responsive className="mb-0">
                  <thead className="sticky-top" style={{ backgroundColor: '#f8f9fa', top: 0, zIndex: 1 }}>
                    <tr>
                      <th className="py-2 px-3 fw-semibold small">Date</th>
                      <th className="py-2 px-3 fw-semibold small">Clock In</th>
                      <th className="py-2 px-3 fw-semibold small">Clock Out</th>
                      <th className="py-2 px-3 fw-semibold small">Work Hours</th>
                      <th className="py-2 px-3 fw-semibold small">Overtime</th>
                      <th className="py-2 px-3 fw-semibold small">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length > 0 ? (
                      attendances.map((attendance) => (
                        <tr key={attendance._id}>
                          <td className="py-2 px-3">{formatDate(attendance.date)}</td>
                          <td className="py-2 px-3">{formatTime(attendance.clockIn)}</td>
                          <td className="py-2 px-3">{attendance.clockOut ? formatTime(attendance.clockOut) : <span className="text-muted">-</span>}</td>
                          <td className="py-2 px-3">{attendance.workHours || 0} hrs</td>
                          <td className="py-2 px-3">{attendance.overtime || 0} hrs</td>
                          <td className="py-2 px-3">
                            <Badge bg={getStatusVariant(attendance.status)} className="px-2">
                              {attendance.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="text-muted">
                            <div className="mb-2" style={{ fontSize: '2rem' }}>📭</div>
                            <div>No attendance records found for this period</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Employee Info */}
        <Card className="mt-3 border-0 shadow-sm">
          <Card.Body className="p-3 bg-light">
            <Row className="g-3">
              <Col xs={12} md={6}>
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 rounded p-2">
                    <span className="text-primary">👤</span>
                  </div>
                  <div>
                    <small className="text-muted d-block mb-1">Employee Name</small>
                    <strong className="d-block">{employee.name}</strong>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-info bg-opacity-10 rounded p-2">
                    <span className="text-info">✉️</span>
                  </div>
                  <div>
                    <small className="text-muted d-block mb-1">Email</small>
                    <strong className="d-block">{employee.email}</strong>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer className="border-0 bg-light">
        <Button variant="secondary" onClick={onHide} className="px-4">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmployeeAttendanceDetails;
