import { useState, useEffect } from 'react';
import { Modal, Card, Row, Col, Badge, Table, Button, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { attendanceApi } from '../../api/attendanceApi';
import holidayApi from '../../api/holidayApi';
import { formatDate, formatTime, getStatusVariant } from '../../utils/helpers';
import { formatWorkHours, toISTDateString, eachDateStringInRange, isSundayIST } from '../../utils/attendanceHelpers';
import AttendanceCalendar from './AttendanceCalendar';

const EmployeeAttendanceDetails = ({ show, onHide, employee }) => {
  const [attendances, setAttendances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [viewType, setViewType] = useState('table'); // 'calendar' or 'table'

  // Helper function to format date to IST (YYYY-MM-DD)
  const formatDateToIST = (date) => toISTDateString(date);

  // Helper function to check if a date is Sunday (IST calendar day)
  const isSunday = (date) => {
    const dateStr = typeof date === 'string' ? date : toISTDateString(date);
    return isSundayIST(dateStr);
  };

  // Helper function to check if a date is a holiday
  const isHoliday = (date) => {
    const dateStr = typeof date === 'string' ? date : toISTDateString(date);
    return holidays.some((holiday) => toISTDateString(holiday.date) === dateStr);
  };

  // Helper function to get holiday name
  const getHolidayName = (date) => {
    const dateStr = typeof date === 'string' ? date : toISTDateString(date);
    const holiday = holidays.find((h) => toISTDateString(h.date) === dateStr);
    return holiday ? holiday.name : null;
  };

  // Helper function to get day name
  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(date);
    return days[d.getDay()];
  };

  // Helper function to get day color
  const getDayColor = (date) => {
    if (isSunday(date)) {
      return '#dc3545'; // Red for Sunday
    }
    if (isHoliday(date)) {
      return '#ffc107'; // Yellow for Holiday
    }
    return '#28a745'; // Green for normal working days
  };

  useEffect(() => {
    if (show && employee) {
      // Set default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDateStr = formatDateToIST(firstDay);
      const endDateStr = formatDateToIST(lastDay);
      
      setDateRange({
        startDate: startDateStr,
        endDate: endDateStr
      });
      
      loadDetails(employee._id, startDateStr, endDateStr);
    }
  }, [show, employee]);

  const parseHolidays = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const loadDetails = async (employeeId, startDate, endDate) => {
    setLoading(true);
    setAttendances([]);
    try {
      const [attendanceRes, holidayRes] = await Promise.all([
        attendanceApi.getAllAttendance({
          employee: employeeId,
          startDate,
          endDate,
        }),
        holidayApi.getHolidays().catch((error) => {
          console.error("Error fetching holidays:", error);
          return { data: [] };
        }),
      ]);
      setAttendances(attendanceRes.data || []);
      setHolidays(parseHolidays(holidayRes));
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance records');
      setAttendances([]);
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
    loadDetails(employee._id, dateRange.startDate, dateRange.endDate);
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

    // Convert to IST date strings (YYYY-MM-DD)
    const start = formatDateToIST(startDate);
    const end = formatDateToIST(endDate);
    
    setDateRange({ startDate: start, endDate: end });
    loadDetails(employee._id, start, end);
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

  // Generate all dates in the range for table view (excluding future dates)
  const getAllDatesInRange = () => {
    if (loading || !dateRange.startDate || !dateRange.endDate) return [];

    const todayIST = toISTDateString(new Date());
    const attendanceByDate = new Map();
    for (const record of attendances) {
      if (!record?.date) continue;
      const key = toISTDateString(record.date);
      if (!key) continue;
      // Prefer on-leave over absent when duplicate keys exist (IST day match)
      const existing = attendanceByDate.get(key);
      if (
        !existing ||
        (existing.status === 'absent' && record.status === 'on-leave') ||
        (existing.status === 'no-data' && record.status && record.status !== 'no-data')
      ) {
        attendanceByDate.set(key, record);
      }
    }

    const allDates = [];
    for (const dateStr of eachDateStringInRange(dateRange.startDate, dateRange.endDate)) {
      if (dateStr > todayIST) continue;

      const attendance = attendanceByDate.get(dateStr);
      if (attendance) {
        allDates.push(attendance);
        continue;
      }

      const isSundayDate = isSunday(dateStr);
      const isHolidayDate = isHoliday(dateStr);
      let status = 'absent';
      if (isHolidayDate) {
        status = 'holiday';
      } else if (isSundayDate) {
        status = 'weekend';
      }

      allDates.push({
        _id: dateStr,
        date: dateStr,
        status,
        employee: employee._id,
        clockIn: null,
        clockOut: null,
        workHours: 0,
        breaks: [],
        overtime: 0,
      });
    }

    return allDates.sort((a, b) => {
      const aKey = toISTDateString(a.date);
      const bKey = toISTDateString(b.date);
      return bKey.localeCompare(aKey);
    });
  };

  const formatAttendanceStatusLabel = (status) => {
    switch (status) {
      case 'no-data':
        return 'No Data';
      case 'absent':
        return 'Absent';
      case 'on-leave':
        return 'On Leave';
      case 'half-day':
        return 'Half Day';
      case 'weekend':
        return 'Weekend';
      case 'holiday':
        return 'Holiday';
      default:
        return status || '—';
    }
  };

  // Calculate statistics from all dates in range
  const allDatesWithStatus = getAllDatesInRange();
  const stats = {
    present: allDatesWithStatus.filter(a => a.status === 'present').length,
    late: allDatesWithStatus.filter(a => a.status === 'late').length,
    halfDay: allDatesWithStatus.filter(a => a.status === 'half-day').length,
    absent: allDatesWithStatus.filter(a => a.status === 'absent').length,
    onLeave: allDatesWithStatus.filter(a => a.status === 'on-leave').length,
    weekend: allDatesWithStatus.filter(a => a.status === 'weekend').length,
    holiday: allDatesWithStatus.filter(a => a.status === 'holiday').length,
    totalHours: attendances.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(2),
    totalOvertime: attendances.reduce((sum, a) => sum + (a.overtime || 0), 0).toFixed(2),
    totalDays: allDatesWithStatus.length
  };

  if (!employee) return null;

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="xl" 
      centered
      backdrop="static"
      scrollable
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
      <Modal.Body style={{ padding: '1.5rem' }}>
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
                <h5 className="text-success mb-0 fw-bold">{loading ? '—' : stats.present}</h5>
                <small className="text-muted d-block">Present</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #ffc107' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-warning mb-0 fw-bold">{loading ? '—' : stats.late}</h5>
                <small className="text-muted d-block">Late</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0dcaf0' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-info mb-0 fw-bold">{loading ? '—' : stats.halfDay}</h5>
                <small className="text-muted d-block">Half Day</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #dc3545' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-danger mb-0 fw-bold">{loading ? '—' : stats.absent}</h5>
                <small className="text-muted d-block">Absent</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0d6efd' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-primary mb-0 fw-bold">{loading ? '—' : stats.onLeave}</h5>
                <small className="text-muted d-block">On Leave</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0d6efd' }}>
              <Card.Body className="p-2 text-center">
                <h5 className="text-primary mb-0 fw-bold">{loading ? '—' : stats.totalHours}</h5>
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
            <div className="d-flex gap-2 align-items-center">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${viewType === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewType('calendar')}
                >
                  📅 Calendar
                </button>
                <button
                  type="button"
                  className={`btn ${viewType === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewType('table')}
                >
                  📊 Table
                </button>
              </div>
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
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted mt-3 mb-0">Loading attendance details...</p>
              </div>
            ) : viewType === 'calendar' ? (
              // Calendar View
              <div className="p-3">
                <AttendanceCalendar
                  attendances={allDatesWithStatus}
                  holidays={holidays}
                  selectedMonth={new Date(dateRange.startDate).getMonth()}
                  selectedYear={new Date(dateRange.startDate).getFullYear()}
                  employeeName={employee.name}
                />
              </div>
            ) : (
              // Table View
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <Table hover responsive className="mb-0">
                  <thead className="sticky-top" style={{ backgroundColor: '#f8f9fa', top: 0, zIndex: 1 }}>
                    <tr>
                      <th className="py-2 px-3 fw-semibold small">Date</th>
                      <th className="py-2 px-3 fw-semibold small">Clock In</th>
                      <th className="py-2 px-3 fw-semibold small">Clock Out</th>
                      <th className="py-2 px-3 fw-semibold small">Work Hours</th>
                      <th className="py-2 px-3 fw-semibold small">Breaks</th>
                      <th className="py-2 px-3 fw-semibold small">Overtime</th>
                      <th className="py-2 px-3 fw-semibold small">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDatesWithStatus.length > 0 ? (
                      allDatesWithStatus.map((attendance) => {
                        const breaks = attendance.breaks || [];
                        const totalBreakMinutes = breaks.reduce((sum, b) => {
                          if (b.startTime && b.endTime) {
                            const start = new Date(b.startTime);
                            const end = new Date(b.endTime);
                            return sum + Math.round((end - start) / (1000 * 60));
                          }
                          return sum;
                        }, 0);
                        
                        return (
                          <tr key={attendance._id} style={{ backgroundColor: attendance.status === 'no-data' || attendance.status === 'absent' ? '#f8f9fa' : 'transparent' }}>
                            <td className="py-2 px-3">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span>{formatDate(attendance.date)}</span>
                                {attendance.isWFH && (
                                  <span
                                    title={`Work From Home${attendance.wfhReason ? ': ' + attendance.wfhReason : ''}`}
                                    style={{ fontSize: '1.1em', cursor: 'default' }}
                                  >
                                    🏠
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {attendance.status === 'on-leave' ? (
                                <Badge bg="primary">On Leave</Badge>
                              ) : attendance.clockIn ? (
                                formatTime(attendance.clockIn)
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {attendance.status === 'on-leave' ? (
                                <span className="text-muted">-</span>
                              ) : attendance.clockOut ? (
                                formatTime(attendance.clockOut)
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">{formatWorkHours(attendance.workHours || 0)}</td>
                            <td className="py-2 px-3">
                              {breaks.length > 0 ? (
                                <span className="text-info" title={`${breaks.length} break(s), Total: ${totalBreakMinutes} min`}>
                                  {breaks.length} ({totalBreakMinutes} min)
                                </span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">{attendance.overtime || 0} hrs</td>
                            <td className="py-2 px-3">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <Badge bg={getStatusVariant(attendance.status)} className="px-2">
                                  {formatAttendanceStatusLabel(attendance.status)}
                                </Badge>
                                {attendance.isWFH && (
                                  <span
                                    title={`Work From Home${attendance.wfhReason ? ': ' + attendance.wfhReason : ''}`}
                                    style={{ fontSize: '1.15em', cursor: 'default', lineHeight: 1 }}
                                  >
                                    🏠
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
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
