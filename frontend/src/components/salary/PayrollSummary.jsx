import { useState, useEffect, useCallback } from "react";
import { Card, Form, Spinner, Alert } from "react-bootstrap";
import {
  FaMoneyBillWave,
  FaUsers,
  FaChartLine,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { salarySlipApi } from "../../api/salaryApi";
import MobileFilterSheet from "../shared/MobileFilterSheet";
import ResponsiveChartGrid from "../shared/ResponsiveChartGrid";
import ResponsiveDataTable from "../shared/ResponsiveDataTable";
import FormFieldStack from "../shared/FormFieldStack";

const PayrollSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const fetchPayrollSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await salarySlipApi.getPayrollSummary(filters);
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching payroll summary:", error);
      toast.error("Failed to load payroll summary");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPayrollSummary();
  }, [fetchPayrollSummary]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <div className="mt-2">Loading payroll summary...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <Alert variant="info">
        No payroll data found for the selected period.
      </Alert>
    );
  }

  const departmentRows = Object.entries(summary?.byDepartment || {}).map(([dept, data]) => ({
    department: dept,
    count: data.count,
    totalNetSalary: formatCurrency(data.totalNetSalary),
  }));

  const statusRows = Object.entries(summary?.byStatus || {}).map(([status, count]) => ({
    status: status.replace("_", " "),
    count,
    percentage:
      (summary?.totalEmployees || 0) > 0
        ? ((count / (summary?.totalEmployees || 1)) * 100).toFixed(1)
        : 0,
  }));

  return (
    <>
      <MobileFilterSheet title="Payroll Period" showApply={false}>
        <FormFieldStack md={6}>
          <Form.Group>
            <Form.Label>Month</Form.Label>
            <Form.Select
              value={filters.month}
              onChange={(e) => handleFilterChange("month", parseInt(e.target.value))}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Year</Form.Label>
            <Form.Select
              value={filters.year}
              onChange={(e) => handleFilterChange("year", parseInt(e.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </FormFieldStack>
      </MobileFilterSheet>

      <ResponsiveChartGrid className="mb-4">
        <Card className="text-center h-100">
          <Card.Body>
            <div
              className="rounded-circle bg-primary bg-opacity-10 p-3 mx-auto mb-3"
              style={{ width: "60px", height: "60px" }}
            >
              <FaUsers className="text-primary" size={30} />
            </div>
            <h3 className="mb-1">{summary?.totalEmployees || 0}</h3>
            <p className="text-muted mb-0">Total Employees</p>
          </Card.Body>
        </Card>
        <Card className="text-center h-100">
          <Card.Body>
            <div
              className="rounded-circle bg-success bg-opacity-10 p-3 mx-auto mb-3"
              style={{ width: "60px", height: "60px" }}
            >
              <FaMoneyBillWave className="text-success" size={30} />
            </div>
            <h3 className="mb-1">{formatCurrency(summary?.totalGrossSalary || 0)}</h3>
            <p className="text-muted mb-0">Total Gross Salary</p>
          </Card.Body>
        </Card>
        <Card className="text-center h-100">
          <Card.Body>
            <div
              className="rounded-circle bg-danger bg-opacity-10 p-3 mx-auto mb-3"
              style={{ width: "60px", height: "60px" }}
            >
              <FaChartLine className="text-danger" size={30} />
            </div>
            <h3 className="mb-1">{formatCurrency(summary?.totalDeductions || 0)}</h3>
            <p className="text-muted mb-0">Total Deductions</p>
          </Card.Body>
        </Card>
        <Card className="text-center h-100">
          <Card.Body>
            <div
              className="rounded-circle bg-warning bg-opacity-10 p-3 mx-auto mb-3"
              style={{ width: "60px", height: "60px" }}
            >
              <FaFileInvoiceDollar className="text-warning" size={30} />
            </div>
            <h3 className="mb-1 text-success">{formatCurrency(summary?.totalNetSalary || 0)}</h3>
            <p className="text-muted mb-0">Total Net Payout</p>
          </Card.Body>
        </Card>
      </ResponsiveChartGrid>

      <ResponsiveChartGrid className="mb-4">
        <Card className="h-100">
          <Card.Header>
            <strong>Department-wise Breakdown</strong>
          </Card.Header>
          <Card.Body>
            {departmentRows.length === 0 ? (
              <Alert variant="info">No department data available</Alert>
            ) : (
              <ResponsiveDataTable
                columns={[
                  { key: "department", label: "Department", mobilePriority: 1 },
                  { key: "count", label: "Employees", mobilePriority: 2 },
                  { key: "totalNetSalary", label: "Total Payout", mobilePriority: 3 },
                ]}
                data={departmentRows}
                loading={false}
                paginated={false}
                sortable={false}
                keyField="department"
              />
            )}
          </Card.Body>
        </Card>

        <Card className="h-100">
          <Card.Header>
            <strong>Status Breakdown</strong>
          </Card.Header>
          <Card.Body>
            <ResponsiveDataTable
              columns={[
                {
                  key: "status",
                  label: "Status",
                  mobilePriority: 1,
                  render: (_, row) => <span className="text-capitalize">{row.status}</span>,
                },
                { key: "count", label: "Count", mobilePriority: 2 },
                { key: "percentage", label: "Percentage", mobilePriority: 3, render: (_, row) => `${row.percentage}%` },
              ]}
              data={statusRows}
              loading={false}
              paginated={false}
              sortable={false}
              keyField="status"
            />
          </Card.Body>
        </Card>
      </ResponsiveChartGrid>

      <Card>
        <Card.Header>
          <strong>Summary Statistics</strong>
        </Card.Header>
        <Card.Body>
          <ResponsiveChartGrid>
            <div className="text-center">
              <h5 className="text-muted">Average Gross Salary</h5>
              <h4 className="text-primary">
                {(summary?.totalEmployees || 0) > 0
                  ? formatCurrency((summary?.totalGrossSalary || 0) / (summary?.totalEmployees || 1))
                  : formatCurrency(0)}
              </h4>
            </div>
            <div className="text-center">
              <h5 className="text-muted">Average Net Salary</h5>
              <h4 className="text-success">
                {(summary?.totalEmployees || 0) > 0
                  ? formatCurrency((summary?.totalNetSalary || 0) / (summary?.totalEmployees || 1))
                  : formatCurrency(0)}
              </h4>
            </div>
            <div className="text-center">
              <h5 className="text-muted">Deduction Rate</h5>
              <h4 className="text-danger">
                {(summary?.totalGrossSalary || 0) > 0
                  ? (((summary?.totalDeductions || 0) / (summary?.totalGrossSalary || 1)) * 100).toFixed(1)
                  : 0}
                %
              </h4>
            </div>
            <div className="text-center">
              <h5 className="text-muted">Processing Status</h5>
              <h4 className="text-info">
                {(summary?.byStatus?.paid || 0)}/{(summary?.totalEmployees || 0)} Paid
              </h4>
            </div>
          </ResponsiveChartGrid>
        </Card.Body>
      </Card>
    </>
  );
};

export default PayrollSummary;
