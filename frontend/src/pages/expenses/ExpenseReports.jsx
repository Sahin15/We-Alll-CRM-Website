import React, { useState } from "react";
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from "react-bootstrap";
import { FaFileExcel, FaFilePdf, FaDownload } from "react-icons/fa";
import { exportExpenses } from "../../api/expenseApi";
import toast from "../../utils/toast";

const ExpenseReports = () => {
  const [reportType, setReportType] = useState("summary");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
    status: "",
  });
  const [generating, setGenerating] = useState(false);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerateReport = async (format) => {
    if (!filters.startDate || !filters.endDate) {
      toast.warning("Please select date range");
      return;
    }

    try {
      setGenerating(true);
      const exportFilters = {};
      if (filters.category) exportFilters.category = filters.category;
      if (filters.status) exportFilters.status = filters.status;
      exportFilters.startDate = filters.startDate;
      exportFilters.endDate = filters.endDate;

      const response = await exportExpenses({
        format,
        filters: exportFilters,
      });

      if (format === "csv") {
        const url = window.URL.createObjectURL(response);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expense_report_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } else {
        const dataStr = JSON.stringify(response, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expense_report_${new Date().getTime()}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }

      toast.success(`Report generated as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to generate report");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const reportDescriptions = {
    summary: "Summary of all expenses with totals and statistics",
    detailed: "Detailed report with all expense information",
    category: "Breakdown of expenses by category",
    status: "Analysis of expenses by approval status",
    employee: "Employee-wise expense summary",
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Expense Reports</h2>
          <p className="text-muted">Generate and export expense reports</p>
        </Col>
      </Row>

      {/* Report Type Selection */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Select Report Type</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                {Object.entries(reportDescriptions).map(([type, description]) => (
                  <Col md={6} lg={4} key={type} className="mb-3">
                    <Card
                      className={`cursor-pointer h-100 ${
                        reportType === type ? "border-primary" : ""
                      }`}
                      onClick={() => setReportType(type)}
                      style={{ cursor: "pointer" }}
                    >
                      <Card.Body>
                        <h6 className="mb-2">{type.replace(/_/g, " ").toUpperCase()}</h6>
                        <small className="text-muted">{description}</small>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 p-3">
        <Row>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Start Date *</Form.Label>
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
              <Form.Label>End Date *</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="">All Categories</option>
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
        </Row>
      </Card>

      {/* Export Options */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Export Report</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Button
                    variant="success"
                    className="w-100 mb-3"
                    onClick={() => handleGenerateReport("csv")}
                    disabled={generating}
                  >
                    <FaFileExcel className="me-2" />
                    {generating ? "Generating..." : "Export as CSV"}
                  </Button>
                </Col>
                <Col md={6}>
                  <Button
                    variant="info"
                    className="w-100 mb-3"
                    onClick={() => handleGenerateReport("json")}
                    disabled={generating}
                  >
                    <FaDownload className="me-2" />
                    {generating ? "Generating..." : "Export as JSON"}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Report Preview */}
      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Report Information</h6>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-0">
                <strong>Report Type:</strong> {reportType.replace(/_/g, " ").toUpperCase()}
                <br />
                <strong>Date Range:</strong> {filters.startDate || "Not selected"} to{" "}
                {filters.endDate || "Not selected"}
                <br />
                <strong>Filters Applied:</strong>{" "}
                {filters.category || filters.status
                  ? `${filters.category ? `Category: ${filters.category}` : ""} ${
                      filters.status ? `Status: ${filters.status}` : ""
                    }`
                  : "None"}
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ExpenseReports;
