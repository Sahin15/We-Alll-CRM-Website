import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  InputGroup,
  Alert,
} from "react-bootstrap";
import {
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaBuilding,
  FaEye,
  FaUserShield,
  FaChartLine,
  FaMoneyBillWave,
  FaHome,
  FaUserPlus,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";
import LeaveManagement from "../../components/hr/LeaveManagement";
import HolidayManagement from "../../components/hr/HolidayManagement";
import TaskManagement from "../../components/hr/TaskManagement";
import MeetingManagement from "../../components/hr/MeetingManagement";
import AttendanceOverview from "../../components/hr/AttendanceOverview";
import PolicyManagement from "../../components/hr/PolicyManagement";
import AnnouncementManagement from "../../components/hr/AnnouncementManagement";
import QuickStatsWidgets from "../../components/hr/QuickStatsWidgets";
import NotificationCenter from "../../components/hr/NotificationCenter";
import ReportsAnalytics from "../../components/hr/ReportsAnalytics";
import OvertimeApprovalPanel from "../../components/hr/OvertimeApprovalPanel";
import WFHApprovalPanel from "../../components/wfh/WFHApprovalPanel";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import { departmentApi } from "../../api/departmentApi";
import { leadApi } from "../../api/leadApi";
import { getPendingOvertimeEntries } from "../../api/overtimeApi";
import { getPendingWFHRequests } from "../../api/wfhApi";
import { hiringRequestApi } from "../../api/hiringRequestApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import toast from "../../utils/toast";
import TodoWidget from "../../components/common/TodoWidget";

const HRDashboard = () => {
  const { user, canAccess } = useAuth();
  const hasReportsAccess = checkPageAccess(canAccess, PAGE_ACCESS.reportsAnalytics);
  const hasLeadsAccess = checkPageAccess(canAccess, PAGE_ACCESS.crmLeadView);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employees: 0,
    pendingLeaves: 0,
    presentToday: 0,
    departments: 0,
    leads: 0,
    lateToday: 0,
    pendingOvertime: 0,
    pendingWFH: 0,
    pendingHiring: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [lateEntries, setLateEntries] = useState([]);
  
  // Modal states
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [showLeavesModal, setShowLeavesModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  
  // Modal data
  const [employeesList, setEmployeesList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch users data — only active employees for accurate count
      const usersRes = await userApi.getAllUsers({ status: 'active', limit: 1000 });
      // Fetch leave data
      const leaveRes = await leaveApi.getAllLeaves({ status: "pending" });
      // Fetch today's attendance data only
      const attendanceRes = await attendanceApi.getAllAttendance({ date: today });
      // Fetch department data
      const departmentRes = await departmentApi.getAllDepartments();
      // Fetch leads only when user has explicit CRM lead access
      let leadsRes = { data: [] };
      if (hasLeadsAccess) {
        try {
          leadsRes = await leadApi.getAllLeads();
        } catch (error) {
          console.log('Could not fetch leads data');
        }
      }

      // Count all who clocked in today (present, late, half-day) as "present today"
      const todayPresentCount = attendanceRes.data?.filter((a) => 
        a.status === "present" || a.status === "late" || a.status === "half-day"
      ).length || 0;
      
      // Count today's late entries (including half-day)
      const todayLateCount = attendanceRes.data?.filter((a) => 
        a.status === "late" || a.status === "half-day"
      ).length || 0;
      
      // Get late and half-day entries with employee details
      const lateEntriesData = attendanceRes.data?.filter((a) => 
        a.status === "late" || a.status === "half-day"
      ) || [];
      setLateEntries(lateEntriesData);

      // Fetch pending overtime count
      let pendingOvertimeCount = 0;
      try {
        const overtimeRes = await getPendingOvertimeEntries();
        pendingOvertimeCount = overtimeRes.total || 0;
      } catch (error) {
        console.log('Could not fetch pending overtime:', error);
      }

      // Fetch pending WFH count
      let pendingWFHCount = 0;
      try {
        const wfhRes = await getPendingWFHRequests();
        pendingWFHCount = wfhRes.data?.length || 0;
      } catch (error) {
        console.log('Could not fetch pending WFH requests:', error);
      }

      let pendingHiringCount = 0;
      try {
        const hiringRes = await hiringRequestApi.pendingCount();
        pendingHiringCount = hiringRes.data?.count || 0;
      } catch (error) {
        console.log('Could not fetch pending hiring requests:', error);
      }

      setStats({
        // usersRes already filtered to active employees only by the API
        employees:
          usersRes.data?.filter((u) => 
            (u.role === "employee" || u.role === "hod" || u.role === "hr" || u.role === "manager") &&
            u.isActive !== false
          ).length || 0,
        pendingLeaves: leaveRes.data?.length || 0,
        presentToday: todayPresentCount,
        departments: departmentRes.data?.length || 0,
        leads: leadsRes.data?.length || 0,
        lateToday: todayLateCount,
        pendingOvertime: pendingOvertimeCount,
        pendingWFH: pendingWFHCount,
        pendingHiring: pendingHiringCount,
      });

      // Set pending leaves for table
      setPendingLeaves(leaveRes.data?.slice(0, 5) || []);

      // Set recent activities - Enhanced with more data
      const activities = [];
      
      // Add recent leave activities (last 5)
      if (leaveRes.data?.length > 0) {
        leaveRes.data.slice(0, 3).forEach((leave) => {
          activities.push({
            description: `${leave.employee?.name || "Employee"} requested ${leave.leaveType} leave`,
            date: leave.createdAt || new Date(),
            type: "warning",
            status: "Pending",
          });
        });
      }
      
      // Add attendance summary
      if (todayPresentCount > 0) {
        activities.push({
          description: `${todayPresentCount} employees marked present today`,
          date: new Date(),
          type: "success",
          status: "Present",
        });
      }
      
      // Add new employees (if any joined recently)
      const recentEmployees = usersRes.data?.filter((u) => {
        if (!u.joiningDate || u.role !== "employee") return false;
        const joinDate = new Date(u.joiningDate);
        const daysSinceJoining = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
        return daysSinceJoining <= 7; // Last 7 days
      }) || [];
      
      recentEmployees.slice(0, 2).forEach((emp) => {
        activities.push({
          description: `${emp.name} joined as ${emp.designation || "Employee"}`,
          date: emp.joiningDate,
          type: "info",
          status: "New",
        });
      });
      
      // Sort by date (most recent first) and limit to 10
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Card click handlers
  const handleEmployeesCardClick = async () => {
    try {
      // Pass status=active directly to backend so only truly active employees are returned
      const response = await userApi.getAllUsers({ status: 'active', limit: 1000 });
      const employees = (response.data || []).filter(u => 
        (u.role === 'employee' || u.role === 'hod' || u.role === 'hr' || u.role === 'manager') &&
        u.isActive !== false
      );
      
      // Fetch today's attendance to show status
      const today = new Date().toISOString().split('T')[0];
      let todayAttendance = [];
      try {
        const attResponse = await attendanceApi.getAllAttendance({ date: today });
        todayAttendance = attResponse.data || [];
      } catch (err) {
        console.log('Could not fetch attendance:', err);
      }
      
      // Fetch approved leaves for today to show who's on leave
      let todayLeaves = [];
      try {
        const leaveResponse = await leaveApi.getAllLeaves();
        const allLeaves = leaveResponse.data || [];
        const todayDate = new Date(today);
        todayLeaves = allLeaves.filter(leave => {
          if (leave.status !== 'approved') return false;
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return todayDate >= startDate && todayDate <= endDate;
        });
      } catch (err) {
        console.log('Could not fetch leaves:', err);
      }
      
      // Enhance employees with attendance status
      const enhancedEmployees = employees.map(emp => {
        const attendance = todayAttendance.find(a => a.employee?._id === emp._id || a.employee === emp._id);
        const onLeave = todayLeaves.find(l => l.employee?._id === emp._id || l.employee === emp._id);
        
        return {
          ...emp,
          attendanceStatus: onLeave ? 'on-leave' : (attendance ? 'present' : 'absent'),
          leaveType: onLeave?.leaveType
        };
      });
      
      setEmployeesList(enhancedEmployees);
      setShowEmployeesModal(true);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleLeavesCardClick = () => {
    setShowLeavesModal(true);
  };

  const handleAttendanceCardClick = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await attendanceApi.getAllAttendance({ date: today });
      
      // Fetch approved leaves for today
      let todayLeaves = [];
      try {
        const leaveResponse = await leaveApi.getAllLeaves();
        const allLeaves = leaveResponse.data || [];
        const todayDate = new Date(today);
        todayLeaves = allLeaves.filter(leave => {
          if (leave.status !== 'approved') return false;
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return todayDate >= startDate && todayDate <= endDate;
        });
      } catch (err) {
        console.log('Could not fetch leaves:', err);
      }
      
      // Enhance attendance with leave info
      const enhancedAttendance = response.data.map(att => {
        const onLeave = todayLeaves.find(l => 
          (l.employee?._id === att.employee?._id) || (l.employee === att.employee?._id)
        );
        return {
          ...att,
          onLeave: !!onLeave,
          leaveType: onLeave?.leaveType
        };
      });
      
      // Add employees who are on leave but didn't clock in
      const attendanceEmployeeIds = new Set(
        response.data.map(att => att.employee?._id?.toString() || att.employee?.toString())
      );
      
      for (const leave of todayLeaves) {
        const leaveEmployeeId = leave.employee?._id?.toString() || leave.employee?.toString();
        if (!attendanceEmployeeIds.has(leaveEmployeeId)) {
          enhancedAttendance.push({
            _id: `leave-${leave._id}`,
            employee: leave.employee,
            date: today,
            clockIn: null,
            clockOut: null,
            status: 'on-leave',
            onLeave: true,
            leaveType: leave.leaveType,
            isLeaveOnly: true
          });
        }
      }
      
      setAttendanceToday(enhancedAttendance);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    }
  };

  const handleLateEntriesCardClick = () => {
    setShowLateModal(true);
  };

  const handleLeadsCardClick = async () => {
    try {
      const response = await leadApi.getAllLeads();
      setLeadsList(response.data || []);
      setShowLeadsModal(true);
    } catch (error) {
      toast.error('Failed to load leads');
    }
  };

  const quickActions = [
    {
      label: "Salary Management",
      icon: <FaMoneyBillWave />,
      path: "/salary-management",
      variant: "success",
    },
    {
      label: "Approve Leaves",
      icon: <FaCalendarAlt />,
      path: "/leaves/requests",
      variant: "primary",
      badge: stats.pendingLeaves > 0 ? stats.pendingLeaves : null,
    },
    {
      label: "Approve Overtime",
      icon: <FaClock />,
      path: "#overtime-approvals",
      variant: "warning",
      badge: stats.pendingOvertime > 0 ? stats.pendingOvertime : null,
      onClick: () => {
        // Scroll to overtime approval panel
        const overtimeSection = document.getElementById('overtime-approvals');
        if (overtimeSection) {
          overtimeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    },
    {
      label: "Approve WFH",
      icon: <FaHome />,
      path: "#wfh-approvals",
      variant: "success",
      badge: stats.pendingWFH > 0 ? stats.pendingWFH : null,
      onClick: () => {
        // Scroll to WFH approval panel
        const wfhSection = document.getElementById('wfh-approvals');
        if (wfhSection) {
          wfhSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    },
    {
      label: "Hiring Requests",
      icon: <FaUserPlus />,
      path: "/hr/hiring/requests",
      variant: "primary",
      badge: stats.pendingHiring > 0 ? stats.pendingHiring : null,
    },
    {
      label: "View Attendance",
      icon: <FaClock />,
      path: "/attendance/tracking",
      variant: "info",
    },
  ];

  const handleApproveLeave = async (id) => {
    try {
      await leaveApi.approveLeave(id, '');
      toast.success("Leave approved successfully");
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error("Failed to approve leave");
    }
  };

  const handleRejectLeave = async (id) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    
    try {
      await leaveApi.rejectLeave(id, reason);
      toast.success("Leave rejected successfully");
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error("Failed to reject leave");
    }
  };

  return (
    <Container fluid className="py-2">
      <GreetingBanner subtitle="Manage your workforce efficiently" />

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <div onClick={handleEmployeesCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Active Employees"
              value={stats.employees}
              icon={<FaUsers />}
              bgColor="primary"
              trend={5}
            />
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleLeavesCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Pending Leave Requests"
              value={stats.pendingLeaves}
              icon={<FaCalendarAlt />}
              bgColor="warning"
            />
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleAttendanceCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Present Today"
              value={stats.presentToday}
              icon={<FaClock />}
              bgColor="success"
            />
          </div>
        </Col>
        {hasLeadsAccess ? (
          <Col lg={3} md={6}>
            <div onClick={handleLeadsCardClick} style={{ cursor: 'pointer', height: '100%' }}>
              <StatCard
                title="Total Leads"
                value={stats.leads}
                icon={<FaChartLine />}
                bgColor="info"
              />
            </div>
          </Col>
        ) : (
          <Col lg={3} md={6}>
            <div onClick={handleLateEntriesCardClick} style={{ cursor: 'pointer', height: '100%' }}>
              <StatCard
                title="Late Today"
                value={stats.lateToday}
                icon={<FaExclamationTriangle />}
                bgColor="danger"
              />
            </div>
          </Col>
        )}
      </Row>

      {/* Salary Management Card */}
      <Row className="mb-4">
        <Col>
          <Card 
            className="border-0 shadow-sm"
            style={{ 
              backgroundColor: '#f8f9fa',
              minHeight: '120px'
            }}
          >
            <Card.Body className="d-flex align-items-center">
              <Row className="w-100 align-items-center">
                <Col md={8}>
                  <div className="d-flex align-items-center">
                    <div className="me-4">
                      <FaMoneyBillWave 
                        size={50} 
                        className="text-primary"
                      />
                    </div>
                    <div>
                      <h4 className="mb-2 fw-bold text-dark" style={{ fontSize: '20px' }}>
                        Salary Management System
                      </h4>
                      <p className="mb-0 text-muted fs-6">
                        Manage salary structures, generate salary slips, and view payroll reports
                      </p>
                    </div>
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => navigate('/salary-management')}
                    className="fw-bold px-4 py-3"
                  >
                    <FaMoneyBillWave className="me-2" />
                    Manage Salaries
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions & Notifications - High Priority */}
      <Row className="g-4 mb-4">
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
        <Col lg={8}>
          <NotificationCenter />
        </Col>
      </Row>

      {/* Quick Stats Widgets - Important Alerts */}
      <Row className="mb-4">
        <Col>
          <QuickStatsWidgets />
        </Col>
      </Row>

      {/* My To-Do List */}
      <Row className="mb-4">
        <Col>
          <TodoWidget />
        </Col>
      </Row>

      {/* Leave Management - Most Actionable */}
      <Row className="mb-4">
        <Col>
          <LeaveManagement />
        </Col>
      </Row>

      {/* Overtime Approval - Important for HR */}
      <Row className="mb-4" id="overtime-approvals">
        <Col>
          <OvertimeApprovalPanel />
        </Col>
      </Row>

      {/* WFH Approval - Work From Home Requests */}
      <Row className="mb-4" id="wfh-approvals">
        <Col>
          <WFHApprovalPanel />
        </Col>
      </Row>

      {/* Attendance Overview - Daily Priority */}
      <Row className="mb-4">
        <Col>
          <AttendanceOverview />
        </Col>
      </Row>

      {/* Meeting Management - Full Width */}
      <Row className="mb-4">
        <Col lg={12}>
          <MeetingManagement />
        </Col>
      </Row>

      {/* Task Management - Full Width */}
      <Row className="mb-4">
        <Col lg={12}>
          <TaskManagement />
        </Col>
      </Row>

      {/* Policy & Announcement Management */}
      <Row className="g-4 mb-4">
        <Col lg={6}>
          <PolicyManagement />
        </Col>
        <Col lg={6}>
          <AnnouncementManagement />
        </Col>
      </Row>

      {/* Recent Activity & Reports */}
      <Row className="g-4 mb-4">
        <Col lg={5}>
          <RecentActivity activities={recentActivities} />
        </Col>
        <Col lg={7}>
          <ReportsAnalytics />
        </Col>
      </Row>

      {/* Quick Access Information */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h6 className="mb-0">
                <FaChartLine className="me-2 text-primary" />
                Team Management Hub
              </h6>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-0">
                <FaUsers className="me-2" />
                <strong>Comprehensive Employee Management:</strong> Access detailed employee profiles, document management, salary slips, offer letters, and all HR documents through the <strong>Team → Employees</strong> section in the sidebar.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Employees Modal */}
      <Modal show={showEmployeesModal} onHide={() => setShowEmployeesModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaUsers className="me-2 text-primary" />Active Employees ({employeesList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employeesList.map(emp => (
                <tr key={emp._id}>
                  <td>
                    {emp.attendanceStatus === 'present' && (
                      <span className="d-flex align-items-center">
                        <span className="badge bg-success rounded-circle" style={{ width: '12px', height: '12px' }} title="Present"></span>
                        <small className="ms-2 text-success">Present</small>
                      </span>
                    )}
                    {emp.attendanceStatus === 'absent' && (
                      <span className="d-flex align-items-center">
                        <span className="badge bg-danger rounded-circle" style={{ width: '12px', height: '12px' }} title="Absent"></span>
                        <small className="ms-2 text-danger">Absent</small>
                      </span>
                    )}
                    {emp.attendanceStatus === 'on-leave' && (
                      <span className="d-flex align-items-center">
                        <span className="badge bg-warning rounded-circle" style={{ width: '12px', height: '12px' }} title="On Leave"></span>
                        <small className="ms-2 text-warning">On Leave</small>
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{emp.name}</strong>
                    {emp.leaveType && <div><Badge bg="warning" className="mt-1">{emp.leaveType}</Badge></div>}
                  </td>
                  <td>{emp.email}</td>
                  <td>{emp.department?.name || 'N/A'}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/employees/${emp._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* Pending Leaves Modal */}
      <Modal show={showLeavesModal} onHide={() => setShowLeavesModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaCalendarAlt className="me-2 text-warning" />Pending Leave Requests ({pendingLeaves.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {pendingLeaves.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map(leave => (
                  <tr key={leave._id}>
                    <td><strong>{leave.employee?.name}</strong></td>
                    <td><Badge bg="info">{leave.leaveType}</Badge></td>
                    <td>
                      <small>{new Date(leave.startDate).toLocaleDateString('en-GB')} - {new Date(leave.endDate).toLocaleDateString('en-GB')}</small>
                    </td>
                    <td>
                      <Button size="sm" variant="success" className="me-2" onClick={() => handleApproveLeave(leave._id)}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => handleRejectLeave(leave._id)}>Reject</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted">No pending leave requests</div>
          )}
        </Modal.Body>
      </Modal>

      {/* Attendance Today Modal */}
      <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaClock className="me-2 text-success" />Today's Attendance ({attendanceToday.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceToday.map(att => (
                <tr key={att._id} className={att.isWFH ? 'table-info' : att.onLeave ? 'table-warning' : ''}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <strong>{att.employee?.name || 'N/A'}</strong>
                      {att.isWFH && (
                        <span 
                          title={`Work From Home${att.wfhReason ? ': ' + att.wfhReason : ''}`}
                          style={{ fontSize: '1.2em' }}
                        >
                          🏠
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{att.clockIn ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (att.onLeave ? 'On Leave' : 'N/A')}</td>
                  <td>{att.clockOut ? new Date(att.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (att.onLeave ? 'On Leave' : 'Not yet')}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {att.onLeave ? (
                        <>
                          <Badge bg="warning">On Leave</Badge>
                          {att.leaveType && <Badge bg="secondary">{att.leaveType}</Badge>}
                        </>
                      ) : (
                        <>
                          <Badge bg={att.status === 'present' ? 'success' : att.status === 'late' ? 'danger' : 'secondary'}>
                            {att.status}
                          </Badge>
                          {att.isWFH && (
                            <Badge bg="info">WFH</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* Late Entries Modal */}
      <Modal show={showLateModal} onHide={() => setShowLateModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaClock className="me-2 text-danger" />Late & Half Day Entries Today ({lateEntries.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {lateEntries.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No late or half-day entries today</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Clock In Time</th>
                  <th>Expected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lateEntries.map((entry) => {
                  const clockInTime = new Date(entry.clockIn);
                  const timeStr = clockInTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  return (
                    <tr key={entry._id}>
                      <td>
                        <strong>{entry.employee?.name || 'N/A'}</strong>
                        <br />
                        <small className="text-muted">{entry.employee?.email}</small>
                      </td>
                      <td>{entry.employee?.department?.name || 'N/A'}</td>
                      <td>
                        <Badge bg="danger">{timeStr}</Badge>
                      </td>
                      <td>
                        <small className="text-muted">10:30 AM</small>
                      </td>
                      <td>
                        <Badge bg={entry.status === 'half-day' ? 'info' : 'danger'}>
                          {entry.status === 'half-day' ? 'Half Day' : 'Late'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      {hasLeadsAccess && (
      <Modal show={showLeadsModal} onHide={() => setShowLeadsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaChartLine className="me-2 text-primary" />All Leads ({leadsList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leadsList.map(lead => (
                <tr key={lead._id}>
                  <td><strong>{lead.fullName || lead.name || 'N/A'}</strong></td>
                  <td>{lead.companyName || lead.company || 'N/A'}</td>
                  <td><Badge bg={lead.status === 'hot' ? 'danger' : lead.status === 'warm' ? 'warning' : 'info'}>{lead.status || 'cold'}</Badge></td>
                  <td><Badge bg="secondary">{lead.source || 'N/A'}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/leads/${lead._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
              {leadsList.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted">No leads found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
      )}
    </Container>
  );
};

export default HRDashboard;
