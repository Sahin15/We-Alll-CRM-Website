import React, { useState } from "react";
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Table, Badge } from "react-bootstrap";
import { FaSearch, FaDownload, FaFileExcel, FaFile } from "react-icons/fa";
import { searchExpenses, exportExpenses } from "../../api/expenseApi";
import toast from "../../utils/toast";
import { formatDate, formatCurrency } from "../../utils/helpers";

const ExpenseSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    paymentMethod: "",
  });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [exporting, setExporting] = useState(false);

  const handleSearch = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await searchExpenses({
        query: searchQuery,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== "")
        ),
        page: pageNum,
        limit: 10,
      });
      setExpenses(response.expenses);
      setPagination(response.pagination);
      setSearched(true);
      setPage(pageNum);
    } catch (error) {
      toast.error("Search failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const response = await exportExpenses({
        format,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== "")
        ),
      });

      if (format === "csv") {
        const url = window.URL.createObjectURL(response);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expenses_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } else {
        const dataStr = JSON.stringify(response, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expenses_${new Date().getTime()}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Export failed");
      console.error(error);
    } finally {
      setExporting(false);
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
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Search & Export Expenses</h2>
          <p className="text-muted">Find and export expenses with advanced filters</p>
        </Col>
      </Row>

      {/* Search Bar */}
      <Card className="mb-4 p-3">
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label>Search</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search by description, merchant, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex align-items-end">
            <Button
              variant="primary"
              className="w-100"
              onClick={() => handleSearch()}
              disabled={loading}
            >
              <FaSearch className="me-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </Col>
        </Row>

        {/* Filters */}
        <Row>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="reimbursed">Reimbursed</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
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
          <Col md={2}>
            <Form.Group>
              <Form.Label>Min Amount</Form.Label>
              <Form.Control
                type="number"
                name="minAmount"
                value={filters.minAmount}
                onChange={handleFilterChange}
                placeholder="0"
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Max Amount</Form.Label>
              <Form.Control
                type="number"
                name="maxAmount"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                placeholder="0"
              />
            </Form.Group>
          </Col>
          <Col md={2}>
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
          <Col md={2}>
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
        </Row>

        <Row className="mt-3">
          <Col md={2}>
            <Form.Group>
              <Form.Label>Payment Method</Form.Label>
              <Form.Select
                name="paymentMethod"
                value={filters.paymentMethod}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={10} className="d-flex align-items-end gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => {
                setFilters({
                  status: "",
                  category: "",
                  minAmount: "",
                  maxAmount: "",
                  startDate: "",
                  endDate: "",
                  paymentMethod: "",
                });
              }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Export Buttons */}
      {searched && expenses.length > 0 && (
        <Card className="mb-4 p-3 bg-light">
          <Row>
            <Col>
              <h6>Export Results</h6>
            </Col>
            <Col md={4} className="d-flex gap-2 justify-content-end">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={exporting}
              >
                <FaFileExcel className="me-2" />
                CSV
              </Button>
              <Button
                variant="info"
                size="sm"
                onClick={() => handleExport("json")}
                disabled={exporting}
              >
                <FaFile className="me-2" />
                JSON
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Results */}
      {searched && (
        <>
          {expenses.length === 0 ? (
            <Alert variant="info">No expenses found matching your search</Alert>
          ) : (
            <>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                  <strong>Results: {pagination.total} expense(s) found</strong>
                </Card.Header>
                <Table hover responsive className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Description</th>
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
                          <Badge bg={getStatusBadge(expense.status)}>
                            {expense.status}
                          </Badge>
                        </td>
                        <td>
                          <small>{expense.description.substring(0, 40)}...</small>
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
                      onClick={() => handleSearch(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="align-self-center">
                      Page {page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline-secondary"
                      disabled={page === pagination.pages}
                      onClick={() => handleSearch(page + 1)}
                    >
                      Next
                    </Button>
                  </Col>
                </Row>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default ExpenseSearch;
