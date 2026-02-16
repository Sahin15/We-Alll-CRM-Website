import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Table,
  Accordion
} from "react-bootstrap";
import { toast } from "react-toastify";
import { FaEye, FaQuestionCircle, FaCheckCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { salaryPreviewApi } from "../../api/salaryApi";

const SalaryPreview = ({ month, year, onPreviewUpdate }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (month && year) {
      fetchPreview();
    }
  }, [month, year]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const response = await salaryPreviewApi.getMyPreview(month, year);
      setPreview(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setPreview(null);
      } else {
        console.error("Error fetching salary preview:", error);
        toast.error("Failed to load salary preview");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuery = async () => {
    if (!queryText.trim()) {
      toast.error("Please enter your query");
      return;
    }

    try {
      setSubmittingQuery(true);
      const response = await salaryPreviewApi.submitQuery(preview._id, queryText.trim());
      setPreview(response.data.preview);
      setShowQueryModal(false);
      setQueryText("");
      toast.success("Query submitted successfully");
      if (onPreviewUpdate) onPreviewUpdate(response.data.preview);
    } catch (error) {
      console.error("Error submitting query:", error);
      toast.error("Failed to submit query");
    } finally {
      setSubmittingQuery(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      setAcknowledging(true);
      const response = await salaryPreviewApi.acknowledge(preview._id);
      setPreview(response.data.preview);
      toast.success("Salary preview acknowledged successfully");
      if (onPreviewUpdate) onPreviewUpdate(response.data.preview);
    } catch (error) {
      console.error("Error acknowledging preview:", error);
      toast.error("Failed to acknowledge preview");
    } finally {
      setAcknowledging(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      generated: { variant: "info", icon: FaClock, text: "Generated" },
      under_review: { variant: "warning", icon: FaEye, text: "Under Review" },
      query_raised: { variant: "danger", icon: FaQuestionCircle, text: "Query Raised" },
      acknowledged: { variant: "success", icon: FaCheckCircle, text: "Acknowledged" },
      finalized: { variant: "success", icon: FaCheckCircle, text: "Finalized" }
    };

    const config = statusConfig[status] || statusConfig.generated;
    const IconComponent = config.icon;

    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1">
        <IconComponent size={12} />
        {config.text}
      </Badge>
    );
  };

  const isReviewExpired = preview && new Date() > new Date(preview.reviewDeadline);
  const canRaiseQuery = preview && !isReviewExpired && preview.status !== 'finalized';
  const canAcknowledge = preview && !preview.acknowledgedBy && !isReviewExpired;

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2 mb-0">Loading salary preview...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <FaExclamationTriangle size={48} className="text-muted mb-3" />
          <h5>No Salary Preview Available</h5>
          <p className="text-muted">
            Salary preview for {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} is not yet generated.
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                Salary Preview - {new Date(preview.year, preview.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h5>
            </Col>
            <Col xs="auto">
              {getStatusBadge(preview.status)}
            </Col>
          </Row>
        </Card.Header>

        <Card.Body>
          {/* Review Deadline Alert */}
          {!isReviewExpired && preview.status !== 'finalized' && (
            <Alert variant="info" className="mb-4">
              <FaClock className="me-2" />
              <strong>Review Deadline:</strong> {new Date(preview.reviewDeadline).toLocaleDateString()}
              {canRaiseQuery && (
                <span className="ms-2">
                  - You can raise queries or concerns until this date.
                </span>
              )}
            </Alert>
          )}

          {isReviewExpired && preview.status !== 'acknowledged' && preview.status !== 'finalized' && (
            <Alert variant="warning" className="mb-4">
              <FaExclamationTriangle className="me-2" />
              <strong>Review Period Expired:</strong> The review deadline has passed. 
              Your salary will be processed based on the current calculation.
            </Alert>
          )}

          {/* Working Days Breakdown */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="border-info">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">Working Days Breakdown</h6>
                </Card.Header>
                <Card.Body>
                  <Table size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td>Total Calendar Days</td>
                        <td className="text-end">{preview.workingDaysBreakdown.totalDays}</td>
                      </tr>
                      <tr>
                        <td>Weekends</td>
                        <td className="text-end">{preview.workingDaysBreakdown.weekends}</td>
                      </tr>
                      <tr>
                        <td>Holidays</td>
                        <td className="text-end">{preview.workingDaysBreakdown.holidays}</td>
                      </tr>
                      <tr className="table-success">
                        <td><strong>Working Days</strong></td>
                        <td className="text-end"><strong>{preview.workingDaysBreakdown.workingDays}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="border-warning">
                <Card.Header className="bg-warning text-dark">
                  <h6 className="mb-0">Leave Impact</h6>
                </Card.Header>
                <Card.Body>
                  <Table size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td>Per Day Salary</td>
                        <td className="text-end">{formatCurrency(preview.leaveImpact.perDaySalary)}</td>
                      </tr>
                      <tr>
                        <td>Paid Leaves</td>
                        <td className="text-end">{preview.leaveImpact.paidLeaves} days</td>
                      </tr>
                      <tr>
                        <td>Unpaid Leaves</td>
                        <td className="text-end">{preview.leaveImpact.unpaidLeaves} days</td>
                      </tr>
                      <tr className="table-danger">
                        <td><strong>Leave Deduction</strong></td>
                        <td className="text-end"><strong>{formatCurrency(preview.leaveImpact.deductionAmount)}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Salary Breakdown */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="border-success">
                <Card.Header className="bg-success text-white">
                  <h6 className="mb-0">Earnings</h6>
                </Card.Header>
                <Card.Body>
                  <Table size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td>Basic Salary</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.basicSalary)}</td>
                      </tr>
                      <tr>
                        <td>HRA</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.hra)}</td>
                      </tr>
                      <tr>
                        <td>Special Allowance</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.specialAllowance)}</td>
                      </tr>
                      <tr>
                        <td>Transport Allowance</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.transportAllowance)}</td>
                      </tr>
                      <tr>
                        <td>Medical Allowance</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.medicalAllowance)}</td>
                      </tr>
                      {preview.salaryBreakdown.earnings.bonus > 0 && (
                        <tr>
                          <td>Bonus</td>
                          <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.bonus)}</td>
                        </tr>
                      )}
                      {preview.salaryBreakdown.earnings.overtime > 0 && (
                        <tr>
                          <td>Overtime</td>
                          <td className="text-end">{formatCurrency(preview.salaryBreakdown.earnings.overtime)}</td>
                        </tr>
                      )}
                      <tr className="table-success">
                        <td><strong>Gross Salary</strong></td>
                        <td className="text-end"><strong>{formatCurrency(preview.salaryBreakdown.grossSalary)}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="border-danger">
                <Card.Header className="bg-danger text-white">
                  <h6 className="mb-0">Deductions</h6>
                </Card.Header>
                <Card.Body>
                  <Table size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td>Provident Fund</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.deductions.providentFund)}</td>
                      </tr>
                      <tr>
                        <td>Professional Tax</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.deductions.professionalTax)}</td>
                      </tr>
                      <tr>
                        <td>TDS</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.deductions.tds)}</td>
                      </tr>
                      <tr>
                        <td>ESI</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.deductions.esi)}</td>
                      </tr>
                      <tr>
                        <td>Loss of Pay</td>
                        <td className="text-end">{formatCurrency(preview.salaryBreakdown.deductions.lossOfPay)}</td>
                      </tr>
                      <tr className="table-danger">
                        <td><strong>Total Deductions</strong></td>
                        <td className="text-end"><strong>{formatCurrency(preview.salaryBreakdown.totalDeductions)}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Net Salary */}
          <Alert variant="success" className="text-center mb-4">
            <h4 className="mb-1">Net Salary</h4>
            <h2 className="mb-0">{formatCurrency(preview.salaryBreakdown.netSalary)}</h2>
          </Alert>

          {/* Leave Breakdown Details */}
          {preview.leaveImpact.leaveBreakdown && preview.leaveImpact.leaveBreakdown.length > 0 && (
            <Accordion className="mb-4">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Leave Details</Accordion.Header>
                <Accordion.Body>
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Days</th>
                        <th>Type</th>
                        <th className="text-end">Deduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.leaveImpact.leaveBreakdown.map((leave, index) => (
                        <tr key={index}>
                          <td>{leave.leaveType}</td>
                          <td>{leave.days}</td>
                          <td>
                            <Badge bg={leave.isPaid ? "success" : "danger"}>
                              {leave.isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </td>
                          <td className="text-end">{formatCurrency(leave.deductionAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}

          {/* Employee Queries */}
          {preview.employeeQueries && preview.employeeQueries.length > 0 && (
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Your Queries & Responses</h6>
              </Card.Header>
              <Card.Body>
                {preview.employeeQueries.map((query, index) => (
                  <div key={index} className="mb-3 pb-3 border-bottom">
                    <div className="mb-2">
                      <strong>Query:</strong> {query.query}
                      <small className="text-muted ms-2">
                        ({new Date(query.submittedAt).toLocaleString()})
                      </small>
                    </div>
                    {query.hrResponse && (
                      <div className="bg-light p-2 rounded">
                        <strong>HR Response:</strong> {query.hrResponse}
                        <small className="text-muted ms-2">
                          ({new Date(query.respondedAt).toLocaleString()})
                        </small>
                      </div>
                    )}
                    {!query.hrResponse && (
                      <Badge bg="warning">Pending Response</Badge>
                    )}
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-2 justify-content-center">
            {canRaiseQuery && (
              <Button 
                variant="outline-primary" 
                onClick={() => setShowQueryModal(true)}
              >
                <FaQuestionCircle className="me-2" />
                Raise Query
              </Button>
            )}
            
            {canAcknowledge && (
              <Button 
                variant="success" 
                onClick={handleAcknowledge}
                disabled={acknowledging}
              >
                {acknowledging ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="me-2" />
                    Acknowledge Preview
                  </>
                )}
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Query Modal */}
      <Modal show={showQueryModal} onHide={() => setShowQueryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Raise Query</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Your Query or Concern</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Please describe your query or concern about the salary calculation..."
              />
              <Form.Text className="text-muted">
                HR will review your query and respond within 24 hours.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQueryModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitQuery}
            disabled={submittingQuery || !queryText.trim()}
          >
            {submittingQuery ? (
              <>
                <Spinner size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              "Submit Query"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SalaryPreview;