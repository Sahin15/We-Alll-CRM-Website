import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Alert,
  Spinner,
  Badge,
  Button,
  Table,
} from "react-bootstrap";
import {
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFileDownload,
  FaEye,
  FaHistory,
  FaChartLine,
} from "react-icons/fa";
import { salaryStructureApi, salarySlipApi } from "../../api/salaryApi";
import { toast } from "react-toastify";

const EmployeeSalaryInfo = ({ employeeId, canEdit = false }) => {
  const [loading, setLoading] = useState(true);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [recentSlips, setRecentSlips] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);

  useEffect(() => {
    if (employeeId) {
      fetchSalaryData();
    }
  }, [employeeId]);

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      
      // Fetch active salary structure
      try {
        const structureResponse = await salaryStructureApi.getActiveStructure(employeeId);
        setSalaryStructure(structureResponse.data);
      } catch (error) {
        // Silently handle - employee may not have salary structure yet
        setSalaryStructure(null);
      }

      // Fetch recent salary slips (last 6 months)
      try {
        const slipsResponse = await salarySlipApi.getEmployeeSlips(employeeId, { limit: 6 });
        setRecentSlips(slipsResponse.data.slips || []);
      } catch (error) {
        // Silently handle - employee may not have salary slips yet
        setRecentSlips([]);
      }

      // Fetch salary structure history
      try {
        const historyResponse = await salaryStructureApi.getHistory(employeeId);
        setSalaryHistory(historyResponse.data || []);
      } catch (error) {
        // Silently handle - employee may not have salary history yet
        setSalaryHistory([]);
      }
    } catch (error) {
      console.error("Error fetching salary data:", error);
      toast.error("Failed to load salary information");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: "success", text: "Active" },
      draft: { bg: "warning", text: "Draft" },
      superseded: { bg: "secondary", text: "Superseded" },
      generated: { bg: "success", text: "Generated" },
      sent: { bg: "info", text: "Sent" },
      viewed: { bg: "primary", text: "Viewed" },
    };
    
    const config = statusConfig[status] || { bg: "secondary", text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading salary information...</span>
        </Spinner>
        <p className="mt-2 text-muted">Loading salary information...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Current Salary Structure */}
      <Row className="mb-4">
        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <FaMoneyBillWave className="me-2" />
                Current Salary Structure
              </h5>
            </Card.Header>
            <Card.Body>
              {salaryStructure ? (
                <Row>
                  <Col md={8}>
                    <Row>
                      <Col md={6} className="mb-3">
                        <div className="border rounded p-3 bg-light">
                          <h6 className="text-success mb-2">
                            <FaChartLine className="me-2" />
                            Earnings
                          </h6>
                          <div className="d-flex justify-content-between mb-1">
                            <small>Basic Salary:</small>
                            <strong>{formatCurrency(salaryStructure.basicSalary)}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>HRA:</small>
                            <span>{formatCurrency(salaryStructure.hra)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>Special Allowance:</small>
                            <span>{formatCurrency(salaryStructure.specialAllowance)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>Transport Allowance:</small>
                            <span>{formatCurrency(salaryStructure.transportAllowance)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>Medical Allowance:</small>
                            <span>{formatCurrency(salaryStructure.medicalAllowance)}</span>
                          </div>
                          <hr />
                          <div className="d-flex justify-content-between">
                            <strong>Gross Salary:</strong>
                            <strong className="text-success">
                              {formatCurrency(salaryStructure.grossSalary)}
                            </strong>
                          </div>
                        </div>
                      </Col>
                      <Col md={6} className="mb-3">
                        <div className="border rounded p-3 bg-light">
                          <h6 className="text-danger mb-2">
                            <FaChartLine className="me-2" />
                            Deductions
                          </h6>
                          <div className="d-flex justify-content-between mb-1">
                            <small>Provident Fund:</small>
                            <span>{formatCurrency(salaryStructure.providentFund)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>Professional Tax:</small>
                            <span>{formatCurrency(salaryStructure.professionalTax)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>TDS:</small>
                            <span>{formatCurrency(salaryStructure.tds)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small>ESI:</small>
                            <span>{formatCurrency(salaryStructure.esi)}</span>
                          </div>
                          <hr />
                          <div className="d-flex justify-content-between">
                            <strong>Total Deductions:</strong>
                            <strong className="text-danger">
                              {formatCurrency(salaryStructure.totalDeductions)}
                            </strong>
                          </div>
                        </div>
                      </Col>
                    </Row>
                    <Row>
                      <Col xs={12}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">Effective From:</small>
                            <div>
                              {new Date(salaryStructure.effectiveFrom).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          <div>
                            <small className="text-muted">Status:</small>
                            <div>{getStatusBadge(salaryStructure.status)}</div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Col>
                  <Col md={4}>
                    <div className="text-center">
                      <Alert variant="success" className="mb-3">
                        <h4 className="mb-1">Net Salary</h4>
                        <h2 className="mb-0">{formatCurrency(salaryStructure.netSalary)}</h2>
                        <small>per month</small>
                      </Alert>
                      <Alert variant="info">
                        <h6 className="mb-1">Annual CTC</h6>
                        <h3 className="mb-0">{formatCurrency(salaryStructure.ctc)}</h3>
                      </Alert>
                      {salaryStructure.notes && (
                        <div className="mt-3">
                          <small className="text-muted">Notes:</small>
                          <p className="small">{salaryStructure.notes}</p>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              ) : (
                <Alert variant="warning" className="text-center">
                  <FaMoneyBillWave size={48} className="mb-3 text-muted" />
                  <h5>No Active Salary Structure</h5>
                  <p className="mb-0">
                    No salary structure has been set up for this employee yet.
                    {canEdit && " Please create a salary structure to get started."}
                  </p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Salary Slips */}
      <Row className="mb-4">
        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Recent Salary Slips
              </h5>
            </Card.Header>
            <Card.Body>
              {recentSlips.length > 0 ? (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Net Salary</th>
                      <th>Payment Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSlips.map((slip) => (
                      <tr key={slip._id}>
                        <td>
                          <strong>{slip.payPeriod}</strong>
                        </td>
                        <td>
                          <strong className="text-success">
                            {formatCurrency(slip.netSalary)}
                          </strong>
                        </td>
                        <td>
                          {slip.paymentDate 
                            ? new Date(slip.paymentDate).toLocaleDateString('en-GB')
                            : '—'
                          }
                        </td>
                        <td>{getStatusBadge(slip.status)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              title="View Details"
                            >
                              <FaEye />
                            </Button>
                            {slip.pdfUrl && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                title="Download PDF"
                                onClick={() => {
                                  window.open(slip.pdfUrl, '_blank');
                                }}
                              >
                                <FaFileDownload />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info" className="text-center">
                  <FaCalendarAlt size={48} className="mb-3 text-muted" />
                  <h5>No Salary Slips Found</h5>
                  <p className="mb-0">No salary slips have been generated for this employee yet.</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Salary Structure History */}
      {salaryHistory.length > 1 && (
        <Row>
          <Col xs={12}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                  <FaHistory className="me-2" />
                  Salary Structure History
                </h5>
              </Card.Header>
              <Card.Body>
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Effective Period</th>
                      <th>Basic Salary</th>
                      <th>Gross Salary</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((structure) => (
                      <tr key={structure._id}>
                        <td>
                          <div>
                            <strong>From:</strong> {new Date(structure.effectiveFrom).toLocaleDateString('en-GB')}
                          </div>
                          {structure.effectiveTo && (
                            <div>
                              <strong>To:</strong> {new Date(structure.effectiveTo).toLocaleDateString('en-GB')}
                            </div>
                          )}
                        </td>
                        <td>{formatCurrency(structure.basicSalary)}</td>
                        <td>{formatCurrency(structure.grossSalary)}</td>
                        <td>
                          <strong className="text-success">
                            {formatCurrency(structure.netSalary)}
                          </strong>
                        </td>
                        <td>{getStatusBadge(structure.status)}</td>
                        <td>
                          {structure.createdBy?.name || '—'}
                          <br />
                          <small className="text-muted">
                            {new Date(structure.createdAt).toLocaleDateString('en-GB')}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default EmployeeSalaryInfo;