import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Form,
  Alert,
  ProgressBar,
} from "react-bootstrap";
import { FaPlus, FaTimes, FaInfoCircle, FaExclamationTriangle, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import { leaveApi } from "../../api/leaveApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { LEAVE_TYPE_DETAILS } from "../../utils/constants";
import ApplyWFHModal from "../../components/wfh/ApplyWFHModal";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/shared/PageHeader";
import ResponsiveDataTable from "../../components/shared/ResponsiveDataTable";
import MobileModal from "../../components/shared/MobileModal";
import FormFieldStack from "../../components/shared/FormFieldStack";
import {
  canApplyPaidLeave,
  formatEmploymentType,
  getAllowedLeaveTypes,
  isFullTimeEmployee,
} from "../../utils/leaveEligibility";

const MyLeaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [viewLeave, setViewLeave] = useState(null); // leave to view in detail modal
  const paidLeaveEligible = canApplyPaidLeave(user, leaveBalance);
  const allowedLeaveTypes = getAllowedLeaveTypes(user, leaveBalance);

  const [formData, setFormData] = useState({
    leaveType: isFullTimeEmployee(user) ? "personal" : "unpaid",
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
    
    if (isSubmitting) return; // Prevent double submission
    
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
    
    if (paidLeaveEligible && formData.leaveType !== 'unpaid') {
      const availableBalance = leaveBalance?.earned?.remaining || 0;
      
      if (requestedDays > availableBalance) {
        toast.error(`Insufficient earned leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days. You have earned ${leaveBalance?.earned?.earned || 0} out of 24 annual leaves.`);
        return;
      }
    }

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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

  const leaveTypeBadge = (type) => (
    <Badge
      bg={
        type === "personal"
          ? "primary"
          : type === "medical"
          ? "danger"
          : type === "vacation"
          ? "success"
          : type === "half_day"
          ? "warning"
          : "secondary"
      }
      className="text-capitalize"
    >
      {LEAVE_TYPE_DETAILS[type]?.name || type}
    </Badge>
  );

  const leaveColumns = [
    {
      key: "leaveType",
      label: "Leave Type",
      mobilePriority: 1,
      render: (_, row) => leaveTypeBadge(row.leaveType),
    },
    {
      key: "startDate",
      label: "Start Date",
      mobilePriority: 2,
      render: (_, row) => formatDate(row.startDate),
    },
    {
      key: "endDate",
      label: "End Date",
      mobilePriority: 3,
      render: (_, row) => formatDate(row.endDate),
    },
    {
      key: "numberOfDays",
      label: "Days",
      mobilePriority: 4,
    },
    {
      key: "reason",
      label: "Reason",
      hideOnMobile: true,
    },
    {
      key: "status",
      label: "Status",
      mobilePriority: 5,
      render: (_, row) => (
        <Badge bg={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="d-flex gap-1">
          <Button
            size="sm"
            variant="outline-primary"
            className="touch-target"
            onClick={() => setViewLeave(row)}
            title="View details"
          >
            <FaEye />
          </Button>
          {row.status === "pending" && (
            <Button
              size="sm"
              variant="outline-danger"
              className="touch-target"
              onClick={() => handleCancel(row._id)}
            >
              <FaTimes /> Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container fluid>
      <PageHeader
        title="My Leave Requests"
        subtitle="Manage your leave applications - Earned leave system (24 days annual allowance)"
        actions={
          <Button variant="primary" className="touch-target" onClick={() => setShowModal(true)}>
            <FaPlus className="me-2" />
            Request Leave
          </Button>
        }
      />

      {!paidLeaveEligible && (
        <Alert variant="info" className="mb-4">
          <FaInfoCircle className="me-2" />
          As a <strong>{formatEmploymentType(user?.employmentType)}</strong> employee, you are not eligible for earned leave.
          You may apply for <strong>unpaid leave</strong> only.
        </Alert>
      )}

      {/* Earned Leave Balance Summary */}
      {leaveBalance && paidLeaveEligible && leaveBalance.earned && (
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
              <ResponsiveDataTable
                columns={leaveColumns}
                data={leaves}
                loading={loading}
                emptyMessage="No leave requests found"
                paginated={false}
                keyField="_id"
              />
            </Card.Body>
            <Card.Footer className="bg-light border-top-0">
              <div className="text-center py-2">
                <small className="text-muted">
                  Need to work from home?{' '}
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowWFHModal(true);
                    }}
                    className="text-decoration-none text-secondary"
                    style={{ fontSize: '0.9rem' }}
                  >
                    Apply here
                  </a>
                </small>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      <MobileModal
        show={showModal}
        onHide={() => setShowModal(false)}
        title="Request Leave"
        footer={
          <>
            <Button variant="secondary" className="touch-target" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="touch-target"
              type="submit"
              form="leave-request-form"
              disabled={
                isSubmitting ||
                !validateAdvanceNotice(formData.leaveType, formData.startDate).valid ||
                (paidLeaveEligible &&
                  formData.leaveType !== "unpaid" &&
                  calculateDays(formData.startDate, formData.endDate) >
                    (leaveBalance?.earned?.remaining || 0))
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </>
        }
      >
        <Form id="leave-request-form" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Leave Type *</Form.Label>
            <Form.Select
              value={formData.leaveType}
              onChange={(e) =>
                setFormData({ ...formData, leaveType: e.target.value })
              }
              required
            >
              {Object.entries(LEAVE_TYPE_DETAILS)
                .filter(([type]) => allowedLeaveTypes.includes(type))
                .map(([type, details]) => (
                  <option key={type} value={type}>
                    {details.name} (
                    {type === "unpaid"
                      ? "No limit"
                      : `${leaveBalance?.earned?.remaining || 0} days available`}
                    )
                  </option>
                ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {LEAVE_TYPE_DETAILS[formData.leaveType]?.description}
              <br />
              <strong>Advance Notice Required:</strong>{" "}
              {LEAVE_TYPE_DETAILS[formData.leaveType]?.advanceNotice === 0
                ? "Same day application allowed"
                : `${LEAVE_TYPE_DETAILS[formData.leaveType]?.advanceNotice} days`}
            </Form.Text>
          </Form.Group>

          <FormFieldStack md={6}>
            <Form.Group>
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
            <Form.Group>
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
          </FormFieldStack>

          {formData.startDate && formData.endDate && (
            <Alert variant="info" className="mb-3">
              <FaInfoCircle className="me-2" />
              <strong>Leave Duration:</strong>{" "}
              {calculateDays(formData.startDate, formData.endDate)} day(s)
              <br />
              {formData.leaveType === "unpaid" ? (
                <span>
                  <strong>Type:</strong> Unpaid Leave (no limit)
                </span>
              ) : (
                <>
                  <strong>Available Balance:</strong>{" "}
                  {leaveBalance?.earned?.remaining || 0} day(s) (earned leaves)
                  {calculateDays(formData.startDate, formData.endDate) >
                    (leaveBalance?.earned?.remaining || 0) && (
                    <div className="text-danger mt-1">
                      <FaExclamationTriangle className="me-1" />
                      Insufficient earned leave balance! You have earned{" "}
                      {leaveBalance?.earned?.earned || 0} out of 24 annual leaves.
                    </div>
                  )}
                </>
              )}
            </Alert>
          )}

          {formData.startDate &&
            !validateAdvanceNotice(formData.leaveType, formData.startDate).valid && (
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
        </Form>
      </MobileModal>

      {/* Apply for WFH Modal */}
      <ApplyWFHModal
        show={showWFHModal}
        onHide={() => setShowWFHModal(false)}
        onSuccess={() => {
          toast.success("WFH request submitted successfully!");
        }}
      />

      <MobileModal
        show={!!viewLeave}
        onHide={() => setViewLeave(null)}
        title="Leave Request Details"
        footer={
          <Button variant="secondary" className="touch-target" onClick={() => setViewLeave(null)}>
            Close
          </Button>
        }
      >
        {viewLeave && (
          <>
            <div className="text-center mb-3">
              <Badge
                bg={getStatusVariant(viewLeave.status)}
                className="text-capitalize"
              >
                {viewLeave.status}
              </Badge>
            </div>

            <div className="row g-2 mb-3">
              {[
                {
                  label: "Leave Type",
                  value:
                    LEAVE_TYPE_DETAILS[viewLeave.leaveType]?.name ||
                    viewLeave.leaveType,
                },
                { label: "Duration", value: `${viewLeave.numberOfDays} day(s)` },
                { label: "Start Date", value: formatDate(viewLeave.startDate) },
                { label: "End Date", value: formatDate(viewLeave.endDate) },
              ].map((item) => (
                <div key={item.label} className="col-6">
                  <div className="bg-light rounded p-2 border">
                    <div className="small text-muted text-uppercase">{item.label}</div>
                    <div className="fw-semibold">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-light rounded p-2 border mb-3">
              <div className="small text-muted text-uppercase">Your Reason</div>
              <div>{viewLeave.reason}</div>
            </div>

            {viewLeave.status === "approved" && viewLeave.rejectionReason && (
              <Alert variant="success">
                <strong>Approval Note:</strong> {viewLeave.rejectionReason}
              </Alert>
            )}

            {viewLeave.status === "rejected" && viewLeave.rejectionReason && (
              <Alert variant="danger">
                <strong>Rejection Reason:</strong> {viewLeave.rejectionReason}
              </Alert>
            )}

            {viewLeave.status !== "pending" &&
              (viewLeave.approvedBy || viewLeave.approvedDate) && (
                <p className="text-muted small text-center mb-0">
                  {viewLeave.status === "approved" ? "Approved" : "Reviewed"} by{" "}
                  <strong>{viewLeave.approvedBy?.name || "HR"}</strong>
                  {viewLeave.approvedDate &&
                    ` on ${formatDate(viewLeave.approvedDate)}`}
                </p>
              )}
          </>
        )}
      </MobileModal>
    </Container>
  );
};

export default MyLeaves;
