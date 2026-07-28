import { useState, useEffect, useCallback } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Spinner,
  Alert,
  Table,
} from "react-bootstrap";
import {
  FaMoneyBillWave,
  FaUsers,
  FaChartLine,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { salarySlipApi } from "../../api/salaryApi";
import { departmentApi } from "../../api/departmentApi";

/**
 * Ensure byDepartment always has every org department (zeros if no slips).
 * @param {object} summary
 * @param {Array<{ name?: string }>} departments
 */
const mergeDepartmentsIntoSummary = (summary, departments) => {
  if (!summary) return summary;
  const byDepartment = { ...(summary.byDepartment || {}) };
  (departments || []).forEach((dept) => {
    const name = dept?.name;
    if (!name) return;
    if (!byDepartment[name]) {
      byDepartment[name] = { count: 0, totalNetSalary: 0 };
    }
  });
  return { ...summary, byDepartment };
};

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
      const [payrollRes, departments] = await Promise.all([
        salarySlipApi.getPayrollSummary(filters),
        departmentApi.getAllDepartments().catch(() => []),
      ]);

      // salarySlipApi returns Axios response; departmentApi returns body
      const payload = payrollRes?.data ?? payrollRes;
      const deptList = Array.isArray(departments) ? departments : [];
      setSummary(mergeDepartmentsIntoSummary(payload, deptList));
    } catch (error) {
      console.error("Error fetching payroll summary:", error);
      toast.error("Failed to load payroll summary");
      setSummary(null);
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

  return (
    <>
      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
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
        </Col>
        <Col md={3}>
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
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4 align-items-stretch">
        <Col md={3} className="d-flex">
          <Card className="text-center w-100">
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
        </Col>
        <Col md={3} className="d-flex">
          <Card className="text-center w-100">
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
        </Col>
        <Col md={3} className="d-flex">
          <Card className="text-center w-100">
            <Card.Body>
              <div
                className="rounded-circle bg-info bg-opacity-10 p-3 mx-auto mb-3"
                style={{ width: "60px", height: "60px" }}
              >
                <FaChartLine className="text-info" size={30} />
              </div>
              <h3 className="mb-1">
                {Math.max(
                  0,
                  (summary?.totalEmployees || 0) - (summary?.byStatus?.paid || 0)
                )}
              </h3>
              <p className="text-muted mb-0">Pending Payment</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="d-flex">
          <Card className="text-center w-100">
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
        </Col>
      </Row>

      <Row>
        {/* Department-wise Breakdown */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <strong>Department-wise Breakdown</strong>
            </Card.Header>
            <Card.Body>
              {Object.keys(summary?.byDepartment || {}).length === 0 ? (
                <Alert variant="info">
                  No departments found. Add departments under organization setup.
                </Alert>
              ) : (
                <>
                  {(summary?.totalEmployees || 0) === 0 && (
                    <Alert variant="light" className="mb-3 py-2">
                      No salary slips for this month yet — departments are listed with zero payout.
                    </Alert>
                  )}
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Employees</th>
                        <th>Total Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary?.byDepartment || {})
                        .sort(([a], [b]) => {
                          if (a === "Unassigned") return 1;
                          if (b === "Unassigned") return -1;
                          return a.localeCompare(b);
                        })
                        .map(([dept, data]) => (
                          <tr key={dept}>
                            <td>{dept}</td>
                            <td>{data.count}</td>
                            <td>{formatCurrency(data.totalNetSalary)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Status Breakdown */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <strong>Status Breakdown</strong>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary?.byStatus || {}).map(([status, count]) => {
                    const percentage = (summary?.totalEmployees || 0) > 0 
                      ? ((count / (summary?.totalEmployees || 1)) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <tr key={status}>
                        <td className="text-capitalize">{status.replace('_', ' ')}</td>
                        <td>{count}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Summary Statistics */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <strong>Summary Statistics</strong>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <div className="text-center">
                    <h5 className="text-muted">Average Gross Salary</h5>
                    <h4 className="text-primary">
                      {(summary?.totalEmployees || 0) > 0
                        ? formatCurrency((summary?.totalGrossSalary || 0) / (summary?.totalEmployees || 1))
                        : formatCurrency(0)
                      }
                    </h4>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h5 className="text-muted">Average Net Salary</h5>
                    <h4 className="text-success">
                      {(summary?.totalEmployees || 0) > 0
                        ? formatCurrency((summary?.totalNetSalary || 0) / (summary?.totalEmployees || 1))
                        : formatCurrency(0)
                      }
                    </h4>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h5 className="text-muted">Deduction Rate</h5>
                    <h4 className="text-danger">
                      {(summary?.totalGrossSalary || 0) > 0
                        ? (((summary?.totalDeductions || 0) / (summary?.totalGrossSalary || 1)) * 100).toFixed(1)
                        : 0
                      }%
                    </h4>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <h5 className="text-muted">Processing Status</h5>
                    <h4 className="text-info">
                      {(summary?.byStatus?.paid || 0)}/{(summary?.totalEmployees || 0)} Paid
                    </h4>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PayrollSummary;