import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Form, Alert, Spinner, Table, Tabs, Tab, Modal } from "react-bootstrap";
import { FaCheck, FaTimes, FaMoneyBillWave, FaCheckSquare } from "react-icons/fa";
import { getAllExpenses, markAsReimbursed, bulkApproveExpenses, bulkRejectExpenses } from "../../api/expenseApi";
import toast from "../../utils/toast";
import { formatDate, formatCurrency } from "../../utils/helpers";

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, [page, activeTab, filters]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
      };

      if (activeTab !== "all") {
        params.status = activeTab;
      } else if (filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters.category !== "all") {
        params.category = filters.category;
      }

      if (filters.startDate) {
        params.startDate = filters.startDate;
      }

      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const response = await getAllExpenses(params);
      setExpenses(response.expenses);
      setPagination(response.pagination);
      setSelectedExpenses(new Set());
    } catch (error) {
      toast.error("Failed to fetch expenses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReimbursed = async (expenseId) => {
    try {
      setSubmitting(true);
      await markAsReimbursed(expenseId, {
        reimbursementDate: new Date(),
        method: "bank_transfer",
      });
      toast.success("Expense marked as reimbursed");
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark as reimbursed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectExpense = (expenseId) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId);
    } else {
      newSelected.add(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedExpenses.size === expenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(expenses.map((e) => e._id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.size === 0) {
      toast.warning("Please select expenses to approve");
      return;
    }

    try {
      setSubmitting(true);
      await bulkApproveExpenses({
        expenseIds: Array.from(selectedExpenses),
      });
      toast.success(`${selectedExpenses.size} expenses approved`);
      setSelectedExpenses(new Set());
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk approve failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedExpenses.size === 0) {
      toast.warning("Please select expenses to reject");
      return;
    }

    if (!bulkRejectReason.trim()) {
      toast.warning("Please provide a rejection reason");
      return;
    }

    try {
      setSubmitting(true);
      await bulkRejectExpenses({
        expenseIds: Array.from(selectedExpenses),
        reason: bulkRejectReason,
      });
      toast.success(`${selectedExpenses.size} expenses rejected`);
      setSelectedExpenses(new Set());
      setBulkRejectReason("");
      setShowBulkRejectModal(false);
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk reject failed");
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

  const getStatusBadge = (status) => {
    const colors = {
      pending: "warning",
      approved: "info",
      rejected: "danger",
      reimbursed: "success",
    };
    return colors[status] || "light";
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
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
          <h2>Expense Management</h2>
          <p className="text-muted">
            Total: {pagination.total} expense{pagination.total !== 1 ? "s" : ""}
          </p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 p-3">
        <Row>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="all">All Categories</option>
                <option value="travel">Travel</option>
                <option value="food">Food</option>
                <option value="accommodation">Accommodation</option>
                <option value="office_supplies">Office Supplies</option>
                <option value="client_meeting">Client Meeting</option>
                <option value="training">Training</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex align-items-end">
            <Button
              variant="outline-secondary"
              className="w-100"
              onClick={() => {
                setFilters({
                  status: "all",
                  category: "all",
                  startDate: "",
                  endDate: "",
                });
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => {
          setActiveTab(k);
          setPage(1);
        }}
        className="mb-4"
      >
        <Tab eventKey="all" title="All Expenses" />
        <Tab eventKey="pending" title="Pending" />
        <Tab eventKey="approved" title="Approved" />
        <Tab eventKey="rejected" title="Rejected" />
        <Tab eventKey="reimbursed" title="Reimbursed" />
      </Tabs>

      {/* Bulk Actions */}
      {selectedExpenses.size > 0 && (
        <Card className="mb-4 p-3 bg-light border-primary">
          <Row className="align-items-center">
            <Col>
              <strong>{selectedExpenses.size} expense(s) selected</strong>
            </Col>
            <Col md={6} className="d-flex gap-2 justify-content-end">
              {activeTab === "pending" && (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleBulkApprove}
                    disabled={submitting}
                  >
                    <FaCheck className="me-2" />
                    Bulk Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowBulkRejectModal(true)}
                    disabled={submitting}
                  >
                    <FaTimes className="me-2" />
                    Bulk Reject
                  </Button>
                </>
              )}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setSelectedExpenses(new Set())}
              >
                Clear Selection
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Alert variant="info">No expenses found</Alert>
      ) : (
        <>
          <Card className="shadow-sm">
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>
                    <Form.Check
                      type="checkbox"
                      checked={selectedExpenses.size === expenses.length && expenses.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={selectedExpenses.has(expense._id)}
                        onChange={() => handleSelectExpense(expense._id)}
                      />
                    </td>
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
                      <Badge bg={getStatusBadge(expense.status)}>
                        {expense.status}
                      </Badge>
                    </td>
                    <td>
                      <small>{expense.description.substring(0, 30)}...</small>
                    </td>
                    <td>
                      {expense.status === "approved" && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleMarkAsReimbursed(expense._id)}
                          disabled={submitting}
                          title="Mark as Reimbursed"
                        >
                          <FaMoneyBillWave />
                        </Button>
                      )}
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

      {/* Bulk Reject Modal */}
      <Modal show={showBulkRejectModal} onHide={() => setShowBulkRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Bulk Reject Expenses</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            You are about to reject <strong>{selectedExpenses.size}</strong> expense(s).
          </p>
          <Form.Group>
            <Form.Label>Rejection Reason *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkRejectModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkReject}
            disabled={submitting || !bulkRejectReason.trim()}
          >
            {submitting ? "Rejecting..." : "Reject"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ExpenseManagement;
