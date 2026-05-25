import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Table, Badge } from "react-bootstrap";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getFinancialYears, getCategoryStats } from "../../api/expenseApi";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";
import { getPurposeLabel, getTypeLabel } from "../../utils/expenseConstants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import PageHeader from "../../components/shared/PageHeader";
import { chartHeight } from "../../components/shared/ResponsiveChartGrid";
import { useBreakpoint } from "../../context/BreakpointContext";
import "./ExpenseManagement.css";

const BudgetManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Role-based access control
  if (!user || (user.role !== "admin" && user.role !== "superadmin" && user.role !== "hr" && user.role !== "manager")) {
    return (
      <Container className="py-5 text-center">
        <Alert variant="danger">
          <h4>Access Denied</h4>
          <p>You don't have permission to access Expense Tracking. Only Admin, Super Admin, HR, and Managers can view expense reports.</p>
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            <FaArrowLeft className="me-2" />
            Go Back
          </Button>
        </Alert>
      </Container>
    );
  }

  const [categoryExpenses, setCategoryExpenses] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const { isCompact } = useBreakpoint();

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658"];

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  useEffect(() => {
    if (selectedFinancialYear) {
      fetchExpenseData();
    }
  }, [selectedFinancialYear]);

  const fetchFinancialYears = async () => {
    try {
      const response = await getFinancialYears();
      setFinancialYears(response.financialYears || []);
      setSelectedFinancialYear(response.currentFinancialYear);
    } catch (error) {
      console.error("Error fetching financial years:", error);
      toast.error("Failed to load financial years");
    }
  };

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      
      // Get category-wise expense statistics
      const response = await getCategoryStats({ financialYear: selectedFinancialYear });
      const stats = response.categoryStats || [];
      
      // Transform data for display
      setCategoryExpenses(stats);
      
      // Prepare chart data
      const chartData = stats.map(stat => ({
        name: `${getPurposeLabel(stat._id.purpose)} - ${getTypeLabel(stat._id.type)}`,
        total: stat.total || 0,
        count: stat.count || 0,
        average: stat.count > 0 ? (stat.total / stat.count).toFixed(2) : 0
      }));
      
      setChartData(chartData);
    } catch (error) {
      console.error("Error fetching expense data:", error);
      toast.error("Failed to load expense data");
    } finally {
      setLoading(false);
    }
  };

  const getTotalExpenses = () => {
    return categoryExpenses.reduce((sum, cat) => sum + (cat.total || 0), 0);
  };

  const getTotalCount = () => {
    return categoryExpenses.reduce((sum, cat) => sum + (cat.count || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleExportData = () => {
    try {
      // Create CSV content
      let csvContent = "Purpose,Type,Total Expenses,Number of Expenses,Average Expense\n";
      
      categoryExpenses.forEach(cat => {
        const avg = cat.count > 0 ? (cat.total / cat.count).toFixed(2) : 0;
        csvContent += `"${getPurposeLabel(cat._id.purpose)}","${getTypeLabel(cat._id.type)}",${cat.total},${cat.count},${avg}\n`;
      });
      
      csvContent += `\nTotal,${getTotalExpenses()},${getTotalCount()},${getTotalCount() > 0 ? (getTotalExpenses() / getTotalCount()).toFixed(2) : 0}\n`;
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracking-${selectedFinancialYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Expense data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
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

  return (
    <Container fluid className="py-4">
      <PageHeader
        title="Expense Tracking"
        actions={
          <>
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
              <FaArrowLeft className="me-2" />
              Back
            </Button>
            <Form.Select
              value={selectedFinancialYear}
              onChange={(e) => setSelectedFinancialYear(e.target.value)}
              style={{ minWidth: "150px" }}
              aria-label="Financial year"
            >
              {financialYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="primary"
              onClick={handleExportData}
              disabled={categoryExpenses.length === 0}
            >
              <FaDownload className="me-2" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* Info Alert */}
      <Alert variant="info" className="mb-4">
        <strong>Expense Tracking:</strong> View total expenses by category for the financial year (April to March). 
        This helps understand spending patterns before allocating budgets.
        <br />
        <small><strong>Current Financial Year:</strong> {selectedFinancialYear}</small>
      </Alert>

      {/* Summary Cards */}
      <div className="stat-grid mb-4">
        <Card className="shadow-sm">
          <Card.Body>
            <h6 className="text-muted mb-3">Total Expenses</h6>
            <h3 className="mb-0">{formatCurrency(getTotalExpenses())}</h3>
          </Card.Body>
        </Card>
        <Card className="shadow-sm">
          <Card.Body>
            <h6 className="text-muted mb-3">Total Transactions</h6>
            <h3 className="mb-0">{getTotalCount()}</h3>
          </Card.Body>
        </Card>
        <Card className="shadow-sm">
          <Card.Body>
            <h6 className="text-muted mb-3">Average Expense</h6>
            <h3 className="mb-0">
              {getTotalCount() > 0 ? formatCurrency(getTotalExpenses() / getTotalCount()) : "₹0"}
            </h3>
          </Card.Body>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-light">
            <h6 className="mb-0">Expenses by Category</h6>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={chartHeight(isCompact)}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="total" fill="#0088FE" name="Total Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      )}

      {/* Category Breakdown Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Category Breakdown</h6>
        </Card.Header>
        <Card.Body>
          {categoryExpenses.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No expenses recorded for the selected financial year.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Purpose</th>
                    <th>Type</th>
                    <th className="text-end">Total Expenses</th>
                    <th className="text-end">Number of Expenses</th>
                    <th className="text-end">Average Expense</th>
                    <th className="text-end">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryExpenses.map((cat, index) => {
                    const percentage = getTotalExpenses() > 0 ? ((cat.total / getTotalExpenses()) * 100).toFixed(1) : 0;
                    const average = cat.count > 0 ? (cat.total / cat.count).toFixed(2) : 0;
                    
                    return (
                      <tr key={`${cat._id.purpose}-${cat._id.type}`}>
                        <td>
                          <Badge bg="primary" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                            {getPurposeLabel(cat._id.purpose)}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="secondary">
                            {getTypeLabel(cat._id.type)}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <strong>{formatCurrency(cat.total)}</strong>
                        </td>
                        <td className="text-end">{cat.count}</td>
                        <td className="text-end">{formatCurrency(average)}</td>
                        <td className="text-end">
                          <Badge bg="light" text="dark">{percentage}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="table-light fw-bold">
                    <td colSpan="2">TOTAL</td>
                    <td className="text-end">{formatCurrency(getTotalExpenses())}</td>
                    <td className="text-end">{getTotalCount()}</td>
                    <td className="text-end">
                      {getTotalCount() > 0 ? formatCurrency(getTotalExpenses() / getTotalCount()) : "₹0"}
                    </td>
                    <td className="text-end">100%</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BudgetManagement;
