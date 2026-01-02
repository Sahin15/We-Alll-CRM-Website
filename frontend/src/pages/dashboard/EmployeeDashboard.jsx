import { useState, useEffect } from "react";
import { Container, Row, Col, Modal, Table, Badge, Button } from "react-bootstrap";
import {
  FaClock,
  FaCalendarAlt,
  FaProjectDiagram,
  FaTasks,
  FaChartLine,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import { useAuth } from "../../context/AuthContext";
import { attendanceApi } from "../../api/attendanceApi";
import { leaveApi } from "../../api/leaveApi";
import { projectApi } from "../../api/projectApi";
import { leadApi } from "../../api/leadApi";
import toast from "../../utils/toast";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    attendance: 0,
    leaves: 0,
    projects: 0,
    leads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [leadsList, setLeadsList] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize stats with default values
      const newStats = {
        attendance: 0,
        leaves: 0,
        projects: 0,
        leads: 0,
      };

      // Fetch attendance data
      try {
        const attendanceRes = await attendanceApi.getMyAttendance();
        newStats.attendance = attendanceRes.data?.length || 0;
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }

      // Fetch leave data
      try {
        const leaveRes = await leaveApi.getMyLeaves();
        newStats.leaves = leaveRes.data?.filter((l) => l.status === "pending").length || 0;
      } catch (error) {
        console.error("Error fetching leaves:", error);
      }

      // Fetch project data
      try {
        const projectRes = await projectApi.getMyProjects();
        newStats.projects = projectRes.data?.length || 0;
      } catch (error) {
        console.error("Error fetching projects:", error);
      }

      // Fetch leads data
      try {
        const leadsRes = await leadApi.getAllLeads();
        newStats.leads = leadsRes.data?.length || 0;
      } catch (error) {
        console.error("Error fetching leads:", error);
        // Don't show error to user, just log it
      }

      setStats(newStats);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadsCardClick = async () => {
    try {
      const response = await leadApi.getAllLeads();
      setLeadsList(response.data || []);
      setShowLeadsModal(true);
    } catch (error) {
      console.error('Error loading leads:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view leads');
      } else if (error.response?.status === 401) {
        toast.error('Please log in again to view leads');
      } else {
        toast.error('Failed to load leads. Please try again.');
      }
    }
  };

  const quickActions = [
    {
      label: "Clock In/Out",
      icon: <FaClock />,
      path: "/attendance/my-attendance",
      variant: "primary",
    },
    {
      label: "Request Leave",
      icon: <FaCalendarAlt />,
      path: "/leaves/my-leaves",
      variant: "success",
    },
    {
      label: "View Projects",
      icon: <FaProjectDiagram />,
      path: "/projects",
      variant: "info",
    },
  ];

  const recentActivities = [
    {
      description: "Clocked in at 9:00 AM",
      date: new Date(),
      type: "success",
      status: "Present",
    },
    {
      description: "Leave request approved",
      date: new Date(Date.now() - 86400000),
      type: "success",
      status: "Approved",
    },
  ];

  return (
    <Container fluid>
      <div className="mb-4">
        <h2>Welcome back, {user?.name}!</h2>
        <p className="text-muted">
          Here's what's happening with your work today.
        </p>
      </div>

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <StatCard
            title="Total Attendance"
            value={stats.attendance}
            icon={<FaClock />}
            bgColor="primary"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Pending Leaves"
            value={stats.leaves}
            icon={<FaCalendarAlt />}
            bgColor="warning"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Active Projects"
            value={stats.projects}
            icon={<FaProjectDiagram />}
            bgColor="success"
          />
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

      <Row className="g-4">
        <Col lg={8}>
          <RecentActivity activities={recentActivities} />
        </Col>
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>

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

export default EmployeeDashboard;
