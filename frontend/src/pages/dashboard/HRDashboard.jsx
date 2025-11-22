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
} from "react-bootstrap";
import {
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaBuilding,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";
import LeaveManagement from "../../components/hr/LeaveManagement";
import TaskManagement from "../../components/hr/TaskManagement";
import MeetingManagement from "../../components/hr/MeetingManagement";
import AttendanceOverview from "../../components/hr/AttendanceOverview";
import PolicyManagement from "../../components/hr/PolicyManagement";
import AnnouncementManagement from "../../components/hr/AnnouncementManagement";
import QuickStatsWidgets from "../../components/hr/QuickStatsWidgets";
import EmployeeDirectory from "../../components/hr/EmployeeDirectory";
import NotificationCenter from "../../components/hr/NotificationCenter";
import CalendarView from "../../components/hr/CalendarView";
import ReportsAnalytics from "../../components/hr/ReportsAnalytics";
import DocumentManagement from "../../components/hr/DocumentManagement";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import { departmentApi } from "../../api/departmentApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import toast from "../../utils/toast";

const HRDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employees: 0,
    pendingLeaves: 0,
    presentToday: 0,
    departments: 0,
    lateToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [lateEntries, setLateEntries] = useState([]);
  
  // Modal states
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [showLeavesModal, setShowLeavesModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  
  // Modal data
  const [employeesList, setEmployeesList] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch users data
      const usersRes = await userApi.getAllUsers();
      // Fetch leave data
      const leaveRes = await leaveApi.getAllLeaves("pending");
      // Fetch today's attendance data only
      const attendanceRes = await attendanceApi.getAllAttendance({ date: today });
      // Fetch department data
      const departmentRes = await departmentApi.getAllDepartments();

      // Count only today's present employees
      const todayPresentCount = attendanceRes.data?.filter((a) => a.status === "present").length || 0;
      
      // Count today's late entries
      const todayLateCount = attendanceRes.data?.filter((a) => a.status === "late").length || 0;
      
      // Get late entries with employee details
      const lateEntriesData = attendanceRes.data?.filter((a) => a.status === "late") || [];
      setLateEntries(lateEntriesData);

      setStats({
        employees:
          usersRes.data?.filter((u) => u.role === "employee").length || 0,
        pendingLeaves: leaveRes.data?.length || 0,
        presentToday: todayPresentCount,
        departments: departmentRes.data?.length || 0,
        lateToday: todayLateCount,
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
      const response = await userApi.getAllUsers();
      const employees = response.data.filter(u => u.role === 'employee');
      setEmployeesList(employees);
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
      setAttendanceToday(response.data);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    }
  };

  const handleLateEntriesCardClick = () => {
    setShowLateModal(true);
  };

  const quickActions = [
    {
      label: "Approve Leaves",
      icon: <FaCalendarAlt />,
      path: "/leaves/requests",
      variant: "primary",
    },
    {
      label: "View Attendance",
      icon: <FaClock />,
      path: "/attendance/tracking",
      variant: "success",
    },
    {
      label: "Manage Employees",
      icon: <FaUsers />,
      path: "/users",
      variant: "info",
    },
    {
      label: "Manage Departments",
      icon: <FaBuilding />,
      path: "/departments",
      variant: "warning",
    },
  ];

  const handleApproveLeave = async (id) => {
    try {
      await leaveApi.approveLeave(id);
      toast.success("Leave approved successfully");
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to approve leave");
    }
  };

  return (
    <Container fluid className="py-3">
      <GreetingBanner subtitle="Manage your workforce efficiently" />

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <div onClick={handleEmployeesCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Total Employees"
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
        <Col lg={3} md={6}>
          <div onClick={handleLateEntriesCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Late Entries Today"
              value={stats.lateToday}
              icon={<FaClock />}
              bgColor="danger"
            />
          </div>
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

      {/* Leave Management - Most Actionable */}
      <Row className="mb-4">
        <Col>
          <LeaveManagement />
        </Col>
      </Row>

      {/* Attendance Overview - Daily Priority */}
      <Row className="mb-4">
        <Col>
          <AttendanceOverview />
        </Col>
      </Row>

      {/* Document Management - Critical HR Function */}
      <Row className="mb-4">
        <Col>
          <DocumentManagement />
        </Col>
      </Row>

      {/* Employee Directory */}
      <Row className="mb-4">
        <Col>
          <EmployeeDirectory />
        </Col>
      </Row>

      {/* Calendar View */}
      <Row className="mb-4">
        <Col>
          <CalendarView />
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

      {/* Employees Modal */}
      <Modal show={showEmployeesModal} onHide={() => setShowEmployeesModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaUsers className="me-2 text-primary" />All Employees ({employeesList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employeesList.map(emp => (
                <tr key={emp._id}>
                  <td><strong>{emp.name}</strong></td>
                  <td>{emp.email}</td>
                  <td>{emp.department?.name || 'N/A'}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/users/${emp._id}`)}>
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
                      <small>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</small>
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
                <tr key={att._id}>
                  <td><strong>{att.employee?.name || 'N/A'}</strong></td>
                  <td>{att.clockIn ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                  <td>{att.clockOut ? new Date(att.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}</td>
                  <td>
                    <Badge bg={att.status === 'present' ? 'success' : att.status === 'late' ? 'danger' : 'secondary'}>
                      {att.status}
                    </Badge>
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
          <Modal.Title><FaClock className="me-2 text-danger" />Late Entries Today ({lateEntries.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {lateEntries.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No late entries today</p>
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
                        <Badge bg="danger">Late</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default HRDashboard;
