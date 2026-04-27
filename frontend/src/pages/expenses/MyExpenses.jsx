import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Form, Pagination, Alert, Modal } from "react-bootstrap";
import { FaPlus, FaEye, FaEdit, FaTrash, FaFilter, FaDownload, FaChartBar, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "../../utils/toast";
import { expenseApi } from "../../api/expenseApi";
import { formatDate, formatCurrency } from "../../utils/helpers";
import { getTypeColor, EXPENSE_PURPOSES_ARRAY, EXPENSE_TYPES_ARRAY } from "../../utils/expenseConstants";

const STATUS_COLORS = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  reimbursed: "info",
};

const MyExpenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, reimbursed: 0, totalAmount: 0, approvedAmount: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    expensePurpose: "",
    expenseType: "",
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    page: 1,
  });

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseApi.getMyExpenses(filters);
      setExpenses(response.expenses || []);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await expenseApi.getExpenseStats();
      setStats(response.stats || {});
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      await expenseApi.deleteExpense(deleteId);
      toast.success("Expense deleted successfully");
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(error.response?.data?.message || "Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

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
          <h2 className="mb-0">My Expenses</h2>
        </div>
        <Button 
          variant="primary"
          onClick={() => navigate("/expenses/create")}
          className="d-flex align-items-center"
        >
          <FaPlus className="me-2" />
          New Expense
        </Button>
      </div>

      {/* Stats Cards - Improved Layout */}
      <Row className="mb-4 g-3">
        <Col lg={3} md={6} sm={12}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Total Expenses</h6>
                  <h3 className="text-primary mb-0">{stats.total}</h3>
                </div>
                <Badge bg="primary" className="p-2">
                  {formatCurrency(stats.totalAmount)}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} sm={12}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Pending</h6>
                  <h3 className="text-warning mb-0">{stats.pending}</h3>
                </div>
                <Badge bg="warning" className="p-2">
                  Awaiting
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} sm={12}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Approved</h6>
                  <h3 className="text-success mb-0">{stats.approved}</h3>
                </div>
                <Badge bg="success" className="p-2">
                  {formatCurrency(stats.approvedAmount)}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} sm={12}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">Reimbursed</h6>
                  <h3 className="text-info mb-0">{stats.reimbursed}</h3>
                </div>
                <Badge bg="info" className="p-2">
                  Paid
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center">
            <FaFilter className="me-2" />
            <span>Filters</span>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {/* Filters */}
          <Row className="mb-4 g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="reimbursed">Reimbursed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Purpose</Form.Label>
                <Form.Select
                  name="expensePurpose"
                  value={filters.expensePurpose}
                  onChange={handleFilterChange}
                >
                  <option value="">All Purposes</option>
                  {EXPENSE_PURPOSES_ARRAY.map((purpose) => (
                    <option key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Type</Form.Label>
                <Form.Select
                  name="expenseType"
                  value={filters.expenseType}
                  onChange={handleFilterChange}
                >
                  <option value="">All Types</option>
                  {EXPENSE_TYPES_ARRAY.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Table */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : expenses.length === 0 ? (
            <Alert variant="info" className="text-center py-5 mb-0">
              <p className="mb-3">No expenses found</p>
              <Button
                variant="primary"
                onClick={() => navigate("/expenses/create")}
              >
                Create Your First Expense
              </Button>
            </Alert>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Purpose</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense._id}>
                        <td>{formatDate(expense.date)}</td>
                        <td>
                          <Badge bg="secondary">
                            {expense.expensePurpose || "N/A"}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getTypeColor(expense.expenseType || expense.category)}>
                            {(expense.expenseType || expense.category || "N/A").replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td>
                          <span title={expense.description}>
                            {expense.description.substring(0, 40)}
                            {expense.description.length > 40 ? "..." : ""}
                          </span>
                        </td>
                        <td>
                          <strong>{formatCurrency(expense.amount)}</strong>
                        </td>
                        <td>
                          <Badge bg={STATUS_COLORS[expense.status]}>
                            {expense.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate(`/expenses/${expense._id}`)}
                              title="View"
                            >
                              <FaEye />
                            </Button>
                            {expense.status === "pending" && (
                              <>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => navigate(`/expenses/${expense._id}/edit`)}
                                  title="Edit"
                                >
                                  <FaEdit />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(expense._id)}
                                  title="Delete"
                                >
                                  <FaTrash />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                    />
                    <Pagination.Prev
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    />
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const startPage = Math.max(1, pagination.page - 2);
                      return startPage + i;
                    }).map((page) => (
                      <Pagination.Item
                        key={page}
                        active={page === pagination.page}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(pagination.pages)}
                      disabled={pagination.page === pagination.pages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

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
    </Container>
  );
};

export default MyExpenses;
