import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Form, Alert, Spinner, Table } from "react-bootstrap";
import { FaDownload, FaCalendarAlt } from "react-icons/fa";
import { getReimbursementTracking } from "../../api/expenseApi";
import toast from "../../utils/toast";
import { formatDate, formatCurrency } from "../../utils/helpers";

const ReimbursementTracking = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [totalReimbursed, setTotalReimbursed] = useState(0);

  useEffect(() => {
    fetchReimbursementData();
  }, [page, filters]);

  const fetchReimbursementData = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...filters,
      };

      const response = await getReimbursementTracking(params);
      setExpenses(response.expenses);
      setPagination(response.pagination);
      setTotalReimbursed(response.totalReimbursed);
    } catch (error) {
      toast.error("Failed to fetch reimbursement data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };

  const getCategoryBadge = (category) => {
    const colors = {
      travel: "primary",
      food: "success",
      accommodation: "info",
      office_supplies: "warning",
      client_meeting: "danger",
      training: "secondary",
      other: "dark",
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
          <h2>Reimbursement Tracking</h2>
          <p className="text-muted">
            Track all reimbursed expenses
          </p>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6 className="text-muted mb-2">Total Reimbursed</h6>
              <h3 className="text-success">{formatCurrency(totalReimbursed)}</h3>
              <small className="text-muted">{pagination.total} expenses</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6 className="text-muted mb-2">Average Reimbursement</h6>
              <h3>
                {formatCurrency(
                  pagination.total > 0 ? totalReimbursed / pagination.total : 0
                )}
              </h3>
              <small className="text-muted">Per expense</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 p-3">
        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label>
                <FaCalendarAlt className="me-2" />
                Start Date
              </Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>
                <FaCalendarAlt className="me-2" />
                End Date
              </Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Button
              variant="outline-secondary"
              className="w-100"
              onClick={() => {
                setFilters({ startDate: "", endDate: "" });
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {expenses.length === 0 ? (
        <Alert variant="info">No reimbursed expenses found</Alert>
      ) : (
        <>
          <Card className="shadow-sm">
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Expense Date</th>
                  <th>Reimbursed Date</th>
                  <th>Reimbursed By</th>
                  <th>Method</th>
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
                    <td>{formatDate(expense.reimbursementDate)}</td>
                    <td>{expense.reimbursedBy?.name || "-"}</td>
                    <td>
                      <Badge bg="secondary">
                        {expense.reimbursementMethod || "bank_transfer"}
                      </Badge>
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
    </Container>
  );
};

export default ReimbursementTracking;
