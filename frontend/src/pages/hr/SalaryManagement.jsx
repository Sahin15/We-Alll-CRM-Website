import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Spinner,
  Button,
} from "react-bootstrap";
import {
  FaFileInvoiceDollar,
  FaUsers,
  FaChartLine,
  FaEye,
  FaCogs,
} from "react-icons/fa";
// import SalaryStructureList from "../../components/salary/SalaryStructureList";
import SalaryStructures from "../../components/salary/SalaryStructures";
import SalarySlipList from "../../components/salary/SalarySlipList";
import GenerateSalarySlips from "../../components/salary/GenerateSalarySlips";
import PayrollSummary from "../../components/salary/PayrollSummary";
import HRSalaryPreviewManagement from "../../components/salary/HRSalaryPreviewManagement";
import TemplateManagement from "../../components/salary/TemplateManagement";
import { salarySlipApi } from "../../api/salaryApi";
import api from "../../services/api";
import PageHeader from "../../components/shared/PageHeader";
import MobileTabBar from "../../components/shared/MobileTabBar";

const SALARY_TABS = [
  { key: "slips", label: "Salary Slips" },
  { key: "generate", label: "Generate" },
  { key: "structures", label: "Structures" },
  { key: "previews", label: "Previews" },
  { key: "templates", label: "Templates" },
  { key: "reports", label: "Reports" },
];

const SalaryManagement = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("slips");
  const [stats, setStats] = useState({
    totalEmployees: 0,
    slipsGenerated: 0,
    totalPayout: 0,
    totalSlips: 0,
    totalStructures: 0,
    totalTemplates: 0,
  });
  const [loading, setLoading] = useState(true);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle URL parameters for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Fetch dashboard stats
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Use previous month — current month's slips are typically not generated yet
      const now = new Date();
      const prevMonthNum = now.getMonth(); // 0-indexed = previous month as 1-indexed
      const currentMonth = prevMonthNum === 0 ? 12 : prevMonthNum;
      const currentYear = prevMonthNum === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const [payrollResponse, employeesResponse, overallResponse] = await Promise.all([
        salarySlipApi.getPayrollSummary({ month: currentMonth, year: currentYear }),
        api.get('/users/employees'),
        salarySlipApi.getOverallStats(),
      ]);

      const totalEmployees = employeesResponse.data?.length || 0;
      const payrollData = payrollResponse.data;
      const overall = overallResponse.data;
      
      setStats({
        totalEmployees,
        slipsGenerated: payrollData?.totalEmployees || 0,
        totalPayout: payrollData?.totalNetSalary || 0,
        totalSlips: overall?.totalSlips || 0,
        totalStructures: overall?.totalStructures || 0,
        totalTemplates: overall?.totalTemplates || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setStats({
        totalEmployees: 0,
        slipsGenerated: 0,
        totalPayout: 0,
        totalSlips: 0,
        totalStructures: 0,
        totalTemplates: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "slips":
        return <SalarySlipList />;
      case "generate":
        return <GenerateSalarySlips />;
      case "structures":
        return <SalaryStructures />;
      case "previews":
        return <HRSalaryPreviewManagement />;
      case "templates":
        return <TemplateManagement />;
      case "reports":
        return <PayrollSummary />;
      default:
        return null;
    }
  };

  return (
    <Container fluid className="mt-4">
      <PageHeader
        title="Salary Management"
        subtitle="Manage salary structures, previews, and generate salary slips with comprehensive payroll analytics"
        actions={
          <>
            <Button
              variant="outline-primary"
              href="/salary-preview-management"
              className="salary-action-btn touch-target d-flex align-items-center"
            >
              <FaEye className="me-2" />
              Preview Management
            </Button>
            <Button
              variant="outline-primary"
              href="/salary-templates"
              className="salary-action-btn touch-target d-flex align-items-center"
            >
              <FaCogs className="me-2" />
              Templates
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div
                className="rounded-circle bg-primary bg-opacity-10 p-3 me-3 flex-shrink-0"
                style={{ width: "60px", height: "60px" }}
              >
                <FaUsers className="text-primary" size={30} />
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1 text-muted">Total Employees</h6>
                <h3 className="mb-1">
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    stats.totalEmployees
                  )}
                </h3>
                <small className="text-muted">Active workforce</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div
                className="rounded-circle bg-success bg-opacity-10 p-3 me-3 flex-shrink-0"
                style={{ width: "60px", height: "60px" }}
              >
                <FaFileInvoiceDollar className="text-success" size={30} />
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1 text-muted">Slips Generated</h6>
                <h3 className="mb-1">
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    stats.slipsGenerated
                  )}
                </h3>
                <small className="text-muted">Last month</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div
                className="rounded-circle bg-warning bg-opacity-10 p-3 me-3 flex-shrink-0"
                style={{ width: "60px", height: "60px" }}
              >
                <FaChartLine className="text-warning" size={30} />
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1 text-muted">Total Payout</h6>
                <h3 className="mb-1">
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    formatCurrency(stats.totalPayout)
                  )}
                </h3>
                <small className="text-muted">Last month</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Counts row */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm h-100 border-start border-4 border-info">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-1 text-muted">Total Salary Slips</h6>
                <h3 className="mb-0">
                  {loading ? <Spinner animation="border" size="sm" /> : stats.totalSlips}
                </h3>
                <small className="text-muted">All time</small>
              </div>
              <Button variant="outline-info" size="sm" onClick={() => setActiveTab("slips")}>
                View
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100 border-start border-4 border-warning">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-1 text-muted">Salary Structures</h6>
                <h3 className="mb-0">
                  {loading ? <Spinner animation="border" size="sm" /> : stats.totalStructures}
                </h3>
                <small className="text-muted">All employees</small>
              </div>
              <Button variant="outline-warning" size="sm" onClick={() => setActiveTab("structures")}>
                Manage
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm h-100 border-start border-4 border-danger">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-1 text-muted">Salary Templates</h6>
                <h3 className="mb-0">
                  {loading ? <Spinner animation="border" size="sm" /> : stats.totalTemplates}
                </h3>
                <small className="text-muted">Reusable templates</small>
              </div>
              <Button variant="outline-danger" size="sm" onClick={() => setActiveTab("templates")}>
                Manage
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="shadow-sm">
        <Card.Body>
          <MobileTabBar
            tabs={SALARY_TABS}
            activeKey={activeTab}
            onSelect={setActiveTab}
            desktopChildren={
              <Nav variant="tabs" className="mb-3">
                {SALARY_TABS.map(({ key, label }) => (
                  <Nav.Item key={key}>
                    <Nav.Link active={activeTab === key} onClick={() => setActiveTab(key)}>
                      {label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            }
          />
          {renderTabContent()}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SalaryManagement;
