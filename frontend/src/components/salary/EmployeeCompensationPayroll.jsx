import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Form,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaBuilding,
  FaCheckCircle,
  FaEllipsisV,
  FaExclamationCircle,
  FaEye,
  FaFilter,
  FaMoneyCheckAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUserFriends,
} from "react-icons/fa";
import { payrollCompensationApi } from "../../api/payrollSimpleApi";
import {
  PayrollDataTable,
  PayrollDropdownMenu,
  StatusChip,
} from "../payroll-ui";

const formatInr = (n) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(n));

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const initials = (name) => {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = [
  "#6f42c1",
  "#0d6efd",
  "#198754",
  "#fd7e14",
  "#d63384",
  "#20c997",
  "#6610f2",
];

const avatarColor = (id) => {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};

/**
 * Payroll tab: employee roster — opens full journey page on row click.
 *
 */
const EmployeeCompensationPayroll = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(() => new Set());

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

  const departments = useMemo(() => {
    const names = new Set();
    rows.forEach((r) => {
      const n = r.employee?.department?.name;
      if (n) names.add(n);
    });
    return Array.from(names).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const e = r.employee || {};
      if (deptFilter !== "all" && (e.department?.name || "") !== deptFilter) {
        return false;
      }
      if (statusFilter === "configured" && !r.hasStructure) return false;
      if (statusFilter === "missing" && r.hasStructure) return false;
      if (!q) return true;
      return (
        String(e.name || "").toLowerCase().includes(q) ||
        String(e.employeeId || "").toLowerCase().includes(q) ||
        String(e.department?.name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, deptFilter, statusFilter]);

  const filteredIds = useMemo(
    () => filtered.map((r) => r.employee?._id).filter(Boolean),
    [filtered]
  );

  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const toggleAll = (checked) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filteredIds));
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEmployee = (id) => {
    if (!id) return;
    navigate(`/salary-management/compensation/${id}`);
  };

  const clearFilters = () => {
    setSearch("");
    setDeptFilter("all");
    setStatusFilter("all");
  };

  const filtersActive =
    search.trim() !== "" || deptFilter !== "all" || statusFilter !== "all";

  const configuredInView = useMemo(
    () => filtered.filter((r) => r.hasStructure).length,
    [filtered]
  );

  return (
    <Card className="shadow-sm border-0 payroll-compensation-card">
      <Card.Header className="payroll-comp-card-header border-0 pb-0">
        <div className="payroll-comp-section-head">
          <div className="payroll-comp-title-block">
            <span className="payroll-comp-title-icon" aria-hidden>
              <FaMoneyCheckAlt size={20} />
            </span>
            <div>
              <h2 className="payroll-comp-title h6 mb-0">Employee compensation</h2>
              <p className="payroll-comp-subtitle text-muted mb-0">
                Salary structures, gross pay, and CTC for your roster
              </p>
            </div>
          </div>
          <Button
            className="payroll-comp-cta"
            onClick={() =>
              navigate("/salary-management/legacy?tab=structures")
            }
          >
            <FaPlus className="me-2" aria-hidden />
            Configure salary
          </Button>
        </div>

        <div className="payroll-comp-meta">
          <span className="payroll-comp-meta-pill">
            <strong>{filtered.length}</strong>
            <span className="text-muted">
              {filtered.length === rows.length
                ? " employees"
                : ` of ${rows.length} shown`}
            </span>
          </span>
          <span className="payroll-comp-meta-pill payroll-comp-meta-pill--success">
            <strong>{configuredInView}</strong>
            <span className="text-muted"> configured</span>
          </span>
          {selected.size > 0 && (
            <span className="payroll-comp-meta-pill payroll-comp-meta-pill--primary">
              <strong>{selected.size}</strong>
              <span className="text-muted"> selected</span>
            </span>
          )}
        </div>

        <div className="payroll-comp-toolbar">
          <InputGroup size="sm" className="payroll-comp-search-group">
            <InputGroup.Text className="payroll-comp-input-icon">
              <FaSearch aria-hidden />
            </InputGroup.Text>
            <Form.Control
              className="payroll-comp-filter-search"
              placeholder="Search name, ID, or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
            />
            {search.trim() ? (
              <Button
                variant="outline-secondary"
                className="payroll-comp-search-clear"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <FaTimes aria-hidden />
              </Button>
            ) : null}
          </InputGroup>

          <div className="payroll-comp-filter-group">
            <span className="payroll-comp-filter-icon" aria-hidden>
              <FaBuilding />
            </span>
            <Form.Select
              size="sm"
              className="payroll-comp-filter-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Department filter"
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="payroll-comp-filter-group">
            <span className="payroll-comp-filter-icon" aria-hidden>
              <FaFilter />
            </span>
            <Form.Select
              size="sm"
              className="payroll-comp-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Structure status filter"
            >
              <option value="all">All status</option>
              <option value="configured">Configured</option>
              <option value="missing">No structure</option>
            </Form.Select>
          </div>

          {filtersActive ? (
            <Button
              variant="outline-secondary"
              size="sm"
              className="payroll-comp-clear-btn"
              onClick={clearFilters}
            >
              <FaTimes className="me-1" aria-hidden />
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="payroll-comp-empty text-center py-5 px-3">
            <span className="payroll-comp-empty-icon" aria-hidden>
              <FaUserFriends size={28} />
            </span>
            <p className="fw-semibold mb-1">No employees match your filters</p>
            <p className="text-muted small mb-3">
              Try a different search or clear filters to see the full roster.
            </p>
            {filtersActive ? (
              <Button
                size="sm"
                variant="outline-primary"
                onClick={clearFilters}
              >
                <FaTimes className="me-1" aria-hidden />
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="payroll-preview-table-wrap">
            <PayrollDataTable
              responsive={false}
              tableClassName="payroll-comp-table"
              headers={
                <>
                  <th className="payroll-col-employee payroll-emp-head">
                    <div className="payroll-emp-head-inner">
                      <Form.Check
                        type="checkbox"
                        className="payroll-comp-check"
                        aria-label="Select all employees"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                      <span>Employee</span>
                    </div>
                  </th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th className="payroll-col-money text-end">Monthly gross</th>
                  <th className="payroll-col-money text-end">Annual CTC</th>
                  <th className="payroll-col-date">Effective since</th>
                  <th className="payroll-col-status">Status</th>
                  <th className="text-end payroll-col-actions">Actions</th>
                </>
              }
            >
              {filtered.map((row) => {
                const id = row.employee?._id;
                const annual =
                  row.monthlySalary != null
                    ? Number(row.monthlySalary) * 12
                    : null;
                return (
                  <tr key={id}>
                    <td className="payroll-emp-cell">
                      <div className="payroll-emp-cell-inner">
                        <Form.Check
                          type="checkbox"
                          className="payroll-comp-check"
                          aria-label={`Select ${row.employee?.name}`}
                          checked={selected.has(id)}
                          onChange={() => toggleOne(id)}
                        />
                        <button
                          type="button"
                          className="payroll-emp-identity"
                          onClick={() => openEmployee(id)}
                        >
                          <span
                            className="payroll-emp-avatar"
                            style={{ background: avatarColor(id) }}
                            aria-hidden
                          >
                            {initials(row.employee?.name)}
                          </span>
                          <span className="payroll-emp-cell-text">
                            <span className="payroll-emp-name">
                              {row.employee?.name}
                            </span>
                            {row.employee?.designation ? (
                              <span className="payroll-emp-role text-muted">
                                {row.employee.designation}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="text-muted small">
                      {row.employee?.employeeId || "—"}
                    </td>
                    <td>{row.employee?.department?.name || "—"}</td>
                    <td className="payroll-col-money text-end text-nowrap">
                      {row.hasStructure ? formatInr(row.monthlySalary) : "—"}
                    </td>
                    <td className="payroll-col-money text-end text-nowrap">
                      {row.hasStructure ? formatInr(annual) : "—"}
                    </td>
                    <td className="text-muted small">
                      {row.hasStructure ? formatDate(row.effectiveFrom) : "—"}
                    </td>
                    <td>
                      {row.hasStructure ? (
                        <StatusChip
                          variant="credited"
                          label={
                            <span className="payroll-status-with-icon">
                              <FaCheckCircle aria-hidden />
                              Configured
                            </span>
                          }
                        />
                      ) : (
                        <StatusChip
                          variant="warning"
                          label={
                            <span className="payroll-status-with-icon">
                              <FaExclamationCircle aria-hidden />
                              No structure
                            </span>
                          }
                          className="payroll-status-chip-warning"
                        />
                      )}
                    </td>
                    <td className="text-end payroll-col-actions">
                      <div className="payroll-comp-actions d-inline-flex gap-1 align-items-center justify-content-end">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="payroll-icon-btn"
                          title="View compensation"
                          aria-label={`View ${row.employee?.name}`}
                          onClick={() => openEmployee(id)}
                        >
                          <FaEye size={14} aria-hidden />
                        </Button>
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            size="sm"
                            variant="outline-secondary"
                            className="payroll-icon-btn"
                            id={`comp-actions-${id}`}
                            aria-label={`More actions for ${row.employee?.name}`}
                          >
                            <FaEllipsisV size={12} aria-hidden />
                          </Dropdown.Toggle>
                          <PayrollDropdownMenu>
                            <Dropdown.Item onClick={() => openEmployee(id)}>
                              View journey
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                navigate(
                                  `/salary-management?workspace=run-payroll&employee=${id}`
                                )
                              }
                            >
                              Run payroll for employee
                            </Dropdown.Item>
                            <Dropdown.Item
                              onClick={() =>
                                navigate(
                                  `/salary-management/legacy?tab=structures`
                                )
                              }
                            >
                              Configure structure
                            </Dropdown.Item>
                          </PayrollDropdownMenu>
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </PayrollDataTable>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default EmployeeCompensationPayroll;
