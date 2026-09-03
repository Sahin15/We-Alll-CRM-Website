import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from "react-bootstrap";
import { FaArrowLeft, FaEdit, FaTrash, FaCheck, FaTimes, FaFileImage, FaDownload, FaEye } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import toast from "../../utils/toast";
import { expenseApi, bulkApproveExpenses, bulkRejectExpenses } from "../../api/expenseApi";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";
import { formatDate, formatCurrency } from "../../utils/helpers";
import { getPurposeLabel, getTypeLabel, getPurposeColor, getTypeColor } from "../../utils/expenseConstants";

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();
  const canApproveExpense = checkPageAccess(canAccess, PAGE_ACCESS.expenseApprove);
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await expenseApi.getExpenseById(id);
      setExpense(response.expense || response.data || null);
    } catch (error) {
      console.error("Error fetching expense:", error);
      toast.error("Failed to load expense details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await expenseApi.deleteExpense(id);
      toast.success("Expense deleted successfully");
      navigate("/expenses/my-expenses");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(error.response?.data?.message || "Failed to delete expense");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await bulkApproveExpenses({
        expenseIds: [id],
      });
      toast.success("Expense approved successfully");
      fetchExpense(); // Refresh to show updated status
    } catch (error) {
      console.error("Error approving expense:", error);
      toast.error(error.response?.data?.message || "Failed to approve expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning("Please provide a rejection reason");
      return;
    }

    try {
      setSubmitting(true);
      await bulkRejectExpenses({
        expenseIds: [id],
        reason: rejectReason,
      });
      toast.success("Expense rejected");
      setShowRejectModal(false);
      setRejectReason("");
      fetchExpense(); // Refresh to show updated status
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast.error(error.response?.data?.message || "Failed to reject expense");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "warning",
      approved: "info",
      rejected: "danger",
      reimbursed: "success",
    };
    return colors[status] || "light";
  };

  const formatStatusLabel = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (!expense) {
    return (
      <Container className="py-4">
        <Alert variant="danger">Expense not found</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="me-3"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
          <h2 className="mb-0">Expense Details</h2>
        </div>
        <div className="d-flex gap-2">
          {expense.status === "pending" && canApproveExpense && (
            <>
              <Button 
                variant="success"
                size="sm"
                onClick={handleApprove}
                disabled={submitting}
                className="d-flex align-items-center"
              >
                <FaCheck className="me-2" />
                {submitting ? "Approving..." : "Approve"}
              </Button>
              <Button 
                variant="danger"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                className="d-flex align-items-center"
              >
                <FaTimes className="me-2" />
                Reject
              </Button>
            </>
          )}
          {expense.status === "pending" && expense.employee?._id === user?._id && (
            <Button 
              variant="outline-danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="d-flex align-items-center"
            >
              <FaTrash className="me-2" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
      </div>

      <Row>
        <Col lg={8} className="mx-auto">
          {/* Main Card */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {/* Top Section - Amount and Status */}
              <div className="mb-4 pb-4 border-bottom">
                <Row className="align-items-center">
                  <Col md={6}>
                    <p className="text-muted mb-1 small">Amount</p>
                    <h3 className="mb-0 fw-bold text-primary">{formatCurrency(expense.amount)}</h3>
                  </Col>
                  <Col md={6} className="text-md-end">
                    <Badge bg={getStatusBadge(expense.status)} className="me-2 p-2">
                      {formatStatusLabel(expense.status)}
                    </Badge>
                    {expense.expensePurpose && (
                      <Badge bg={getPurposeColor(expense.expensePurpose)} className="me-2 p-2">
                        {getPurposeLabel(expense.expensePurpose)}
                      </Badge>
                    )}
                    {expense.expenseType && (
                      <Badge bg={getTypeColor(expense.expenseType)} className="p-2">
                        {getTypeLabel(expense.expenseType)}
                      </Badge>
                    )}
                  </Col>
                </Row>
              </div>

              {/* Details Grid */}
              <Row className="mb-4">
                <Col md={6} className="mb-3">
                  <p className="text-muted mb-1 small">Expense Date</p>
                  <p className="mb-0">{formatDate(expense.date)}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="text-muted mb-1 small">Payment Method</p>
                  <p className="mb-0 text-capitalize">{(expense.paymentMethod || "other").replace(/_/g, " ")}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="text-muted mb-1 small">Merchant/Vendor</p>
                  <p className="mb-0">{expense.merchant || "Not specified"}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <p className="text-muted mb-1 small">Submitted On</p>
                  <p className="mb-0">{formatDate(expense.createdAt)}</p>
                </Col>
              </Row>

              {/* Description */}
              <div className="mb-4 pb-4 border-bottom">
                <p className="text-muted mb-2 small">Description</p>
                <p className="mb-0">{expense.description}</p>
              </div>

              {/* Notes */}
              {expense.notes && (
                <div className="mb-4 pb-4 border-bottom">
                  <p className="text-muted mb-2 small">Additional Notes</p>
                  <p className="mb-0">{expense.notes}</p>
                </div>
              )}

              {/* Receipt/Proof */}
              {expense.receiptUrl && (
                <div className="mb-4 pb-4 border-bottom">
                  <p className="text-muted mb-3 small fw-bold">RECEIPT / PROOF</p>
                  <Card className="border">
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <FaFileImage size={32} className="text-primary me-3" />
                          <div>
                            <p className="mb-1 fw-medium">{expense.receiptFileName || "Receipt"}</p>
                            <small className="text-muted">
                              {expense.receiptUrl.includes('.pdf') ? 'PDF Document' : 'Image File'}
                            </small>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => setShowReceiptModal(true)}
                            className="d-flex align-items-center"
                          >
                            <FaEye className="me-1" />
                            View
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="d-flex align-items-center"
                          >
                            <FaDownload className="me-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Approval Info */}
              {(expense.approvalComments || expense.rejectionReason || expense.approvedAt) && (
                <div>
                  <p className="text-muted mb-3 small fw-bold">APPROVAL INFORMATION</p>
                  
                  {expense.approvedAt && (
                    <div className="mb-3 p-3 bg-success bg-opacity-10 rounded">
                      <p className="text-success mb-1 small fw-bold">Approved On</p>
                      <p className="mb-0">{formatDate(expense.approvedAt)}</p>
                    </div>
                  )}

                  {expense.approvalComments && (
                    <div className="mb-3 p-3 bg-info bg-opacity-10 rounded">
                      <p className="text-info mb-1 small fw-bold">Approval Comments</p>
                      <p className="mb-0">{expense.approvalComments}</p>
                    </div>
                  )}

                  {expense.rejectionReason && (
                    <div className="p-3 bg-danger bg-opacity-10 rounded">
                      <p className="text-danger mb-1 small fw-bold">Rejection Reason</p>
                      <p className="mb-0">{expense.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this expense? This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Please provide a reason for rejecting this expense.</p>
          <Form.Group>
            <Form.Label>Rejection Reason *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowRejectModal(false);
              setRejectReason("");
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleReject}
            disabled={submitting || !rejectReason.trim()}
          >
            {submitting ? "Rejecting..." : "Reject"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Receipt Viewer Modal */}
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Receipt / Proof</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {expense?.receiptUrl && (
            <>
              {expense.receiptUrl.includes('.pdf') ? (
                <div className="p-4 text-center bg-light">
                  <FaFileImage size={64} className="text-muted mb-3" />
                  <p className="mb-2">PDF Document</p>
                  <p className="text-muted small mb-3">{expense.receiptFileName || "Receipt.pdf"}</p>
                  <Button
                    variant="primary"
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-inline-flex align-items-center"
                  >
                    <FaDownload className="me-2" />
                    Open PDF
                  </Button>
                </div>
              ) : (
                <img loading="lazy" src={expense.receiptUrl}
                  alt="Receipt"
                  style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }}
                />
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            href={expense?.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="d-flex align-items-center"
          >
            <FaDownload className="me-2" />
            Download
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowReceiptModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ExpenseDetails;

