import { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import {
  FaUsers,
  FaProjectDiagram,
  FaUserTie,
  FaChartLine,
} from "react-icons/fa";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import { userApi } from "../../api/userApi";
import { projectApi } from "../../api/projectApi";
import { clientApi } from "../../api/clientApi";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    clients: 0,
    revenue: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const usersRes = await userApi.getAllUsers();
      const projectRes = await projectApi.getAllProjects();
      const clientRes = await clientApi.getAllClients();

      setStats({
        users: usersRes.data?.length || 0,
        projects: projectRes.data?.length || 0,
        clients: clientRes.data?.length || 0,
        revenue: 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const quickActions = [
    {
      label: "Add User",
      icon: <FaUsers />,
      path: "/users",
      variant: "primary",
    },
    {
      label: "Add Project",
      icon: <FaProjectDiagram />,
      path: "/projects",
      variant: "success",
    },
    {
      label: "Add Client",
      icon: <FaUserTie />,
      path: "/clients",
      variant: "info",
    },
  ];

  return (
    <Container fluid>
      <div className="mb-4">
        <h2>Admin Dashboard</h2>
        <p className="text-muted">Overview of system performance</p>
      </div>

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <StatCard
            title="Total Users"
            value={stats.users}
            icon={<FaUsers />}
            bgColor="primary"
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
            title="Total Clients"
            value={stats.clients}
            icon={<FaUserTie />}
            bgColor="info"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Revenue"
            value={`$${stats.revenue.toLocaleString()}`}
            icon={<FaChartLine />}
            bgColor="warning"
          />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <RecentActivity activities={[]} />
        </Col>
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
