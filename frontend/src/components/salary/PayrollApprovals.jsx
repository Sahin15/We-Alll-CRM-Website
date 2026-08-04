import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { payrollApprovalApi } from "../../api/payrollApprovalApi";
import { salarySlipApi } from "../../api/salaryApi";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_VARIANT = {
  in_progress: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "secondary",
  pending: "info",
};

/**
 * Payroll approval inbox + start-approval (R4 Ops UI).
 */
const PayrollApprovals = () => {
  const now = new Date();
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [actTarget, setActTarget] = useState(null);
  const [actAction, setActAction] = useState("approved");
  const [capabilities, setCapabilities] = useState(null);
  const [actComments, setActComments] = useState("");

  const [createMonth, setCreateMonth] = useState(
    now.getMonth() === 0 ? 12 : now.getMonth()
  );
  const [createYear, setCreateYear] = useState(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  );
  const [slipOptions, setSlipOptions] = useState([]);
  const [selectedSlipIds, setSelectedSlipIds] = useState([]);
  const [pasteIds, setPasteIds] = useState("");
  const [loadingSlips, setLoadingSlips] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const [pendingRes, listRes, capsRes] = await Promise.all([
        payrollApprovalApi.listPendingMine(),
        payrollApprovalApi.list(params),
        payrollApprovalApi.getCapabilities().catch(() => null),
      ]);
      setPending(pendingRes.data?.data || []);
      setRecent(listRes.data?.data || []);
      if (capsRes?.data?.data) {
        setCapabilities(capsRes.data.data);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load payroll approvals"
      );
      setPending([]);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadSlipsForPeriod = async () => {
    try {
      setLoadingSlips(true);
      const res = await salarySlipApi.getAll({
        month: createMonth,
        year: createYear,
        limit: 200,
        page: 1,
      });
      const slips = res.data?.slips || res.data?.salarySlips || res.data?.data || [];
      const list = Array.isArray(slips) ? slips : [];
      setSlipOptions(list);
      setSelectedSlipIds([]);
      if (list.length === 0) {
        toast.info("No salary slips found for that month/year");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load salary slips"
      );
      setSlipOptions([]);
    } finally {
      setLoadingSlips(false);
    }
  };

  const toggleSlip = (id) => {
    setSelectedSlipIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resolvedCreateIds = useMemo(() => {
    const fromPaste = pasteIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set([...selectedSlipIds, ...fromPaste])];
  }, [selectedSlipIds, pasteIds]);

  const startApproval = async () => {
    if (resolvedCreateIds.length === 0) {
      toast.warning("Select slips or paste salary slip IDs");
      return;
    }
    try {
      setCreating(true);
      await payrollApprovalApi.create({
        salarySlipIds: resolvedCreateIds,
        type: "salary_approval",
        bulkCriteria: {
          month: createMonth,
          year: createYear,
        },
      });
      toast.success("Approval workflow created");
      setSelectedSlipIds([]);
      setPasteIds("");
      await refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create approval workflow"
      );
    } finally {
      setCreating(false);
    }
  };

  const openAct = (workflow, action) => {
    setActTarget(workflow);
    setActAction(action);
    setActComments("");
  };

  const submitAct = async () => {
    if (!actTarget) return;
    try {
      setBusyId(actTarget._id);
      await payrollApprovalApi.act(actTarget._id, {
        action: actAction,
        comments: actComments,
      });
      toast.success(
        actAction === "approved" ? "Stage approved" : "Stage rejected"
      );
      setActTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process action");
    } finally {
      setBusyId(null);
    }
  };

  const runBulkApprove = async (workflow) => {
    const reason = window.prompt(
      "Emergency bulk-approve skips remaining stages. Enter a reason (min 10 chars):",
      ""
    );
    if (reason == null) return;
    if (String(reason).trim().length < 10) {
      toast.warning("Bypass reason must be at least 10 characters");
      return;
    }
    if (
      !window.confirm(
        "Confirm stage-skip bulk approve? Prefer approving each stage instead."
      )
    ) {
      return;
    }
    try {
      setBusyId(workflow._id);
      await payrollApprovalApi.bulkApprove(workflow._id, {
        comments: String(reason).trim(),
        confirmBypass: true,
      });
      toast.success("Workflow bulk-approved");
      await refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to bulk-approve workflow"
      );
    } finally {
      setBusyId(null);
    }
  };

  const bulkApproveAllowed = Boolean(capabilities?.bulkApproveAllowed);

  const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const slipCount = (wf) =>
    Array.isArray(wf.salarySlips) ? wf.salarySlips.length : 0;

  return (
    <div className="py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h5 className="mb-1">Payroll approvals</h5>
          <small className="text-muted">
            Pending inbox, recent workflows, and start approval for a period
          </small>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={refresh}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <h6 className="mt-2">Pending for me</h6>
          {pending.length === 0 ? (
            <Alert variant="light" className="border">
              No workflows awaiting your action.
            </Alert>
          ) : (
            <Table responsive hover size="sm" className="align-middle">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Slips</th>
                  <th>Initiated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((wf) => (
                  <tr key={wf._id}>
                    <td>{wf.type || "salary_approval"}</td>
                    <td>
                      <Badge bg={STATUS_VARIANT[wf.overallStatus] || "secondary"}>
                        {wf.overallStatus}
                      </Badge>
                    </td>
                    <td>{slipCount(wf)}</td>
                    <td>
                      {wf.initiatedBy?.name || "—"}
                      <div className="text-muted small">
                        {wf.createdAt
                          ? new Date(wf.createdAt).toLocaleString()
                          : ""}
                      </div>
                    </td>
                    <td className="text-end">
                      <div className="d-flex flex-wrap gap-1 justify-content-end">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={busyId === wf._id}
                          onClick={() => openAct(wf, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={busyId === wf._id}
                          onClick={() => openAct(wf, "rejected")}
                        >
                          Reject
                        </Button>
                        {bulkApproveAllowed && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            disabled={busyId === wf._id}
                            onClick={() => runBulkApprove(wf)}
                          >
                            Bulk approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <div className="d-flex flex-wrap align-items-end gap-2 mt-4 mb-2">
            <h6 className="mb-0 me-auto">Recent workflows</h6>
            <Form.Group className="mb-0" style={{ minWidth: 160 }}>
              <Form.Label className="small mb-0">Status</Form.Label>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="in_progress">In progress</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>
          </div>
          {recent.length === 0 ? (
            <Alert variant="light" className="border">
              No workflows found.
            </Alert>
          ) : (
            <Table responsive hover size="sm" className="align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Slips</th>
                  <th>Period</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((wf) => (
                  <tr key={wf._id}>
                    <td>
                      <code className="small">{String(wf._id).slice(-8)}</code>
                    </td>
                    <td>
                      <Badge bg={STATUS_VARIANT[wf.overallStatus] || "secondary"}>
                        {wf.overallStatus}
                      </Badge>
                    </td>
                    <td>{slipCount(wf)}</td>
                    <td>
                      {wf.bulkCriteria?.month && wf.bulkCriteria?.year
                        ? `${MONTH_NAMES[wf.bulkCriteria.month - 1] || wf.bulkCriteria.month} ${wf.bulkCriteria.year}`
                        : "—"}
                    </td>
                    <td className="small text-muted">
                      {wf.updatedAt
                        ? new Date(wf.updatedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <hr className="my-4" />
          <h6>Start approval</h6>
          <p className="text-muted small mb-3">
            Load slips for a month or paste salary slip ObjectIds, then create a
            workflow. Requires active HR / Accounts / Admin approvers (or pass
            via API).
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
            <Form.Group>
              <Form.Label className="small mb-0">Month</Form.Label>
              <Form.Select
                size="sm"
                value={createMonth}
                onChange={(e) => setCreateMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label className="small mb-0">Year</Form.Label>
              <Form.Control
                size="sm"
                type="number"
                value={createYear}
                onChange={(e) => setCreateYear(Number(e.target.value))}
                style={{ width: 100 }}
              />
            </Form.Group>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={loadSlipsForPeriod}
              disabled={loadingSlips}
            >
              {loadingSlips ? "Loading…" : "Load slips"}
            </Button>
          </div>

          {slipOptions.length > 0 && (
            <Table responsive hover size="sm" className="mb-3">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {slipOptions.map((slip) => {
                  const id = slip._id;
                  return (
                    <tr key={id}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedSlipIds.includes(id)}
                          onChange={() => toggleSlip(id)}
                          disabled={Boolean(slip.approvalWorkflowId)}
                        />
                      </td>
                      <td>
                        {slip.employee?.name ||
                          slip.employeeName ||
                          String(slip.employee || "").slice(-6)}
                      </td>
                      <td>{slip.status}</td>
                      <td>{formatMoney(slip.netSalary)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="small">Or paste slip IDs</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Comma or newline separated ObjectIds"
              value={pasteIds}
              onChange={(e) => setPasteIds(e.target.value)}
            />
          </Form.Group>

          <Button
            variant="primary"
            disabled={creating || resolvedCreateIds.length === 0}
            onClick={startApproval}
          >
            {creating
              ? "Creating…"
              : `Create approval (${resolvedCreateIds.length} slip${resolvedCreateIds.length === 1 ? "" : "s"})`}
          </Button>
        </>
      )}

      <Modal show={Boolean(actTarget)} onHide={() => setActTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {actAction === "approved" ? "Approve stage" : "Reject stage"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Comments</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={actComments}
              onChange={(e) => setActComments(e.target.value)}
              placeholder="Optional comment"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setActTarget(null)}>
            Cancel
          </Button>
          <Button
            variant={actAction === "approved" ? "success" : "danger"}
            onClick={submitAct}
            disabled={busyId === actTarget?._id}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PayrollApprovals;
