import { Container, Row, Col } from "react-bootstrap";
import { FaProjectDiagram, FaFileAlt, FaComments } from "react-icons/fa";
import StatCard from "../../components/dashboard/StatCard";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";

const ClientDashboard = () => {
  const quickActions = [
    {
      label: "View Projects",
      icon: <FaProjectDiagram />,
      path: "/projects",
      variant: "primary",
    },
    {
      label: "View Invoices",
      icon: <FaFileAlt />,
      path: "/invoices",
      variant: "success",
    },
    {
      label: "Contact Support",
      icon: <FaComments />,
      path: "/support",
      variant: "info",
    },
  ];

  return (
    <Container fluid className="py-2">
      <GreetingBanner subtitle="Track your projects and communications" />

      <div className="stat-grid mb-4">
        <StatCard
          title="Active Projects"
          value="0"
          icon={<FaProjectDiagram />}
          bgColor="primary"
        />
        <StatCard
          title="Pending Invoices"
          value="0"
          icon={<FaFileAlt />}
          bgColor="warning"
        />
        <StatCard
          title="Support Tickets"
          value="0"
          icon={<FaComments />}
          bgColor="info"
        />
      </div>

      <Row>
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>
    </Container>
  );
};

export default ClientDashboard;
