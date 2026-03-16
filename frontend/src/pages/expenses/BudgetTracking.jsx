import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, ProgressBar, Spinner, Alert, Badge } from "react-bootstrap";
import { getBudgetTracking } from "../../api/expenseApi";
import toast from "../../utils/toast";

const BudgetTracking = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [totalSpent, setTotalSpent] = useState(0);

  // Default budget limits per category (can be customized)
  const BUDGET_LIMITS = {
    travel: 50000,
    food: 10000,
    accommodation: 30000,
    office_supplies: 5000,
    client_meeting: 15000,
    training: 20000,
    other: 10000,
  };

  useEffect(() => {
    fetchBudgetData();
  }, [filters]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getBudgetTracking(params);
      setBudgets(response.categoryBudgets);
      setTotalSpent(response.totalSpent);
    } catch (error) {
      toast.error("Failed to fetch budget data");
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
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressVariant = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return "danger";
    if (percentage >= 80) return "warning";
    return "success";
  };

  const getTotalBudget = () => {
    return Object.values(BUDGET_LIMITS).reduce((sum, val) => sum + val, 0);
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

  const totalBudget = getTotalBudget();
  const budgetPercentage = (totalSpent / totalBudget) * 100;

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Budget Tracking</h2>
          <p className="text-muted">Monitor expense spending against budget limits</p>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 p-3">
        <Row>
          <Col md={4}>
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
          <Col md={4}>
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
          <Col md={4} className="d-flex align-items-end">
            <Button
              variant="outline-secondary"
              className="w-100"
              onClick={() => {
                setFilters({ startDate: "", endDate: "" });
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Overall Budget Summary */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6 className="text-muted mb-3">Total Budget</h6>
              <h3 className="mb-3">{formatCurrency(totalBudget)}</h3>
              <ProgressBar
                now={budgetPercentage}
                variant={getProgressVariant(totalSpent, totalBudget)}
                label={`${budgetPercentage.toFixed(1)}%`}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6 className="text-muted mb-3">Total Spent</h6>
              <h3 className="mb-3">{formatCurrency(totalSpent)}</h3>
              <p className="mb-0">
                <strong>Remaining:</strong>{" "}
                <span className={totalSpent > totalBudget ? "text-danger" : "text-success"}>
                  {formatCurrency(Math.max(0, totalBudget - totalSpent))}
                </span>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Budget Breakdown */}
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Budget by Category</h6>
            </Card.Header>
            <Card.Body>
              {budgets.length > 0 ? (
                <div className="space-y-3">
                  {budgets.map((budget) => {
                    const limit = BUDGET_LIMITS[budget._id] || 10000;
                    const percentage = (budget.spent / limit) * 100;
                    const isOverBudget = budget.spent > limit;

                    return (
                      <div key={budget._id} className="mb-4">
                        <Row className="mb-2">
                          <Col>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-1">
                                  {budget._id.replace(/_/g, " ").toUpperCase()}
                                </h6>
                                <small className="text-muted">
                                  {budget.count} expense{budget.count !== 1 ? "s" : ""}
                                </small>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold">
                                  {formatCurrency(budget.spent)} / {formatCurrency(limit)}
                                </div>
                                {isOverBudget && (
                                  <Badge bg="danger">
                                    Over by {formatCurrency(budget.spent - limit)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Col>
                        </Row>
                        <ProgressBar
                          now={Math.min(percentage, 100)}
                          variant={getProgressVariant(budget.spent, limit)}
                          label={`${percentage.toFixed(1)}%`}
                          className="mb-2"
                        />
                        <Row className="text-muted small">
                          <Col md={3}>
                            <Badge bg="warning">Pending: {formatCurrency(budget.pending)}</Badge>
                          </Col>
                          <Col md={3}>
                            <Badge bg="info">Approved: {formatCurrency(budget.approved)}</Badge>
                          </Col>
                        </Row>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert variant="info" className="mb-0">
                  No budget data available
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BudgetTracking;
