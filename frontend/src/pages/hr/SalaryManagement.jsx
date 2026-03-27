import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Tabs,
  Tab,
  Spinner,
  Button,
} from "react-bootstrap";
import {
  FaMoneyBillWave,
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
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

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

  return (
    <Container fluid className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="salary-header-card border-0 shadow-lg">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div className="salary-header-content">
                  <div className="d-flex align-items-center mb-2">
                    <div className="salary-icon-container me-3">
                      <FaMoneyBillWave className="salary-header-icon" />
                    </div>
                    <div>
                      <h2 className="salary-header-title mb-1">
                        Salary Management
                      </h2>
                      <div className="salary-header-badge">
                        HR Dashboard
                      </div>
                    </div>
                  </div>
                  <p className="salary-header-description mb-0">
                    Manage salary structures, previews, and generate salary slips with comprehensive payroll analytics
                  </p>
                </div>
                <div className="d-flex gap-2 salary-action-buttons">
                  <Button 
                    variant="light" 
                    href="/salary-preview-management"
                    className="salary-action-btn d-flex align-items-center"
                  >
                    <FaEye className="me-2" />
                    Preview Management
                  </Button>
                  <Button 
                    variant="light" 
                    href="/salary-templates"
                    className="salary-action-btn d-flex align-items-center"
                  >
                    <FaCogs className="me-2" />
                    Templates
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                <small className="text-muted">This month</small>
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
                <small className="text-muted">This month</small>
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
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="slips" title="Salary Slips">
              <SalarySlipList />
            </Tab>
            <Tab eventKey="generate" title="Generate Slips">
              <GenerateSalarySlips />
            </Tab>
            <Tab eventKey="structures" title="Salary Structures">
              <SalaryStructures />
            </Tab>
            <Tab eventKey="previews" title="Salary Previews">
              <HRSalaryPreviewManagement />
            </Tab>
            <Tab eventKey="templates" title="Templates">
              <TemplateManagement />
            </Tab>
            <Tab eventKey="reports" title="Reports">
              <PayrollSummary />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <style>{`
        /* Salary Management Header Styles */
        .salary-header-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px !important;
          overflow: hidden;
          position: relative;
        }

        .salary-header-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
          backdrop-filter: blur(10px);
        }

        .salary-header-card .card-body {
          position: relative;
          z-index: 2;
        }

        .salary-icon-container {
          width: 70px;
          height: 70px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .salary-icon-container:hover {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.3);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .salary-header-icon {
          font-size: 32px;
          color: #ffffff;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .salary-header-title {
          color: #ffffff;
          font-weight: 700;
          font-size: 2.2rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          margin: 0;
          letter-spacing: -0.5px;
        }

        .salary-header-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: inline-block;
        }

        .salary-header-description {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          line-height: 1.5;
          margin-top: 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .salary-action-buttons {
          flex-shrink: 0;
        }

        .salary-action-btn {
          background: rgba(255, 255, 255, 0.15) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          color: #ffffff !important;
          backdrop-filter: blur(10px);
          border-radius: 12px !important;
          padding: 10px 20px !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          text-decoration: none !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        }

        .salary-action-btn:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
          color: #ffffff !important;
        }

        .salary-action-btn:active {
          transform: translateY(0) !important;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .salary-header-card .d-flex {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .salary-action-buttons {
            margin-top: 1rem;
            width: 100%;
          }

          .salary-action-buttons .d-flex {
            flex-direction: column !important;
            width: 100%;
          }

          .salary-action-btn {
            width: 100% !important;
            margin-bottom: 0.5rem !important;
            justify-content: center !important;
          }

          .salary-header-title {
            font-size: 1.8rem !important;
          }

          .salary-icon-container {
            width: 60px !important;
            height: 60px !important;
          }

          .salary-header-icon {
            font-size: 28px !important;
          }
        }

        @media (max-width: 576px) {
          .salary-header-content .d-flex {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .salary-icon-container {
            margin-bottom: 1rem !important;
            margin-right: 0 !important;
          }

          .salary-header-title {
            font-size: 1.6rem !important;
          }
        }
      `}</style>
    </Container>
  );
};

export default SalaryManagement;
