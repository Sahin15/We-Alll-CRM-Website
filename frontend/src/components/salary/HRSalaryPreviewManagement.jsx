import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
  Tabs,
  Tab,
  InputGroup,
  Dropdown
} from "react-bootstrap";
import { toast } from "react-toastify";
import { 
  FaEye, 
  FaUsers, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaReply,
  FaEdit,
  FaPlus,
  FaDownload,
  FaUser,
  FaBuilding,
  FaCheckSquare
} from "react-icons/fa";
import { salaryPreviewApi } from "../../api/salaryApi";
import {
  payrollSimplePreviewApi,
  payrollAdjustmentApi,
  ADJUSTMENT_TYPE_OPTIONS,
} from "../../api/payrollSimpleApi";
import api from "../../services/api";
import SimplePayrollPreviewPanels from "./SimplePayrollPreviewPanels";
import {
  isSimpleSalaryPreview,
  mapStoredPreviewToSimpleDto,
} from "../../utils/simpleSalaryPreviewView";

const HRSalaryPreviewManagement = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Default to previous month — current month's preview is typically not generated yet
  const getPreviousMonth = () => {
    const now = new Date();
    const month = now.getMonth(); // getMonth() is 0-indexed, so this gives previous month (1-indexed)
    const year = month === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { month: month === 0 ? 12 : month, year };
  };
  const prev = getPreviousMonth();

  const [selectedMonth, setSelectedMonth] = useState(prev.month);
  const [selectedYear, setSelectedYear] = useState(prev.year);
  const [previews, setPreviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [attentionPreviews, setAttentionPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [simpleViewDto, setSimpleViewDto] = useState(null);
  const [simpleViewLoading, setSimpleViewLoading] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateType, setGenerateType] = useState('bulk');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  // Mid-month confirmation state
  const [showMidMonthModal, setShowMidMonthModal] = useState(false);
  const [midMonthData, setMidMonthData] = useState(null);
  const [midMonthOverride, setMidMonthOverride] = useState({ totalDays: 0, workingDays: 0, holidays: 0, weekends: 0 });
  const [pendingGenerateAction, setPendingGenerateAction] = useState(null);

  // Corrections form state
  const [corrections, setCorrections] = useState({
    earnings: {
      bonus: 0,
      overtime: 0,
      arrears: 0,
      reimbursements: 0,
      incentives: 0,
    },
    deductions: {
      advances: 0,
      loans: 0,
    },
    note: ''
  });
  const [simpleCorrections, setSimpleCorrections] = useState({
    monthlySalary: 0,
    tdsAmount: 0,
    adjustmentsTotal: 0,
    netSalary: 0,
    adjustmentLines: [],
    note: "",
    /** Optional new line applied on Save (same as Simple Payroll adjustment) */
    newCorrectionType: "manual_salary_deduction",
    newCorrectionAmount: 0,
    amountMode: "fixed",
    days: 1,
    removeAllAdjustments: false,
  });
  const [correctionsIsSimple, setCorrectionsIsSimple] = useState(false);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [savingCorrections, setSavingCorrections] = useState(false);
  /** Preview being corrected — kept separate so closing the details modal cannot wipe it */
  const [correctionsTarget, setCorrectionsTarget] = useState(null);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchData();
    }
    fetchEmployees();
    fetchDepartments();
  }, [selectedMonth, selectedYear, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPreviews(),
        fetchStatistics(),
        fetchAttentionPreviews()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviews = async () => {
    try {
      const response = await salaryPreviewApi.getMonthPreviews(
        selectedMonth,
        selectedYear
      );
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      // Overlay live Simple Payroll net so the table never shows a stale snapshot
      const enriched = await Promise.all(
        list.map(async (preview) => {
          try {
            const employeeId = preview.employee?._id || preview.employee;
            if (!employeeId) return preview;
            const res = await payrollSimplePreviewApi.get({
              employee: employeeId,
              month: preview.month || selectedMonth,
              year: preview.year || selectedYear,
              automaticDeductions: 0,
            });
            const dto = res.data?.data ?? res.data;
            if (
              dto?.applicable &&
              dto.totals?.netSalary != null &&
              !dto.totals?.rejected
            ) {
              return {
                ...preview,
                payrollMode: "simple",
                salaryBreakdown: {
                  ...preview.salaryBreakdown,
                  netSalary: dto.totals.netSalary,
                },
              };
            }
          } catch {
            /* keep stored preview */
          }
          return preview;
        })
      );

      setPreviews(enriched);
    } catch (error) {
      console.error("Error fetching previews:", error);
      toast.error("Failed to load previews");
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await salaryPreviewApi.getStatistics(selectedMonth, selectedYear);
      setStatistics(response.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchAttentionPreviews = async () => {
    try {
      const response = await salaryPreviewApi.getAttentionPreviews(selectedMonth, selectedYear);
      setAttentionPreviews(response.data);
    } catch (error) {
      console.error("Error fetching attention previews:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleRespondToQuery = async () => {
    if (!responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }

    try {
      await salaryPreviewApi.respondToQuery(selectedPreview._id, selectedQueryIndex, responseText.trim());
      toast.success("Response submitted successfully");
      setShowResponseModal(false);
      setResponseText("");
      setSelectedQueryIndex(null);
      fetchData();
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Failed to submit response");
    }
  };

  const handleFinalizePreview = async (previewId) => {
    try {
      await salaryPreviewApi.finalize(previewId);
      toast.success("Preview finalized successfully");
      fetchData();
    } catch (error) {
      console.error("Error finalizing preview:", error);
      toast.error("Failed to finalize preview");
    }
  };

  const openCorrectionsModal = async (preview) => {
    if (!preview) {
      toast.error("No preview selected");
      return;
    }
    setCorrectionsTarget(preview);
    setSelectedPreview(preview);
    setShowCorrectionsModal(true);
    setCorrectionsLoading(true);
    setCorrectionsIsSimple(false);

    const preferSimple = isSimpleSalaryPreview(preview);
    try {
      const employeeId = preview.employee?._id || preview.employee;
      const res = await payrollSimplePreviewApi.get({
        employee: employeeId,
        month: preview.month,
        year: preview.year,
        automaticDeductions: 0,
      });
      const dto = res.data?.data ?? res.data;
      if (dto?.applicable) {
        setCorrectionsIsSimple(true);
        const monthly = Number(dto.totals?.monthlySalary) || 0;
        const tds = Number(dto.totals?.tdsAmount) || 0;
        const adj = Number(dto.totals?.adjustmentsTotal) || 0;
        setSimpleCorrections({
          monthlySalary: monthly,
          tdsAmount: tds,
          adjustmentsTotal: adj,
          netSalary: dto.totals?.rejected
            ? monthly + adj - tds
            : Number(dto.totals?.netSalary) || monthly + adj - tds,
          adjustmentLines: dto.sections?.manualAdjustments?.lines || [],
          note: "",
          newCorrectionType: "manual_salary_deduction",
          newCorrectionAmount: 0,
          amountMode: "fixed",
          days: 1,
          removeAllAdjustments: false,
        });
        return;
      }

      if (preferSimple) {
        const mapped = mapStoredPreviewToSimpleDto(preview);
        setCorrectionsIsSimple(true);
        setSimpleCorrections({
          monthlySalary: mapped.totals.monthlySalary,
          tdsAmount: mapped.totals.tdsAmount,
          adjustmentsTotal: mapped.totals.adjustmentsTotal,
          netSalary: mapped.totals.netSalary,
          adjustmentLines: mapped.sections.manualAdjustments.lines || [],
          note: "",
          newCorrectionType: "manual_salary_deduction",
          newCorrectionAmount: 0,
          amountMode: "fixed",
          days: 1,
          removeAllAdjustments: false,
        });
        return;
      }

      const e = preview.salaryBreakdown?.earnings || {};
      const d = preview.salaryBreakdown?.deductions || {};
      setCorrections({
        earnings: {
          basicSalary: e.basicSalary || 0,
          hra: e.hra || 0,
          specialAllowance: e.specialAllowance || 0,
          transportAllowance: e.transportAllowance || 0,
          medicalAllowance: e.medicalAllowance || 0,
          bonus: e.bonus || 0,
          overtime: e.overtime || 0,
          arrears: e.arrears || 0,
          reimbursements: e.reimbursements || 0,
          incentives: e.incentives || 0,
        },
        deductions: {
          providentFund: d.providentFund || 0,
          professionalTax: d.professionalTax || 0,
          tds: d.tds || 0,
          esi: d.esi || 0,
          lossOfPay: d.lossOfPay || 0,
          advances: d.advances || 0,
          loans: d.loans || 0,
        },
        note: "",
      });
    } catch {
      if (preferSimple) {
        const mapped = mapStoredPreviewToSimpleDto(preview);
        setCorrectionsIsSimple(true);
        setSimpleCorrections({
          monthlySalary: mapped.totals.monthlySalary,
          tdsAmount: mapped.totals.tdsAmount,
          adjustmentsTotal: mapped.totals.adjustmentsTotal,
          netSalary: mapped.totals.netSalary,
          adjustmentLines: mapped.sections.manualAdjustments.lines || [],
          note: "",
          newCorrectionType: "manual_salary_deduction",
          newCorrectionAmount: 0,
          amountMode: "fixed",
          days: 1,
          removeAllAdjustments: false,
        });
      }
    } finally {
      setCorrectionsLoading(false);
    }
  };

  const correctionPerDayRate = () =>
    Math.round(Number(simpleCorrections.monthlySalary || 0) / 30);

  const effectiveNewCorrectionAmount = () => {
    if (simpleCorrections.amountMode === "per_day") {
      const days = Math.max(0, Number(simpleCorrections.days) || 0);
      return correctionPerDayRate() * days;
    }
    return Math.abs(Number(simpleCorrections.newCorrectionAmount) || 0);
  };

  const signedNewCorrectionAmount = () => {
    const amt = effectiveNewCorrectionAmount();
    if (!amt) return 0;
    const debitTypes = new Set([
      "advance_recovery",
      "penalty",
      "late_deduction",
      "absent_deduction",
      "manual_salary_deduction",
    ]);
    return debitTypes.has(simpleCorrections.newCorrectionType) ? -amt : amt;
  };

  const effectiveAdjustmentsTotal = () => {
    if (simpleCorrections.removeAllAdjustments) return 0;
    return Number(simpleCorrections.adjustmentsTotal || 0);
  };

  const handleSaveCorrections = async () => {
    const target = correctionsTarget || selectedPreview;
    if (!target) {
      toast.error("No preview selected — reopen Make Corrections and try again");
      return;
    }
    const note = correctionsIsSimple
      ? simpleCorrections.note
      : corrections.note;
    if (!note.trim()) {
      toast.error("Please add a note explaining the correction");
      return;
    }
    setSavingCorrections(true);
    try {
      if (correctionsIsSimple) {
        const employeeId = target.employee?._id || target.employee;

        if (simpleCorrections.removeAllAdjustments) {
          const listRes = await payrollAdjustmentApi.list({
            employee: employeeId,
            month: target.month,
            year: target.year,
          });
          const items = listRes.data?.data || listRes.data || [];
          const toVoid = (Array.isArray(items) ? items : []).filter(
            (a) => a.status !== "void" && a._id
          );
          for (const adj of toVoid) {
            await payrollAdjustmentApi.void(adj._id, {
              reason:
                note.trim() ||
                "Removed all adjustments via salary corrections",
            });
          }
        }

        const newAmt = effectiveNewCorrectionAmount();
        if (newAmt > 0) {
          const daysNote =
            simpleCorrections.amountMode === "per_day"
              ? ` (${simpleCorrections.days} day(s) @ ${formatCurrency(
                  correctionPerDayRate()
                )}/day)`
              : "";
          const created = await payrollAdjustmentApi.create({
            employee: employeeId,
            month: target.month,
            year: target.year,
            type: simpleCorrections.newCorrectionType,
            amount: newAmt,
            reason: `${note.trim()}${daysNote}`,
            remarks: "Added from Make Salary Corrections",
          });
          const adjId = created.data?.data?._id || created.data?._id;
          if (adjId) {
            await payrollAdjustmentApi.approve(adjId, {
              reason: "Auto-approved with salary correction",
            });
          }
        }

        await salaryPreviewApi.makeCorrections(target._id, {
          corrections: {
            simple: true,
            monthlySalary: Number(simpleCorrections.monthlySalary) || 0,
            tdsAmount: Number(simpleCorrections.tdsAmount) || 0,
            note: note.trim(),
          },
        });
        toast.success(
          "Corrections saved. Preview updated from Simple Payroll figures."
        );
      } else {
        await salaryPreviewApi.makeCorrections(target._id, {
          corrections,
        });
        toast.success("Corrections saved successfully");
      }
      setShowCorrectionsModal(false);
      setCorrectionsTarget(null);
      setSelectedPreview(null);
      fetchData();
    } catch (error) {
      console.error("Error saving corrections:", error);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to save corrections"
      );
    } finally {
      setSavingCorrections(false);
    }
  };

  // ── Shared confirmation dialog helper ──────────────────────────────────────
  // countWeekends: count Sundays up to a given day (6-day work week)
  const countWeekends = (month, year, upToDay) => {
    let count = 0;
    for (let d = 1; d <= upToDay; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) count++;
    }
    return count;
  };

  // Opens the confirmation dialog for any generate action.
  // actionFn(workingDaysOverride) is called when HR confirms.
  const openConfirmationDialog = async (actionFn) => {
    const now = new Date();
    const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();
    const todayDay = now.getDate();
    const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
    const effectiveDays = isCurrentMonth ? todayDay : totalDaysInMonth;

    let workingDays = 0, holidays = 0, weekends = 0;
    try {
      const res = await api.get(`/salary-preview/working-days-info?month=${selectedMonth}&year=${selectedYear}`);
      workingDays = res.data.workingDays || 0;
      holidays   = res.data.holidays   || 0;
      weekends   = res.data.weekends   || 0;
    } catch {
      weekends     = countWeekends(selectedMonth, selectedYear, effectiveDays);
      workingDays  = effectiveDays - weekends;
    }

    setMidMonthData({
      monthName, totalDaysInMonth, isCurrentMonth,
      todayDate: now.toLocaleDateString('en-GB'),
      todayDay,
      note: isCurrentMonth
        ? `Generating salary preview for ${monthName} ${selectedYear} (current running month). Only ${todayDay} of ${totalDaysInMonth} days have passed.`
        : `Generating salary preview for ${monthName} ${selectedYear}. Review the working days data before confirming.`
    });
    setMidMonthOverride({ totalDays: effectiveDays, workingDays, holidays, weekends });
    setPendingGenerateAction(() => actionFn);
    setShowMidMonthModal(true);
  };

  // Called when HR clicks "Confirm & Generate" in the dialog
  const executeBulkGenerate = async (overrideData) => {
    if (!pendingGenerateAction) return;
    setShowMidMonthModal(false);
    try {
      await pendingGenerateAction(overrideData);
    } catch (error) {
      console.error("Error in generation:", error);
      toast.error("Failed to generate previews");
    }
    setPendingGenerateAction(null);
  };

  // ── Individual generate handlers (all go through confirmation) ─────────────

  const handleBulkGenerate = () => {
    openConfirmationDialog(async (override) => {
      const res = await api.get('/users/employees');
      const employeeIds = res.data.map(e => e._id);
      const data = (await salaryPreviewApi.bulkGenerate({
        employeeIds, month: selectedMonth, year: selectedYear, workingDaysOverride: override
      })).data;
      toast.success(`Bulk: ${data.summary.success} done, ${data.summary.failed} failed, ${data.summary.skipped} skipped`);
      fetchData();
    });
  };

  const handleIndividualGenerate = (employeeId) => {
    openConfirmationDialog(async (override) => {
      const res = await salaryPreviewApi.generate(employeeId, selectedMonth, selectedYear, {}, override);
      toast.success(`Preview generated for ${res.data.preview?.employee?.name || 'employee'}`);
      setShowGenerateModal(false);
      setSelectedEmployees([]);
      fetchData();
    });
  };

  const handleDepartmentGenerate = (departmentId) => {
    const deptEmployees = employees.filter(emp => emp.department?._id === departmentId);
    if (deptEmployees.length === 0) { toast.warning("No employees found in selected department"); return; }
    openConfirmationDialog(async (override) => {
      const data = (await salaryPreviewApi.bulkGenerate({
        employeeIds: deptEmployees.map(e => e._id),
        month: selectedMonth, year: selectedYear, workingDaysOverride: override
      })).data;
      const dept = departments.find(d => d._id === departmentId);
      toast.success(`${dept?.name}: ${data.summary.success} done, ${data.summary.failed} failed`);
      setShowGenerateModal(false);
      setSelectedDepartment('');
      fetchData();
    });
  };

  const handleSelectedEmployeesGenerate = () => {
    if (selectedEmployees.length === 0) { toast.warning("Please select employees"); return; }
    openConfirmationDialog(async (override) => {
      const data = (await salaryPreviewApi.bulkGenerate({
        employeeIds: selectedEmployees,
        month: selectedMonth, year: selectedYear, workingDaysOverride: override
      })).data;
      toast.success(`Selected: ${data.summary.success} done, ${data.summary.failed} failed`);
      setSelectedEmployees([]);
      setShowGenerateModal(false);
      fetchData();
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Open details modal. For simple-mode employees, load the same DTO as
   * Simple Payroll tab so the layout matches exactly.
   */
  const openPreviewDetails = async (preview) => {
    setSelectedPreview(preview);
    setSimpleViewDto(null);

    const preferSimple = isSimpleSalaryPreview(preview);
    setSimpleViewLoading(true);
    try {
      const employeeId = preview.employee?._id || preview.employee;
      const res = await payrollSimplePreviewApi.get({
        employee: employeeId,
        month: preview.month,
        year: preview.year,
        automaticDeductions: 0,
      });
      const dto = res.data?.data ?? res.data;
      if (dto?.applicable) {
        setSimpleViewDto(dto);
        return;
      }
      if (preferSimple) {
        setSimpleViewDto(mapStoredPreviewToSimpleDto(preview));
      }
    } catch {
      if (preferSimple) {
        setSimpleViewDto(mapStoredPreviewToSimpleDto(preview));
      }
    } finally {
      setSimpleViewLoading(false);
    }
  };

  const closePreviewDetails = () => {
    setSelectedPreview(null);
    setSimpleViewDto(null);
    setSimpleViewLoading(false);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      generated: { variant: "info", text: "Generated" },
      under_review: { variant: "warning", text: "Under Review" },
      query_raised: { variant: "danger", text: "Query Raised" },
      acknowledged: { variant: "success", text: "Acknowledged" },
      finalized: { variant: "success", text: "Finalized" }
    };

    const config = statusConfig[status] || statusConfig.generated;
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const generateMonthOptions = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return months.map((month, index) => (
      <option key={index + 1} value={index + 1}>
        {month}
      </option>
    ));
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let year = currentYear; year >= currentYear - 2; year--) {
      years.push(year);
    }
    
    return years.map(year => (
      <option key={year} value={year}>
        {year}
      </option>
    ));
  };

  return (
    <div>
      {/* Header with Controls */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4>Salary Preview Management</h4>
              <p className="text-muted mb-0">Manage employee salary previews and queries</p>
            </div>
            <div className="d-flex gap-2">
              <Form.Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {generateMonthOptions()}
              </Form.Select>
              <Form.Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {generateYearOptions()}
              </Form.Select>
              
              {/* Generate Preview Options */}
              <Dropdown>
                <Dropdown.Toggle variant="primary" id="generate-dropdown">
                  <FaPlus className="me-2" />
                  Generate Previews
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleBulkGenerate}>
                    <FaUsers className="me-2" />
                    All Employees (Bulk)
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => {
                    setGenerateType('individual');
                    setShowGenerateModal(true);
                  }}>
                    <FaUser className="me-2" />
                    Individual Employee
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => {
                    setGenerateType('department');
                    setShowGenerateModal(true);
                  }}>
                    <FaBuilding className="me-2" />
                    By Department
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => {
                    setGenerateType('selected');
                    setShowGenerateModal(true);
                  }}>
                    <FaCheckSquare className="me-2" />
                    Selected Employees
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      {statistics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{statistics.totalPreviews}</h3>
                <p className="mb-0">Total Previews</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">{statistics.queriesRaised}</h3>
                <p className="mb-0">Queries Raised</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-danger">{statistics.pendingQueries}</h3>
                <p className="mb-0">Pending Queries</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{statistics.expiredReviews}</h3>
                <p className="mb-0">Expired Reviews</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="overview" title="All Previews">
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Net Salary</th>
                      <th>Queries</th>
                      <th>Deadline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((preview) => (
                      <tr key={preview._id}>
                        <td>
                          <div>
                            <strong>{preview.employee.name}</strong>
                            <br />
                            <small className="text-muted">{preview.employee.employeeId}</small>
                          </div>
                        </td>
                        <td>{preview.employee.department?.name || 'N/A'}</td>
                        <td>{getStatusBadge(preview.status)}</td>
                        <td>{formatCurrency(preview.salaryBreakdown.netSalary)}</td>
                        <td>
                          {preview.employeeQueries.length > 0 ? (
                            <Badge bg="warning">{preview.employeeQueries.length}</Badge>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td>
                          <small>
                            {new Date(preview.reviewDeadline).toLocaleDateString()}
                            {preview.isReviewExpired && (
                              <Badge bg="danger" className="ms-1">Expired</Badge>
                            )}
                          </small>
                        </td>
                        <td>
                          <Dropdown align="end">
                            <Dropdown.Toggle variant="outline-primary" size="sm">
                              Actions
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{ zIndex: 2000 }}>
                              <Dropdown.Item onClick={() => openPreviewDetails(preview)}>
                                <FaEye className="me-2" />
                                View Details
                              </Dropdown.Item>
                              {preview.employeeQueries.some(q => q.status === 'pending') && (
                                <Dropdown.Item 
                                  onClick={() => {
                                    setSelectedPreview(preview);
                                    setSelectedQueryIndex(preview.employeeQueries.findIndex(q => q.status === 'pending'));
                                    setShowResponseModal(true);
                                  }}
                                >
                                  <FaReply className="me-2" />
                                  Respond to Query
                                </Dropdown.Item>
                              )}
                              <Dropdown.Item 
                                onClick={() => openCorrectionsModal(preview)}
                              >
                                <FaEdit className="me-2" />
                                Make Corrections
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item 
                                onClick={() => handleIndividualGenerate(preview.employee._id)}
                                className="text-success"
                              >
                                <FaPlus className="me-2" />
                                Regenerate Preview
                              </Dropdown.Item>
                              {(preview.status === 'acknowledged' || preview.isReviewExpired) && (
                                <Dropdown.Item 
                                  onClick={() => handleFinalizePreview(preview._id)}
                                >
                                  <FaCheckCircle className="me-2" />
                                  Finalize
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="attention" title={`Needs Attention (${attentionPreviews.length})`}>
          <Card>
            <Card.Body>
              {attentionPreviews.length === 0 ? (
                <Alert variant="success" className="text-center">
                  <FaCheckCircle size={48} className="mb-3" />
                  <h5>All Good!</h5>
                  <p>No previews require immediate attention.</p>
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Issue</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionPreviews.map((preview) => (
                      <tr key={preview._id}>
                        <td>
                          <strong>{preview.employee.name}</strong>
                          <br />
                          <small className="text-muted">{preview.employee.employeeId}</small>
                        </td>
                        <td>
                          {preview.status === 'query_raised' && 'Employee Query Pending'}
                          {preview.isReviewExpired && 'Review Period Expired'}
                        </td>
                        <td>{getStatusBadge(preview.status)}</td>
                        <td>
                          <Badge bg={preview.status === 'query_raised' ? 'danger' : 'warning'}>
                            {preview.status === 'query_raised' ? 'High' : 'Medium'}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => openPreviewDetails(preview)}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Response Modal */}
      <Modal show={showResponseModal} onHide={() => setShowResponseModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Respond to Employee Query</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPreview && selectedQueryIndex !== null && (
            <div>
              <Alert variant="info">
                <strong>Employee Query:</strong><br />
                {selectedPreview.employeeQueries[selectedQueryIndex]?.query}
              </Alert>
              <Form.Group>
                <Form.Label>Your Response</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response to the employee's query..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResponseModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleRespondToQuery}
            disabled={!responseText.trim()}
          >
            Send Response
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Preview Details Modal */}
      {selectedPreview && !showResponseModal && !showCorrectionsModal && (
        <Modal
          show={!!selectedPreview}
          onHide={closePreviewDetails}
          size="xl"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Salary Preview — {selectedPreview.employee.name}
              <small className="ms-2 text-muted fs-6">{selectedPreview.employee.employeeId}</small>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {simpleViewLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : simpleViewDto ? (
              <SimplePayrollPreviewPanels
                preview={simpleViewDto}
                formatCurrency={formatCurrency}
              />
            ) : (
              <>
                <Row className="mb-3">
                  <Col md={6}>
                    <h6 className="text-muted mb-2">Working Days Breakdown</h6>
                    <Table size="sm" bordered>
                      <tbody>
                        <tr><td>Total Calendar Days</td><td className="text-end">{selectedPreview.workingDaysBreakdown.totalDays}</td></tr>
                        <tr><td>Weekends</td><td className="text-end">{selectedPreview.workingDaysBreakdown.weekends}</td></tr>
                        <tr><td>Holidays</td><td className="text-end">{selectedPreview.workingDaysBreakdown.holidays}</td></tr>
                        <tr className="table-primary"><td><strong>Working Days</strong></td><td className="text-end"><strong>{selectedPreview.workingDaysBreakdown.workingDays}</strong></td></tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h6 className="text-muted mb-2">Leave Impact</h6>
                    <Table size="sm" bordered>
                      <tbody>
                        <tr><td>Per Day Salary</td><td className="text-end">{formatCurrency(selectedPreview.leaveImpact.perDaySalary)}</td></tr>
                        <tr><td>Paid Leaves</td><td className="text-end">{selectedPreview.leaveImpact.paidLeaves} days</td></tr>
                        <tr><td>Unpaid Leaves</td><td className="text-end">{selectedPreview.leaveImpact.unpaidLeaves} days</td></tr>
                        <tr className="table-warning"><td><strong>Leave Deduction</strong></td><td className="text-end"><strong>{formatCurrency(selectedPreview.leaveImpact.deductionAmount)}</strong></td></tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <h6 className="text-success mb-2">Earnings</h6>
                    <Table size="sm" bordered>
                      <tbody>
                        {[
                          ['Basic Salary', selectedPreview.salaryBreakdown.earnings.basicSalary],
                          ['HRA', selectedPreview.salaryBreakdown.earnings.hra],
                          ['Special Allowance', selectedPreview.salaryBreakdown.earnings.specialAllowance],
                          ['Transport Allowance', selectedPreview.salaryBreakdown.earnings.transportAllowance],
                          ['Medical Allowance', selectedPreview.salaryBreakdown.earnings.medicalAllowance],
                          ['Bonus', selectedPreview.salaryBreakdown.earnings.bonus],
                          ['Overtime', selectedPreview.salaryBreakdown.earnings.overtime],
                          ['Arrears', selectedPreview.salaryBreakdown.earnings.arrears],
                          ['Reimbursements', selectedPreview.salaryBreakdown.earnings.reimbursements],
                          ['Incentives', selectedPreview.salaryBreakdown.earnings.incentives],
                        ].filter(([, v]) => v > 0).map(([label, value]) => (
                          <tr key={label}><td>{label}</td><td className="text-end">{formatCurrency(value)}</td></tr>
                        ))}
                        <tr className="table-success"><td><strong>Gross Salary</strong></td><td className="text-end"><strong>{formatCurrency(selectedPreview.salaryBreakdown.grossSalary)}</strong></td></tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h6 className="text-danger mb-2">Deductions</h6>
                    <Table size="sm" bordered>
                      <tbody>
                        {[
                          ['Provident Fund (PF)', selectedPreview.salaryBreakdown.deductions.providentFund],
                          ['Professional Tax', selectedPreview.salaryBreakdown.deductions.professionalTax],
                          ['TDS', selectedPreview.salaryBreakdown.deductions.tds],
                          ['ESI', selectedPreview.salaryBreakdown.deductions.esi],
                          ['Loss of Pay', selectedPreview.salaryBreakdown.deductions.lossOfPay],
                          ['Advance Recovery', selectedPreview.salaryBreakdown.deductions.advances],
                          ['Loan EMI', selectedPreview.salaryBreakdown.deductions.loans],
                        ].filter(([, v]) => v > 0).map(([label, value]) => (
                          <tr key={label}><td>{label}</td><td className="text-end text-danger">{formatCurrency(value)}</td></tr>
                        ))}
                        <tr className="table-danger"><td><strong>Total Deductions</strong></td><td className="text-end"><strong>{formatCurrency(selectedPreview.salaryBreakdown.totalDeductions)}</strong></td></tr>
                      </tbody>
                    </Table>
                    <Alert variant="success" className="text-center py-2 mt-2">
                      <div className="small text-muted">Net Salary</div>
                      <h5 className="mb-0">{formatCurrency(selectedPreview.salaryBreakdown.netSalary)}</h5>
                    </Alert>
                  </Col>
                </Row>
              </>
            )}

            {selectedPreview.employeeQueries?.length > 0 && (
              <div className="mt-3">
                <h6 className="text-muted mb-2">Queries & Corrections Log</h6>
                {selectedPreview.employeeQueries.map((q, i) => (
                  <Alert key={i} variant={q.query.startsWith('HR Correction') ? 'warning' : 'info'} className="small py-2">
                    <strong>{q.query.startsWith('HR Correction') ? 'Correction' : 'Query'}:</strong> {q.query}
                    {q.hrResponse && <div className="mt-1"><strong>Response:</strong> {q.hrResponse}</div>}
                  </Alert>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closePreviewDetails}>
              Close
            </Button>
            <Button variant="warning" size="sm" onClick={() => {
              openCorrectionsModal(selectedPreview);
            }}>
              Make Corrections
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Mid-Month Confirmation Modal */}
      <Modal show={showMidMonthModal} onHide={() => setShowMidMonthModal(false)} centered>
        <Modal.Header closeButton className={midMonthData?.isCurrentMonth ? 'bg-warning' : 'bg-primary text-white'}>
          <Modal.Title>
            {midMonthData?.isCurrentMonth ? '⚠️ Mid-Month Preview' : '📋 Confirm Salary Preview Generation'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {midMonthData && (
            <>
              <Alert variant={midMonthData.isCurrentMonth ? 'warning' : 'info'} className="small">
                {midMonthData.note}
              </Alert>

              <h6 className="mb-2">Month Summary</h6>
              <Table bordered size="sm" className="mb-3">
                <tbody>
                  <tr>
                    <td className="text-muted">Month</td>
                    <td><strong>{midMonthData.monthName} {midMonthData.year}</strong></td>
                  </tr>
                  {midMonthData.isCurrentMonth && (
                    <tr>
                      <td className="text-muted">Today's Date</td>
                      <td><strong>{midMonthData.todayDate} ({midMonthData.todayDay} of {midMonthData.totalDaysInMonth} days)</strong></td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted">Total Days in Month</td>
                    <td><strong>{midMonthData.totalDaysInMonth}</strong></td>
                  </tr>
                  <tr>
                    <td className="text-muted">Weekends (Sundays)</td>
                    <td><strong>{midMonthOverride.weekends}</strong></td>
                  </tr>
                  <tr>
                    <td className="text-muted">Holidays</td>
                    <td><strong>{midMonthOverride.holidays}</strong></td>
                  </tr>
                  <tr className="table-success">
                    <td><strong>Working Days</strong></td>
                    <td><strong>{midMonthOverride.workingDays}</strong></td>
                  </tr>
                </tbody>
              </Table>

              <h6 className="mb-2">Adjust if needed</h6>
              <Row className="g-2">
                <Col xs={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Total Days</Form.Label>
                    <Form.Control type="number" size="sm" min="1" max={midMonthData.totalDaysInMonth}
                      value={midMonthOverride.totalDays}
                      onChange={e => setMidMonthOverride({...midMonthOverride, totalDays: Number(e.target.value)})} />
                  </Form.Group>
                </Col>
                <Col xs={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Working Days</Form.Label>
                    <Form.Control type="number" size="sm" min="0"
                      value={midMonthOverride.workingDays}
                      onChange={e => setMidMonthOverride({...midMonthOverride, workingDays: Number(e.target.value)})} />
                  </Form.Group>
                </Col>
                <Col xs={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Holidays</Form.Label>
                    <Form.Control type="number" size="sm" min="0"
                      value={midMonthOverride.holidays}
                      onChange={e => setMidMonthOverride({...midMonthOverride, holidays: Number(e.target.value)})} />
                  </Form.Group>
                </Col>
              </Row>
              <small className="text-muted mt-2 d-block">Edit the values above if the auto-calculated data is incorrect.</small>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMidMonthModal(false)}>Cancel</Button>
          <Button variant={midMonthData?.isCurrentMonth ? 'warning' : 'primary'} onClick={() => executeBulkGenerate(midMonthOverride)}>
            Confirm & Generate
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Corrections Modal */}
      <Modal
        show={showCorrectionsModal}
        onHide={() => {
          setShowCorrectionsModal(false);
          setCorrectionsTarget(null);
        }}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Make Salary Corrections —{" "}
            {(correctionsTarget || selectedPreview)?.employee?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {correctionsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : correctionsIsSimple ? (
            <>
              <Alert variant="info" className="small mb-3">
                Correct pay here using the same Simple Payroll rules: edit
                Monthly Salary or TDS, and optionally add a new adjustment line
                below. Existing adjustments are listed for reference.
              </Alert>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Monthly Salary (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={simpleCorrections.monthlySalary}
                      onChange={(e) =>
                        setSimpleCorrections((s) => ({
                          ...s,
                          monthlySalary: Number(e.target.value),
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>TDS (₹)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={simpleCorrections.tdsAmount}
                      onChange={(e) =>
                        setSimpleCorrections((s) => ({
                          ...s,
                          tdsAmount: Number(e.target.value),
                        }))
                      }
                    />
                  </Form.Group>

                  <Card className="mb-3 border-primary">
                    <Card.Header className="py-2 bg-primary text-white">
                      <strong>Add correction (optional)</strong>
                    </Card.Header>
                    <Card.Body className="py-3">
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Type</Form.Label>
                        <Form.Select
                          value={simpleCorrections.newCorrectionType}
                          onChange={(e) =>
                            setSimpleCorrections((s) => ({
                              ...s,
                              newCorrectionType: e.target.value,
                            }))
                          }
                        >
                          {ADJUSTMENT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-2">
                        <Form.Label className="small d-block">
                          Amount mode
                        </Form.Label>
                        <Form.Check
                          inline
                          type="radio"
                          id="corr-amt-fixed"
                          label="Fixed amount"
                          name="corrAmountMode"
                          checked={simpleCorrections.amountMode === "fixed"}
                          onChange={() =>
                            setSimpleCorrections((s) => ({
                              ...s,
                              amountMode: "fixed",
                            }))
                          }
                        />
                        <Form.Check
                          inline
                          type="radio"
                          id="corr-amt-per-day"
                          label="Per day (Monthly ÷ 30)"
                          name="corrAmountMode"
                          checked={simpleCorrections.amountMode === "per_day"}
                          onChange={() =>
                            setSimpleCorrections((s) => ({
                              ...s,
                              amountMode: "per_day",
                              newCorrectionType:
                                s.newCorrectionType === "manual_salary_addition" ||
                                s.newCorrectionType === "bonus" ||
                                s.newCorrectionType === "incentive"
                                  ? "manual_salary_deduction"
                                  : s.newCorrectionType,
                            }))
                          }
                        />
                      </Form.Group>

                      {simpleCorrections.amountMode === "per_day" ? (
                        <Form.Group className="mb-0">
                          <Form.Label className="small">
                            Days to deduct
                          </Form.Label>
                          <div className="d-flex gap-2 mb-2 flex-wrap">
                            {[1, 2, 3].map((d) => (
                              <Button
                                key={d}
                                size="sm"
                                variant={
                                  Number(simpleCorrections.days) === d
                                    ? "primary"
                                    : "outline-primary"
                                }
                                onClick={() =>
                                  setSimpleCorrections((s) => ({
                                    ...s,
                                    days: d,
                                  }))
                                }
                              >
                                {d} day{d > 1 ? "s" : ""} (
                                {formatCurrency(correctionPerDayRate() * d)})
                              </Button>
                            ))}
                          </div>
                          <Form.Control
                            type="number"
                            min="0"
                            step="1"
                            value={simpleCorrections.days}
                            onChange={(e) =>
                              setSimpleCorrections((s) => ({
                                ...s,
                                days: Number(e.target.value) || 0,
                              }))
                            }
                          />
                          <Form.Text muted>
                            Per day = {formatCurrency(correctionPerDayRate())}{" "}
                            (Monthly {formatCurrency(simpleCorrections.monthlySalary)}{" "}
                            ÷ 30). Deduction amount:{" "}
                            <strong>
                              {formatCurrency(effectiveNewCorrectionAmount())}
                            </strong>
                          </Form.Text>
                        </Form.Group>
                      ) : (
                        <Form.Group className="mb-0">
                          <Form.Label className="small">Amount (₹)</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            placeholder="0 = no new adjustment"
                            value={simpleCorrections.newCorrectionAmount || ""}
                            onChange={(e) =>
                              setSimpleCorrections((s) => ({
                                ...s,
                                newCorrectionAmount: Number(e.target.value) || 0,
                              }))
                            }
                          />
                          <Form.Text muted>
                            Leave 0 if you only need to change Monthly Salary or
                            TDS. Amount is saved as an approved Simple Payroll
                            adjustment when you click Save.
                          </Form.Text>
                        </Form.Group>
                      )}
                    </Card.Body>
                  </Card>

                  <div className="small text-muted mb-1">
                    Existing adjustments (from Simple Payroll)
                  </div>
                  <div className="fw-semibold mb-2">
                    {simpleCorrections.removeAllAdjustments ? (
                      <span className="text-decoration-line-through text-muted">
                        {formatCurrency(simpleCorrections.adjustmentsTotal)}
                      </span>
                    ) : (
                      formatCurrency(simpleCorrections.adjustmentsTotal)
                    )}
                    {simpleCorrections.removeAllAdjustments && (
                      <span className="text-danger ms-2">→ ₹0 (will remove all)</span>
                    )}
                    {!simpleCorrections.removeAllAdjustments &&
                      signedNewCorrectionAmount() !== 0 && (
                        <span className="text-primary ms-2">
                          → with new correction:{" "}
                          {formatCurrency(
                            effectiveAdjustmentsTotal() +
                              signedNewCorrectionAmount()
                          )}
                        </span>
                      )}
                  </div>
                  {(simpleCorrections.adjustmentLines || []).length > 0 && (
                    <>
                      <Table
                        size="sm"
                        bordered
                        className={`mb-2${
                          simpleCorrections.removeAllAdjustments
                            ? " opacity-50"
                            : ""
                        }`}
                      >
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th className="text-end">Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simpleCorrections.adjustmentLines.map(
                            (line, idx) => (
                              <tr key={line.id || idx}>
                                <td>{line.type}</td>
                                <td className="text-end">
                                  {line.signedAmount >= 0 ? "+" : ""}
                                  {formatCurrency(line.signedAmount)}
                                </td>
                                <td>{line.status}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </Table>
                      <Form.Check
                        type="checkbox"
                        id="remove-all-adjustments"
                        className="mb-3"
                        checked={Boolean(
                          simpleCorrections.removeAllAdjustments
                        )}
                        onChange={(e) =>
                          setSimpleCorrections((s) => ({
                            ...s,
                            removeAllAdjustments: e.target.checked,
                          }))
                        }
                        label="Remove all existing adjustments"
                      />
                      {simpleCorrections.removeAllAdjustments && (
                        <Alert variant="warning" className="small py-2">
                          On Save, every non-void adjustment for this employee
                          and month will be voided. Net will recalculate without
                          them.
                        </Alert>
                      )}
                    </>
                  )}
                </Col>
                <Col md={6}>
                  <Alert variant="success" className="text-center">
                    <div className="small text-muted mb-1">
                      Net Salary (after corrections)
                    </div>
                    <h4 className="mb-0">
                      {formatCurrency(
                        Number(simpleCorrections.monthlySalary || 0) +
                          effectiveAdjustmentsTotal() +
                          signedNewCorrectionAmount() -
                          Number(simpleCorrections.tdsAmount || 0)
                      )}
                    </h4>
                    <div className="small text-muted mt-2">
                      {formatCurrency(simpleCorrections.monthlySalary)} ±{" "}
                      {formatCurrency(
                        effectiveAdjustmentsTotal() +
                          signedNewCorrectionAmount()
                      )}{" "}
                      − {formatCurrency(simpleCorrections.tdsAmount)}
                    </div>
                  </Alert>
                </Col>
              </Row>
              <Form.Group className="mt-3">
                <Form.Label>
                  Correction Note <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={simpleCorrections.note}
                  onChange={(e) =>
                    setSimpleCorrections((s) => ({
                      ...s,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Explain why this correction is needed..."
                />
              </Form.Group>
            </>
          ) : (
            <>
          <Alert variant="info" className="small mb-3">
            All existing salary values are pre-filled. Edit any field to make corrections. Changes will be saved and totals recalculated automatically.
          </Alert>

          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-success text-white py-2">
                  <strong>Earnings</strong>
                </Card.Header>
                <Card.Body className="py-2">
                  {[
                    { key: 'basicSalary',        label: 'Basic Salary' },
                    { key: 'hra',                label: 'HRA' },
                    { key: 'specialAllowance',   label: 'Special Allowance' },
                    { key: 'transportAllowance', label: 'Transport Allowance' },
                    { key: 'medicalAllowance',   label: 'Medical Allowance' },
                    { key: 'bonus',              label: 'Bonus' },
                    { key: 'overtime',           label: 'Overtime' },
                    { key: 'arrears',            label: 'Arrears' },
                    { key: 'reimbursements',     label: 'Reimbursements' },
                    { key: 'incentives',         label: 'Incentives' },
                  ].map(({ key, label }) => (
                    <Row key={key} className="align-items-center mb-2">
                      <Col xs={6}><small className="text-muted">{label}</small></Col>
                      <Col xs={6}>
                        <Form.Control
                          type="number" size="sm" min="0"
                          value={corrections.earnings[key] ?? 0}
                          onChange={e => setCorrections({
                            ...corrections,
                            earnings: { ...corrections.earnings, [key]: Number(e.target.value) }
                          })}
                        />
                      </Col>
                    </Row>
                  ))}
                  <hr className="my-2" />
                  <Row className="align-items-center">
                    <Col xs={6}><strong className="text-success small">Gross Salary</strong></Col>
                    <Col xs={6} className="text-end">
                      <strong className="text-success">
                        {formatCurrency(Object.values(corrections.earnings).reduce((s, v) => s + (Number(v) || 0), 0))}
                      </strong>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-danger text-white py-2">
                  <strong>Deductions</strong>
                </Card.Header>
                <Card.Body className="py-2">
                  {[
                    { key: 'providentFund',   label: 'Provident Fund (PF)' },
                    { key: 'professionalTax', label: 'Professional Tax' },
                    { key: 'tds',             label: 'TDS' },
                    { key: 'esi',             label: 'ESI' },
                    { key: 'lossOfPay',       label: 'Loss of Pay' },
                    { key: 'advances',        label: 'Advance Recovery' },
                    { key: 'loans',           label: 'Loan EMI' },
                  ].map(({ key, label }) => (
                    <Row key={key} className="align-items-center mb-2">
                      <Col xs={6}><small className="text-muted">{label}</small></Col>
                      <Col xs={6}>
                        <Form.Control
                          type="number" size="sm" min="0"
                          value={corrections.deductions[key] ?? 0}
                          onChange={e => setCorrections({
                            ...corrections,
                            deductions: { ...corrections.deductions, [key]: Number(e.target.value) }
                          })}
                        />
                      </Col>
                    </Row>
                  ))}
                  <hr className="my-2" />
                  <Row className="align-items-center">
                    <Col xs={6}><strong className="text-danger small">Total Deductions</strong></Col>
                    <Col xs={6} className="text-end">
                      <strong className="text-danger">
                        {formatCurrency(Object.values(corrections.deductions).reduce((s, v) => s + (Number(v) || 0), 0))}
                      </strong>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Alert variant="success" className="text-center py-2">
                <div className="small text-muted mb-1">Net Salary (after corrections)</div>
                <h5 className="mb-0">
                  {formatCurrency(
                    Object.values(corrections.earnings).reduce((s, v) => s + (Number(v) || 0), 0) -
                    Object.values(corrections.deductions).reduce((s, v) => s + (Number(v) || 0), 0)
                  )}
                </h5>
              </Alert>
            </Col>
          </Row>

          <Form.Group>
            <Form.Label>Correction Note <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea" rows={2}
              value={corrections.note}
              onChange={e => setCorrections({ ...corrections, note: e.target.value })}
              placeholder="Explain why this correction is needed..."
            />
          </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCorrectionsModal(false);
              setCorrectionsTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveCorrections}
            disabled={
              savingCorrections ||
              !(correctionsIsSimple
                ? simpleCorrections.note.trim()
                : corrections.note.trim())
            }
          >
            {savingCorrections ? <Spinner animation="border" size="sm" /> : "Save Corrections"}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Generate Preview Modal */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Generate Salary Previews - {
              generateType === 'individual' ? 'Individual Employee' :
              generateType === 'department' ? 'By Department' :
              generateType === 'selected' ? 'Selected Employees' : 'Bulk'
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {generateType === 'individual' && (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Employee</Form.Label>
                <Form.Select
                  value={selectedEmployees[0] || ''}
                  onChange={(e) => setSelectedEmployees(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">Choose an employee...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} - {emp.employeeId} ({emp.department?.name || 'No Department'})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Alert variant="info">
                <small>Generate salary preview for a single employee for {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</small>
              </Alert>
            </div>
          )}

          {generateType === 'department' && (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Department</Form.Label>
                <Form.Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">Choose a department...</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({employees.filter(emp => emp.department?._id === dept._id).length} employees)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              {selectedDepartment && (
                <Alert variant="info">
                  <small>
                    This will generate previews for {employees.filter(emp => emp.department?._id === selectedDepartment).length} employees 
                    in {departments.find(d => d._id === selectedDepartment)?.name} department
                  </small>
                </Alert>
              )}
            </div>
          )}

          {generateType === 'selected' && (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Employees ({selectedEmployees.length} selected)</Form.Label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {employees.map(emp => (
                    <Form.Check
                      key={emp._id}
                      type="checkbox"
                      id={`emp-${emp._id}`}
                      label={`${emp.name} - ${emp.employeeId} (${emp.department?.name || 'No Department'})`}
                      checked={selectedEmployees.includes(emp._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees([...selectedEmployees, emp._id]);
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== emp._id));
                        }
                      }}
                      className="mb-2"
                    />
                  ))}
                </div>
              </Form.Group>
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => setSelectedEmployees(employees.map(emp => emp._id))}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                >
                  Clear All
                </Button>
              </div>
              {selectedEmployees.length > 0 && (
                <Alert variant="info">
                  <small>Generate previews for {selectedEmployees.length} selected employees</small>
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowGenerateModal(false);
            setSelectedEmployees([]);
            setSelectedDepartment('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (generateType === 'individual' && selectedEmployees[0]) {
                setShowGenerateModal(false);
                handleIndividualGenerate(selectedEmployees[0]);
              } else if (generateType === 'department' && selectedDepartment) {
                setShowGenerateModal(false);
                handleDepartmentGenerate(selectedDepartment);
              } else if (generateType === 'selected') {
                setShowGenerateModal(false);
                handleSelectedEmployeesGenerate();
              }
            }}
            disabled={
              (generateType === 'individual' && !selectedEmployees[0]) ||
              (generateType === 'department' && !selectedDepartment) ||
              (generateType === 'selected' && selectedEmployees.length === 0)
            }
          >
            Generate Previews
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default HRSalaryPreviewManagement;