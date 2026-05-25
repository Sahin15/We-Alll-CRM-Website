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
import { useAuth } from "../../context/AuthContext";
import { attendanceApi } from "../../api/attendanceApi";
import { formatDate, formatDateTime, formatTime, getStatusVariant, formatHours } from "../../utils/helpers";
import { formatWorkHours } from "../../utils/attendanceHelpers";
import ConfirmModal from "../../components/common/ConfirmModal";
import WorkLogSubmissionModal from "../../components/worklog/WorkLogSubmissionModal";
import MyOvertimeHistory from "../../components/attendance/MyOvertimeHistory";
import AttendanceCalendar from "../../components/attendance/AttendanceCalendar";
import PageHeader from "../../components/shared/PageHeader";
import MobileTabBar from "../../components/shared/MobileTabBar";
import MobileFilterSheet from "../../components/shared/MobileFilterSheet";
import { workLogApi } from "../../api/workLogApi";
import * as XLSX from "xlsx";
const MyAttendance = () => {
  const { user } = useAuth();
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
  const [activeViewTab, setActiveViewTab] = useState("table");
  
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
      const onLeave = data.filter((a) => a.status === "on-leave").length;
      const totalHours = data.reduce((sum, a) => sum + (a.workHours || 0), 0);
      const overtime = data.reduce((sum, a) => sum + (a.overtime || 0), 0);
      const totalBreakMinutes = data.reduce((sum, a) => sum + (a.totalBreakTime || 0), 0);
      
      // Calculate working days (exclude on-leave days)
      const workingDays = data.length - onLeave;
      const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

      setStats({
        present,
        absent,
        late,
        halfDay,
        onLeave,
        totalHours: formatHours(totalHours),
        overtime: formatHours(overtime),
        totalBreakTime: totalBreakMinutes.toFixed(0),
        avgHoursPerDay: formatHours(avgHoursPerDay),
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
      // Create consistent date strings for comparison (YYYY-MM-DD format)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const record = data.find((a) => {
        const recordDate = new Date(a.date);
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        return recordDateStr === dateStr;
      });

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

  const formatDateDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleExportPDF = () => {
    try {
      // Calculate expected average hours
      let totalExpected = 0;
      let workingDays = 0;
      attendances.forEach((a) => {
        if (a.status === 'present' || a.status === 'late') {
          const date = new Date(a.date);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 6) {
            totalExpected += 6;
          } else if (dayOfWeek !== 0) {
            totalExpected += 8;
          }
          workingDays += 1;
        } else if (a.status === 'half-day') {
          const date = new Date(a.date);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 6) {
            totalExpected += 3;
          } else if (dayOfWeek !== 0) {
            totalExpected += 4;
          }
          workingDays += 1;
        }
      });
      const expectedAvgHours = workingDays > 0 ? totalExpected / workingDays : 0;
      const expectedAvgHoursFormatted = formatHours(expectedAvgHours);

      // Create a printable version
      const printWindow = window.open('', '_blank');
      const currentDate = formatDateDDMMYYYY(new Date());
      const startDateFormatted = formatDateDDMMYYYY(dateRange.startDate);
      const endDateFormatted = formatDateDDMMYYYY(dateRange.endDate);
      
      // Pre-calculate all values needed in the template
      const totalBreakTimeFormatted = `${Math.floor(stats.totalBreakTime / 60)}h ${Math.round(stats.totalBreakTime % 60)}m`;
      const daysWorked = stats.present + stats.late + stats.halfDay;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Attendance Report - ${user?.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #007bff;
              padding-bottom: 20px;
            }
            .logo {
              width: 120px;
              height: auto;
            }
            .header-info {
              flex: 1;
              margin-left: 30px;
            }
            .header-info h1 {
              margin: 0;
              color: #007bff;
              font-size: 28px;
            }
            .header-info p {
              margin: 5px 0;
              color: #666;
              font-size: 14px;
            }
            .employee-info {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
              border-left: 4px solid #007bff;
            }
            .employee-info p {
              margin: 8px 0;
              font-size: 14px;
            }
            .employee-info strong {
              color: #333;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 15px;
              margin: 20px 0;
            }
            .stat-card {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
              text-align: center;
              background-color: #f9f9f9;
            }
            .stat-value {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
              color: #007bff;
            }
            .stat-label {
              color: #666;
              font-size: 12px;
              font-weight: 600;
            }
            .summary-section {
              margin: 30px 0;
            }
            .summary-section h3 {
              color: #333;
              border-bottom: 2px solid #007bff;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
              font-size: 13px;
            }
            th {
              background-color: #007bff;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #f0f0f0;
            }
            .status-present { color: #28a745; font-weight: bold; }
            .status-late { color: #ffc107; font-weight: bold; }
            .status-halfday { color: #17a2b8; font-weight: bold; }
            .status-absent { color: #dc3545; font-weight: bold; }
            .status-on-leave { color: #6c757d; font-weight: bold; }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
            @media print {
              body { background-color: white; }
              .container { box-shadow: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header with Logo -->
            <div class="header">
              <img loading="lazy" src="/We Alll.png" alt="We Alll" class="logo" />
              <div class="header-info">
                <h1>Attendance Report</h1>
                <p><strong>Period:</strong> ${startDateFormatted} to ${endDateFormatted}</p>
                <p><strong>Generated on:</strong> ${currentDate}</p>
              </div>
            </div>

            <!-- Employee Information -->
            <div class="employee-info">
              <p><strong>Employee Name:</strong> ${user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> ${user?.email || 'N/A'}</p>
              <p><strong>Department:</strong> ${user?.department?.name || 'N/A'}</p>
              <p><strong>Employee ID:</strong> ${user?.employeeId || 'N/A'}</p>
            </div>

            <!-- Statistics -->
            <div class="summary-section">
              <h3>Summary Statistics</h3>
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-label">Present</div>
                  <div class="stat-value" style="color: #28a745;">${stats.present}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Late</div>
                  <div class="stat-value" style="color: #ffc107;">${stats.late}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Half Day</div>
                  <div class="stat-value" style="color: #17a2b8;">${stats.halfDay}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Absent</div>
                  <div class="stat-value" style="color: #dc3545;">${stats.absent}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">On Leave</div>
                  <div class="stat-value" style="color: #6c757d;">${stats.onLeave}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Total Days</div>
                  <div class="stat-value">${stats.total}</div>
                </div>
              </div>
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-label">Total Hours</div>
                  <div class="stat-value">${stats.totalHours}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Overtime</div>
                  <div class="stat-value">${stats.overtime}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Avg Hours/Day</div>
                  <div class="stat-value">${stats.avgHoursPerDay}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Expected Avg/Day</div>
                  <div class="stat-value">${expectedAvgHoursFormatted}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Total Break Time</div>
                  <div class="stat-value">${totalBreakTimeFormatted}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Days Worked</div>
                  <div class="stat-value">${daysWorked}</div>
                </div>
              </div>
            </div>

            <!-- Attendance Records Table -->
            <div class="summary-section">
              <h3>Detailed Attendance Records</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Break Time</th>
                    <th>Work Hours</th>
                    <th>Overtime</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendances.map((a) => {
                    const breakTime = a.status === 'on-leave' ? '-' : (a.totalBreakTime > 0 ? `${Math.floor(a.totalBreakTime / 60)}h ${Math.round(a.totalBreakTime % 60)}m` : '-');
                    const workHours = a.status === 'on-leave' ? '-' : formatHours(a.workHours || 0);
                    const overtime = formatHours(a.overtime || 0);
                    const clockIn = a.status === 'on-leave' ? 'On Leave' : formatTime(a.clockIn);
                    const clockOut = a.status === 'on-leave' ? 'On Leave' : (a.clockOut ? formatTime(a.clockOut) : 'N/A');
                    const dateFormatted = formatDateDDMMYYYY(a.date);
                    
                    return `
                      <tr>
                        <td>${dateFormatted}</td>
                        <td>${clockIn}</td>
                        <td>${clockOut}</td>
                        <td>${breakTime}</td>
                        <td>${workHours}</td>
                        <td>${overtime}</td>
                        <td class="status-${a.status.replace('-', '')}">${a.status}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>This is an official attendance report generated from We Alll Office Management System.</p>
              <p>For any queries, please contact the HR department.</p>
            </div>
          </div>

          <script>
            window.print();
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      toast.success("Attendance report opened for printing/export!");
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("Failed to export attendance to PDF");
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

  const viewTabs = [
    { key: "table", label: "Table View" },
    { key: "calendar", label: "Calendar" },
    { key: "overtime", label: "Overtime" },
  ];

  const activeFilterCount = [dateRange.startDate, dateRange.endDate].filter(Boolean).length;

  return (
    <Container fluid>
      <PageHeader
        title="My Attendance"
        subtitle="Track your daily attendance and work hours"
      />

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
                  
                  {todayAttendance.status === 'on-leave' ? (
                    <div className="alert alert-info">
                      <p className="mb-1"><strong>You are on leave today</strong></p>
                      {todayAttendance.notes && (
                        <p className="mb-0 small text-muted">{todayAttendance.notes}</p>
                      )}
                    </div>
                  ) : (
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
                  )}
                  
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
                  {stats.onLeave > 0 && (
                    <Col xs={12} className="mt-2">
                      <div className="p-2 bg-secondary bg-opacity-10 rounded">
                        <small className="text-muted">On Leave: <strong>{stats.onLeave}</strong> days</small>
                      </div>
                    </Col>
                  )}
                  <Col xs={12} className="mt-2">
                    <div className="p-2 bg-primary bg-opacity-10 rounded">
                      <small className="text-muted">Avg Hours/Day (excluding leave): <strong>{stats.avgHoursPerDay}</strong></small>
                    </div>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <MobileFilterSheet
        title="Date range"
        activeFilterCount={activeFilterCount}
        showApply={false}
      >
        <Form.Group>
          <Form.Label>Start Date</Form.Label>
          <Form.Control
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>End Date</Form.Label>
          <Form.Control
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
          />
        </Form.Group>
      </MobileFilterSheet>

      <div className="d-flex flex-column flex-md-row gap-2 mb-3 filter-controls">
        <Button variant="outline-success" onClick={handleExport} className="flex-fill">
          <FaDownload className="me-2" />
          Excel
        </Button>
        <Button variant="outline-danger" onClick={handleExportPDF} className="flex-fill">
          <FaDownload className="me-2" />
          PDF
        </Button>
      </div>

      <div className="has-mobile-tab-bar">
        <MobileTabBar
          tabs={viewTabs}
          activeKey={activeViewTab}
          onSelect={setActiveViewTab}
          desktopChildren={<span />}
        />
        <Tabs activeKey={activeViewTab} onSelect={setActiveViewTab} className="mb-3">
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
                          <td>{attendance.status === 'on-leave' ? <Badge bg="secondary">On Leave</Badge> : formatTime(attendance.clockIn)}</td>
                          <td>
                            {attendance.status === 'on-leave' 
                              ? <Badge bg="secondary">On Leave</Badge>
                              : attendance.clockOut
                              ? formatTime(attendance.clockOut)
                              : <Badge bg="warning">In Progress</Badge>}
                          </td>
                          <td className="hide-mobile">
                            {attendance.status === 'on-leave' 
                              ? '-'
                              : attendance.totalBreakTime > 0 ? (
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
                          <td>{attendance.status === 'on-leave' ? '-' : formatHours(attendance.workHours || 0)}</td>
                          <td className="hide-mobile">{formatHours(attendance.overtime || 0)}</td>
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
          <AttendanceCalendar
            attendances={attendances}
            selectedMonth={new Date(dateRange.startDate).getMonth()}
            selectedYear={new Date(dateRange.startDate).getFullYear()}
            employeeName="My Attendance"
          />
        </Tab>

        <Tab eventKey="overtime" title="Overtime History">
          <MyOvertimeHistory />
        </Tab>
      </Tabs>
      </div>

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

