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
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import { departmentApi } from "../../api/departmentApi";
import { leadApi } from "../../api/leadApi";
import { getPendingOvertimeEntries } from "../../api/overtimeApi";
import { getPendingWFHRequests } from "../../api/wfhApi";
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
    leads: 0,
    lateToday: 0,
    pendingOvertime: 0,
    pendingWFH: 0,
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
      
      // Fetch users data
      const usersRes = await userApi.getAllUsers();
      // Fetch leave data
      const leaveRes = await leaveApi.getAllLeaves({ status: "pending" });
      // Fetch today's attendance data only
      const attendanceRes = await attendanceApi.getAllAttendance({ date: today });
      // Fetch department data
      const departmentRes = await departmentApi.getAllDepartments();
      // Fetch leads data (only for roles with access: admin, superadmin, manager, or Sales department)
      let leadsRes = { data: [] };
      if (['admin', 'superadmin', 'manager'].includes(user?.role) || user?.department === 'Sales') {
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

      setStats({
        // Include both employees AND HoDs in employee count (HoDs are also employees)
        employees:
          usersRes.data?.filter((u) => u.role === "employee" || u.role === "hod" || u.role === "hr").length || 0,
        pendingLeaves: leaveRes.data?.length || 0,
        presentToday: todayPresentCount,
        departments: departmentRes.data?.length || 0,
        leads: leadsRes.data?.length || 0,
        lateToday: todayLateCount,
        pendingOvertime: pendingOvertimeCount,
        pendingWFH: pendingWFHCount,
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
      // Include both employees AND HoDs
      const employees = response.data.filter(u => u.role === 'employee' || u.role === 'hod');
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
          <div onClick={handleLeadsCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Total Leads"
              value={stats.leads}
              icon={<FaChartLine />}
              bgColor="info"
            />
          </div>
        </Col>
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
                <tr key={att._id} className={att.isWFH ? 'table-info' : ''}>
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
                  <td>{att.clockIn ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                  <td>{att.clockOut ? new Date(att.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg={att.status === 'present' ? 'success' : att.status === 'late' ? 'danger' : 'secondary'}>
                        {att.status}
                      </Badge>
                      {att.isWFH && (
                        <Badge bg="info">WFH</Badge>
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

      {/* Leads Modal */}
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
    </Container>
  );
};

export default HRDashboard;
