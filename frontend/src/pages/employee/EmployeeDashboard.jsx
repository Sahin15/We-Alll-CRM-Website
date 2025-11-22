import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form } from "react-bootstrap";
import { FaClock, FaCalendarAlt, FaTasks, FaChartLine, FaFileAlt, FaShieldAlt, FaTimes } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";
import GreetingBanner from "../../components/common/GreetingBanner";

// ============================================
// 📅 WORK SCHEDULE CONFIGURATION
// ============================================
// 
// HOW TO UPDATE WHEN SATURDAY BECOMES OFF:
// 
// 1. Find the line: const SATURDAY_OFF_FROM = null;
// 
// 2. Change it to: const SATURDAY_OFF_FROM = { year: YYYY, month: M };
//    - year: The year when Saturday off starts (e.g., 2025)
//    - month: The month when it starts (0 = January, 1 = February, etc.)
// 
// EXAMPLES:
// - For January 2025:  { year: 2025, month: 0 }
// - For March 2025:    { year: 2025, month: 2 }
// - For June 2025:     { year: 2025, month: 5 }
// 
// CURRENT SCHEDULE:
// - Monday-Friday: 10:00 AM - 7:00 PM (8h/day, Lunch: 1:30-2:30 PM)
// - Saturday (WFH): 10:00 AM - 5:00 PM (6h/day, Lunch: 1:30-2:30 PM)
// - Weekly Target: 46 hours
// 
// AFTER SATURDAY OFF:
// - Monday-Friday: 10:00 AM - 7:00 PM (8h/day, Lunch: 1:30-2:30 PM)
// - Saturday: OFF
// - Weekly Target: 40 hours
// 
// ============================================

const SATURDAY_OFF_FROM = null; // 👈 UPDATE THIS WHEN SATURDAY OFF POLICY STARTS

const WORK_HOURS = {
  WEEKDAY: 8,        // Monday-Friday: 8 hours/day
  SATURDAY_WFH: 6,   // Saturday WFH: 6 hours/day
  WEEKDAYS_COUNT: 5  // Number of weekdays
};

// ============================================

const EmployeeDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    attendanceToday: null,
    leaveBalance: 0,
    pendingTasks: 0,
    hoursThisWeek: 0,
    daysWorkedThisWeek: 0,
    attendanceThisMonth: "0/25",
  });
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentTasks, setRecentTasks] = useState([]);
  const [todaysMeetings, setTodaysMeetings] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLeaveDetailsModal, setShowLeaveDetailsModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showWorkHoursModal, setShowWorkHoursModal] = useState(false);
  
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: 'personal',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [leaveDetails, setLeaveDetails] = useState({
    total: 18,
    used: 0,
    remaining: 18,
    personal: { total: 12, used: 0 },
    sick: { total: 6, used: 0 },
    recentLeaves: []
  });
  const [attendanceDetails, setAttendanceDetails] = useState({
    thisMonth: [],
    summary: { present: 0, absent: 0, late: 0, halfDay: 0 }
  });
  const [tasksDetails, setTasksDetails] = useState({
    all: [],
    pending: [],
    inProgress: [],
    completed: []
  });
  const [workHoursDetails, setWorkHoursDetails] = useState({
    thisWeek: [],
    totalHours: 0,
    avgHoursPerDay: 0,
    daysWorked: 0
  });

  useEffect(() => {
    fetchDashboardData();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Listen for attendance updates from navbar
    const handleAttendanceUpdate = (event) => {
      const { type, data } = event.detail;
      if (type === 'clockIn') {
        setClockedIn(true);
        setClockInTime(new Date(data.clockIn));
      } else if (type === 'clockOut') {
        setClockedIn(false);
        setClockInTime(null);
      }
    };

    window.addEventListener('attendanceUpdate', handleAttendanceUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('attendanceUpdate', handleAttendanceUpdate);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch today's attendance status from backend
      try {
        const response = await api.get("/attendance/today");
        
        if (response.data && response.data.clockIn) {
          // Already clocked in today
          setClockedIn(!response.data.clockOut); // True if not clocked out yet
          setClockInTime(new Date(response.data.clockIn));
        } else {
          // No attendance record for today
          setClockedIn(false);
          setClockInTime(null);
        }
        
        // Fetch task stats and attendance stats
        try {
          const tasksResponse = await api.get('/tasks/my-tasks');
          const allTasks = tasksResponse.data;
          const pendingTasks = allTasks.filter(t => t.status !== 'done').length;
          
          // Get top 3 pending tasks sorted by due date
          const topTasks = allTasks
            .filter(t => t.status !== 'done')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);
          setRecentTasks(topTasks);
          
          // Fetch today's meetings
          try {
            const meetingsResponse = await api.get('/meetings/today');
            setTodaysMeetings(meetingsResponse.data);
          } catch (meetError) {
            console.log('No meetings or error fetching meetings');
          }
          
          // Fetch recent activities
          try {
            const activitiesResponse = await api.get('/activities/my-activities?limit=5');
            setRecentActivities(activitiesResponse.data);
          } catch (actError) {
            console.log('No activities or error fetching activities');
          }

          // Fetch recent policies
          try {
            const policiesResponse = await api.get('/policies/recent?limit=3');
            setPolicies(policiesResponse.data);
          } catch (policyError) {
            console.log('No policies or error fetching policies');
          }
          
          // Fetch attendance records for this month
          const attendanceResponse = await api.get('/attendance/my-attendance');
          const attendanceRecords = attendanceResponse.data;
          
          // Calculate this month's attendance
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthRecords = attendanceRecords.filter(record => 
            new Date(record.date) >= firstDayOfMonth
          );
          const presentDays = thisMonthRecords.filter(r => r.status === 'present' || r.clockIn).length;
          const workingDaysInMonth = 25; // Approximate working days
          
          // Calculate this week's hours
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
          startOfWeek.setHours(0, 0, 0, 0);
          
          const thisWeekRecords = attendanceRecords.filter(record => 
            new Date(record.date) >= startOfWeek
          );
          const hoursThisWeek = thisWeekRecords.reduce((sum, record) => 
            sum + (record.workHours || 0), 0
          );
          const daysWorkedThisWeek = thisWeekRecords.filter(r => r.clockIn).length;
          
          // Fetch leave balance
          const leavesResponse = await api.get('/leaves/my-leaves');
          const approvedLeaves = leavesResponse.data.filter(leave => leave.status === 'approved');
          const usedLeaves = approvedLeaves.reduce((sum, leave) => {
            const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            return sum + days;
          }, 0);
          const totalLeaves = 18; // 12 casual + 6 medical
          const remainingLeaves = totalLeaves - usedLeaves;
          
          setStats({
            attendanceToday: response.data && response.data.clockIn ? 
              (response.data.clockOut ? "Completed" : "Present") : "Not Clocked In",
            leaveBalance: remainingLeaves,
            pendingTasks: pendingTasks,
            hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
            daysWorkedThisWeek: daysWorkedThisWeek,
            attendanceThisMonth: `${presentDays}/${workingDaysInMonth}`,
          });
        } catch (taskError) {
          setStats({
            attendanceToday: response.data && response.data.clockIn ? 
              (response.data.clockOut ? "Completed" : "Present") : "Not Clocked In",
            leaveBalance: 18,
            pendingTasks: 0,
            hoursThisWeek: 0,
            attendanceThisMonth: "0/25",
          });
        }
      } catch (attendanceError) {
        // No attendance record or error
        setClockedIn(false);
        setClockInTime(null);
        
        // Try to fetch other stats even if attendance fails
        try {
          const tasksResponse = await api.get('/tasks/my-tasks');
          const allTasks = tasksResponse.data;
          const pendingTasks = allTasks.filter(t => t.status !== 'done').length;
          
          // Get top 3 pending tasks sorted by due date
          const topTasks = allTasks
            .filter(t => t.status !== 'done')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);
          setRecentTasks(topTasks);
          
          // Fetch leave balance
          const leavesResponse = await api.get('/leaves/my-leaves');
          const approvedLeaves = leavesResponse.data.filter(leave => leave.status === 'approved');
          const usedLeaves = approvedLeaves.reduce((sum, leave) => {
            const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            return sum + days;
          }, 0);
          const totalLeaves = 18; // 12 casual + 6 medical
          const remainingLeaves = totalLeaves - usedLeaves;
          
          setStats({
            attendanceToday: "Not Clocked In",
            leaveBalance: remainingLeaves,
            pendingTasks: pendingTasks,
            hoursThisWeek: 0,
            daysWorkedThisWeek: 0,
            attendanceThisMonth: "0/25",
          });
        } catch (statsError) {
          // If all API calls fail, set empty values
          setStats({
            attendanceToday: "Not Clocked In",
            leaveBalance: 0,
            pendingTasks: 0,
            hoursThisWeek: 0,
            daysWorkedThisWeek: 0,
            attendanceThisMonth: "0/25",
          });
        }
      }
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const response = await api.post("/attendance/clock-in");
      const attendance = response.data.attendance;
      
      setClockedIn(true);
      setClockInTime(new Date(attendance.clockIn));
      toast.clockIn();
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockIn', data: attendance } 
      }));
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error) {
      console.error("Error clocking in:", error);
      const errorType = error.response?.data?.type;
      const clockInTime = error.response?.data?.clockInTime;
      
      if (errorType === 'already_clocked_in') {
        const time = clockInTime ? new Date(clockInTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : null;
        toast.alreadyClockedIn(time);
        // Refresh dashboard data to sync state
        fetchDashboardData();
      } else {
        const errorMessage = error.response?.data?.message || "Failed to clock in. Please try again.";
        toast.error(errorMessage);
      }
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await api.post("/attendance/clock-out");
      const attendance = response.data.attendance || response.data;
      
      setClockedIn(false);
      setClockInTime(null);
      toast.clockOut();
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendance } 
      }));
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error) {
      console.error("Error clocking out:", error);
      const errorType = error.response?.data?.type;
      const clockOutTime = error.response?.data?.clockOutTime;
      
      if (errorType === 'already_clocked_out') {
        const time = clockOutTime ? new Date(clockOutTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : null;
        toast.alreadyClockedOut(time);
        // Refresh dashboard data to sync state
        fetchDashboardData();
      } else if (errorType === 'not_clocked_in') {
        toast.notClockedIn();
      } else {
        const errorMessage = error.response?.data?.message || "Failed to clock out. Please try again.";
        toast.error(errorMessage);
      }
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const calculateWorkingHours = () => {
    if (!clockedIn || !clockInTime) return "0h 0m";
    
    const now = new Date();
    const diff = now - clockInTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const formatHoursAndMinutes = (decimalHours) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  // Calculate expected weekly hours based on company schedule
  const getExpectedWeeklyHours = () => {
    // Check if Saturday off policy has started
    if (SATURDAY_OFF_FROM) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed (0 = January)
      
      // Check if current date is after Saturday off start date
      if (currentYear > SATURDAY_OFF_FROM.year || 
          (currentYear === SATURDAY_OFF_FROM.year && currentMonth >= SATURDAY_OFF_FROM.month)) {
        // Saturday is OFF: 5 days × 8h = 40h
        return WORK_HOURS.WEEKDAYS_COUNT * WORK_HOURS.WEEKDAY;
      }
    }
    
    // Saturday is WFH: (5 days × 8h) + (1 day × 6h) = 46h
    return (WORK_HOURS.WEEKDAYS_COUNT * WORK_HOURS.WEEKDAY) + WORK_HOURS.SATURDAY_WFH;
  };

  // Check if Saturday is currently a working day
  const isSaturdayWorkDay = () => {
    if (!SATURDAY_OFF_FROM) return true; // Saturday WFH by default
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Return true if we haven't reached the Saturday off date yet
    return currentYear < SATURDAY_OFF_FROM.year || 
           (currentYear === SATURDAY_OFF_FROM.year && currentMonth < SATURDAY_OFF_FROM.month);
  };

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!leaveFormData.startDate || !leaveFormData.endDate || !leaveFormData.reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (new Date(leaveFormData.endDate) < new Date(leaveFormData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      await api.post('/leaves', leaveFormData);
      toast.success('Leave application submitted successfully!');
      setShowLeaveModal(false);
      setLeaveFormData({
        leaveType: 'personal',
        startDate: '',
        endDate: '',
        reason: ''
      });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error(error.response?.data?.message || 'Failed to submit leave application');
    }
  };

  const handleLeaveCardClick = async () => {
    try {
      const response = await api.get('/leaves/my-leaves');
      const allLeaves = response.data;
      
      const approvedLeaves = allLeaves.filter(leave => leave.status === 'approved');
      const personalLeaves = approvedLeaves.filter(l => l.leaveType === 'personal');
      const sickLeaves = approvedLeaves.filter(l => l.leaveType === 'sick');
      
      const calculateDays = (leaves) => {
        return leaves.reduce((sum, leave) => {
          const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
      };
      
      const personalUsed = calculateDays(personalLeaves);
      const sickUsed = calculateDays(sickLeaves);
      const totalUsed = personalUsed + sickUsed;
      
      const recentLeaves = allLeaves
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      setLeaveDetails({
        total: 18,
        used: totalUsed,
        remaining: 18 - totalUsed,
        personal: { total: 12, used: personalUsed },
        sick: { total: 6, used: sickUsed },
        recentLeaves
      });
      
      setShowLeaveDetailsModal(true);
    } catch (error) {
      console.error('Error fetching leave details:', error);
      toast.error('Failed to load leave details');
    }
  };

  const handleAttendanceCardClick = async () => {
    try {
      const response = await api.get('/attendance/my-attendance');
      const allAttendance = response.data;
      
      // Filter this month's attendance
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthAttendance = allAttendance.filter(record => 
        new Date(record.date) >= firstDayOfMonth
      );
      
      // Calculate summary
      const summary = {
        present: thisMonthAttendance.filter(r => r.status === 'present' || r.clockIn).length,
        absent: thisMonthAttendance.filter(r => r.status === 'absent').length,
        late: thisMonthAttendance.filter(r => r.status === 'late').length,
        halfDay: thisMonthAttendance.filter(r => r.status === 'half-day').length
      };
      
      setAttendanceDetails({
        thisMonth: thisMonthAttendance.slice(0, 10), // Last 10 records
        summary
      });
      
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      toast.error('Failed to load attendance details');
    }
  };

  const handleTasksCardClick = async () => {
    try {
      const response = await api.get('/tasks/my-tasks');
      const allTasks = response.data;
      
      const pending = allTasks.filter(t => t.status === 'pending' || t.status === 'todo');
      const inProgress = allTasks.filter(t => t.status === 'in-progress');
      const completed = allTasks.filter(t => t.status === 'done' || t.status === 'completed');
      
      setTasksDetails({
        all: allTasks,
        pending,
        inProgress,
        completed
      });
      
      setShowTasksModal(true);
    } catch (error) {
      console.error('Error fetching tasks details:', error);
      toast.error('Failed to load tasks details');
    }
  };

  const handleWorkHoursCardClick = async () => {
    try {
      const response = await api.get('/attendance/my-attendance');
      const allAttendance = response.data;
      
      // Filter this week's attendance
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const thisWeekAttendance = allAttendance.filter(record => 
        new Date(record.date) >= startOfWeek && record.clockIn
      );
      
      const totalHours = thisWeekAttendance.reduce((sum, record) => 
        sum + (record.workHours || 0), 0
      );
      
      const daysWorked = thisWeekAttendance.length;
      const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;
      
      setWorkHoursDetails({
        thisWeek: thisWeekAttendance,
        totalHours,
        avgHoursPerDay,
        daysWorked
      });
      
      setShowWorkHoursModal(true);
    } catch (error) {
      console.error('Error fetching work hours details:', error);
      toast.error('Failed to load work hours details');
    }
  };

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 dashboard-container">
      {/* Greeting Banner */}
      <GreetingBanner subtitle="Welcome to your dashboard" />

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card 
            className="dashboard-card stat-card border-0 shadow-sm h-100 cursor-pointer"
            onClick={handleAttendanceCardClick}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Attendance</h6>
                  <h3 className="mb-1">{stats.attendanceToday || "N/A"}</h3>
                  <small className="text-success">This Month: {stats.attendanceThisMonth} days • Click for details</small>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <FaClock className="text-success fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card 
            className="dashboard-card stat-card border-0 shadow-sm h-100 cursor-pointer" 
            onClick={handleLeaveCardClick}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Leave Balance</h6>
                  <h3 className="mb-1">{stats.leaveBalance} days</h3>
                  <small className="text-info">Remaining this year • Click for details</small>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <FaCalendarAlt className="text-info fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card 
            className="dashboard-card stat-card border-0 shadow-sm h-100 cursor-pointer"
            onClick={handleTasksCardClick}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Pending Tasks</h6>
                  <h3 className="mb-1">{stats.pendingTasks}</h3>
                  <small className="text-warning">Need attention • Click for details</small>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <FaTasks className="text-warning fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card 
            className="dashboard-card stat-card border-0 shadow-sm h-100 cursor-pointer"
            onClick={handleWorkHoursCardClick}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div className="w-100">
                  <h6 className="text-muted mb-2">Work This Week</h6>
                  <h3 className="mb-1">{formatHoursAndMinutes(stats.hoursThisWeek)} / {getExpectedWeeklyHours()}h</h3>
                  <div className="progress mb-2" style={{ height: '6px' }}>
                    <div 
                      className={`progress-bar ${stats.hoursThisWeek >= getExpectedWeeklyHours() ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${Math.min((stats.hoursThisWeek / getExpectedWeeklyHours()) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <small className={stats.hoursThisWeek >= getExpectedWeeklyHours() ? 'text-success' : 'text-muted'}>
                    {stats.daysWorkedThisWeek} {stats.daysWorkedThisWeek === 1 ? 'day' : 'days'} worked • 
                    {stats.hoursThisWeek >= getExpectedWeeklyHours() ? ' ✓ Target met!' : ` ${formatHoursAndMinutes(getExpectedWeeklyHours() - stats.hoursThisWeek)} left`} • Click for details
                  </small>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <FaChartLine className="text-primary fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Clock In/Out Section */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="dashboard-card action-card border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="mb-3">
                <FaClock className="me-2" />
                Attendance
              </h5>
              
              <div className="text-center py-4">
                <div className="mb-3">
                  <h2 className="mb-0">{formatTime(currentTime)}</h2>
                  <small className="text-muted">Current Time</small>
                </div>

                {clockedIn ? (
                  <>
                    <Badge bg="success" className="mb-3 px-3 py-2">
                      <FaClock className="me-2" />
                      Clocked In
                    </Badge>
                    <p className="text-muted mb-2">
                      Since: {clockInTime ? formatTime(clockInTime) : "N/A"}
                    </p>
                    <p className="text-primary fw-bold mb-3">
                      Working Hours: {calculateWorkingHours()}
                    </p>
                    <Button
                      variant="danger"
                      size="lg"
                      onClick={handleClockOut}
                      className="px-5"
                    >
                      Clock Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge bg="secondary" className="mb-3 px-3 py-2">
                      Not Clocked In
                    </Badge>
                    <p className="text-muted mb-3">
                      Start your workday
                    </p>
                    <Button
                      variant="success"
                      size="lg"
                      onClick={handleClockIn}
                      className="px-5"
                    >
                      Clock In
                    </Button>
                  </>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-3">
          <Card className="dashboard-card action-card border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="mb-3">Quick Actions</h5>
              
              <div className="d-grid gap-2">
                <Button variant="outline-primary" size="lg" onClick={() => setShowLeaveModal(true)}>
                  <FaCalendarAlt className="me-2" />
                  Apply for Leave
                </Button>
                <Button variant="outline-primary" size="lg" href="/employee/tasks">
                  <FaTasks className="me-2" />
                  View My Tasks
                </Button>
                <Button variant="outline-primary" size="lg" href="/employee/attendance">
                  <FaClock className="me-2" />
                  View Attendance History
                </Button>
                <Button variant="outline-primary" size="lg" href="/employee/time-tracking">
                  <FaChartLine className="me-2" />
                  Track Time
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Today's Schedule */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="dashboard-card content-card border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column">
              <h5 className="mb-3">Today's Meetings</h5>
              
              {todaysMeetings.length > 0 ? (
                <div className="list-group list-group-flush flex-grow-1" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {todaysMeetings.map((meeting) => {
                    const meetingTime = `${meeting.startTime} - ${meeting.endTime}`;
                    const statusColor = meeting.status === 'completed' ? 'success' : 
                                       meeting.status === 'ongoing' ? 'warning' : 
                                       meeting.status === 'cancelled' ? 'danger' : 'primary';
                    
                    return (
                      <div key={meeting._id} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{meeting.title}</h6>
                            <small className="text-muted">
                              <FaClock className="me-1" />
                              {meetingTime}
                            </small>
                            {meeting.location && (
                              <small className="text-muted ms-2">
                                📍 {meeting.location}
                              </small>
                            )}
                            {meeting.meetingLink && (
                              <div className="mt-1">
                                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="small">
                                  Join Meeting →
                                </a>
                              </div>
                            )}
                          </div>
                          <Badge bg={statusColor} className="ms-2">
                            {meeting.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5 text-muted flex-grow-1 d-flex flex-column justify-content-center">
                  <FaCalendarAlt className="fs-1 mb-3 opacity-25" />
                  <p className="mb-0">No meetings scheduled for today</p>
                  <small>Your meetings will appear here</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-3">
          <Card className="dashboard-card content-card border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column">
              <h5 className="mb-3">My Tasks</h5>
              
              {recentTasks.length > 0 ? (
                <div className="flex-grow-1">
                  <div className="list-group list-group-flush" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {recentTasks.map((task) => {
                      const dueDate = new Date(task.dueDate);
                      const today = new Date();
                      const isOverdue = dueDate < today && task.status !== 'done';
                      const isToday = dueDate.toDateString() === today.toDateString();
                      
                      let dueDateText = dueDate.toLocaleDateString();
                      if (isToday) dueDateText = 'Today';
                      else if (isOverdue) dueDateText = 'Overdue';
                      
                      const priorityColor = task.priority === 'high' ? 'danger' : 
                                          task.priority === 'medium' ? 'warning' : 'info';
                      
                      return (
                        <div key={task._id} className="list-group-item px-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-1">{task.title}</h6>
                              <small className={isOverdue ? 'text-danger' : 'text-muted'}>
                                Due: {dueDateText}
                              </small>
                            </div>
                            <Badge bg={priorityColor}>{task.priority}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button variant="link" className="mt-3 p-0" href="/employee/tasks">
                    View All Tasks →
                  </Button>
                </div>
              ) : (
                <div className="text-center py-5 text-muted flex-grow-1 d-flex flex-column justify-content-center">
                  <FaTasks className="fs-1 mb-3 opacity-25" />
                  <p className="mb-0">No pending tasks</p>
                  <small>You're all caught up!</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activities & Company Policies */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="dashboard-card content-card border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column">
              <h5 className="mb-3">Recent Activities</h5>
              
              {recentActivities.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentActivities.slice(0, 3).map((activity) => {
                    const getIcon = () => {
                      switch (activity.type) {
                        case 'leave_approved':
                        case 'leave_rejected':
                        case 'leave_applied':
                          return <FaCalendarAlt className={`text-${activity.color}`} />;
                        case 'task_completed':
                        case 'task_assigned':
                          return <FaTasks className={`text-${activity.color}`} />;
                        case 'attendance_marked':
                          return <FaClock className={`text-${activity.color}`} />;
                        case 'meeting_scheduled':
                          return <FaCalendarAlt className={`text-${activity.color}`} />;
                        default:
                          return <FaTasks className={`text-${activity.color}`} />;
                      }
                    };
                    
                    const getTimeAgo = (date) => {
                      const now = new Date();
                      const activityDate = new Date(date);
                      const diffMs = now - activityDate;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);
                      
                      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
                      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                      if (diffDays === 1) return 'Yesterday';
                      if (diffDays < 7) return `${diffDays} days ago`;
                      return activityDate.toLocaleDateString();
                    };
                    
                    return (
                      <div key={activity._id} className="list-group-item px-0">
                        <div className="d-flex align-items-center">
                          <div className={`bg-${activity.color} bg-opacity-10 p-2 rounded me-3`}>
                            {getIcon()}
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-0">{activity.title}</h6>
                            <small className="text-muted">{activity.description}</small>
                          </div>
                          <small className="text-muted">{getTimeAgo(activity.createdAt)}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5 text-muted flex-grow-1 d-flex flex-column justify-content-center">
                  <FaTasks className="fs-1 mb-3 opacity-25" />
                  <p className="mb-0">No recent activities</p>
                  <small>Your activities will appear here</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Company Policies */}
        <Col md={6} className="mb-3">
          <Card className="dashboard-card content-card border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  <FaShieldAlt className="me-2 text-primary" />
                  Company Policies
                </h5>
                <Button variant="link" size="sm" href="/employee/policies" className="p-0">
                  View All →
                </Button>
              </div>
              
              {policies.length > 0 ? (
                <div className="list-group list-group-flush">
                  {policies.map((policy) => {
                    const getCategoryIcon = () => {
                      switch (policy.category) {
                        case 'hr':
                          return '👥';
                        case 'it':
                          return '💻';
                        case 'finance':
                          return '💰';
                        case 'security':
                          return '🔒';
                        case 'health-safety':
                          return '🏥';
                        case 'code-of-conduct':
                          return '📋';
                        case 'leave':
                          return '🏖️';
                        case 'attendance':
                          return '⏰';
                        default:
                          return '📄';
                      }
                    };
                    
                    const getPriorityColor = () => {
                      switch (policy.priority) {
                        case 'critical':
                          return 'danger';
                        case 'high':
                          return 'warning';
                        case 'medium':
                          return 'info';
                        default:
                          return 'secondary';
                      }
                    };
                    
                    const getTimeAgo = (date) => {
                      const now = new Date();
                      const policyDate = new Date(date);
                      const diffDays = Math.floor((now - policyDate) / (1000 * 60 * 60 * 24));
                      
                      if (diffDays === 0) return 'Today';
                      if (diffDays === 1) return 'Yesterday';
                      if (diffDays < 7) return `${diffDays} days ago`;
                      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
                      return policyDate.toLocaleDateString();
                    };
                    
                    return (
                      <div key={policy._id} className="list-group-item px-0">
                        <div className="d-flex align-items-start">
                          <div className="me-3 fs-4">
                            {getCategoryIcon()}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <h6 className="mb-1">{policy.title}</h6>
                              {policy.priority !== 'low' && (
                                <Badge bg={getPriorityColor()} className="ms-2">
                                  {policy.priority}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted mb-1 small">
                              {policy.description.length > 80 
                                ? `${policy.description.substring(0, 80)}...` 
                                : policy.description
                              }
                            </p>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-muted">
                                By {policy.createdBy?.name || 'Admin'}
                              </small>
                              <small className="text-muted">
                                {getTimeAgo(policy.createdAt)}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5 text-muted flex-grow-1 d-flex flex-column justify-content-center">
                  <FaFileAlt className="fs-1 mb-3 opacity-25" />
                  <p className="mb-0">No policies available</p>
                  <small>Company policies will appear here</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Dashboard Card Styling */}
      <style>{`
        /* Base Dashboard Card Styles - Clean white cards */
        .dashboard-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #ffffff;
          position: relative;
          overflow: hidden;
        }
        
        /* Subtle top accent line on hover */
        .dashboard-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        
        .dashboard-card:hover::before {
          transform: scaleX(1);
        }
        
        /* Hover effect - lift and shadow */
        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
          border-color: rgba(102, 126, 234, 0.3);
        }
        
        /* Icon hover effects */
        .stat-card .bg-success,
        .stat-card .bg-info,
        .stat-card .bg-warning,
        .stat-card .bg-primary {
          transition: all 0.3s ease;
        }
        
        .stat-card:hover .bg-success {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(25, 135, 84, 0.2);
        }
        
        .stat-card:hover .bg-info {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(13, 202, 240, 0.2);
        }
        
        .stat-card:hover .bg-warning {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
        }
        
        .stat-card:hover .bg-primary {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2);
        }
        
        /* List items hover effect */
        .content-card .list-group-item {
          transition: all 0.2s ease;
          border-radius: 6px;
          margin-bottom: 2px;
        }
        
        .content-card .list-group-item:hover {
          background-color: rgba(102, 126, 234, 0.04);
          transform: translateX(4px);
        }
        
        /* Button hover effects */
        .dashboard-card .btn {
          transition: all 0.2s ease;
        }
        
        .dashboard-card .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Badge hover effects */
        .dashboard-card .badge {
          transition: all 0.2s ease;
        }
        
        .dashboard-card .badge:hover {
          transform: scale(1.05);
        }
        
        /* Icon scale on card hover */
        .dashboard-card .fs-4 {
          transition: all 0.3s ease;
        }
        
        .dashboard-card:hover .fs-4 {
          transform: scale(1.08);
        }
        
        /* Progress bar smooth animation */
        .dashboard-card .progress-bar {
          transition: width 0.6s ease;
        }
        
        /* Card title underline effect */
        .dashboard-card h5 {
          position: relative;
          padding-bottom: 8px;
        }
        
        .dashboard-card h5::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }
        
        .dashboard-card:hover h5::after {
          width: 60px;
        }
        
        /* Clickable card effect */
        .cursor-pointer {
          cursor: pointer !important;
          transition: all 0.3s ease;
        }
        
        .cursor-pointer:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 12px 24px rgba(13, 202, 240, 0.25) !important;
        }
        
        .cursor-pointer:active {
          transform: translateY(-2px) !important;
        }
      `}</style>

      {/* Leave Application Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2" />
            Apply for Leave
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleLeaveSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type</Form.Label>
              <Form.Select
                name="leaveType"
                value={leaveFormData.leaveType}
                onChange={handleLeaveFormChange}
                required
              >
                <option value="personal">Personal Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="vacation">Vacation</option>
                <option value="emergency">Emergency Leave</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={leaveFormData.startDate}
                onChange={handleLeaveFormChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={leaveFormData.endDate}
                onChange={handleLeaveFormChange}
                min={leaveFormData.startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="reason"
                value={leaveFormData.reason}
                onChange={handleLeaveFormChange}
                placeholder="Please provide a reason for your leave..."
                required
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Submit Application
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Leave Details Modal */}
      <Modal show={showLeaveDetailsModal} onHide={() => setShowLeaveDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2 text-info" />
            Leave Balance Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h6 className="text-muted mb-2">Total Leave</h6>
                  <h2 className="mb-0 text-primary">{leaveDetails.total}</h2>
                  <small className="text-muted">days/year</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h6 className="text-muted mb-2">Used</h6>
                  <h2 className="mb-0 text-warning">{leaveDetails.used}</h2>
                  <small className="text-muted">days</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h6 className="text-muted mb-2">Remaining</h6>
                  <h2 className="mb-0 text-success">{leaveDetails.remaining}</h2>
                  <small className="text-muted">days</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Leave Type Breakdown */}
          <h6 className="mb-3">Leave Type Breakdown</h6>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Personal Leave</span>
              <span className="text-muted">
                {leaveDetails.personal.used} / {leaveDetails.personal.total} days
              </span>
            </div>
            <div className="progress mb-3" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-info" 
                style={{ width: `${(leaveDetails.personal.used / leaveDetails.personal.total) * 100}%` }}
              ></div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Sick Leave</span>
              <span className="text-muted">
                {leaveDetails.sick.used} / {leaveDetails.sick.total} days
              </span>
            </div>
            <div className="progress mb-3" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-warning" 
                style={{ width: `${(leaveDetails.sick.used / leaveDetails.sick.total) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Recent Leaves */}
          {leaveDetails.recentLeaves.length > 0 && (
            <>
              <h6 className="mb-3">Recent Leave History</h6>
              <div className="list-group">
                {leaveDetails.recentLeaves.map((leave) => {
                  const startDate = new Date(leave.startDate).toLocaleDateString();
                  const endDate = new Date(leave.endDate).toLocaleDateString();
                  const statusColor = leave.status === 'approved' ? 'success' : 
                                     leave.status === 'pending' ? 'warning' : 'danger';
                  
                  return (
                    <div key={leave._id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1 text-capitalize">{leave.leaveType} Leave</h6>
                          <small className="text-muted">
                            {startDate} - {endDate}
                          </small>
                        </div>
                        <Badge bg={statusColor}>{leave.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Quick Actions */}
          <div className="mt-4 d-flex gap-2">
            <Button 
              variant="primary" 
              className="flex-grow-1"
              onClick={() => {
                setShowLeaveDetailsModal(false);
                setShowLeaveModal(true);
              }}
            >
              <FaCalendarAlt className="me-2" />
              Apply for Leave
            </Button>
            <Button 
              variant="outline-primary"
              onClick={() => window.location.href = '/employee/leaves'}
            >
              View All Leaves
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Attendance Details Modal */}
      <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaClock className="me-2 text-success" />
            Attendance Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Present</h6>
                  <h2 className="mb-0 text-success">{attendanceDetails.summary.present}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Absent</h6>
                  <h2 className="mb-0 text-danger">{attendanceDetails.summary.absent}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Late</h6>
                  <h2 className="mb-0 text-warning">{attendanceDetails.summary.late}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Half Day</h6>
                  <h2 className="mb-0 text-info">{attendanceDetails.summary.halfDay}</h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <h6 className="mb-3">Recent Attendance</h6>
          <div className="list-group">
            {attendanceDetails.thisMonth.map((record) => {
              const date = new Date(record.date).toLocaleDateString();
              const clockIn = record.clockIn ? new Date(record.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
              const clockOut = record.clockOut ? new Date(record.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
              const statusColor = record.status === 'present' ? 'success' : record.status === 'absent' ? 'danger' : 'warning';
              
              return (
                <div key={record._id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">{date}</h6>
                      <small className="text-muted">
                        In: {clockIn} • Out: {clockOut}
                        {record.workHours && ` • ${record.workHours.toFixed(1)}h`}
                      </small>
                    </div>
                    <Badge bg={statusColor}>{record.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <Button variant="primary" className="w-100" onClick={() => window.location.href = '/employee/attendance'}>
              View Full Attendance History
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Tasks Details Modal */}
      <Modal show={showTasksModal} onHide={() => setShowTasksModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTasks className="me-2 text-warning" />
            My Tasks
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Pending</h6>
                  <h2 className="mb-0 text-warning">{tasksDetails.pending.length}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">In Progress</h6>
                  <h2 className="mb-0 text-info">{tasksDetails.inProgress.length}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Completed</h6>
                  <h2 className="mb-0 text-success">{tasksDetails.completed.length}</h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <h6 className="mb-3">Pending Tasks</h6>
          <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {tasksDetails.pending.length > 0 ? (
              tasksDetails.pending.map((task) => {
                const dueDate = new Date(task.dueDate);
                const isOverdue = dueDate < new Date();
                const priorityColor = task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info';
                
                return (
                  <div key={task._id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{task.title}</h6>
                        <small className={isOverdue ? 'text-danger' : 'text-muted'}>
                          Due: {dueDate.toLocaleDateString()}
                          {isOverdue && ' (Overdue)'}
                        </small>
                      </div>
                      <Badge bg={priorityColor}>{task.priority}</Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted">
                <FaTasks className="fs-1 mb-3 opacity-25" />
                <p>No pending tasks</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button variant="primary" className="w-100" onClick={() => window.location.href = '/employee/tasks'}>
              View All Tasks
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Work Hours Details Modal */}
      <Modal show={showWorkHoursModal} onHide={() => setShowWorkHoursModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaChartLine className="me-2 text-primary" />
            Work Hours This Week
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Company Schedule Info */}
          <div className="alert alert-info mb-4">
            <h6 className="mb-2">📅 Company Work Schedule</h6>
            <small>
              <strong>Monday - Friday:</strong> 10:00 AM - 7:00 PM ({WORK_HOURS.WEEKDAY}h/day, Lunch: 1:30-2:30 PM)<br/>
              {isSaturdayWorkDay() ? (
                <><strong>Saturday (WFH):</strong> 10:00 AM - 5:00 PM ({WORK_HOURS.SATURDAY_WFH}h/day, Lunch: 1:30-2:30 PM)<br/></>
              ) : (
                <><strong>Saturday:</strong> Off<br/></>
              )}
              <strong>Weekly Target:</strong> {getExpectedWeeklyHours()} hours
              {!isSaturdayWorkDay() && SATURDAY_OFF_FROM && (
                <span className="text-success">
                  {' '}(Saturday off from {new Date(SATURDAY_OFF_FROM.year, SATURDAY_OFF_FROM.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                </span>
              )}
            </small>
          </div>

          <Row className="mb-4">
            <Col md={4}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Total Hours</h6>
                  <h2 className="mb-0 text-primary">{workHoursDetails.totalHours.toFixed(1)}h</h2>
                  <small className="text-muted">of {getExpectedWeeklyHours()}h target</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Days Worked</h6>
                  <h2 className="mb-0 text-success">{workHoursDetails.daysWorked}</h2>
                  <small className="text-muted">this week</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-light text-center">
                <Card.Body>
                  <h6 className="text-muted mb-2">Avg Hours/Day</h6>
                  <h2 className="mb-0 text-info">{workHoursDetails.avgHoursPerDay.toFixed(1)}h</h2>
                  <small className="text-muted">average</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="mb-4">
            <h6 className="mb-3">Weekly Progress</h6>
            <div className="progress" style={{ height: '30px' }}>
              <div 
                className={`progress-bar ${workHoursDetails.totalHours >= getExpectedWeeklyHours() ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${Math.min((workHoursDetails.totalHours / getExpectedWeeklyHours()) * 100, 100)}%` }}
              >
                <strong>{workHoursDetails.totalHours.toFixed(1)}h / {getExpectedWeeklyHours()}h</strong>
              </div>
            </div>
            <small className="text-muted mt-2 d-block">
              {workHoursDetails.totalHours >= getExpectedWeeklyHours() ? '✓ Weekly target achieved!' : `${(getExpectedWeeklyHours() - workHoursDetails.totalHours).toFixed(1)}h remaining to reach target`}
            </small>
          </div>

          <h6 className="mb-3">Daily Breakdown</h6>
          <div className="list-group">
            {(() => {
              // Generate all days of the current week (Sunday to Saturday)
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
              startOfWeek.setHours(0, 0, 0, 0);
              
              const daysOfWeek = [];
              for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                
                const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
                
                // Skip Sunday (day 0) and Saturday if it's off
                if (dayOfWeek === 0 || (dayOfWeek === 6 && !isSaturdayWorkDay())) {
                  continue; // Skip this iteration
                }
                
                // Find attendance record for this day
                const record = workHoursDetails.thisWeek.find(r => {
                  const recordDate = new Date(r.date);
                  return recordDate.toDateString() === date.toDateString();
                });
                
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = date.toLocaleDateString();
                const hours = record?.workHours || 0;
                const isFutureDay = date > now;
                
                // Determine expected hours for this day
                let expectedHours = 0;
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  // Monday to Friday
                  expectedHours = WORK_HOURS.WEEKDAY;
                } else if (dayOfWeek === 6 && isSaturdayWorkDay()) {
                  // Saturday (if WFH)
                  expectedHours = WORK_HOURS.SATURDAY_WFH;
                }
                
                daysOfWeek.push(
                  <div key={date.toISOString()} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">
                          {dayName}
                          {dayOfWeek === 6 && <span className="badge bg-info ms-2 small">WFH</span>}
                        </h6>
                        <small className="text-muted">{dateStr}</small>
                      </div>
                      <div className="text-end">
                        {isFutureDay ? (
                          <Badge bg="secondary">
                            {expectedHours}h expected
                          </Badge>
                        ) : hours > 0 ? (
                          <Badge bg={hours >= expectedHours ? 'success' : 'warning'}>
                            {hours.toFixed(1)}h / {expectedHours}h
                          </Badge>
                        ) : (
                          <Badge bg="danger">
                            0h / {expectedHours}h
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              return daysOfWeek;
            })()}
          </div>

          <div className="mt-4">
            <Button variant="primary" className="w-100" onClick={() => window.location.href = '/employee/time-tracking'}>
              View Time Tracking
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default EmployeeDashboard;
