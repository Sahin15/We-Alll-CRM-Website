import { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Alert, Spinner } from "react-bootstrap";
import { 
  FaClock, 
  FaCalendarAlt, 
  FaTasks, 
  FaChartLine, 
  FaFileAlt, 
  FaShieldAlt, 
  FaBullhorn, 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaHome, 
  FaEye, 
  FaEdit, 
  FaCheckCircle, 
  FaPlus,
  FaPhone,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";
import api from "../../services/api";
import workItemApi from "../../api/workItemApi";
import { LEAVE_TYPE_DETAILS } from "../../utils/constants";
import {
  canApplyPaidLeave,
  getAllowedLeaveTypes,
  isFullTimeEmployee,
} from "../../utils/leaveEligibility";
import { getLeaveRequestDays } from "../../utils/leaveDays";
import GreetingBanner from "../../components/common/GreetingBanner";
import TodoWidget from "../../components/common/TodoWidget";
import ConfirmModal from "../../components/common/ConfirmModal";
import HoDSection from "../../components/dashboard/HoDSection";
import HoPSection from "../../components/dashboard/HoPSection";
import QuickAnnouncements from "../../components/dashboard/QuickAnnouncements";
import WorkLogSubmissionModal from "../../components/worklog/WorkLogSubmissionModal";
import "../../styles/dashboard-mobile.css";
import "../../styles/modal-mobile.css";

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

// Reusable meeting row for the modal
const MeetingRow = ({ meeting, user, onEdit, onComplete, showDate }) => {
  const statusColor = meeting.status === 'completed' ? '#10B981' : meeting.status === 'cancelled' ? '#EF4444' : meeting.status === 'ongoing' ? '#F59E0B' : '#6366F1';
  const isOrganizer = meeting.organizer?._id === user?._id || meeting.organizer === user?._id;
  const meetingDate = new Date(meeting.date);
  const isToday = meetingDate.toDateString() === new Date().toDateString();

  return (
    <div style={{ padding: '12px 4px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ width: '4px', minHeight: '48px', borderRadius: '4px', background: statusColor, flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827', marginBottom: '3px' }}>{meeting.title}</div>
        {showDate && (
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '2px' }}>
            📅 {meetingDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            {isToday && <span style={{ marginLeft: '6px', background: '#DBEAFE', color: '#1D4ED8', borderRadius: '10px', padding: '1px 7px', fontSize: '0.65rem', fontWeight: '700' }}>Today</span>}
          </div>
        )}
        <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
          🕐 {meeting.startTime} – {meeting.endTime}
          {meeting.location && <span className="ms-2">📍 {meeting.location}</span>}
        </div>
        {meeting.meetingLink && (
          <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: '600', display: 'inline-block', marginTop: '3px' }}>
            Join Meeting →
          </a>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: statusColor + '20', color: statusColor, textTransform: 'capitalize' }}>
          {meeting.status}
        </span>
        {isOrganizer && meeting.status === 'scheduled' && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => onEdit(meeting)} title="Edit" style={{ background: '#F3F4F6', border: 'none', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', color: '#6B7280', fontSize: '0.72rem' }}>✏️</button>
            <button onClick={() => onComplete(meeting._id)} title="Mark Complete" style={{ background: '#ECFDF5', border: 'none', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', color: '#10B981', fontSize: '0.72rem' }}>✓</button>
          </div>
        )}
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { user, canPermission } = useAuth();
  const paidLeaveEligible = canApplyPaidLeave(user);
  const allowedLeaveTypes = getAllowedLeaveTypes(user);
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
  
  // Use refs to track current values without causing re-renders
  const clockedInRef = useRef(false);
  const clockInTimeRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Helper functions to update both state and ref
  const updateClockedIn = (value) => {
    clockedInRef.current = value;
    setClockedIn(value);
  };
  
  const updateClockInTime = (value) => {
    clockInTimeRef.current = value;
    setClockInTime(value);
  };
  const [recentTasks, setRecentTasks] = useState([]);
  const [todaysMeetings, setTodaysMeetings] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [allMeetingsLoading, setAllMeetingsLoading] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [meetingsModalTab, setMeetingsModalTab] = useState('today'); // 'today' | 'all'
  const [recentActivities, setRecentActivities] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLeaveDetailsModal, setShowLeaveDetailsModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showWorkHoursModal, setShowWorkHoursModal] = useState(false);
  const [showClockInConfirm, setShowClockInConfirm] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingLink: "",
    attendees: [],
    type: "team"
  });
  const [employees, setEmployees] = useState([]);
  
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: isFullTimeEmployee(user) ? 'personal' : 'unpaid',
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
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchDashboardData();
        await fetchEmployees();
      }
    };
    
    loadData();
    
    // Update current time every 30 seconds instead of every second
    const timer = setInterval(() => {
      if (isMounted) {
        setCurrentTime(new Date());
      }
    }, 30000); // Changed from 1000ms to 30000ms

    // Update work hours every 5 minutes instead of every minute
    const workHoursTimer = setInterval(() => {
      if (isMounted) {
        updateWorkHours();
      }
    }, 300000); // Changed from 60000ms to 300000ms (5 minutes)

    // Listen for attendance updates from navbar
    const handleAttendanceUpdate = (event) => {
      if (!isMounted) return;
      const { type, data } = event.detail;
      if (type === 'clockIn') {
        updateClockedIn(true);
        updateClockInTime(new Date(data.clockIn));
        updateWorkHours(); // Update immediately on clock in
      } else if (type === 'clockOut') {
        updateClockedIn(false);
        updateClockInTime(null);
        fetchDashboardData(); // Refresh to get final hours
      }
    };

    window.addEventListener('attendanceUpdate', handleAttendanceUpdate);

    return () => {
      isMounted = false;
      clearInterval(timer);
      clearInterval(workHoursTimer);
      window.removeEventListener('attendanceUpdate', handleAttendanceUpdate);
    };
  }, []);

  const updateWorkHours = async () => {
    // Calculate current work hours including today's ongoing session
    try {
      const response = await api.get('/attendance/my-attendance');
      const attendanceRecords = response.data;
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const thisWeekRecords = attendanceRecords.filter(record => 
        new Date(record.date) >= startOfWeek
      );
      
      // Calculate hours from completed days
      let totalHours = thisWeekRecords.reduce((sum, record) => {
        // Skip today's record as we'll calculate it separately
        const recordDate = new Date(record.date).toDateString();
        const todayDate = now.toDateString();
        if (recordDate === todayDate) return sum;
        return sum + (record.workHours || 0);
      }, 0);
      
      // Add today's ongoing hours if clocked in (use refs to avoid stale closure)
      if (clockedInRef.current && clockInTimeRef.current) {
        const todayHours = (now - clockInTimeRef.current) / (1000 * 60 * 60); // Convert to hours
        totalHours += todayHours;
      }
      
      const daysWorkedThisWeek = thisWeekRecords.filter(r => r.clockIn).length;
      
      setStats(prev => ({
        ...prev,
        hoursThisWeek: Math.round(totalHours * 10) / 10,
        daysWorkedThisWeek: clockedInRef.current ? Math.max(daysWorkedThisWeek, 1) : daysWorkedThisWeek
      }));
    } catch (error) {
      console.error("Error updating work hours:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users/meeting-directory", { params: { limit: 1000 } });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Fetch all data in parallel for better performance
      const [
        attendanceRes,
        tasksRes,
        meetingsRes,
        activitiesRes,
        policiesRes,
        attendanceRecordsRes,
        leaveBalanceRes,
        announcementsRes,
        projectsRes
      ] = await Promise.allSettled([
        api.get("/attendance/today"),
        workItemApi.getMyWork({ type: 'task' }),
        api.get('/meetings/today'),
        api.get('/activities/my-activities?limit=5'),
        api.get('/policies/recent?limit=3'),
        api.get('/attendance/my-attendance'),
        api.get('/leaves/balance'),
        api.get('/announcements'),
        api.get('/projects')
      ]);

      // Process attendance status — only update when the API returns a definitive answer
      if (attendanceRes.status === "fulfilled" && attendanceRes.value?.data) {
        const attendanceData = attendanceRes.value.data;
        if (attendanceData.clockIn) {
          updateClockedIn(!attendanceData.clockOut);
          updateClockInTime(new Date(attendanceData.clockIn));
        } else {
          updateClockedIn(false);
          updateClockInTime(null);
        }
      }

      // Process tasks
      let pendingTasks = 0;
      if (tasksRes.status === 'fulfilled') {
        const allTasks = tasksRes.value.data || [];
        pendingTasks = allTasks.filter(t => t.status !== 'Done' && !t.isDeleted).length;
        const topTasks = allTasks
          .filter(t => t.status !== 'Done' && !t.isDeleted)
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
          .slice(0, 3);
        setRecentTasks(topTasks);
      }

      // Process meetings
      if (meetingsRes.status === 'fulfilled') {
        setTodaysMeetings(meetingsRes.value.data || []);
      }

      // Process activities with announcements and projects
      let activities = [];
      if (activitiesRes.status === 'fulfilled') {
        activities = activitiesRes.value.data || [];
      }

      // Add announcements to activities
      if (announcementsRes.status === 'fulfilled' && announcementsRes.value.data?.length > 0) {
        const recentAnnouncements = announcementsRes.value.data.slice(0, 2).map(announcement => ({
          _id: `announcement-${announcement._id}`,
          type: 'announcement',
          title: 'New Announcement',
          description: announcement.title,
          color: announcement.type === 'important' ? 'danger' : announcement.type === 'urgent' ? 'warning' : 'info',
          createdAt: announcement.createdAt
        }));
        activities = [...recentAnnouncements, ...activities];
      }

      // Add projects to activities
      if (projectsRes.status === 'fulfilled' && projectsRes.value.data?.length > 0) {
        const userDepartment = user?.department;
        const recentProjects = projectsRes.value.data
          .filter(project => project.department === userDepartment)
          .slice(0, 1)
          .map(project => ({
            _id: `project-${project._id}`,
            type: 'project',
            title: 'New Project',
            description: `${project.name} assigned to ${project.department}`,
            color: 'primary',
            createdAt: project.createdAt
          }));
        activities = [...recentProjects, ...activities];
      }

      // Sort and limit activities
      activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentActivities(activities.slice(0, 5));

      // Process policies
      if (policiesRes.status === 'fulfilled') {
        setPolicies(policiesRes.value.data || []);
      }

      // Calculate attendance stats
      let presentDays = 0;
      let hoursThisWeek = 0;
      let daysWorkedThisWeek = 0;

      if (attendanceRecordsRes.status === 'fulfilled') {
        const attendanceRecords = attendanceRecordsRes.value.data;
        const now = new Date();
        
        // This month's attendance
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthRecords = attendanceRecords.filter(record => 
          new Date(record.date) >= firstDayOfMonth
        );
        presentDays = thisMonthRecords.filter(r => r.status === 'present' || r.clockIn).length;
        
        // This week's hours
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const thisWeekRecords = attendanceRecords.filter(record => 
          new Date(record.date) >= startOfWeek
        );
        hoursThisWeek = thisWeekRecords.reduce((sum, record) => 
          sum + (record.workHours || 0), 0
        );
        daysWorkedThisWeek = thisWeekRecords.filter(r => r.clockIn).length;
      }

      // Get leave balance
      let remainingLeaves = 0;
      if (leaveBalanceRes.status === 'fulfilled') {
        const leaveBalance = leaveBalanceRes.value.data.balance;
        remainingLeaves = leaveBalance.earned.remaining;
      }

      // Get attendance status text
      let attendanceToday = "Not Clocked In";
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value.data && attendanceRes.value.data.clockIn) {
        attendanceToday = attendanceRes.value.data.clockOut ? "Completed" : "Present";
      }

      // Update stats
      setStats({
        attendanceToday,
        leaveBalance: remainingLeaves,
        pendingTasks,
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        daysWorkedThisWeek,
        attendanceThisMonth: `${presentDays}/25`,
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (!silent) {
        toast.error("Failed to load dashboard data");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleClockInClick = () => {
    setShowClockInConfirm(true);
  };

  const handleEditMeeting = (meeting) => {
    // Format date for HTML date input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    // Extract attendee IDs (handle both object and ID formats)
    const getAttendeeIds = (attendees) => {
      if (!attendees || !Array.isArray(attendees)) return [];
      return attendees.map(attendee => {
        // If attendee is an object with _id, extract the _id
        if (typeof attendee === 'object' && attendee._id) {
          return attendee._id;
        }
        // If attendee is just an ID string, return it
        return attendee;
      });
    };

    // Set form data and open modal
    setFormData({
      title: meeting.title || "",
      description: meeting.description || "",
      date: formatDateForInput(meeting.date),
      startTime: meeting.startTime || "",
      endTime: meeting.endTime || "",
      location: meeting.location || "",
      meetingLink: meeting.meetingLink || "",
      attendees: getAttendeeIds(meeting.attendees),
      type: meeting.type || "team"
    });
    setSelectedMeeting(meeting);
    setShowCreateModal(true);
  };

  const handleCloseMeetingModal = () => {
    setShowCreateModal(false);
    setSelectedMeeting(null);
    // Reset form data to initial state
    setFormData({
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      meetingLink: "",
      attendees: [],
      type: "team"
    });
  };

  const handleCompleteMeeting = async (meetingId) => {
    try {
      await api.patch(`/meetings/${meetingId}/complete`);
      toast.success("Meeting marked as completed");
      fetchDashboardData();
      // Also refresh all meetings if that view is open
      if (showAllMeetings) fetchAllMeetings();
    } catch (error) {
      console.error("Error completing meeting:", error);
      toast.error(error.response?.data?.message || "Failed to complete meeting");
    }
  };

  const fetchAllMeetings = async () => {
    setAllMeetingsLoading(true);
    try {
      const res = await api.get('/meetings');
      const raw = res.data?.meetings || res.data || [];
      const userId = user?._id || user?.id;
      // Only show meetings where user is organizer or attendee, sorted newest first
      const myMeetings = raw
        .filter(m => {
          const isOrganizer = m.organizer?._id === userId || m.organizer === userId;
          const isAttendee = m.attendees?.some(a => (a._id || a) === userId);
          return isOrganizer || isAttendee;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllMeetings(myMeetings);
    } catch (err) {
      console.error('Error fetching all meetings:', err);
    } finally {
      setAllMeetingsLoading(false);
    }
  };

  const handleClockIn = async () => {
    setShowClockInConfirm(false);
    setClockActionLoading(true);
    
    try {
      const response = await api.post("/attendance/clock-in");
      const attendance = response.data.attendance;
      
      updateClockedIn(true);
      updateClockInTime(new Date(attendance.clockIn));
      toast.clockIn();
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockIn', data: attendance } 
      }));
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
    } finally {
      setClockActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.attendees.length === 0) {
      toast.error("Please select at least one attendee");
      return;
    }

    try {
      setProcessing(true);
      
      if (selectedMeeting) {
        // Update existing meeting
        await api.put(`/meetings/${selectedMeeting._id}`, formData);
        toast.success("Meeting updated successfully");
      } else {
        // Create new meeting
        await api.post("/meetings", formData);
        toast.success("Meeting scheduled successfully");
      }
      
      handleCloseMeetingModal();
      fetchDashboardData();
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error(error.response?.data?.message || "Failed to save meeting");
    } finally {
      setProcessing(false);
    }
  };

  const handleClockOutClick = () => {
    setShowClockOutConfirm(true);
  };

  const handleClockOut = async () => {
    setShowClockOutConfirm(false);
    setClockActionLoading(true);
    
    try {
      const response = await api.post("/attendance/clock-out");
      const attendance = response.data.attendance || response.data;
      
      updateClockedIn(false);
      updateClockInTime(null);
      toast.clockOut();
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendance } 
      }));
    } catch (error) {
      console.error("Error clocking out:", error);
      const errorType = error.response?.data?.type;
      const clockOutTime = error.response?.data?.clockOutTime;
      const workLogRequired = error.response?.data?.workLogRequired;
      
      if (workLogRequired) {
        // Show work log modal
        setShowWorkLogModal(true);
      } else if (errorType === 'already_clocked_out') {
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
    } finally {
      setClockActionLoading(false);
    }
  };

  const handleWorkLogSubmit = async (workLog) => {
    // After work log is submitted, proceed with clock-out
    try {
      setClockActionLoading(true);
      const response = await api.post("/attendance/clock-out");
      const attendance = response.data.attendance || response.data;
      
      updateClockedIn(false);
      updateClockInTime(null);
      toast.clockOut();
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendance } 
      }));
      
      // Refresh dashboard data
      fetchDashboardData();
      setShowWorkLogModal(false);
    } catch (error) {
      console.error("Error clocking out after work log:", error);
      toast.error("Failed to clock out. Please try again.");
    } finally {
      setClockActionLoading(false);
    }
  };

  const handleWorkLogSkip = async () => {
    // Manager skip - proceed with clock-out without work log
    try {
      setClockActionLoading(true);
      const response = await api.post("/attendance/clock-out");
      const attendance = response.data.attendance || response.data;
      
      updateClockedIn(false);
      updateClockInTime(null);
      toast.clockOut();
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendance } 
      }));
      
      // Refresh dashboard data
      fetchDashboardData();
      setShowWorkLogModal(false);
    } catch (error) {
      console.error("Error clocking out (skip):", error);
      toast.error("Failed to clock out. Please try again.");
    } finally {
      setClockActionLoading(false);
    }
  };

  const formatTime = (date) => {
    try {
      // Extract time components manually to ensure no date is included
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      
      // Pad with zeros
      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      const secondsStr = seconds.toString().padStart(2, '0');
      
      return `${hoursStr}:${minutesStr}:${secondsStr} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return "Invalid Time";
    }
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

  const calculateDays = (leaveType, startDate, endDate) =>
    getLeaveRequestDays(leaveType, startDate, endDate);

  const validateAdvanceNotice = (leaveType, startDate) => {
    if (!startDate) return { valid: true };
    
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    const requiredDays = LEAVE_TYPE_DETAILS[leaveType]?.advanceNotice || 0;
    
    if (daysDifference < requiredDays) {
      return {
        valid: false,
        message: `${LEAVE_TYPE_DETAILS[leaveType]?.name} requires ${requiredDays} days advance notice`
      };
    }
    
    return { valid: true };
  };

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (next.leaveType === 'half_day' && (name === 'startDate' || name === 'leaveType')) {
        next.endDate = name === 'startDate' ? value : prev.startDate;
      }
      return next;
    });
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

    // Validate advance notice
    const advanceNoticeCheck = validateAdvanceNotice(leaveFormData.leaveType, leaveFormData.startDate);
    if (!advanceNoticeCheck.valid) {
      toast.error(advanceNoticeCheck.message);
      return;
    }

    // Check leave balance (skip for unpaid leave only)
    const requestedDays = calculateDays(
      leaveFormData.leaveType,
      leaveFormData.startDate,
      leaveFormData.endDate
    );
    
    if (paidLeaveEligible && leaveFormData.leaveType !== 'unpaid') {
      try {
        const balanceResponse = await api.get('/leaves/balance');
        const balance = balanceResponse.data.balance;
        const availableBalance = balance.earned.remaining;

        if (requestedDays > availableBalance) {
          toast.error(`Insufficient earned leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days. You have earned ${balance.earned.earned} out of 24 annual leaves.`);
          return;
        }
      } catch (error) {
        console.error('Error checking leave balance:', error);
        toast.error('Failed to check leave balance. Please try again.');
        return;
      }
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', leaveFormData.leaveType);
      formDataToSend.append('startDate', leaveFormData.startDate);
      formDataToSend.append('endDate', leaveFormData.endDate);
      formDataToSend.append('reason', leaveFormData.reason);

      await api.post('/leaves', formDataToSend);
      toast.success('Leave application submitted successfully!');
      setShowLeaveModal(false);
      setLeaveFormData({
        leaveType: paidLeaveEligible ? 'personal' : 'unpaid',
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
      // Fetch leave balance using new earned leave system
      const balanceResponse = await api.get('/leaves/balance');
      const balance = balanceResponse.data.balance;
      
      // Fetch leave history
      const leavesResponse = await api.get('/leaves/my-leaves');
      const allLeaves = leavesResponse.data;
      
      const recentLeaves = allLeaves
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      setLeaveDetails({
        // Earned leave system data
        earned: {
          total: balance.earned.total,
          earned: balance.earned.earned,
          used: balance.earned.used,
          remaining: balance.earned.remaining,
          monthlyRate: balance.earned.monthlyRate
        },
        // Category breakdown (for reference)
        personal: balance.personal,
        medical: balance.medical,
        vacation: balance.vacation,
        unpaid: balance.unpaid,
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
      const response = await workItemApi.getMyWork({ type: 'task' });
      const allTasks = response.data || [];
      
      const pending = allTasks.filter(t => t.status === 'To Do');
      const inProgress = allTasks.filter(t => t.status === 'In Progress');
      const completed = allTasks.filter(t => t.status === 'Done');
      
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
    <Container fluid className="py-2 dashboard-container">
      {/* Greeting Banner */}
      <GreetingBanner subtitle="Welcome to your dashboard" />

      {/* HoD Section - Shows if user is Head of Department */}
      {user && (user.isHeadOfDepartment || user.headOfDepartment) && (
        <HoDSection user={user} />
      )}

      {/* HoP Section - Shows if user is Head of Project */}
      {user && user.headOfProjects && user.headOfProjects.length > 0 && (
        <HoPSection user={user} />
      )}

      {/* Quick Stats - Clean 4-Card Layout */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
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

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card 
            className="dashboard-card stat-card border-0 shadow-sm h-100 cursor-pointer" 
            onClick={handleLeaveCardClick}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Leave Balance</h6>
                  <h3 className="mb-1">{paidLeaveEligible ? `${stats.leaveBalance} days` : 'Unpaid only'}</h3>
                  <small className="text-info">
                    {paidLeaveEligible ? 'Available earned leaves • Click for details' : 'Earned leave not available • Click for details'}
                  </small>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <FaCalendarAlt className="text-info fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
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

        <Col xs={12} sm={6} lg={3} className="mb-3">
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
        <Col xs={12} md={6} className="mb-3">
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
                      onClick={handleClockOutClick}
                      className="px-5"
                      disabled={clockActionLoading}
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
                      onClick={handleClockInClick}
                      className="px-5"
                      disabled={clockActionLoading}
                    >
                      Clock In
                    </Button>
                  </>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} className="mb-3">
          <Card className="dashboard-card action-card border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="mb-3">Quick Actions</h5>
              
              <div className="d-grid gap-2">
                <Button variant="outline-primary" size="lg" onClick={() => setShowLeaveModal(true)}>
                  <FaCalendarAlt className="me-2" />
                  Apply for Leave
                </Button>
                <Button variant="outline-primary" size="lg" href="/employee/my-work">
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
                {canPermission("support.manage") && (
                  <Button variant="outline-primary" size="lg" href="/admin/support-management">
                    <FaPhone className="me-2" />
                    Support Contacts
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Today's Schedule */}
      <Row className="mb-4">
        <Col xs={12} md={6} className="mb-3">
          <Card className="dashboard-card border-0 shadow-sm" style={{ height: '320px', borderRadius: '16px', overflow: 'hidden' }}>
            <Card.Body className="d-flex flex-column p-0">
              {/* Fixed header */}
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarAlt size={15} color="#6366F1" />
                    <h6 className="mb-0 fw-bold">Today's Meetings</h6>
                    {todaysMeetings.length > 0 && (
                      <Badge bg="primary" pill style={{ fontSize: '0.7rem' }}>{todaysMeetings.length}</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px' }}
                    onClick={() => {
                      setShowMeetingsModal(true);
                      setMeetingsModalTab('today');
                      if (allMeetings.length === 0) fetchAllMeetings();
                    }}
                  >
                    View All
                  </Button>
                </div>
              </div>

              {/* Preview — max 3 items, fixed scroll area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {todaysMeetings.length === 0 ? (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                    <FaCalendarAlt size={32} className="mb-2 opacity-25" />
                    <p className="mb-0 small">No meetings today</p>
                  </div>
                ) : (
                  todaysMeetings.slice(0, 3).map((meeting) => {
                    const statusColor = meeting.status === 'completed' ? '#10B981' : meeting.status === 'cancelled' ? '#EF4444' : '#6366F1';
                    return (
                      <div key={meeting._id} style={{ padding: '10px 20px', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ width: '4px', height: '40px', borderRadius: '4px', background: statusColor, flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                            <FaClock size={10} className="me-1" />{meeting.startTime} – {meeting.endTime}
                            {meeting.meetingLink && <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="ms-2" style={{ color: '#6366F1', fontSize: '0.72rem' }}>Join →</a>}
                          </div>
                        </div>
                        <Badge style={{ fontSize: '0.65rem', background: statusColor }}>{meeting.status}</Badge>
                      </div>
                    );
                  })
                )}
                {todaysMeetings.length > 3 && (
                  <div
                    style={{ padding: '10px 20px', textAlign: 'center', fontSize: '0.78rem', color: '#6366F1', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => { setShowMeetingsModal(true); setMeetingsModalTab('today'); }}
                  >
                    +{todaysMeetings.length - 3} more meetings
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} className="mb-3">
          <TodoWidget />
        </Col>
      </Row>

      {/* Meetings Full Modal */}
      <Modal show={showMeetingsModal} onHide={() => setShowMeetingsModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <Modal.Title className="fw-bold">Meetings</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0 24px 24px' }}>
          {/* Tabs */}
          <div className="d-flex gap-2 mb-3 pt-2">
            {['today', 'all'].map(tab => (
              <button
                key={tab}
                onClick={() => { setMeetingsModalTab(tab); if (tab === 'all' && allMeetings.length === 0) fetchAllMeetings(); }}
                style={{
                  padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                  background: meetingsModalTab === tab ? '#6366F1' : '#F3F4F6',
                  color: meetingsModalTab === tab ? '#fff' : '#6B7280',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'today' ? `📅 Today (${todaysMeetings.length})` : `📋 All Meetings`}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {meetingsModalTab === 'today' ? (
              todaysMeetings.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaCalendarAlt size={40} className="mb-3 opacity-25" />
                  <p>No meetings scheduled for today</p>
                </div>
              ) : (
                todaysMeetings.map(meeting => <MeetingRow key={meeting._id} meeting={meeting} user={user} onEdit={handleEditMeeting} onComplete={handleCompleteMeeting} showDate={false} />)
              )
            ) : (
              allMeetingsLoading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
              ) : allMeetings.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaCalendarAlt size={40} className="mb-3 opacity-25" />
                  <p>No meetings found</p>
                </div>
              ) : (
                allMeetings.map(meeting => <MeetingRow key={meeting._id} meeting={meeting} user={user} onEdit={handleEditMeeting} onComplete={handleCompleteMeeting} showDate={true} />)
              )
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Announcements */}
      <Row className="mb-4">
        <Col xs={12}>
          <QuickAnnouncements />
        </Col>
      </Row>

      {/* Recent Activities & Company Policies */}
      <Row className="mb-4">
        <Col xs={12} md={6} className="mb-3">
          <Card className="dashboard-card content-card border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column">
              <h5 className="mb-3">Recent Activities</h5>
              
              {recentActivities.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentActivities.slice(0, 3).map((activity) => {
                    const getIcon = () => {
                      switch (activity.type) {
                        case 'announcement':
                          return <FaBullhorn className={`text-${activity.color}`} />;
                        case 'project':
                          return <FaTasks className={`text-${activity.color}`} />;
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
                      
                      // Use DD/MM/YYYY format
                      const day = activityDate.getDate().toString().padStart(2, '0');
                      const month = (activityDate.getMonth() + 1).toString().padStart(2, '0');
                      const year = activityDate.getFullYear();
                      return `${day}/${month}/${year}`;
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
        <Col xs={12} md={6} className="mb-3">
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
                      const day = policyDate.getDate().toString().padStart(2, '0');
                      const month = (policyDate.getMonth() + 1).toString().padStart(2, '0');
                      const year = policyDate.getFullYear();
                      return `${day}/${month}/${year}`;
                    };
                    
                    return (
                      <div key={policy._id} className="list-group-item px-0">
                        <div className="d-flex align-items-start">
                          <div className="me-3 fs-4 flex-shrink-0">
                            {getCategoryIcon()}
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <h6 className="mb-1 text-truncate" style={{ maxWidth: '70%' }}>
                                {policy.title}
                              </h6>
                              {policy.priority !== 'low' && (
                                <Badge bg={getPriorityColor()} className="flex-shrink-0">
                                  {policy.priority}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted mb-1 small" style={{ 
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {policy.description}
                            </p>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-1">
                              <small className="text-muted text-truncate" style={{ maxWidth: '60%' }}>
                                By {policy.createdBy?.name || 'Admin'}
                              </small>
                              <small className="text-muted flex-shrink-0">
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
        /* Base Dashboard Card Styles - Clean white cards with proper spacing */
        .dashboard-card {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #ffffff;
          position: relative;
          overflow: hidden;
          margin-bottom: 1.5rem; /* Add bottom margin to prevent touching */
        }
        
        /* Subtle gradient overlay on hover */
        .dashboard-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.03), rgba(118, 75, 162, 0.03));
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        
        .dashboard-card:hover::before {
          opacity: 1;
        }
        
        /* Premium hover effect - enhanced shadow and border glow, NO transform */
        .dashboard-card:hover {
          box-shadow: 
            0 0 0 1px rgba(102, 126, 234, 0.1),
            0 8px 24px -4px rgba(102, 126, 234, 0.15),
            0 16px 48px -8px rgba(0, 0, 0, 0.08) !important;
          border-color: rgba(102, 126, 234, 0.4);
        }
        
        /* Stat card specific styles */
        .stat-card {
          margin-bottom: 1.5rem;
        }
        
        /* Icon hover effects - subtle scale and glow */
        .stat-card .bg-success,
        .stat-card .bg-info,
        .stat-card .bg-warning,
        .stat-card .bg-primary {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stat-card:hover .bg-success {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(25, 135, 84, 0.25);
        }
        
        .stat-card:hover .bg-info {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(13, 202, 240, 0.25);
        }
        
        .stat-card:hover .bg-warning {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(255, 193, 7, 0.25);
        }
        
        .stat-card:hover .bg-primary {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(13, 110, 253, 0.25);
        }
        
        /* List items hover effect - smooth slide */
        .content-card .list-group-item {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 6px;
          margin-bottom: 2px;
        }
        
        .content-card .list-group-item:hover {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.03));
          padding-left: 1.25rem;
        }
        
        /* Button hover effects - subtle lift */
        .dashboard-card .btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .dashboard-card .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }
        
        .dashboard-card .btn:active {
          transform: translateY(0);
        }
        
        /* Badge hover effects */
        .dashboard-card .badge {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .dashboard-card .badge:hover {
          transform: scale(1.03);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Icon subtle scale on card hover */
        .dashboard-card .fs-4 {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .dashboard-card:hover .fs-4 {
          transform: scale(1.05);
        }
        
        /* Progress bar smooth animation */
        .dashboard-card .progress-bar {
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Card title shimmer effect on hover */
        .dashboard-card h5 {
          position: relative;
          padding-bottom: 8px;
          transition: color 0.3s ease;
        }
        
        .dashboard-card:hover h5 {
          color: #667eea;
        }
        
        /* Clickable card effect - enhanced shadow, NO vertical movement */
        .cursor-pointer {
          cursor: pointer !important;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 1.5rem;
        }
        
        .cursor-pointer:hover {
          box-shadow: 
            0 0 0 1px rgba(13, 202, 240, 0.15),
            0 12px 32px -4px rgba(13, 202, 240, 0.2),
            0 20px 56px -8px rgba(0, 0, 0, 0.1) !important;
          border-color: rgba(13, 202, 240, 0.5);
        }
        
        .cursor-pointer:active {
          transform: scale(0.98);
        }

        /* Leave Type Card Styles */
        .leave-type-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border-radius: 8px;
        }

        .leave-type-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          border-color: rgba(13, 110, 253, 0.3) !important;
        }

        .leave-type-card.selected {
          background-color: #f8f9fa;
          border-color: #0d6efd !important;
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
        }

        .leave-type-card h6 {
          font-size: 0.95rem !important;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .leave-type-card small {
          font-size: 0.8rem;
          line-height: 1.3;
        }
      `}</style>

      {/* Leave Application Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} size="lg" centered className="leave-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2" />
            Request Leave
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleLeaveSubmit}>
            {/* Leave Type Selection - Card Style */}
            <div className="mb-4">
              <h6 className="mb-3">Leave Type</h6>
              {!paidLeaveEligible && (
                <Alert variant="secondary" className="mb-3">
                  Only unpaid leave is available for your employment type.
                </Alert>
              )}
              <Row className="g-3">
                {allowedLeaveTypes.includes('vacation') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${leaveFormData.leaveType === 'vacation' ? 'selected' : ''}`}
                    onClick={() => setLeaveFormData(prev => ({ ...prev, leaveType: 'vacation' }))}
                    style={{ cursor: 'pointer', border: leaveFormData.leaveType === 'vacation' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6f42c1' }}></div>
                        </div>
                        <div>
                          <h6 className="mb-1">Vacation</h6>
                          <small className="text-muted">Planned time off for rest and recreation</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('medical') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${leaveFormData.leaveType === 'medical' ? 'selected' : ''}`}
                    onClick={() => setLeaveFormData(prev => ({ ...prev, leaveType: 'medical' }))}
                    style={{ cursor: 'pointer', border: leaveFormData.leaveType === 'medical' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc3545' }}></div>
                        </div>
                        <div>
                          <h6 className="mb-1">Sick Leave</h6>
                          <small className="text-muted">Medical leave for illness or health issues</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('personal') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${leaveFormData.leaveType === 'personal' ? 'selected' : ''}`}
                    onClick={() => setLeaveFormData(prev => ({ ...prev, leaveType: 'personal' }))}
                    style={{ cursor: 'pointer', border: leaveFormData.leaveType === 'personal' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0dcaf0' }}></div>
                        </div>
                        <div>
                          <h6 className="mb-1">Personal Leave</h6>
                          <small className="text-muted">Personal matters and family obligations</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('half_day') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${leaveFormData.leaveType === 'half_day' ? 'selected' : ''}`}
                    onClick={() => setLeaveFormData(prev => ({
                      ...prev,
                      leaveType: 'half_day',
                      endDate: prev.startDate || prev.endDate,
                    }))}
                    style={{ cursor: 'pointer', border: leaveFormData.leaveType === 'half_day' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fd7e14' }}></div>
                        </div>
                        <div>
                          <h6 className="mb-1">Half Day</h6>
                          <small className="text-muted">Leave for half of the working day</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('unpaid') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${leaveFormData.leaveType === 'unpaid' ? 'selected' : ''}`}
                    onClick={() => setLeaveFormData(prev => ({ ...prev, leaveType: 'unpaid' }))}
                    style={{ cursor: 'pointer', border: leaveFormData.leaveType === 'unpaid' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6c757d' }}></div>
                        </div>
                        <div>
                          <h6 className="mb-1">Unpaid Leave</h6>
                          <small className="text-muted">Extended leave without pay</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
              </Row>
            </div>

            {/* Date Fields */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
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
              </Col>
              <Col md={6}>
                <Form.Group>
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
              </Col>
            </Row>

            {/* Reason Field */}
            <Form.Group className="mb-3">
              <Form.Label>
                <FaFileAlt className="me-2" />
                Reason for Leave
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="reason"
                value={leaveFormData.reason}
                onChange={handleLeaveFormChange}
                placeholder="Please provide a reason for your leave request..."
                maxLength={500}
                required
              />
              <Form.Text className="text-muted">
                {leaveFormData.reason.length}/500 characters
              </Form.Text>
            </Form.Group>

            {/* Attachments (Optional) - Placeholder for future */}
            <Form.Group className="mb-4">
              <Form.Label className="text-muted">
                📎 Attachments (Optional)
              </Form.Label>
              <div className="text-muted small">
                <em>Attachment feature coming soon</em>
              </div>
            </Form.Group>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Submit Request
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Leave Details Modal */}
      <Modal show={showLeaveDetailsModal} onHide={() => setShowLeaveDetailsModal(false)} size="lg" centered className="details-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2 text-info" />
            Leave Balance Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Earned Leave Summary */}
          {leaveDetails.earned && (
            <>
              <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded">
                <h6 className="text-primary mb-2">
                  <FaCalendarAlt className="me-2" />
                  Earned Leave System (2026)
                </h6>
                <p className="mb-2 small text-muted">
                  You earn 2 leaves per month. Total annual allowance: 24 days.
                </p>
                <Row className="text-center">
                  <Col xs={6} sm={3}>
                    <div className="mb-2">
                      <div className="h5 mb-0 text-primary">{leaveDetails.earned.earned}</div>
                      <small className="text-muted">Earned</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="mb-2">
                      <div className="h5 mb-0 text-danger">{leaveDetails.earned.used}</div>
                      <small className="text-muted">Used</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="mb-2">
                      <div className="h5 mb-0 text-success">{leaveDetails.earned.remaining}</div>
                      <small className="text-muted">Available</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="mb-2">
                      <div className="h5 mb-0 text-info">{leaveDetails.earned.total}</div>
                      <small className="text-muted">Annual Total</small>
                    </div>
                  </Col>
                </Row>
                <div className="progress mt-3" style={{ height: '10px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: `${(leaveDetails.earned.used / leaveDetails.earned.earned) * 100}%` }}
                  ></div>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <small className="text-muted">Usage: {leaveDetails.earned.used}/{leaveDetails.earned.earned}</small>
                  <small className="text-muted">Monthly Rate: {leaveDetails.earned.monthlyRate} days</small>
                </div>
              </div>
            </>
          )}

          {/* Leave Type Breakdown (Reference) */}
          <h6 className="mb-3">Leave Type Breakdown (Reference)</h6>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Personal Leave</span>
              <span className="text-muted">
                {leaveDetails.personal?.used || 0} / {leaveDetails.personal?.total || 12} days
              </span>
            </div>
            <div className="progress mb-3" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-info" 
                style={{ width: `${((leaveDetails.personal?.used || 0) / (leaveDetails.personal?.total || 12)) * 100}%` }}
              ></div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Medical Leave</span>
              <span className="text-muted">
                {leaveDetails.medical?.used || 0} / {leaveDetails.medical?.total || 6} days
              </span>
            </div>
            <div className="progress mb-3" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-warning" 
                style={{ width: `${((leaveDetails.medical?.used || 0) / (leaveDetails.medical?.total || 6)) * 100}%` }}
              ></div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Vacation Leave</span>
              <span className="text-muted">
                {leaveDetails.vacation?.used || 0} / {leaveDetails.vacation?.total || 6} days
              </span>
            </div>
            <div className="progress mb-3" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-success" 
                style={{ width: `${((leaveDetails.vacation?.used || 0) / (leaveDetails.vacation?.total || 6)) * 100}%` }}
              ></div>
            </div>

            {leaveDetails.unpaid && leaveDetails.unpaid.used > 0 && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Unpaid Leave</span>
                  <span className="text-muted">
                    {leaveDetails.unpaid.used} days (no limit)
                  </span>
                </div>
                <div className="progress mb-3" style={{ height: '8px' }}>
                  <div className="progress-bar bg-secondary" style={{ width: '100%' }}></div>
                </div>
              </>
            )}
          </div>

          {/* Recent Leaves */}
          {leaveDetails.recentLeaves.length > 0 && (
            <>
              <h6 className="mb-3">Recent Leave History</h6>
              <div className="list-group">
                {leaveDetails.recentLeaves.map((leave) => {
                  const startDateObj = new Date(leave.startDate);
                  const endDateObj = new Date(leave.endDate);
                  const startDate = `${startDateObj.getDate().toString().padStart(2, '0')}/${(startDateObj.getMonth() + 1).toString().padStart(2, '0')}/${startDateObj.getFullYear()}`;
                  const endDate = `${endDateObj.getDate().toString().padStart(2, '0')}/${(endDateObj.getMonth() + 1).toString().padStart(2, '0')}/${endDateObj.getFullYear()}`;
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
          <div className="mt-4 d-flex flex-column flex-sm-row gap-2">
            <Button 
              variant="primary" 
              className="flex-grow-1 w-mobile-100"
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
              className="w-mobile-100"
              onClick={() => window.location.href = '/employee/leaves'}
            >
              View All Leaves
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Attendance Details Modal */}
      <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg" centered className="details-modal">
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
              const dateObj = new Date(record.date);
              const date = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
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
                          Due: {`${dueDate.getDate().toString().padStart(2, '0')}/${(dueDate.getMonth() + 1).toString().padStart(2, '0')}/${dueDate.getFullYear()}`}
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
            <Button variant="primary" className="w-100" onClick={() => window.location.href = '/employee/my-work'}>
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
                const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
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
        loading={clockActionLoading}
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
        loading={clockActionLoading}
        additionalInfo={clockInTime && (
          <><strong>Clock In Time:</strong> {formatTime(clockInTime)}</>
        )}
      />

      {/* Work Log Submission Modal */}
      <WorkLogSubmissionModal
        show={showWorkLogModal}
        onHide={() => setShowWorkLogModal(false)}
        onSubmit={handleWorkLogSubmit}
        onSkip={handleWorkLogSkip}
      />

      {/* Create/Edit Meeting Modal */}
      <Modal show={showCreateModal} onHide={handleCloseMeetingModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedMeeting ? "Edit" : "Schedule"} Meeting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Meeting Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter meeting title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter meeting description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Conference Room A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Meeting Link</Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="e.g., https://zoom.us/j/..."
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Meeting Type</Form.Label>
              <Form.Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="team">Team Meeting</option>
                <option value="one-on-one">1-on-1</option>
                <option value="client">Client Meeting</option>
                <option value="training">Training</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attendees * (Hold Ctrl/Cmd to select multiple)</Form.Label>
              <Form.Select
                multiple
                value={formData.attendees}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, attendees: selected });
                }}
                style={{ minHeight: "150px" }}
                required
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Selected: {formData.attendees.length} attendee(s)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMeetingModal} disabled={processing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={processing}>
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {selectedMeeting ? "Updating..." : "Scheduling..."}
              </>
            ) : (
              <>
                {selectedMeeting ? <FaEdit className="me-2" /> : <FaPlus className="me-2" />}
                {selectedMeeting ? "Update" : "Schedule"} Meeting
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeeDashboard;
