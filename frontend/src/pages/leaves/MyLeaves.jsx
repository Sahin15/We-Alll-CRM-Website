import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Alert,
  ProgressBar,
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTimes, FaInfoCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import { leaveApi } from "../../api/leaveApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { LEAVE_TYPE_DETAILS } from "../../utils/constants";

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [formData, setFormData] = useState({
    leaveType: "personal",
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    fetchLeaves();
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const response = await leaveApi.getLeaveBalance();
      setLeaveBalance(response.data.balance);
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      toast.error("Failed to load leave balance");
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getMyLeaves();
      setLeaves(response.data);
    } catch (error) {
      console.error("Leave fetch error:", error);
      console.error("Error response:", error.response);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.statusText ||
        "Failed to fetch leave requests. Please check your permissions.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const validateAdvanceNotice = (leaveType, startDate) => {
    if (!startDate) return { valid: true };
    
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    const requiredDays = LEAVE_TYPE_DETAILS[leaveType]?.advanceNotice || 0;
    
    if (daysDifference < requiredDays) {
      return {
        valid: false,
        message: `${LEAVE_TYPE_DETAILS[leaveType]?.name} requires ${requiredDays} days advance notice`
      };
    }
    
    return { valid: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate advance notice
    const advanceNoticeCheck = validateAdvanceNotice(formData.leaveType, formData.startDate);
    if (!advanceNoticeCheck.valid) {
      toast.error(advanceNoticeCheck.message);
      return;
    }

    // Check leave balance (skip for unpaid leave)
    const requestedDays = calculateDays(formData.startDate, formData.endDate);
    
    if (formData.leaveType !== 'unpaid') {
      const availableBalance = leaveBalance?.earned?.remaining || 0;
      
      if (requestedDays > availableBalance) {
        toast.error(`Insufficient earned leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days. You have earned ${leaveBalance?.earned?.earned || 0} out of 24 annual leaves.`);
        return;
      }
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', formData.leaveType);
      formDataToSend.append('startDate', formData.startDate);
      formDataToSend.append('endDate', formData.endDate);
      formDataToSend.append('reason', formData.reason);

      await leaveApi.createLeaveRequest(formDataToSend);
      toast.success("Leave request submitted successfully");
      setShowModal(false);
      setFormData({
        leaveType: "personal",
        startDate: "",
        endDate: "",
        reason: "",
      });
      fetchLeaves();
      fetchLeaveBalance();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit leave request"
      );
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this leave request?")) {
      try {
        await leaveApi.cancelLeave(id);
        toast.success("Leave request cancelled");
        fetchLeaves();
        fetchLeaveBalance();
      } catch (error) {
        toast.error("Failed to cancel leave request");
      }
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>My Leave Requests</h2>
          <p className="text-muted mb-0">Manage your leave applications - Earned leave system (24 days annual allowance)</p>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <FaPlus className="me-2" />
            Request Leave
          </Button>
        </Col>
      </Row>

      {/* Earned Leave Balance Summary */}
      {leaveBalance && leaveBalance.earned && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
              <Card.Body>
                <Row className="align-items-center">
                  <Col xs={12} md={8}>
                    <h6 className="mb-2 text-primary">
                      <FaInfoCircle className="me-2" />
                      Annual Leave Balance (Earned System)
                    </h6>
                    <p className="mb-0 text-muted">
                      You earn 2 leaves per month. 
                      <span className="ms-2">
                        <strong>Earned so far:</strong> {leaveBalance.earned.earned} days | 
                        <strong className="ms-2">Used:</strong> {leaveBalance.earned.used} days | 
                        <strong className="ms-2">Available:</strong> {leaveBalance.earned.remaining} days
                      </span>
                    </p>
                  </Col>
                  <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
                    <div className="d-flex justify-content-between justify-content-md-end align-items-center">
                      <div className="me-3">
                        <div className="text-muted small">Progress</div>
                        <div className="h4 mb-0 text-primary">
                          {leaveBalance.earned.used}/{leaveBalance.earned.earned}
                        </div>
                      </div>
                      <div>
                        <ProgressBar 
                          now={(leaveBalance.earned.used / leaveBalance.earned.earned) * 100} 
                          variant="primary"
                          style={{ width: '100px', height: '8px' }}
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length > 0 ? (
                      leaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>
                            <Badge bg={
                              leave.leaveType === 'personal' ? 'primary' :
                              leave.leaveType === 'medical' ? 'danger' :
                              leave.leaveType === 'vacation' ? 'success' : 'secondary'
                            } className="text-capitalize">
                              {LEAVE_TYPE_DETAILS[leave.leaveType]?.name || leave.leaveType}
                            </Badge>
                          </td>
                          <td>{formatDate(leave.startDate)}</td>
                          <td>{formatDate(leave.endDate)}</td>
                          <td>{leave.numberOfDays}</td>
                          <td>{leave.reason}</td>
                          <td>
                            <Badge bg={getStatusVariant(leave.status)}>
                              {leave.status}
                            </Badge>
                          </td>
                          <td>
                            {leave.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleCancel(leave._id)}
                              >
                                <FaTimes /> Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          No leave requests found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Leave Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Request Leave</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type *</Form.Label>
              <Form.Select
                value={formData.leaveType}
                onChange={(e) =>
                  setFormData({ ...formData, leaveType: e.target.value })
                }
                required
              >
                {Object.entries(LEAVE_TYPE_DETAILS).map(([type, details]) => (
                  <option key={type} value={type}>
                    {details.name} ({type === 'unpaid' ? 'No limit' : `${leaveBalance?.earned?.remaining || 0} days available`})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                {LEAVE_TYPE_DETAILS[formData.leaveType]?.description}
                <br />
                <strong>Advance Notice Required:</strong> {
                  LEAVE_TYPE_DETAILS[formData.leaveType]?.advanceNotice === 0 
                    ? 'Same day application allowed' 
                    : `${LEAVE_TYPE_DETAILS[formData.leaveType]?.advanceNotice} days`
                }
              </Form.Text>
            </Form.Group>

            <Row>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Validation Alerts */}
            {formData.startDate && formData.endDate && (
              <Alert variant="info" className="mb-3">
                <FaInfoCircle className="me-2" />
                <strong>Leave Duration:</strong> {calculateDays(formData.startDate, formData.endDate)} day(s)
                <br />
                {formData.leaveType === 'unpaid' ? (
                  <span>
                    <strong>Type:</strong> Unpaid Leave (no limit)
                  </span>
                ) : (
                  <>
                    <strong>Available Balance:</strong> {leaveBalance?.earned?.remaining || 0} day(s) (earned leaves)
                    {calculateDays(formData.startDate, formData.endDate) > (leaveBalance?.earned?.remaining || 0) && (
                      <div className="text-danger mt-1">
                        <FaExclamationTriangle className="me-1" />
                        Insufficient earned leave balance! You have earned {leaveBalance?.earned?.earned || 0} out of 24 annual leaves.
                      </div>
                    )}
                  </>
                )}
              </Alert>
            )}

            {formData.startDate && !validateAdvanceNotice(formData.leaveType, formData.startDate).valid && (
              <Alert variant="warning" className="mb-3">
                <FaExclamationTriangle className="me-2" />
                {validateAdvanceNotice(formData.leaveType, formData.startDate).message}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Please provide a reason for your leave..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={
                !validateAdvanceNotice(formData.leaveType, formData.startDate).valid || 
                (formData.leaveType !== 'unpaid' && calculateDays(formData.startDate, formData.endDate) > (leaveBalance?.earned?.remaining || 0))
              }
            >
              Submit Request
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default MyLeaves;
