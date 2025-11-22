import { Container, Row, Col } from "react-bootstrap";
import {
  FaDollarSign,
  FaFileInvoice,
  FaChartPie,
  FaWallet,
} from "react-icons/fa";
import StatCard from "../../components/dashboard/StatCard";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";

const AccountsDashboard = () => {
  const quickActions = [
    {
      label: "Create Invoice",
      icon: <FaFileInvoice />,
      path: "/invoices",
      variant: "primary",
    },
    {
      label: "View Reports",
      icon: <FaChartPie />,
      path: "/reports",
      variant: "success",
    },
  ];

  return (
    <Container fluid className="py-4">
      <GreetingBanner subtitle="Financial overview and management" />

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <StatCard
            title="Total Revenue"
            value="$0"
            icon={<FaDollarSign />}
            bgColor="success"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Pending Invoices"
            value="0"
            icon={<FaFileInvoice />}
            bgColor="warning"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Expenses"
            value="$0"
            icon={<FaWallet />}
            bgColor="danger"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Net Profit"
            value="$0"
            icon={<FaChartPie />}
            bgColor="info"
          />
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>
    </Container>
  );
};

export default AccountsDashboard;
