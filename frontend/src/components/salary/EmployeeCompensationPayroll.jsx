import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Form,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { payrollCompensationApi } from "../../api/payrollSimpleApi";
import { PayrollDataTable } from "../payroll-ui";

const formatInr = (n) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(n));

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN") : "—";

/**
 * Payroll tab: employee roster — opens full journey page on row click.
 */
const EmployeeCompensationPayroll = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRoster = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollCompensationApi.getRoster();
      setRows(res.data?.data?.rows || []);
    } catch {
      toast.error("Failed to load employee compensation list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const e = r.employee || {};
      return (
        String(e.name || "").toLowerCase().includes(q) ||
        String(e.employeeId || "").toLowerCase().includes(q) ||
        String(e.department?.name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const openEmployee = (id) => {
    if (!id) return;
    navigate(`/salary-management/compensation/${id}`);
  };

  return (
    <div>
      <Alert variant="light" className="border mb-3 py-2 small">
        Long-term compensation for each employee. Click a row to open their full
        journey. For this month&apos;s breakdown, adjustments, and crediting
        payslips, use <strong>Salary Preview</strong> and{" "}
        <strong>Salary Slips</strong>.
      </Alert>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
          <strong>Employees</strong>
          <Form.Control
            size="sm"
            style={{ maxWidth: 280 }}
            placeholder="Search name, ID, or department"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted text-center py-4 mb-0">
              No employees match your search.
            </p>
          ) : (
            <PayrollDataTable
              headers={
                <>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Current monthly salary</th>
                  <th className="text-muted small">Active since</th>
                </>
              }
            >
              {filtered.map((row) => {
                const id = row.employee?._id;
                return (
                  <tr
                    key={id}
                    style={{ cursor: "pointer" }}
                    onClick={() => openEmployee(id)}
                    title="Open compensation journey"
                  >
                    <td>
                      <strong>{row.employee?.name}</strong>
                      <br />
                      <small className="text-muted">
                        {row.employee?.employeeId}
                      </small>
                    </td>
                    <td>{row.employee?.department?.name || "—"}</td>
                    <td>
                      {row.hasStructure ? (
                        formatInr(row.monthlySalary)
                      ) : (
                        <Badge bg="secondary">No structure</Badge>
                      )}
                    </td>
                    <td className="text-muted small">
                      {row.hasStructure ? formatDate(row.effectiveFrom) : "—"}
                    </td>
                  </tr>
                );
              })}
            </PayrollDataTable>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeCompensationPayroll;
