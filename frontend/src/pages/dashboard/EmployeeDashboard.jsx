import { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import {
  FaClock,
  FaCalendarAlt,
  FaProjectDiagram,
  FaTasks,
} from "react-icons/fa";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import { useAuth } from "../../context/AuthContext";
import { attendanceApi } from "../../api/attendanceApi";
import { leaveApi } from "../../api/leaveApi";
import { projectApi } from "../../api/projectApi";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    attendance: 0,
    leaves: 0,
    projects: 0,
    tasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch attendance data
      const attendanceRes = await attendanceApi.getMyAttendance();
      // Fetch leave data
      const leaveRes = await leaveApi.getMyLeaves();
      // Fetch project data
      const projectRes = await projectApi.getMyProjects();

      setStats({
        attendance: attendanceRes.data?.length || 0,
        leaves:
          leaveRes.data?.filter((l) => l.status === "pending").length || 0,
        projects: projectRes.data?.length || 0,
        tasks: 0, // Will be implemented later
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
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
          <StatCard
            title="Pending Tasks"
            value={stats.tasks}
            icon={<FaTasks />}
            bgColor="info"
          />
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
    </Container>
  );
};

export default EmployeeDashboard;
