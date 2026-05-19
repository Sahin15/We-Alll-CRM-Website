import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Form, Alert, Spinner, Table, Tabs, Tab, Modal, ProgressBar } from "react-bootstrap";
import { FaArrowLeft, FaCheck, FaTimes, FaMoneyBillWave, FaSearch, FaChartBar, FaFileInvoiceDollar, FaDownload, FaFileExcel, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getAllExpenses, markAsReimbursed, bulkApproveExpenses, bulkRejectExpenses, getReimbursementTracking, searchExpenses, exportExpenses, getExpenseAnalytics, getMonthlyTrends, getBudgetTracking, getCategoryStats, getBudgetTrackingWithLimits, getFinancialYears } from "../../api/expenseApi";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { formatDate, formatCurrency } from "../../utils/helpers";
import { EXPENSE_PURPOSES_ARRAY, getTypeColor } from "../../utils/expenseConstants";
import "./ExpenseManagement.css";

const ExpenseManagementConsolidated = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all-expenses");
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "all",
    expensePurpose: "all",
    expenseType: "all",
    startDate: "",
    endDate: "",
  });
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    categoryData: [],
    typeData: [],
    statusData: [],
    trendData: [],
    departmentData: [],
  });
  const [budgetData, setBudgetData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Reports state
  const [reportType, setReportType] = useState("summary");
  const [generating, setGenerating] = useState(false);
  
  // Budget state
  const [totalSpent, setTotalSpent] = useState(0);
  const [budgetLimits, setBudgetLimits] = useState({});
  const [currentFinancialYear, setCurrentFinancialYear] = useState("");
  const [hasBudgets, setHasBudgets] = useState(false);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  useEffect(() => {
    fetchData();
  }, [activeTab, page, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === "all-expenses" || activeTab === "approvals" || activeTab === "search") {
        await fetchExpenses();
      } else if (activeTab === "reimbursement") {
        await fetchReimbursementData();
      } else if (activeTab === "analytics") {
        await fetchAnalyticsData();
      } else if (activeTab === "budget") {
        await fetchBudgetData();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    const params = {
      page,
      limit: 10,
    };

    if (activeTab === "approvals") {
      params.status = "pending";
    } else if (filters.status !== "all") {
      params.status = filters.status;
    }

    if (filters.expensePurpose !== "all") {
      params.expensePurpose = filters.expensePurpose;
    }

    if (filters.expenseType !== "all") {
      params.expenseType = filters.expenseType;
    }

    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const response = await getAllExpenses(params);
    setExpenses(response.expenses ?? []);
    setPagination(response.pagination ?? {});
    setSelectedExpenses(new Set());
  };

  const fetchReimbursementData = async () => {
    try {
      const params = {
        page,
        limit: 10,
      };
      
      if (filters.expensePurpose !== "all") {
        params.expensePurpose = filters.expensePurpose;
      }
      
      if (filters.expenseType !== "all") {
        params.expenseType = filters.expenseType;
      }
      
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getReimbursementTracking(params);
      setExpenses(response.expenses || []);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching reimbursement data:", error);
      toast.error("Failed to fetch reimbursement data");
      setExpenses([]);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      console.log("Fetching analytics with params:", params);

      const [purposeAnalytics, typeAnalytics, statusAnalytics, departmentAnalytics, trendsRes, categoryStatsRes] = await Promise.all([
        getExpenseAnalytics({ ...params, groupBy: 'expensePurpose' }),
        getExpenseAnalytics({ ...params, groupBy: 'expenseType' }),
        getExpenseAnalytics({ ...params, groupBy: 'status' }),
        getExpenseAnalytics({ ...params, groupBy: 'department' }),
        getMonthlyTrends({ months: 12 }),
        getCategoryStats(params),
      ]);

      console.log("Analytics responses:", { 
        purposeAnalytics: purposeAnalytics?.analytics || [], 
        typeAnalytics: typeAnalytics?.analytics || [], 
        statusAnalytics: statusAnalytics?.analytics || [], 
        departmentAnalytics: departmentAnalytics?.analytics || [], 
        trendsRes: trendsRes?.trends || [], 
        categoryStatsRes: categoryStatsRes?.categoryStats || [] 
      });

      // Transform purpose analytics for pie chart
      const categoryData = (purposeAnalytics?.analytics || [])
        .filter(stat => stat._id && stat._id !== 'null' && stat._id !== null)
        .map(stat => ({
          name: stat._id ? stat._id.replace(/_/g, ' ').toUpperCase() : 'Unknown',
          value: stat.total || 0,
          count: stat.count || 0
        }));

      // Transform type analytics for pie chart
      const typeData = (typeAnalytics?.analytics || [])
        .filter(stat => stat._id && stat._id !== 'null' && stat._id !== null)
        .map(stat => ({
          name: stat._id ? stat._id.replace(/_/g, ' ').toUpperCase() : 'Unknown',
          value: stat.total || 0,
          count: stat.count || 0
        }));

      // Transform status analytics for status breakdown
      const statusData = (statusAnalytics?.analytics || [])
        .filter(stat => stat._id && stat._id !== 'null' && stat._id !== null)
        .map(stat => ({
          name: stat._id || 'Unknown',
          value: stat.total || 0,
          count: stat.count || 0
        }));

      // Transform department analytics
      const departmentData = (departmentAnalytics?.analytics || [])
        .filter(stat => stat._id && stat._id !== 'null' && stat._id !== null)
        .map(stat => ({
          name: stat.departmentName || stat._id || 'Unknown',
          value: stat.total || 0,
          count: stat.count || 0
        }));

      // Transform trends for line chart
      const trendData = (trendsRes?.trends || []).map(trend => ({
        month: `${trend._id?.year || 0}-${String(trend._id?.month || 0).padStart(2, '0')}`,
        total: trend.total || 0,
        count: trend.count || 0,
        approved: trend.approved || 0,
        pending: trend.pending || 0,
        rejected: trend.rejected || 0
      }));

      console.log("Transformed data:", { categoryData, typeData, statusData, departmentData, trendData });

      setAnalyticsData({
        categoryData,
        typeData,
        statusData,
        departmentData,
        trendData,
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
      console.error("Error details:", error.response?.data);
      // Set empty data on error
      setAnalyticsData({
        categoryData: [],
        typeData: [],
        statusData: [],
        departmentData: [],
        trendData: [],
      });
    }
  };

  const fetchBudgetData = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      // Fetch budget tracking with limits from backend
      const response = await getBudgetTrackingWithLimits(params);
      setBudgetData(response.categoryBudgets || []);
      setTotalSpent(response.totalSpent || 0);
      
      // Set budget limits from backend
      if (response.budgetMap) {
        setBudgetLimits(response.budgetMap);
      }
      
      // Set current financial year
      if (response.financialYear) {
        setCurrentFinancialYear(response.financialYear);
      }
      
      // Store whether budgets are configured
      setHasBudgets(response.hasBudgets || false);
    } catch (error) {
      console.error("Error fetching budget data:", error);
      toast.error("Failed to load budget data");
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
      toast.success(`${selectedExpenses.size} expense(s) approved`);
      setSelectedExpenses(new Set());
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk approve failed");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleApproveExpense = async (expenseId) => {
    try {
      setSubmitting(true);
      await bulkApproveExpenses({
        expenseIds: [expenseId],
      });
      toast.success("Expense approved");
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve expense");
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      setSearchPerformed(true);
      const searchPayload = {
        query: searchQuery,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== "" && v !== "all")
        ),
        page: 1,
        limit: 100, // Increase limit for search results
      };
      
      console.log("Sending search request:", searchPayload);
      
      const response = await searchExpenses(searchPayload);
      
      console.log("Search response:", response);
      
      setSearchResults(response.expenses || []);
      if (response.expenses && response.expenses.length > 0) {
        toast.success(`Found ${response.expenses.length} result(s)`);
      } else {
        console.warn("No results returned from search");
      }
    } catch (error) {
      console.error("Search error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Search failed");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setSubmitting(true);
      const response = await exportExpenses({
        format,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== "" && v !== "all")
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReport = async (format) => {
    try {
      setGenerating(true);
      const exportFilters = {
        reportType: reportType, // Include report type
      };
      
      // Add optional filters if set
      if (filters.expensePurpose && filters.expensePurpose !== "all") exportFilters.expensePurpose = filters.expensePurpose;
      if (filters.expenseType && filters.expenseType !== "all") exportFilters.expenseType = filters.expenseType;
      if (filters.status && filters.status !== "all") exportFilters.status = filters.status;
      if (filters.startDate) exportFilters.startDate = filters.startDate;
      if (filters.endDate) exportFilters.endDate = filters.endDate;

      console.log("Generating report with filters:", exportFilters);

      const response = await exportExpenses({
        format,
        filters: exportFilters,
      });

      if (format === "csv") {
        // CSV format returns XLSX blob
        const url = window.URL.createObjectURL(response);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expense_report_${reportType}_${new Date().getTime()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // JSON format returns JSON data
        const dataStr = JSON.stringify(response, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `expense_report_${reportType}_${new Date().getTime()}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast.success(`${reportType.toUpperCase()} report generated as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error(error.response?.data?.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const getProgressVariant = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return "danger";
    if (percentage >= 80) return "warning";
    return "success";
  };

  const getTotalBudget = () => {
    // Use budgetLimits from backend if available, otherwise return 0
    if (Object.keys(budgetLimits).length > 0) {
      return Object.values(budgetLimits).reduce((sum, val) => sum + val, 0);
    }
    // If no budgets are set, return 0
    return 0;
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

  const ExpenseTable = ({ data = expenses, showCheckbox = true, showActions = true }) => (
    <Card className="shadow-sm">
      <Table hover responsive className="mb-0">
        <thead className="table-light">
          <tr>
            {showCheckbox && (
              <th>
                <Form.Check
                  type="checkbox"
                  checked={selectedExpenses.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            <th>Employee</th>
            <th>Purpose</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((expense) => (
            <tr key={expense._id}>
              {showCheckbox && (
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedExpenses.has(expense._id)}
                    onChange={() => handleSelectExpense(expense._id)}
                  />
                </td>
              )}
              <td>
                <strong>{expense.employee?.name}</strong>
                <br />
                <small className="text-muted">{expense.employee?.email}</small>
              </td>
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
                <strong>{formatCurrency(expense.amount)}</strong>
              </td>
              <td>{formatDate(expense.date)}</td>
              <td>
                <Badge bg={getStatusBadge(expense.status)}>
                  {expense.status}
                </Badge>
              </td>
              {showActions && (
                <td>
                  <div className="d-flex gap-1">
                    {expense.status === "pending" && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApproveExpense(expense._id)}
                          disabled={submitting}
                          title="Approve Expense"
                        >
                          <FaCheck />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setSelectedExpenses(new Set([expense._id]));
                            setShowBulkRejectModal(true);
                          }}
                          disabled={submitting}
                          title="Reject Expense"
                        >
                          <FaTimes />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => navigate(`/expenses/${expense._id}`)}
                      title="View Details"
                    >
                      <FaEye />
                    </Button>
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
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );

  if (loading && expenses.length === 0 && analyticsData.categoryData.length === 0) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
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
          <h2 className="mb-0">Expense Management</h2>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4 p-3">
        <Row>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Purpose</Form.Label>
              <Form.Select
                name="expensePurpose"
                value={filters.expensePurpose}
                onChange={handleFilterChange}
              >
                <option value="all">All Purposes</option>
                {EXPENSE_PURPOSES_ARRAY.map((purpose) => (
                  <option key={purpose.value} value={purpose.value}>
                    {purpose.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Type</Form.Label>
              <Form.Select
                name="expenseType"
                value={filters.expenseType}
                onChange={handleFilterChange}
              >
                <option value="all">All Types</option>
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
          <Col md={2} className="d-flex align-items-end">
            <Button
              variant="outline-secondary"
              className="w-100"
              onClick={() => {
                setFilters({
                  status: "all",
                  expensePurpose: "all",
                  expenseType: "all",
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
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="all-expenses" title="All Expenses">
          {selectedExpenses.size > 0 && (
            <Card className="mb-4 p-3 bg-light border-primary">
              <Row className="align-items-center">
                <Col>
                  <strong>{selectedExpenses.size} expense(s) selected</strong>
                </Col>
                <Col md={6} className="d-flex gap-2 justify-content-end">
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
              <ExpenseTable />
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
        </Tab>

        <Tab eventKey="approvals" title="Pending Approvals">
          {selectedExpenses.size > 0 && (
            <Card className="mb-4 p-3 bg-light border-primary">
              <Row className="align-items-center">
                <Col>
                  <strong>{selectedExpenses.size} expense(s) selected</strong>
                </Col>
                <Col md={6} className="d-flex gap-2 justify-content-end">
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
            <Alert variant="info">No pending expenses</Alert>
          ) : (
            <>
              <ExpenseTable />
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
        </Tab>

        <Tab eventKey="reimbursement" title="Reimbursement">
          {expenses.length === 0 ? (
            <Alert variant="info">No reimbursement records found</Alert>
          ) : (
            <>
              <ExpenseTable showCheckbox={false} showActions={false} />
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
        </Tab>

        <Tab eventKey="search" title={<><FaSearch className="me-2" />Search & Export</>}>
          <Alert variant="info" className="mb-3">
            <small>
              <strong>Tip:</strong> Use the filters at the top (Status, Category, Date Range) to narrow down expenses before exporting. 
              Search by employee name, category, description, merchant, or notes to find specific expenses.
            </small>
          </Alert>
          
          <Card className="mb-4 p-3">
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Search</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by employee name, category, description, merchant, or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end gap-2">
                <Button
                  variant="primary"
                  className="flex-grow-1"
                  onClick={handleSearch}
                  disabled={loading || !searchQuery.trim()}
                >
                  <FaSearch className="me-2" />
                  Search
                </Button>
                {searchQuery && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setSearchPerformed(false);
                    }}
                  >
                    <FaTimes />
                  </Button>
                )}
              </Col>
            </Row>
          </Card>

          {((searchPerformed && searchResults.length > 0) || (!searchPerformed && expenses.length > 0)) && (
            <Card className="mb-4 p-3 bg-light">
              <Row className="align-items-center">
                <Col>
                  <h6 className="mb-0">
                    Export {searchPerformed ? 'Search Results' : 'All Expenses'}
                    <Badge bg="secondary" className="ms-2">
                      {searchPerformed ? searchResults.length : expenses.length} expenses
                    </Badge>
                  </h6>
                </Col>
                <Col md={4} className="d-flex gap-2 justify-content-end">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    disabled={submitting}
                  >
                    <FaDownload className="me-1" />
                    CSV
                  </Button>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => handleExport("json")}
                    disabled={submitting}
                  >
                    <FaDownload className="me-1" />
                    JSON
                  </Button>
                </Col>
              </Row>
            </Card>
          )}

          {searchPerformed && searchResults.length === 0 && !loading ? (
            <Alert variant="warning">
              <strong>No results found for "{searchQuery}"</strong>
              <p className="mb-0 mt-2">Try searching with different keywords or check if the employee name is spelled correctly.</p>
            </Alert>
          ) : !searchPerformed && expenses.length === 0 && !loading ? (
            <Alert variant="info">No expenses found. Create some expenses to see them here.</Alert>
          ) : loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <ExpenseTable 
              data={searchPerformed ? searchResults : expenses} 
              showCheckbox={false} 
              showActions={false} 
            />
          )}
        </Tab>

        <Tab eventKey="analytics" title={<><FaChartBar className="me-2" />Analytics</>}>
          {analyticsData.categoryData.length === 0 && analyticsData.statusData.length === 0 && analyticsData.trendData.length === 0 && analyticsData.departmentData.length === 0 ? (
            <Alert variant="info">No analytics data available. Add some expenses to see analytics.</Alert>
          ) : (
            <>
              <Row className="mb-4">
                {analyticsData.categoryData.length > 0 && (
                  <Col lg={6} className="mb-4">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="mb-3">Expenses by Purpose</h6>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={analyticsData.categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ₹${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {analyticsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
                {analyticsData.typeData.length > 0 && (
                  <Col lg={6} className="mb-4">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="mb-3">Expenses by Type</h6>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={analyticsData.typeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ₹${value}`}
                              outerRadius={80}
                              fill="#82ca9d"
                              dataKey="value"
                            >
                              {analyticsData.typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>

              <Row className="mb-4">
                {analyticsData.statusData.length > 0 && (
                  <Col lg={6} className="mb-4">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="mb-3">Expenses by Status</h6>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analyticsData.statusData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `₹${value}`} />
                            <Bar dataKey="value" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
                {analyticsData.categoryData.length > 0 && (
                  <Col lg={6} className="mb-4">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="mb-3">Purpose Distribution (Count)</h6>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analyticsData.categoryData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip formatter={(value) => value} />
                            <Bar dataKey="count" fill="#ffc658" name="Count" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
              
              <Row className="mb-4">
                {analyticsData.departmentData.length > 0 && (
                  <Col lg={12} className="mb-4">
                    <Card className="shadow-sm">
                      <Card.Body>
                        <h6 className="mb-3">Expenses by Department</h6>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={analyticsData.departmentData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} />
                            <Tooltip formatter={(value) => `₹${value}`} />
                            <Legend />
                            <Bar dataKey="value" fill="#82ca9d" name="Total Amount" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
              
              {analyticsData.trendData.length > 0 && (
                <Card className="shadow-sm mb-4">
                  <Card.Body>
                    <h6 className="mb-3">Monthly Trends</h6>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `₹${value}`} />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
                        <Line type="monotone" dataKey="approved" stroke="#82ca9d" name="Approved" />
                        <Line type="monotone" dataKey="pending" stroke="#ffc658" name="Pending" />
                        <Line type="monotone" dataKey="rejected" stroke="#ff8042" name="Rejected" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              )}

              {/* Summary Statistics */}
              <Row className="mb-4">
                {analyticsData.categoryData.length > 0 && (
                  <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Total Purposes</h6>
                        <h3 className="mb-0">{analyticsData.categoryData.length}</h3>
                        <small className="text-muted">Expense purposes tracked</small>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
                {analyticsData.typeData.length > 0 && (
                  <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Total Types</h6>
                        <h3 className="mb-0">{analyticsData.typeData.length}</h3>
                        <small className="text-muted">Expense types tracked</small>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
                {analyticsData.categoryData.length > 0 && (
                  <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Highest Purpose</h6>
                        <h5 className="mb-0">
                          {analyticsData.categoryData.reduce((max, curr) => curr.value > max.value ? curr : max, analyticsData.categoryData[0])?.name || 'N/A'}
                        </h5>
                        <small className="text-muted">
                          {formatCurrency(analyticsData.categoryData.reduce((max, curr) => curr.value > max.value ? curr : max, analyticsData.categoryData[0])?.value || 0)}
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
                {analyticsData.typeData.length > 0 && (
                  <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm h-100">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Highest Type</h6>
                        <h5 className="mb-0">
                          {analyticsData.typeData.reduce((max, curr) => curr.value > max.value ? curr : max, analyticsData.typeData[0])?.name || 'N/A'}
                        </h5>
                        <small className="text-muted">
                          {formatCurrency(analyticsData.typeData.reduce((max, curr) => curr.value > max.value ? curr : max, analyticsData.typeData[0])?.value || 0)}
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
            </>
          )}
        </Tab>

        <Tab eventKey="budget" title="Budget Tracking">
          {/* Financial Year Info */}
          {currentFinancialYear && (
            <Alert variant="info" className="mb-4">
              <strong>Financial Year:</strong> {currentFinancialYear} (April {currentFinancialYear.split('-')[0]} - March {currentFinancialYear.split('-')[1]})
            </Alert>
          )}
          
          {/* Expense Tracking View - No budgets required */}
          <Alert variant="success" className="mb-4">
            <h6>Expense Tracking</h6>
            <p className="mb-2">
              View total expenses by category for the financial year. This helps understand spending patterns before allocating budgets.
            </p>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => navigate('/expenses/budget-management')}
            >
              View Detailed Expense Tracking
            </Button>
          </Alert>

          {budgetData.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No expense data available for the selected period.
            </Alert>
          ) : (
            <>
              {/* Summary Cards */}
              <Row className="mb-4">
                <Col md={4}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <h6 className="text-muted mb-3">Total Expenses</h6>
                      <h3 className="mb-0">{formatCurrency(budgetData.reduce((sum, b) => sum + (b.spent || 0), 0))}</h3>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <h6 className="text-muted mb-3">Total Transactions</h6>
                      <h3 className="mb-0">{budgetData.reduce((sum, b) => sum + (b.count || 0), 0)}</h3>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <h6 className="text-muted mb-3">Average Expense</h6>
                      <h3 className="mb-0">
                        {formatCurrency(
                          budgetData.reduce((sum, b) => sum + (b.spent || 0), 0) / 
                          Math.max(budgetData.reduce((sum, b) => sum + (b.count || 0), 0), 1)
                        )}
                      </h3>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Category Breakdown */}
              <Card className="shadow-sm">
                <Card.Header className="bg-light">
                  <h6 className="mb-0">Expenses by Category</h6>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Category</th>
                          <th className="text-end">Total Expenses</th>
                          <th className="text-end">Number of Expenses</th>
                          <th className="text-end">Average Expense</th>
                          <th className="text-end">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetData.map((budget, index) => {
                          const totalSpent = budgetData.reduce((sum, b) => sum + (b.spent || 0), 0);
                          const percentage = totalSpent > 0 ? ((budget.spent / totalSpent) * 100).toFixed(1) : 0;
                          const average = budget.count > 0 ? (budget.spent / budget.count).toFixed(2) : 0;
                          
                          // Handle both string _id and object _id (purpose/type combination)
                          const categoryLabel = typeof budget._id === 'string' 
                            ? budget._id.replace(/_/g, " ").toUpperCase()
                            : budget._id?.purpose 
                              ? `${budget._id.purpose.replace(/_/g, " ")} / ${budget._id.type.replace(/_/g, " ")}`.toUpperCase()
                              : "Unknown";
                          
                          return (
                            <tr key={`${budget._id?.purpose || budget._id}-${budget._id?.type || index}`}>
                              <td>
                                <Badge bg="primary">
                                  {categoryLabel}
                                </Badge>
                              </td>
                              <td className="text-end">
                                <strong>{formatCurrency(budget.spent || 0)}</strong>
                              </td>
                              <td className="text-end">{budget.count || 0}</td>
                              <td className="text-end">{formatCurrency(average)}</td>
                              <td className="text-end">
                                <Badge bg="light" text="dark">{percentage}%</Badge>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="table-light fw-bold">
                          <td>TOTAL</td>
                          <td className="text-end">
                            {formatCurrency(budgetData.reduce((sum, b) => sum + (b.spent || 0), 0))}
                          </td>
                          <td className="text-end">
                            {budgetData.reduce((sum, b) => sum + (b.count || 0), 0)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(
                              budgetData.reduce((sum, b) => sum + (b.spent || 0), 0) / 
                              Math.max(budgetData.reduce((sum, b) => sum + (b.count || 0), 0), 1)
                            )}
                          </td>
                          <td className="text-end">100%</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>

        <Tab eventKey="reports" title={<><FaFileInvoiceDollar className="me-2" />Reports</>}>
          <Alert variant="info" className="mb-4">
            <small>
              <strong>How to use:</strong> Select a report type, optionally apply filters using the controls at the top, then export as CSV or JSON.
            </small>
          </Alert>

          {/* Report Type Selection */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">📊 Select Report Type</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                {[
                  { type: "summary", description: "Summary of all expenses with totals and statistics" },
                  { type: "detailed", description: "Detailed report with all expense information" },
                  { type: "category", description: "Breakdown of expenses by category" },
                  { type: "status", description: "Analysis of expenses by approval status" },
                  { type: "employee", description: "Employee-wise expense summary" },
                ].map(({ type, description }) => (
                  <Col md={6} lg={4} key={type} className="mb-3">
                    <Card
                      className={`cursor-pointer h-100 border-2 ${
                        reportType === type ? "border-primary bg-primary bg-opacity-10" : "border-light"
                      }`}
                      onClick={() => setReportType(type)}
                      style={{ cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <Card.Body>
                        <h6 className="mb-2 fw-bold">{type.replace(/_/g, " ").toUpperCase()}</h6>
                        <small className="text-muted">{description}</small>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>

          {/* Filters Summary */}
          <Card className="shadow-sm mb-4 bg-light">
            <Card.Body>
              <h6 className="mb-3">🔍 Active Filters</h6>
              <Row>
                <Col md={2}>
                  <small className="text-muted">Date Range:</small>
                  <p className="mb-0 small fw-medium">
                    {filters.startDate && filters.endDate
                      ? `${filters.startDate} to ${filters.endDate}`
                      : "All dates"}
                  </p>
                </Col>
                <Col md={2}>
                  <small className="text-muted">Purpose:</small>
                  <p className="mb-0 small fw-medium text-capitalize">
                    {filters.expensePurpose && filters.expensePurpose !== "all" ? filters.expensePurpose : "All"}
                  </p>
                </Col>
                <Col md={2}>
                  <small className="text-muted">Type:</small>
                  <p className="mb-0 small fw-medium text-capitalize">
                    {filters.expenseType && filters.expenseType !== "all" ? filters.expenseType : "All"}
                  </p>
                </Col>
                <Col md={2}>
                  <small className="text-muted">Status:</small>
                  <p className="mb-0 small fw-medium text-capitalize">
                    {filters.status !== "all" ? filters.status : "All"}
                  </p>
                </Col>
                <Col md={2}>
                  <small className="text-muted">Report Type:</small>
                  <p className="mb-0 small fw-medium text-capitalize">
                    {reportType ? reportType.replace(/_/g, " ") : "N/A"}
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Export Options */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">📥 Export Report</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Button
                    variant="success"
                    className="w-100 mb-3 d-flex align-items-center justify-content-center"
                    onClick={() => handleGenerateReport("csv")}
                    disabled={generating}
                  >
                    <FaFileExcel className="me-2" />
                    {generating ? "Generating CSV..." : "Export as CSV"}
                  </Button>
                  <small className="text-muted">Best for spreadsheets and data analysis</small>
                </Col>
                <Col md={6}>
                  <Button
                    variant="info"
                    className="w-100 mb-3 d-flex align-items-center justify-content-center"
                    onClick={() => handleGenerateReport("json")}
                    disabled={generating}
                  >
                    <FaDownload className="me-2" />
                    {generating ? "Generating JSON..." : "Export as JSON"}
                  </Button>
                  <small className="text-muted">Best for data integration and APIs</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Report Information */}
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">ℹ️ Report Details</h6>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-0">
                <div className="mb-2">
                  <strong>Report Type:</strong> {reportType ? reportType.replace(/_/g, " ").toUpperCase() : "N/A"}
                </div>
                <div className="mb-2">
                  <strong>Date Range:</strong> {filters.startDate && filters.endDate
                    ? `${filters.startDate} to ${filters.endDate}`
                    : "All available data"}
                </div>
                <div className="mb-2">
                  <strong>Purpose Filter:</strong> {filters.expensePurpose && filters.expensePurpose !== "all" ? filters.expensePurpose.replace(/_/g, " ") : "All purposes"}
                </div>
                <div className="mb-2">
                  <strong>Type Filter:</strong> {filters.expenseType && filters.expenseType !== "all" ? filters.expenseType.replace(/_/g, " ") : "All types"}
                </div>
                <div>
                  <strong>Status Filter:</strong> {filters.status !== "all" ? filters.status : "All statuses"}
                </div>
              </Alert>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

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

export default ExpenseManagementConsolidated;
