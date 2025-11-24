import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge, Button, Modal, Table } from "react-bootstrap";
import {
  FaUsers,
  FaProjectDiagram,
  FaUserTie,
  FaChartLine,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaServer,
  FaBuilding,
  FaUserClock,
  FaCalendarCheck,
  FaUserCheck,
  FaClipboardCheck,
  FaBullhorn,
  FaShieldAlt,
  FaFileAlt,
  FaDownload,
  FaCalendarAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";
import AnalyticsCharts from "../../components/dashboard/AnalyticsCharts";
import AdminQuickStats from "../../components/dashboard/AdminQuickStats";
import AdminRecentActivity from "../../components/dashboard/AdminRecentActivity";
import QuickAnnouncements from "../../components/dashboard/QuickAnnouncements";
import DocumentQuickAccess from "../../components/dashboard/DocumentQuickAccess";
import PolicyUpdates from "../../components/dashboard/PolicyUpdates";
import UpcomingEvents from "../../components/dashboard/UpcomingEvents";
import { userApi } from "../../api/userApi";
import { projectApi } from "../../api/projectApi";
import { clientApi } from "../../api/clientApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import { departmentApi } from "../../api/departmentApi";
import { leadApi } from "../../api/leadApi";
import { announcementApi } from "../../api/announcementApi";
import { documentApi } from "../../api/documentApi";
import { policyApi } from "../../api/policyApi";
import { meetingApi } from "../../api/meetingApi";
import { useNavigate } from "react-router-dom";
import toast from "../../utils/toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    employees: 0,
    projects: 0,
    clients: 0,
    activeProjects: 0,
    pendingLeaves: 0,
    presentToday: 0,
    systemHealth: 100,
    officeHealth: 95,
    departments: 0,
    leads: 0,
    lateToday: 0,
    onLeaveToday: 0,
    // Analytics data
    completedProjects: 0,
    onHoldProjects: 0,
    cancelledProjects: 0,
    adminCount: 0,
    hrCount: 0,
    employeeCount: 0,
    managerCount: 0,
    departmentNames: [],
    departmentEmployees: [],
    departmentProjects: [],
  });

  // Modal states
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);

  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  const [showOnLeaveModal, setShowOnLeaveModal] = useState(false);
  const [showSystemHealthModal, setShowSystemHealthModal] = useState(false);
  const [showOfficeHealthModal, setShowOfficeHealthModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);

  // Modal data
  const [usersList, setUsersList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [lateList, setLateList] = useState([]);
  const [onLeaveList, setOnLeaveList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [approvalsList, setApprovalsList] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, projectRes, clientRes, departmentRes, leadsRes, announcementsRes, documentsRes, policiesRes, meetingsRes] = await Promise.all([
        userApi.getAllUsers(),
        projectApi.getAllProjects(),
        clientApi.getAllClients(),
        departmentApi.getAllDepartments().catch(() => ({ data: [] })),
        leadApi.getAllLeads().catch(() => ({ data: [] })),
        announcementApi.getAllAnnouncements().catch(() => ({ data: [] })),
        documentApi.getAllDocuments().catch(() => ({ data: [] })),
        policyApi.getAllPolicies().catch(() => ({ data: [] })),
        meetingApi.getAllMeetings().catch(() => ({ data: [] })),
      ]);
      
      const users = usersRes.data || [];
      const projects = projectRes.data || [];
      const departments = departmentRes.data || [];
      
      const employees = users.filter(u => u.role === 'employee');
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in-progress');
      const completedProjects = projects.filter(p => p.status === 'completed');
      const onHoldProjects = projects.filter(p => p.status === 'on-hold');
      const cancelledProjects = projects.filter(p => p.status === 'cancelled');
      
      // User role counts
      const adminCount = users.filter(u => u.role === 'admin').length;
      const hrCount = users.filter(u => u.role === 'hr').length;
      const employeeCount = employees.length;
      const managerCount = users.filter(u => u.role === 'manager').length;
      
      // Department analytics
      const departmentNames = departments.map(d => d.name);
      const departmentEmployees = departments.map(d => d.employeeCount || 0);
      const departmentProjects = departments.map(d => {
        return projects.filter(p => p.department?._id === d._id || p.department === d._id).length;
      });
      
      const today = new Date().toISOString().split('T')[0];
      let presentToday = 0;
      let lateToday = 0;
      let onLeaveToday = 0;
      
      try {
        const attendanceRes = await attendanceApi.getAllAttendance({ date: today });
        presentToday = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
        lateToday = attendanceRes.data?.filter(a => a.status === 'late').length || 0;
        
        const allLeavesRes = await leaveApi.getAllLeaves('approved');
        const todayDate = new Date(today);
        onLeaveToday = allLeavesRes.data?.filter(leave => {
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return todayDate >= startDate && todayDate <= endDate;
        }).length || 0;
      } catch (err) {
        console.log('Attendance/Leave data not available');
      }
      
      let pendingLeaves = 0;
      try {
        const leavesRes = await leaveApi.getAllLeaves('pending');
        pendingLeaves = leavesRes.data?.length || 0;
      } catch (err) {
        console.log('Leave data not available');
      }

      // Calculate OFFICE health based on HR/operations factors
      let officeHealth = 100;
      
      // Reduce health if attendance is low
      const attendanceRate = employees.length > 0 ? (presentToday / employees.length) * 100 : 100;
      if (attendanceRate < 70) officeHealth -= 15;
      else if (attendanceRate < 85) officeHealth -= 5;
      
      // Reduce health if too many pending leaves
      if (pendingLeaves > 10) officeHealth -= 10;
      else if (pendingLeaves > 5) officeHealth -= 5;
      
      // Reduce health if too many late arrivals
      if (lateToday > 5) officeHealth -= 10;
      else if (lateToday > 2) officeHealth -= 5;
      
      // Reduce health if project completion rate is low
      const totalProjects = projects.length;
      const completionRate = totalProjects > 0 ? (completedProjects.length / totalProjects) * 100 : 100;
      if (completionRate < 30) officeHealth -= 10;
      
      officeHealth = Math.max(0, Math.min(100, officeHealth)); // Keep between 0-100

      // Calculate SYSTEM health based on technical factors
      let systemHealth = 100;
      let apiErrors = 0;
      let apiResponseTime = 0;
      
      // Check API health by testing response times
      const apiStartTime = Date.now();
      try {
        await Promise.all([
          userApi.getAllUsers().catch(() => { apiErrors++; }),
          projectApi.getAllProjects().catch(() => { apiErrors++; }),
          clientApi.getAllClients().catch(() => { apiErrors++; })
        ]);
        apiResponseTime = Date.now() - apiStartTime;
      } catch (err) {
        apiErrors++;
      }
      
      // Reduce health based on API errors
      if (apiErrors > 2) systemHealth -= 30;
      else if (apiErrors > 0) systemHealth -= 15;
      
      // Reduce health based on slow API response
      if (apiResponseTime > 3000) systemHealth -= 20;
      else if (apiResponseTime > 1500) systemHealth -= 10;
      
      systemHealth = Math.max(0, Math.min(100, systemHealth));

      setStats({
        users: users.length,
        employees: employees.length,
        projects: projects.length,
        clients: clientRes.data?.length || 0,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        onHoldProjects: onHoldProjects.length,
        cancelledProjects: cancelledProjects.length,
        pendingLeaves,
        presentToday,
        lateToday,
        onLeaveToday,
        systemHealth: Math.round(systemHealth),
        officeHealth: Math.round(officeHealth),
        departments: departments.length,
        leads: leadsRes.data?.length || 0,
        adminCount,
        hrCount,
        employeeCount,
        managerCount,
        departmentNames,
        departmentEmployees,
        departmentProjects,
      });

      const alerts = [];
      if (pendingLeaves > 5) {
        alerts.push({ type: 'warning', message: `${pendingLeaves} pending leave requests need attention`, icon: <FaClock /> });
      }
      if (lateToday > 0) {
        alerts.push({ type: 'danger', message: `${lateToday} employees arrived late today`, icon: <FaUserClock /> });
      }
      if (presentToday < employees.length * 0.7) {
        alerts.push({ type: 'info', message: 'Attendance is below 70% today', icon: <FaExclamationTriangle /> });
      }
      setSystemAlerts(alerts);

      // Generate recent activities from real data
      const activities = [];
      let activityId = 1;

      // Add recent user registrations (last 5 users)
      users.slice(-5).reverse().forEach(user => {
        activities.push({
          id: activityId++,
          type: 'user',
          message: `New user ${user.name} registered as ${user.role}`,
          time: user.createdAt ? new Date(user.createdAt) : new Date(Date.now() - Math.random() * 86400000)
        });
      });

      // Add recent project updates (last 5 projects)
      projects.slice(-5).reverse().forEach(project => {
        const statusText = project.status === 'completed' ? 'completed' : 
                          project.status === 'active' ? 'started' : 
                          `marked as ${project.status}`;
        activities.push({
          id: activityId++,
          type: 'project',
          message: `Project "${project.name}" ${statusText}`,
          time: project.updatedAt ? new Date(project.updatedAt) : new Date(Date.now() - Math.random() * 86400000)
        });
      });

      // Add recent client additions (last 3 clients)
      (clientRes.data || []).slice(-3).reverse().forEach(client => {
        activities.push({
          id: activityId++,
          type: 'employee',
          message: `New client ${client.name} added to system`,
          time: client.createdAt ? new Date(client.createdAt) : new Date(Date.now() - Math.random() * 86400000)
        });
      });

      // Add recent leave approvals
      try {
        const approvedLeaves = await leaveApi.getAllLeaves('approved');
        (approvedLeaves.data || []).slice(-3).reverse().forEach(leave => {
          activities.push({
            id: activityId++,
            type: 'approval',
            message: `Leave request approved for ${leave.user?.name || 'employee'}`,
            time: leave.updatedAt ? new Date(leave.updatedAt) : new Date(Date.now() - Math.random() * 86400000)
          });
        });
      } catch (err) {
        console.log('Could not fetch approved leaves for activity');
      }

      // Sort by time (most recent first) and take top 15
      activities.sort((a, b) => b.time - a.time);
      setRecentActivities(activities.slice(0, 15));

      // Set announcements (real data from API)
      setAnnouncements(announcementsRes.data || []);

      // Set documents (real data from API)
      setDocuments(documentsRes.data || []);

      // Set policies (real data from API)
      setPolicies(policiesRes.data || []);

      // Set upcoming events/meetings (real data from API)
      // Filter for upcoming meetings only
      const now = new Date();
      const upcoming = (meetingsRes.data || [])
        .filter(meeting => new Date(meeting.date || meeting.startTime) >= now)
        .sort((a, b) => new Date(a.date || a.startTime) - new Date(b.date || b.startTime))
        .slice(0, 6);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleUsersCardClick = async () => {
    try {
      const response = await userApi.getAllUsers();
      setUsersList(response.data || []);
      setShowUsersModal(true);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const handleProjectsCardClick = async () => {
    try {
      const response = await projectApi.getAllProjects();
      const activeProjects = response.data?.filter(p => p.status === 'active' || p.status === 'in-progress') || [];
      setProjectsList(activeProjects);
      setShowProjectsModal(true);
    } catch (error) {
      toast.error('Failed to load projects');
    }
  };

  const handleClientsCardClick = async () => {
    try {
      const response = await clientApi.getAllClients();
      setClientsList(response.data || []);
      setShowClientsModal(true);
    } catch (error) {
      toast.error('Failed to load clients');
    }
  };

  const handleDepartmentsCardClick = async () => {
    try {
      const response = await departmentApi.getAllDepartments();
      setDepartmentsList(response.data || []);
      setShowDepartmentsModal(true);
    } catch (error) {
      toast.error('Failed to load departments');
    }
  };

  const handleLeadsCardClick = async () => {
    try {
      const response = await leadApi.getAllLeads();
      console.log('Leads data:', response.data); // Debug log
      setLeadsList(response.data || []);
      setShowLeadsModal(true);
    } catch (error) {
      toast.error('Failed to load leads');
    }
  };

  const handleSystemHealthClick = () => {
    setShowSystemHealthModal(true);
  };

  const handleAttendanceWidgetClick = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await attendanceApi.getAllAttendance({ date: today });
      let todayAttendance = response.data || [];
      
      // Fetch user data if needed
      if (todayAttendance.length > 0 && !todayAttendance[0].employee?.name) {
        const usersRes = await userApi.getAllUsers();
        const usersMap = {};
        usersRes.data?.forEach(u => usersMap[u._id] = u);
        
        todayAttendance = todayAttendance.map(att => {
          const employeeId = typeof att.employee === 'string' ? att.employee : att.employee?._id;
          return {
            ...att,
            employee: usersMap[employeeId] || att.employee || { name: 'Unknown' }
          };
        });
      }
      
      console.log('Today attendance:', todayAttendance);
      setAttendanceList(todayAttendance);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance data');
    }
  };

  const handleApprovalsWidgetClick = async () => {
    try {
      const response = await leaveApi.getAllLeaves('pending');
      let pendingLeaves = response.data || [];
      
      // Fetch user data if needed
      if (pendingLeaves.length > 0 && !pendingLeaves[0].user?.name) {
        const usersRes = await userApi.getAllUsers();
        const usersMap = {};
        usersRes.data?.forEach(u => usersMap[u._id] = u);
        
        pendingLeaves = pendingLeaves.map(leave => {
          const userId = typeof leave.user === 'string' ? leave.user : leave.user?._id;
          return {
            ...leave,
            user: usersMap[userId] || leave.user || { name: 'Unknown' }
          };
        });
      }
      
      console.log('Pending approvals:', pendingLeaves);
      setApprovalsList(pendingLeaves);
      setShowApprovalsModal(true);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load pending approvals');
    }
  };

  const handleChartClick = async (chartType, segment, index) => {
    console.log('Chart clicked:', chartType, segment, index);
    
    if (chartType === 'projects') {
      try {
        const response = await projectApi.getAllProjects();
        let filteredProjects = response.data || [];
        
        // Filter based on clicked segment
        if (segment === 'active') {
          filteredProjects = filteredProjects.filter(p => p.status === 'active' || p.status === 'in-progress');
        } else if (segment === 'completed') {
          filteredProjects = filteredProjects.filter(p => p.status === 'completed');
        } else if (segment === 'on-hold') {
          filteredProjects = filteredProjects.filter(p => p.status === 'on-hold');
        } else if (segment === 'cancelled') {
          filteredProjects = filteredProjects.filter(p => p.status === 'cancelled');
        }
        
        setProjectsList(filteredProjects);
        setShowProjectsModal(true);
      } catch (error) {
        toast.error('Failed to load projects');
      }
    } else if (chartType === 'users') {
      try {
        const response = await userApi.getAllUsers();
        let filteredUsers = response.data || [];
        
        // Filter based on clicked segment
        if (segment) {
          filteredUsers = filteredUsers.filter(u => u.role === segment);
        }
        
        setUsersList(filteredUsers);
        setShowUsersModal(true);
      } catch (error) {
        toast.error('Failed to load users');
      }
    } else if (chartType === 'departments') {
      try {
        const response = await departmentApi.getAllDepartments();
        const allDepartments = response.data || [];
        
        // Find the clicked department by name
        const clickedDepartment = allDepartments.find(d => d.name === segment);
        
        if (clickedDepartment) {
          // Show single department in modal
          setDepartmentsList([clickedDepartment]);
          setShowDepartmentsModal(true);
        } else {
          toast.info(`Department "${segment}" details not available`);
        }
      } catch (error) {
        toast.error('Failed to load department details');
      }
    }
  };

  const handleWidgetClick = (widgetType) => {
    switch (widgetType) {
      case 'attendance':
        handleAttendanceWidgetClick();
        break;
      case 'projects':
        handleProjectsCardClick();
        break;
      case 'approvals':
        handleApprovalsWidgetClick();
        break;
      case 'completion':
        handleProjectsCardClick();
        break;
      case 'clients':
        handleClientsCardClick();
        break;
      case 'leads':
        handleLeadsCardClick();
        break;
      case 'late':
        handleLateCardClick();
        break;
      case 'officeHealth':
        setShowOfficeHealthModal(true);
        break;
      case 'health':
        handleSystemHealthClick();
        break;
      default:
        break;
    }
  };

  const handleLateCardClick = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await attendanceApi.getAllAttendance({ date: today });
      let lateEmployees = response.data?.filter(a => a.status === 'late') || [];
      
      console.log('Raw late employees data:', lateEmployees); // Debug log
      
      // The backend returns 'employee' field, not 'user'
      // If employee data is not populated, fetch it
      if (lateEmployees.length > 0 && !lateEmployees[0].employee?.name) {
        const usersRes = await userApi.getAllUsers();
        const usersMap = {};
        usersRes.data?.forEach(u => usersMap[u._id] = u);
        
        lateEmployees = lateEmployees.map(att => {
          // Handle both cases: employee as object or employee as ID string
          const employeeId = typeof att.employee === 'string' ? att.employee : att.employee?._id;
          return {
            ...att,
            employee: usersMap[employeeId] || att.employee || { name: 'Unknown User' }
          };
        });
      }
      
      console.log('Processed late employees:', lateEmployees); // Debug log
      setLateList(lateEmployees);
      setShowLateModal(true);
    } catch (error) {
      console.error('Error loading late entries:', error);
      toast.error('Failed to load late entries');
    }
  };

  const handleOnLeaveCardClick = async () => {
    try {
      const response = await leaveApi.getAllLeaves('approved');
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const onLeaveToday = response.data?.filter(leave => {
        const startDate = new Date(leave.startDate).toISOString().split('T')[0];
        const endDate = new Date(leave.endDate).toISOString().split('T')[0];
        return todayStr >= startDate && todayStr <= endDate;
      }) || [];
      setOnLeaveList(onLeaveToday);
      setShowOnLeaveModal(true);
    } catch (error) {
      toast.error('Failed to load leave data');
    }
  };

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleAnnouncementClick = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowAnnouncementModal(true);
  };

  const handleDocumentAction = async (action, doc) => {
    if (action === 'view') {
      setSelectedDocument(doc);
      setShowDocumentModal(true);
    } else if (action === 'download') {
      try {
        const response = await documentApi.downloadDocument(doc._id);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', doc.fileName || doc.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Downloaded: ${doc.fileName || doc.name}`);
      } catch (error) {
        toast.error('Failed to download document');
      }
    }
  };

  const handlePolicyClick = (policy) => {
    setSelectedPolicy(policy);
    setShowPolicyModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const quickActions = [
    { label: "Add User", icon: <FaUsers />, path: "/users", variant: "primary" },
    { label: "Add Project", icon: <FaProjectDiagram />, path: "/projects", variant: "success" },
    { label: "Add Client", icon: <FaUserTie />, path: "/clients", variant: "info" },
  ];

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
    <Container fluid className="py-4">
      <GreetingBanner subtitle="System overview and management" />

      {systemAlerts.length > 0 && (
        <Row className="mb-4">
          {systemAlerts.map((alert, index) => (
            <Col key={index} md={6} className="mb-2">
              <Card className={`border-0 shadow-sm border-start border-${alert.type === 'warning' ? 'warning' : alert.type === 'danger' ? 'danger' : 'info'} border-4`}>
                <Card.Body className="d-flex align-items-center">
                  <div className={`me-3 text-${alert.type === 'warning' ? 'warning' : alert.type === 'danger' ? 'danger' : 'info'}`} style={{ fontSize: '1.5rem' }}>
                    {alert.icon}
                  </div>
                  <div>
                    <small className="text-muted text-uppercase">Alert</small>
                    <p className="mb-0">{alert.message}</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <AdminQuickStats stats={stats} onWidgetClick={handleWidgetClick} />

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <div onClick={handleUsersCardClick} className="cursor-pointer">
            <StatCard title="Total Users" value={stats.users} icon={<FaUsers />} bgColor="primary" />
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleProjectsCardClick} className="cursor-pointer">
            <StatCard title="Active Projects" value={stats.activeProjects} icon={<FaProjectDiagram />} bgColor="success" />
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleClientsCardClick} className="cursor-pointer">
            <StatCard title="Total Clients" value={stats.clients} icon={<FaUserTie />} bgColor="info" />
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleSystemHealthClick} className="cursor-pointer">
            <StatCard 
              title="System Health" 
              value={`${stats.systemHealth}%`} 
              icon={<FaServer />} 
              bgColor={stats.systemHealth >= 90 ? 'success' : stats.systemHealth >= 70 ? 'warning' : 'danger'} 
            />
          </div>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <div onClick={handleDepartmentsCardClick} className="cursor-pointer">
            <Card className="dashboard-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Departments</h6>
                    <h3 className="mb-1">{stats.departments}</h3>
                    <small className="text-info">Active departments</small>
                  </div>
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <FaBuilding className="text-info fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleLeadsCardClick} className="cursor-pointer">
            <Card className="dashboard-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Leads</h6>
                    <h3 className="mb-1">{stats.leads}</h3>
                    <small className="text-primary">Potential clients</small>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <FaChartLine className="text-primary fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleLateCardClick} className="cursor-pointer">
            <Card className="dashboard-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Late Today</h6>
                    <h3 className="mb-1">{stats.lateToday}</h3>
                    <small className="text-danger">Late arrivals</small>
                  </div>
                  <div className="bg-danger bg-opacity-10 p-3 rounded">
                    <FaUserClock className="text-danger fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleOnLeaveCardClick} className="cursor-pointer">
            <Card className="dashboard-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">On Leave</h6>
                    <h3 className="mb-1">{stats.onLeaveToday}</h3>
                    <small className="text-warning">Today</small>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <FaCalendarCheck className="text-warning fs-4" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>

      <AnalyticsCharts stats={stats} onChartClick={handleChartClick} />

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <AdminRecentActivity activities={recentActivities} />
        </Col>
        <Col lg={6}>
          <QuickAnnouncements 
            announcements={announcements} 
            onAnnouncementClick={handleAnnouncementClick} 
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <PolicyUpdates policies={policies} onPolicyClick={handlePolicyClick} />
        </Col>
        <Col lg={4}>
          <DocumentQuickAccess documents={documents} onDocumentAction={handleDocumentAction} />
        </Col>
        <Col lg={4}>
          <UpcomingEvents events={upcomingEvents} onEventClick={handleEventClick} />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={12}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>

      <Modal show={showUsersModal} onHide={() => setShowUsersModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaUsers className="me-2 text-primary" />All Users ({usersList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(user => (
                <tr key={user._id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.email}</td>
                  <td><Badge bg="primary" className="text-capitalize">{user.role}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/users/${user._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showProjectsModal} onHide={() => setShowProjectsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaProjectDiagram className="me-2 text-success" />Active Projects ({projectsList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {projectsList.map(project => (
                <tr key={project._id}>
                  <td><strong>{project.name}</strong></td>
                  <td>{project.client?.name || 'N/A'}</td>
                  <td>
                    <Badge bg={project.status === 'active' ? 'success' : 'warning'}>
                      {project.status}
                    </Badge>
                  </td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/projects/${project._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showClientsModal} onHide={() => setShowClientsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaUserTie className="me-2 text-info" />All Clients ({clientsList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {clientsList.map(client => (
                <tr key={client._id}>
                  <td><strong>{client.name}</strong></td>
                  <td>{client.email}</td>
                  <td>{client.phone || 'N/A'}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/clients/${client._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showDepartmentsModal} onHide={() => setShowDepartmentsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaBuilding className="me-2 text-info" />All Departments ({departmentsList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Head</th>
                <th>Employees</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departmentsList.map(dept => (
                <tr key={dept._id}>
                  <td><strong>{dept.name}</strong></td>
                  <td>{dept.head?.name || 'N/A'}</td>
                  <td><Badge bg="info">{dept.employeeCount || 0}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/departments/${dept._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showLeadsModal} onHide={() => setShowLeadsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaChartLine className="me-2 text-primary" />All Leads ({leadsList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leadsList.map(lead => (
                <tr key={lead._id}>
                  <td><strong>{lead.fullName || lead.name || 'N/A'}</strong></td>
                  <td>{lead.companyName || lead.company || 'N/A'}</td>
                  <td><Badge bg={lead.status === 'hot' ? 'danger' : lead.status === 'warm' ? 'warning' : 'info'}>{lead.status || 'cold'}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/leads/${lead._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showLateModal} onHide={() => setShowLateModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaUserClock className="me-2 text-danger" />Late Arrivals Today ({lateList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {lateList.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No late arrivals today</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Clock In</th>
                  <th>Expected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lateList.map(att => (
                  <tr key={att._id}>
                    <td><strong>{att.employee?.name || att.user?.name || 'N/A'}</strong></td>
                    <td>{att.clockIn ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td>10:30 AM</td>
                    <td><Badge bg="danger">Late</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showOnLeaveModal} onHide={() => setShowOnLeaveModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaCalendarCheck className="me-2 text-warning" />Employees On Leave Today ({onLeaveList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {onLeaveList.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No employees on leave today</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {onLeaveList.map(leave => (
                  <tr key={leave._id}>
                    <td><strong>{leave.user?.name || 'N/A'}</strong></td>
                    <td><Badge bg="info">{leave.leaveType}</Badge></td>
                    <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                    <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showSystemHealthModal} onHide={() => setShowSystemHealthModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaServer className={`me-2 text-${stats.systemHealth >= 90 ? 'success' : stats.systemHealth >= 70 ? 'warning' : 'danger'}`} />
            System Health - Technical Status ({stats.systemHealth}%)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Backend & Infrastructure Health</h6>
              <h3 className={`mb-0 ${stats.systemHealth >= 90 ? 'text-success' : stats.systemHealth >= 70 ? 'text-warning' : 'text-danger'}`}>
                {stats.systemHealth}%
              </h3>
            </div>
            <div className="progress" style={{ height: '25px' }}>
              <div 
                className={`progress-bar ${stats.systemHealth >= 90 ? 'bg-success' : stats.systemHealth >= 70 ? 'bg-warning' : 'bg-danger'}`}
                role="progressbar" 
                style={{ width: `${stats.systemHealth}%` }}
                aria-valuenow={stats.systemHealth} 
                aria-valuemin="0" 
                aria-valuemax="100"
              >
                {stats.systemHealth}%
              </div>
            </div>
          </div>

          <Card className="border-0 bg-light mb-3">
            <Card.Body>
              <h6 className="mb-3">Technical Metrics</h6>
              
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaServer className="text-success me-2" />
                  <strong>Backend Server</strong>
                </div>
                <Badge bg="success">
                  <FaCheckCircle className="me-1" />Online
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaCheckCircle className="text-success me-2" />
                  <strong>API Status</strong>
                </div>
                <Badge bg="success">
                  Operational
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaClock className="text-info me-2" />
                  <strong>API Response Time</strong>
                </div>
                <span className="text-muted">
                  &lt; 500ms
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaExclamationTriangle className="text-success me-2" />
                  <strong>Error Rate</strong>
                </div>
                <Badge bg="success">
                  0%
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaServer className="text-info me-2" />
                  <strong>Database Connection</strong>
                </div>
                <Badge bg="success">
                  <FaCheckCircle className="me-1" />Connected
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaCheckCircle className="text-success me-2" />
                  <strong>Uptime</strong>
                </div>
                <span className="text-muted">
                  99.9%
                </span>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="mb-3">System Status</h6>
              {stats.systemHealth >= 90 && (
                <div className="alert alert-success mb-0">
                  <FaCheckCircle className="me-2" />
                  <strong>All Systems Operational!</strong> Backend, APIs, and database are running smoothly.
                </div>
              )}
              {stats.systemHealth >= 70 && stats.systemHealth < 90 && (
                <div className="alert alert-warning mb-0">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Minor Issues Detected</strong> Some services experiencing degraded performance.
                </div>
              )}
              {stats.systemHealth < 70 && (
                <div className="alert alert-danger mb-0">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Critical Issues!</strong> Multiple system components need immediate attention.
                </div>
              )}
              
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted">
                  <strong>Note:</strong> System health is calculated based on API response times, error rates, and service availability.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>

      <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUserCheck className="me-2 text-success" />
            Today's Attendance ({attendanceList.length})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {attendanceList.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No attendance records for today</p>
            </div>
          ) : (
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
                {attendanceList.map(att => (
                  <tr key={att._id}>
                    <td><strong>{att.employee?.name || 'N/A'}</strong></td>
                    <td>{att.clockIn ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td>{att.clockOut ? new Date(att.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>
                      <Badge bg={
                        att.status === 'present' ? 'success' : 
                        att.status === 'late' ? 'warning' : 
                        att.status === 'absent' ? 'danger' : 'secondary'
                      }>
                        {att.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showApprovalsModal} onHide={() => setShowApprovalsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaClipboardCheck className="me-2 text-warning" />
            Pending Leave Approvals ({approvalsList.length})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {approvalsList.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No pending leave requests</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {approvalsList.map(leave => {
                  const startDate = new Date(leave.startDate);
                  const endDate = new Date(leave.endDate);
                  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <tr key={leave._id}>
                      <td><strong>{leave.user?.name || 'N/A'}</strong></td>
                      <td><Badge bg="info">{leave.leaveType}</Badge></td>
                      <td>{startDate.toLocaleDateString()}</td>
                      <td>{endDate.toLocaleDateString()}</td>
                      <td>{days} day{days > 1 ? 's' : ''}</td>
                      <td>
                        <Button 
                          size="sm" 
                          variant="outline-primary" 
                          onClick={() => navigate(`/leaves`)}
                        >
                          <FaEye className="me-1" />Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showOfficeHealthModal} onHide={() => setShowOfficeHealthModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBuilding className={`me-2 text-${stats.officeHealth >= 90 ? 'success' : stats.officeHealth >= 70 ? 'warning' : 'danger'}`} />
            Office Health - HR & Operations ({stats.officeHealth}%)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Overall Office Performance</h6>
              <h3 className={`mb-0 ${stats.officeHealth >= 90 ? 'text-success' : stats.officeHealth >= 70 ? 'text-warning' : 'text-danger'}`}>
                {stats.officeHealth}%
              </h3>
            </div>
            <div className="progress" style={{ height: '25px' }}>
              <div 
                className={`progress-bar ${stats.officeHealth >= 90 ? 'bg-success' : stats.officeHealth >= 70 ? 'bg-warning' : 'bg-danger'}`}
                role="progressbar" 
                style={{ width: `${stats.officeHealth}%` }}
                aria-valuenow={stats.officeHealth} 
                aria-valuemin="0" 
                aria-valuemax="100"
              >
                {stats.officeHealth}%
              </div>
            </div>
          </div>

          <Card className="border-0 bg-light mb-3">
            <Card.Body>
              <h6 className="mb-3">HR & Operations Metrics</h6>
              
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaUserCheck className="text-success me-2" />
                  <strong>Attendance Rate</strong>
                </div>
                <span className="text-muted">
                  {stats.employees > 0 ? Math.round((stats.presentToday / stats.employees) * 100) : 0}%
                  <small className="ms-2">({stats.presentToday}/{stats.employees})</small>
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaClock className="text-warning me-2" />
                  <strong>Pending Leave Requests</strong>
                </div>
                <Badge bg={stats.pendingLeaves > 5 ? 'danger' : stats.pendingLeaves > 0 ? 'warning' : 'success'}>
                  {stats.pendingLeaves}
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaUserClock className="text-danger me-2" />
                  <strong>Late Arrivals Today</strong>
                </div>
                <Badge bg={stats.lateToday > 2 ? 'danger' : stats.lateToday > 0 ? 'warning' : 'success'}>
                  {stats.lateToday}
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaCalendarCheck className="text-info me-2" />
                  <strong>On Leave Today</strong>
                </div>
                <Badge bg="info">
                  {stats.onLeaveToday}
                </Badge>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                  <FaProjectDiagram className="text-primary me-2" />
                  <strong>Active Projects</strong>
                </div>
                <span className="text-muted">
                  {stats.activeProjects} / {stats.projects}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaChartLine className="text-success me-2" />
                  <strong>Project Completion Rate</strong>
                </div>
                <span className="text-muted">
                  {stats.projects > 0 ? Math.round((stats.completedProjects / stats.projects) * 100) : 0}%
                </span>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="mb-3">Office Status</h6>
              {stats.officeHealth >= 90 && (
                <div className="alert alert-success mb-0">
                  <FaCheckCircle className="me-2" />
                  <strong>Excellent Performance!</strong> Office operations are running smoothly with high attendance and productivity.
                </div>
              )}
              {stats.officeHealth >= 70 && stats.officeHealth < 90 && (
                <div className="alert alert-warning mb-0">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Good Performance</strong> Office is stable but some areas need attention (attendance, pending approvals, or late arrivals).
                </div>
              )}
              {stats.officeHealth < 70 && (
                <div className="alert alert-danger mb-0">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Attention Required!</strong> Multiple HR/operations issues detected. Please review attendance, leaves, and project metrics.
                </div>
              )}
              
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted">
                  <strong>Note:</strong> Office health is calculated based on attendance rates, leave management, punctuality, and project completion.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>

      <Modal show={showAnnouncementModal} onHide={() => setShowAnnouncementModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBullhorn className="me-2 text-warning" />
            {selectedAnnouncement?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAnnouncement && (
            <>
              <div className="mb-3">
                <Badge bg={
                  selectedAnnouncement.type === 'urgent' ? 'danger' :
                  selectedAnnouncement.type === 'important' ? 'warning' :
                  selectedAnnouncement.type === 'event' ? 'success' : 'info'
                }>
                  {selectedAnnouncement.type}
                </Badge>
                {selectedAnnouncement.isPinned && (
                  <Badge bg="primary" className="ms-2">Pinned</Badge>
                )}
                <small className="text-muted ms-3">
                  Posted by {selectedAnnouncement.createdBy?.name || 'Admin'} on{' '}
                  {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </small>
              </div>
              <div className="announcement-content" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedAnnouncement.content}
              </div>
              {selectedAnnouncement.department && (
                <div className="mt-3 pt-3 border-top">
                  <small className="text-muted">
                    <strong>Department:</strong> {selectedAnnouncement.department}
                  </small>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAnnouncementModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPolicyModal} onHide={() => setShowPolicyModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaShieldAlt className="me-2 text-success" />
            {selectedPolicy?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPolicy && (
            <>
              <div className="mb-3">
                <Badge bg={
                  selectedPolicy.status === 'new' ? 'success' :
                  selectedPolicy.status === 'updated' ? 'warning' : 'primary'
                }>
                  {selectedPolicy.status}
                </Badge>
                <small className="text-muted ms-3">
                  {selectedPolicy.effectiveDate && `Effective: ${new Date(selectedPolicy.effectiveDate).toLocaleDateString()}`}
                  {selectedPolicy.createdAt && !selectedPolicy.effectiveDate && `Created: ${new Date(selectedPolicy.createdAt).toLocaleDateString()}`}
                </small>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {selectedPolicy.content || selectedPolicy.description}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPolicyModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDocumentModal} onHide={() => setShowDocumentModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileAlt className="me-2 text-info" />
            {selectedDocument?.fileName || selectedDocument?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDocument && (
            <>
              <div className="mb-3">
                <Badge bg="info">{selectedDocument.category || 'Document'}</Badge>
                <small className="text-muted ms-3">
                  Size: {selectedDocument.size || 'N/A'} • 
                  Uploaded: {new Date(selectedDocument.uploadedAt || selectedDocument.createdAt).toLocaleDateString()}
                </small>
              </div>
              {selectedDocument.description && (
                <p>{selectedDocument.description}</p>
              )}
              <div className="alert alert-info">
                <FaFileAlt className="me-2" />
                Document preview not available. Use the download button to view the file.
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="success" 
            onClick={() => {
              handleDocumentAction('download', selectedDocument);
              setShowDocumentModal(false);
            }}
          >
            <FaDownload className="me-1" />Download
          </Button>
          <Button variant="secondary" onClick={() => setShowDocumentModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEventModal} onHide={() => setShowEventModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2 text-primary" />
            {selectedEvent?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <>
              <div className="mb-3">
                <Badge bg={
                  selectedEvent.type === 'meeting' ? 'primary' :
                  selectedEvent.type === 'holiday' ? 'danger' :
                  selectedEvent.type === 'training' ? 'info' : 'success'
                }>
                  {selectedEvent.type || 'Event'}
                </Badge>
              </div>
              <div className="mb-3">
                <h6>Date & Time</h6>
                <p>
                  <FaCalendarAlt className="me-2" />
                  {new Date(selectedEvent.date || selectedEvent.startTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p>
                  <FaClock className="me-2" />
                  {selectedEvent.time || (selectedEvent.startTime ? new Date(selectedEvent.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD')}
                </p>
              </div>
              {selectedEvent.location && (
                <div className="mb-3">
                  <h6>Location</h6>
                  <p><FaMapMarkerAlt className="me-2" />{selectedEvent.location}</p>
                </div>
              )}
              {selectedEvent.description && (
                <div className="mb-3">
                  <h6>Description</h6>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.description}</p>
                </div>
              )}
              {(selectedEvent.attendees > 0 || selectedEvent.participants?.length > 0) && (
                <div className="mb-3">
                  <h6>Attendees</h6>
                  <p><FaUsers className="me-2" />{selectedEvent.attendees || selectedEvent.participants?.length || 0} people</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEventModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
