import { useState, useEffect } from "react";
import {
  Card, Row, Col, Table, Form, Badge, Spinner, Alert,
  InputGroup, Button, Dropdown
} from "react-bootstrap";
import { FaSearch, FaUsers, FaDownload, FaFilePdf, FaFileCsv, FaChevronDown } from "react-icons/fa";
import { toast } from "react-toastify";
import { leaveApi } from "../../api/leaveApi";
import { isPaidLeaveEligibleRow } from "../../utils/leaveEligibility";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = [
  { value: "", label: "Full Year" },
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

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2];

const LeaveBalanceOverview = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [employmentFilter, setEmploymentFilter] = useState("all");

  useEffect(() => {
    fetchBalances();
  }, [selectedYear, selectedMonth]);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getAllLeaveBalances(
        selectedYear,
        selectedMonth || null
      );
      setSummaries(response.data.summaries || []);
    } catch (error) {
      console.error("Error fetching leave balances:", error);
      toast.error("Failed to load leave balance data");
    } finally {
      setLoading(false);
    }
  };

  const filtered = summaries.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.employee.name?.toLowerCase().includes(q) ||
      s.employee.employeeId?.toLowerCase().includes(q) ||
      s.employee.department?.name?.toLowerCase().includes(q);

    const empType = s.employee.employmentType;
    const isNonFullTime =
      (empType && empType !== "full-time") || s.eligibleForPaidLeave === false;
    const matchesEmployment =
      employmentFilter === "all" ||
      (employmentFilter === "full-time" && !isNonFullTime) ||
      (employmentFilter === "non-full-time" && isNonFullTime);

    return matchesSearch && matchesEmployment;
  });

  const formatEmploymentType = (type) => {
    if (!type) return "Full Time";
    return type.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const exportCSV = () => {
    const monthLabel = selectedMonth
      ? MONTHS.find(m => m.value === selectedMonth)?.label
      : "Full Year";

    const headers = [
      "Employee", "ID", "Department", "Employment Type",
      "Earned (Year)", "Used (Year)", "Remaining",
      ...(selectedMonth ? [`Used (${monthLabel})`, `Unpaid (${monthLabel})`, `Late (${monthLabel})`, `Absent (${monthLabel})`] : []),
      "Personal", "Medical", "Vacation", "Half Day (×0.5)", "Unpaid (Year)", "Late (Year)", "Absent (Year)"
    ];

    const rows = filtered.map(s => [
      s.employee.name,
      s.employee.employeeId || "",
      s.employee.department?.name || "",
      formatEmploymentType(s.employee.employmentType),
      isPaidLeaveEligibleRow(s) ? s.year.earned : "N/A",
      isPaidLeaveEligibleRow(s) ? s.year.totalUsed : "—",
      isPaidLeaveEligibleRow(s) ? s.year.remaining : "N/A",
      ...(selectedMonth ? [s.month?.totalUsed ?? 0, s.month?.unpaid ?? 0, s.month?.late ?? 0, s.month?.absent ?? 0] : []),
      s.year.personal,
      s.year.medical,
      s.year.vacation,
      s.year.halfDay,
      s.year.unpaid,
      s.year.late ?? 0,
      s.year.absent ?? 0
    ]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-balance-${selectedYear}${selectedMonth ? `-${monthLabel}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const periodLabel = monthLabel
      ? `${monthLabel} ${selectedYear}`
      : `Full Year ${selectedYear}`;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Leave Balance Overview", 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${periodLabel}`, 14, 23);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 29);
    doc.text(`Total Employees: ${filtered.length}`, 14, 35);

    // Build columns
    const baseColumns = [
      { header: "Employee", dataKey: "employee" },
      { header: "Dept", dataKey: "dept" },
      { header: "Earned", dataKey: "earned" },
      { header: "Used", dataKey: "used" },
      { header: "Remaining", dataKey: "remaining" },
      { header: "Personal", dataKey: "personal" },
      { header: "Medical", dataKey: "medical" },
      { header: "Vacation", dataKey: "vacation" },
      { header: "Half Day", dataKey: "halfDay" },
      { header: "Unpaid", dataKey: "unpaid" },
      { header: "Late (Year)", dataKey: "late" },
      { header: "Absent (Year)", dataKey: "absent" },
    ];

    const monthColumns = selectedMonth ? [
      { header: `${monthLabel} Used`, dataKey: "monthUsed" },
      { header: `${monthLabel} Unpaid`, dataKey: "monthUnpaid" },
      { header: `${monthLabel} Late`, dataKey: "monthLate" },
      { header: `${monthLabel} Absent`, dataKey: "monthAbsent" },
    ] : [];

    const columns = selectedMonth
      ? [baseColumns[0], baseColumns[1], ...monthColumns, ...baseColumns.slice(2)]
      : baseColumns;

    // Build rows
    const rows = filtered.map(s => {
      const base = {
        employee: s.employee.name + (s.employee.employeeId ? `\n${s.employee.employeeId}` : ""),
        dept: s.employee.department?.name || "—",
        earned: isPaidLeaveEligibleRow(s) ? s.year.earned : "N/A",
        used: isPaidLeaveEligibleRow(s) ? (s.year.totalUsed > 0 ? s.year.totalUsed : "—") : "—",
        remaining: isPaidLeaveEligibleRow(s)
          ? (s.year.remaining % 1 === 0 ? s.year.remaining : s.year.remaining.toFixed(1))
          : "N/A",
        personal: s.year.personal || "—",
        medical: s.year.medical || "—",
        vacation: s.year.vacation || "—",
        halfDay: s.year.halfDay > 0 ? s.year.halfDay : "—",
        unpaid: s.year.unpaid > 0 ? s.year.unpaid : "—",
        late: (s.year.late ?? 0) > 0 ? s.year.late : "—",
        absent: (s.year.absent ?? 0) > 0 ? s.year.absent : "—",
      };
      if (selectedMonth) {
        base.monthUsed = (s.month?.totalUsed ?? 0) > 0 ? s.month.totalUsed : "—";
        base.monthUnpaid = (s.month?.unpaid ?? 0) > 0 ? s.month.unpaid : "—";
        base.monthLate = (s.month?.late ?? 0) > 0 ? s.month.late : "—";
        base.monthAbsent = (s.month?.absent ?? 0) > 0 ? s.month.absent : "—";
      }
      return base;
    });

    autoTable(doc, {
      startY: 40,
      columns,
      body: rows,
      tableWidth: "auto",
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [67, 97, 238], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        employee: { cellWidth: "auto" },
        dept:     { cellWidth: "auto" },
        earned:   { halign: "center" },
        used:     { halign: "center" },
        remaining:{ halign: "center" },
        personal: { halign: "center" },
        medical:  { halign: "center" },
        vacation: { halign: "center" },
        halfDay:  { halign: "center" },
        unpaid:   { halign: "center" },
        ...(selectedMonth ? {
          monthUsed:   { halign: "center" },
          monthUnpaid: { halign: "center" },
        } : {}),
      },
      didParseCell: (data) => {
        if (data.column.dataKey === "remaining" && data.section === "body") {
          const val = parseFloat(data.cell.raw);
          if (!isNaN(val)) {
            if (val <= 2) data.cell.styles.textColor = [220, 53, 69];
            else if (val <= 5) data.cell.styles.textColor = [255, 153, 0];
            else data.cell.styles.textColor = [25, 135, 84];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    }

    doc.save(`leave-balance-${selectedYear}${selectedMonth ? `-${monthLabel}` : ""}.pdf`);
  };

  const monthLabel = selectedMonth
    ? MONTHS.find(m => m.value === selectedMonth)?.label
    : null;

  const totalEmployees = filtered.length;
  const onLeaveThisMonth = selectedMonth
    ? filtered.filter(s => (s.month?.totalUsed ?? 0) > 0).length
    : 0;
  const highUsage = filtered.filter(
    s => s.eligibleForPaidLeave !== false && s.year.remaining <= 2
  ).length;
  const totalUnpaid = filtered.reduce((sum, s) => sum + s.year.unpaid, 0);

  return (
    <div>
      {/* Controls */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="py-3">
          <Row className="align-items-center g-2">
            <Col md={4}>
              <InputGroup size="sm">
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Search employee, ID, department..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value ? parseInt(e.target.value) : "")}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                size="sm"
                value={employmentFilter}
                onChange={e => setEmploymentFilter(e.target.value)}
              >
                <option value="all">All employment types</option>
                <option value="full-time">Full-time only</option>
                <option value="non-full-time">Non-full-time only</option>
              </Form.Select>
            </Col>
            <Col md="auto" className="ms-auto">
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-secondary">
                  <FaDownload className="me-1" /> Export <FaChevronDown className="ms-1" style={{ fontSize: "0.7em" }} />
                </Dropdown.Toggle>
                <Dropdown.Menu
                  align="end"
                  popperConfig={{ strategy: "fixed" }}
                  renderOnMount
                >
                  <Dropdown.Item onClick={exportCSV}>
                    <FaFileCsv className="me-2 text-success" /> Export as CSV
                  </Dropdown.Item>
                  <Dropdown.Item onClick={exportPDF}>
                    <FaFilePdf className="me-2 text-danger" /> Export as PDF
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Stats */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-primary mb-1">{totalEmployees}</h3>
              <small className="text-muted">Total Employees</small>
            </Card.Body>
          </Card>
        </Col>
        {selectedMonth && (
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body>
                <h3 className="text-warning mb-1">{onLeaveThisMonth}</h3>
                <small className="text-muted">On Leave in {monthLabel}</small>
              </Card.Body>
            </Card>
          </Col>
        )}
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-danger mb-1">{highUsage}</h3>
              <small className="text-muted">Low Balance (≤2 days left)</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="text-info mb-1">{totalUnpaid}</h3>
              <small className="text-muted">Total Unpaid Days ({selectedYear})</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <div className="d-flex align-items-center gap-2">
            <FaUsers className="text-primary" />
            <strong>
              Leave Balance — {selectedYear}
              {monthLabel ? ` · ${monthLabel}` : " · Full Year"}
            </strong>
            <Badge bg="secondary" className="ms-auto">{filtered.length} employees</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading leave balances...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Alert variant="info" className="m-3">
              No employees found{search ? ` matching "${search}"` : ""}.
            </Alert>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <Table hover className="mb-0" style={{ fontSize: "0.82rem" }}>
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: 140 }}>Employee</th>
                  <th style={{ minWidth: 100 }}>Type</th>
                  {selectedMonth && (
                    <>
                      <th className="text-center text-nowrap">{monthLabel} Unpaid</th>
                      <th className="text-center text-nowrap">{monthLabel} Late</th>
                      <th className="text-center text-nowrap">{monthLabel} Absent</th>
                    </>
                  )}
                  <th className="text-center">Earned</th>
                  <th className="text-center">Used</th>
                  <th className="text-center">Remaining</th>
                  <th className="text-center">Personal</th>
                  <th className="text-center">Medical</th>
                  <th className="text-center">Vacation</th>
                  <th className="text-center text-nowrap">Half Day</th>
                  <th className="text-center">Unpaid</th>
                  <th className="text-center">Late</th>
                  <th className="text-center">Absent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.employee._id}>
                    {/* Employee column: name + ID + department in one cell */}
                    <td>
                      <div className="fw-semibold" style={{ wordBreak: "break-word", lineHeight: 1.3 }}>
                        {s.employee.name}
                      </div>
                      {s.employee.employeeId && (
                        <small className="text-muted d-block">{s.employee.employeeId}</small>
                      )}
                      {s.employee.department?.name && (
                        <small className="text-secondary d-block">{s.employee.department.name}</small>
                      )}
                    </td>
                    <td className="align-middle">
                      <Badge bg={isPaidLeaveEligibleRow(s) ? "primary" : "secondary"}>
                        {formatEmploymentType(s.employee.employmentType)}
                      </Badge>
                    </td>

                    {selectedMonth && (
                      <>
                        <td className="text-center align-middle">
                          {(s.month?.unpaid ?? 0) > 0 ? (
                            <Badge bg="danger">{s.month.unpaid}</Badge>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-center align-middle">
                          {(s.month?.late ?? 0) > 0 ? (
                            <Badge bg="warning" text="dark">{s.month.late}</Badge>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-center align-middle">
                          {(s.month?.absent ?? 0) > 0 ? (
                            <Badge bg="danger">{s.month.absent}</Badge>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </>
                    )}

                    <td className="text-center align-middle fw-bold">
                      {!isPaidLeaveEligibleRow(s) ? (
                        <span className="text-muted">N/A</span>
                      ) : (
                        s.year.earned
                      )}
                    </td>
                    <td className="text-center align-middle">
                      {isPaidLeaveEligibleRow(s) ? (s.year.totalUsed > 0 ? s.year.totalUsed : "—") : "—"}
                    </td>
                    <td className="text-center align-middle">
                      {isPaidLeaveEligibleRow(s) ? (
                        <Badge bg={s.year.remaining <= 2 ? "danger" : s.year.remaining <= 5 ? "warning" : "success"}>
                          {s.year.remaining % 1 === 0 ? s.year.remaining : s.year.remaining.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td className="text-center align-middle">{s.year.personal || "—"}</td>
                    <td className="text-center align-middle">{s.year.medical || "—"}</td>
                    <td className="text-center align-middle">{s.year.vacation || "—"}</td>
                    <td className="text-center align-middle">
                      {s.year.halfDay > 0 ? (
                        <Badge bg="info">{s.year.halfDay}</Badge>
                      ) : "—"}
                    </td>
                    <td className="text-center align-middle">
                      {s.year.unpaid > 0 ? (
                        <Badge bg="danger">{s.year.unpaid}</Badge>
                      ) : "—"}
                    </td>
                    <td className="text-center align-middle">
                      {(s.year.late ?? 0) > 0 ? (
                        <Badge bg="warning" text="dark">{s.year.late}</Badge>
                      ) : "—"}
                    </td>
                    <td className="text-center align-middle">
                      {(s.year.absent ?? 0) > 0 ? (
                        <Badge bg="danger">{s.year.absent}</Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default LeaveBalanceOverview;
