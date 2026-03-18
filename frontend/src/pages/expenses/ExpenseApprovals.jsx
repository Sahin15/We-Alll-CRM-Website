import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Alert, Spinner, Table } from "react-bootstrap";
import { FaCheck, FaTimes, FaEye } from "react-icons/fa";
import { getAllExpenses, approveExpense, rejectExpense } from "../../api/expenseApi";
import toast from "../../utils/toast";
import { formatDate, formatCurrency } from "../../utils/helpers";

const ExpenseApprovals = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchPendingExpenses();
  }, [page]);

  const fetchPendingExpenses = async () => {
    try {
      setLoading(true);
      const response = await getAllExpenses({
        status: "pending",
        page,
        limit: 10,
      });
      setExpenses(response.expenses);
      setPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to fetch pending expenses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (expense) => {
    setSelectedExpense(expense);
    setApprovalComments("");
    setShowApproveModal(true);
  };

  const handleRejectClick = (expense) => {
    setSelectedExpense(expense);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    if (!selectedExpense) return;

    try {
      setSubmitting(true);
      await approveExpense(selectedExpense._id, {
        comments: approvalComments,
      });
      toast.success("Expense approved successfully");
      setShowApproveModal(false);
      fetchPendingExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectionReason.trim()) {
      toast.warning("Please provide a rejection reason");
      return;
    }

    try {
      setSubmitting(true);
      await rejectExpense(selectedExpense._id, {
        reason: rejectionReason,
      });
      toast.success("Expense rejected successfully");
      setShowRejectModal(false);
      fetchPendingExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject expense");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (category) => {
    const colors = {
      travel: "primary",
      food: "success",
      accommodation: "info",
      office_supplies: "warning",
      client_meeting: "danger",
      training: "secondary",
      other: "light",
    };
    return colors[category] || "light";
  };

  if (loading && expenses.length === 0) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Pending Expense Approvals</h2>
          <p className="text-muted">
            {pagination.total} pending expense{pagination.total !== 1 ? "s" : ""}
          </p>
        </Col>
      </Row>

      {expenses.length === 0 ? (
        <Alert variant="info">No pending expenses to approve</Alert>
      ) : (
        <>
          <Card className="shadow-sm">
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <strong>{expense.employee?.name}</strong>
                      <br />
                      <small className="text-muted">{expense.employee?.email}</small>
                    </td>
                    <td>
                      <Badge bg={getCategoryBadge(expense.category)}>
                        {expense.category.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td>
                      <strong>{formatCurrency(expense.amount)}</strong>
                    </td>
                    <td>{formatDate(expense.date)}</td>
                    <td>
                      <small>{expense.description.substring(0, 30)}...</small>
                    </td>
                    <td>
                      <Button
                        variant="success"
                        size="sm"
                        className="me-2"
                        onClick={() => handleApproveClick(expense)}
                        title="Approve"
                      >
                        <FaCheck />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRejectClick(expense)}
                        title="Reject"
                      >
                        <FaTimes />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {pagination.pages > 1 && (
            <Row className="mt-4">
              <Col className="d-flex justify-content-center gap-2">
                <Button
                  variant="outline-secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="align-self-center">
                  Page {page} of {pagination.pages}
                </span>
                <Button
                  variant="outline-secondary"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Approve Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Approve Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedExpense && (
            <>
              <p>
                <strong>Employee:</strong> {selectedExpense.employee?.name}
              </p>
              <p>
                <strong>Amount:</strong> {formatCurrency(selectedExpense.amount)}
              </p>
              <p>
                <strong>Description:</strong> {selectedExpense.description}
              </p>
              <Form.Group className="mt-3">
                <Form.Label>Comments (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Add any comments..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleApprove}
            disabled={submitting}
          >
            {submitting ? "Approving..." : "Approve"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Expense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedExpense && (
            <>
              <p>
                <strong>Employee:</strong> {selectedExpense.employee?.name}
              </p>
              <p>
                <strong>Amount:</strong> {formatCurrency(selectedExpense.amount)}
              </p>
              <p>
                <strong>Description:</strong> {selectedExpense.description}
              </p>
              <Form.Group className="mt-3">
                <Form.Label>Rejection Reason *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  isInvalid={!rejectionReason.trim() && submitting}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={submitting}
          >
            {submitting ? "Rejecting..." : "Reject"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ExpenseApprovals;
