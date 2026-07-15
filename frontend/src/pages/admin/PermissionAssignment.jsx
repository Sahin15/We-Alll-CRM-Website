import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { FaHistory, FaSave, FaShieldAlt, FaUndo, FaUser } from "react-icons/fa";
import authzApi from "../../api/authzApi";
import { userApi } from "../../api/userApi";
import SearchableUserSelect from "../../components/shared/SearchableUserSelect";
import toast from "../../utils/toast";

const SCOPE_OPTIONS = [
  { value: "SELF", label: "Self only" },
  { value: "TEAM", label: "Team" },
  { value: "OWN_DEPARTMENT", label: "Own department" },
  { value: "ASSIGNED_DEPARTMENTS", label: "Assigned departments" },
  { value: "PROJECT", label: "Project" },
  { value: "CLIENT_PORTFOLIO", label: "Client portfolio" },
  { value: "COMPANY", label: "Company-wide" },
];

const MODULE_LABELS = {
  platform: "Platform",
  dashboard: "Dashboard",
  profile: "Profile",
  support: "Support",
  team: "Team",
  attendance: "Attendance",
  leave: "Leave",
  worklog: "Work log",
  projects: "Projects",
  work: "Work items",
  company: "Company",
  hiring: "Hiring",
  crm: "CRM",
  procurement: "Procurement",
  billing: "Billing",
  finance: "Finance",
  resources: "Resources",
  reports: "Reports",
  auth: "Auth admin",
};

const VIEW_FILTERS = [
  { value: "all", label: "All permissions" },
  { value: "overrides", label: "Overrides only" },
  { value: "unsaved", label: "Unsaved changes" },
];

/**
 * @param {Record<string, { permission: string, scope: string, effect: string, note?: string }>} draft
 */
function draftToAssignments(draft) {
  return Object.values(draft);
}

function unwrapAuthzPayload(response) {
  if (!response || typeof response !== "object") return null;
  if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
    return response.data;
  }
  return response;
}

function rowsToDraft(rows = []) {
  const nextDraft = {};
  for (const row of rows) {
    if (!row?.permission || row.isExpired) continue;
    nextDraft[row.permission] = {
      permission: row.permission,
      scope: row.scope,
      effect: row.effect === "deny" ? "deny" : "grant",
      note: row.note || "",
      expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : "",
    };
  }
  return nextDraft;
}

function scopeLabel(scope) {
  return SCOPE_OPTIONS.find((opt) => opt.value === scope)?.label || scope;
}

function formatAuditDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

/**
 * @param {Record<string, object>} savedDraft
 * @param {Record<string, object>} draft
 */
function summarizeChanges(savedDraft, draft) {
  const allKeys = new Set([...Object.keys(savedDraft), ...Object.keys(draft)]);
  const changes = [];

  for (const key of allKeys) {
    const before = savedDraft[key];
    const after = draft[key];

    if (!before && after) {
      changes.push({
        permission: key,
        type: after.effect === "deny" ? "deny" : "grant",
        detail: after.effect === "deny" ? "Deny inherited permission" : `Grant (${scopeLabel(after.scope)})`,
      });
      continue;
    }

    if (before && !after) {
      changes.push({
        permission: key,
        type: "clear",
        detail: "Remove override (revert to role default)",
      });
      continue;
    }

    if (before && after && JSON.stringify(before) !== JSON.stringify(after)) {
      if (before.effect !== after.effect) {
        changes.push({
          permission: key,
          type: after.effect === "deny" ? "deny" : "grant",
          detail: `Change effect to ${after.effect}`,
        });
      } else if (before.scope !== after.scope) {
        changes.push({
          permission: key,
          type: "scope",
          detail: `Scope ${scopeLabel(before.scope)} → ${scopeLabel(after.scope)}`,
        });
      } else if (before.note !== after.note) {
        changes.push({
          permission: key,
          type: "note",
          detail: "Update assignment note",
        });
      }
    }
  }

  return changes;
}

const PermissionAssignment = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [catalogByModule, setCatalogByModule] = useState({});
  const [payload, setPayload] = useState(null);
  const [draft, setDraft] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [viewFilter, setViewFilter] = useState("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const draftRef = useRef({});
  const loadRequestRef = useRef(0);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingUsers(true);
        const [usersRes, catalogRes] = await Promise.all([
          userApi.getAllUsers({ excludePast: true, limit: 500 }),
          authzApi.getCatalog(),
        ]);

        const userList = Array.isArray(usersRes?.data)
          ? usersRes.data
          : Array.isArray(usersRes)
            ? usersRes
            : usersRes?.users || [];

        setUsers(
          userList
            .filter((u) => u.role !== "superadmin")
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        );
        setCatalogByModule(catalogRes?.byModule || {});
      } catch (error) {
        console.error("[PermissionAssignment] init load failed:", error);
        toast.error(error.response?.data?.error || "Failed to load permission data");
      } finally {
        setLoadingUsers(false);
      }
    };

    load();
  }, []);

  const loadUserAssignments = useCallback(async (userId) => {
    if (!userId) {
      setPayload(null);
      setDraft({});
      draftRef.current = {};
      return;
    }

    const requestId = ++loadRequestRef.current;

    try {
      setLoadingDetail(true);
      const data = unwrapAuthzPayload(await authzApi.getUserAssignments(userId));
      if (requestId !== loadRequestRef.current) return;

      setPayload(data);
      const nextDraft = rowsToDraft(data?.directAssignments);
      setDraft(nextDraft);
      draftRef.current = nextDraft;
      setPermissionSearch("");
      setViewFilter("all");
    } catch (error) {
      if (requestId !== loadRequestRef.current) return;
      console.error("[PermissionAssignment] user load failed:", error);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to load user permissions"
      );
      setPayload(null);
      setDraft({});
      draftRef.current = {};
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUserAssignments(selectedUserId);
  }, [selectedUserId, loadUserAssignments]);

  const inheritedSet = useMemo(
    () => new Set(payload?.inherited?.permissions || []),
    [payload]
  );

  const inheritedScopes = useMemo(
    () => payload?.inherited?.scopes || {},
    [payload]
  );

  const savedDraft = useMemo(
    () => rowsToDraft(payload?.directAssignments),
    [payload?.directAssignments]
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(savedDraft) !== JSON.stringify(draft),
    [savedDraft, draft]
  );

  const pendingChanges = useMemo(
    () => summarizeChanges(savedDraft, draft),
    [savedDraft, draft]
  );

  const setGrant = (permission, scope = "COMPANY") => {
    setDraft((prev) => ({
      ...prev,
      [permission]: {
        permission,
        scope,
        effect: "grant",
        note: prev[permission]?.note || "",
        expiresAt: prev[permission]?.expiresAt || "",
      },
    }));
  };

  const setDeny = (permission) => {
    setDraft((prev) => ({
      ...prev,
      [permission]: {
        permission,
        scope: prev[permission]?.scope || inheritedScopes[permission] || "SELF",
        effect: "deny",
        note: prev[permission]?.note || "",
        expiresAt: "",
      },
    }));
  };

  const setExpiresAt = (permission, expiresAt) => {
    setDraft((prev) => {
      if (!prev[permission]) return prev;
      return {
        ...prev,
        [permission]: { ...prev[permission], expiresAt },
      };
    });
  };

  const setNote = (permission, note) => {
    setDraft((prev) => {
      if (!prev[permission]) return prev;
      return {
        ...prev,
        [permission]: { ...prev[permission], note },
      };
    });
  };

  const clearOverride = (permission) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[permission];
      return next;
    });
  };

  const handleDiscard = () => {
    setDraft(savedDraft);
    draftRef.current = savedDraft;
    toast.info("Discarded unsaved changes");
  };

  const performSave = async () => {
    if (!selectedUserId) return;

    const assignments = draftToAssignments(draftRef.current).map((item) => ({
      ...item,
      expiresAt: item.expiresAt ? `${item.expiresAt}T23:59:59.999Z` : null,
    }));
    const effectiveBefore = payload?.effective?.permissions?.length || 0;

    try {
      setSaving(true);
      const updated = unwrapAuthzPayload(
        await authzApi.updateUserAssignments(selectedUserId, assignments)
      );

      if (!updated?.user?._id) {
        throw new Error("Save succeeded but the server returned an invalid response");
      }

      setPayload(updated);
      const nextDraft = rowsToDraft(updated.directAssignments);
      setDraft(nextDraft);
      draftRef.current = nextDraft;
      setShowConfirmModal(false);

      const effectiveAfter = updated.effective?.permissions?.length || 0;
      const grantCount = assignments.filter((item) => item.effect !== "deny").length;
      const denialCount = assignments.filter((item) => item.effect === "deny").length;
      const effectiveDelta = effectiveAfter - effectiveBefore;

      let summary = `Saved ${assignments.length} override${assignments.length === 1 ? "" : "s"}`;
      if (grantCount || denialCount) {
        summary += ` (${grantCount} grant${grantCount === 1 ? "" : "s"}, ${denialCount} denial${denialCount === 1 ? "" : "s"})`;
      }
      if (effectiveDelta !== 0) {
        summary += `. Effective permissions: ${effectiveBefore} → ${effectiveAfter}`;
      } else if (assignments.length > 0) {
        summary += ". Effective count unchanged (role already included these or denials offset grants).";
      }

      toast.success(summary);
    } catch (error) {
      console.error("[PermissionAssignment] save failed:", error);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to save assignments"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!selectedUserId || !hasUnsavedChanges) return;

    const hasDenials = pendingChanges.some((c) => c.type === "deny");
    const hasClears = pendingChanges.some((c) => c.type === "clear");

    if (hasDenials || hasClears || pendingChanges.length >= 3) {
      setShowConfirmModal(true);
      return;
    }

    performSave();
  };

  const permissionMatchesFilters = (perm, override, inherited) => {
    const term = permissionSearch.trim().toLowerCase();
    if (term) {
      const haystack = `${perm.key} ${perm.description || ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (viewFilter === "overrides") {
      return Boolean(override);
    }

    if (viewFilter === "unsaved") {
      const saved = savedDraft[perm.key];
      const current = draft[perm.key];
      if (!saved && !current) return false;
      return JSON.stringify(saved || null) !== JSON.stringify(current || null);
    }

    return true;
  };

  const filteredCatalogByModule = useMemo(() => {
    const result = {};

    for (const [moduleKey, permissions] of Object.entries(catalogByModule)) {
      if (moduleKey === "platform") continue;

      const filtered = permissions.filter((perm) => {
        const override = draft[perm.key];
        const inherited = inheritedSet.has(perm.key);
        return permissionMatchesFilters(perm, override, inherited);
      });

      if (filtered.length) {
        result[moduleKey] = filtered;
      }
    }

    return result;
  }, [catalogByModule, draft, inheritedSet, permissionSearch, savedDraft, viewFilter]);

  const denyCount = Object.values(draft).filter((d) => d.effect === "deny").length;
  const savedOverrideCount = payload?.directAssignments?.length || 0;
  const netCustomPermissions = payload?.effective?.customPermissions?.length || 0;

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-1 d-flex align-items-center gap-2">
            <FaShieldAlt className="text-primary" />
            Permission Assignment
          </h4>
          <p className="text-muted mb-0">
            Grant or revoke permissions on top of role defaults. Denials remove inherited access;
            grants add permissions the role does not include. Changes apply after the user&apos;s
            next login or token refresh.
          </p>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={6}>
              <Form.Label>Select user</Form.Label>
              <SearchableUserSelect
                users={users}
                value={selectedUserId}
                onChange={setSelectedUserId}
                loading={loadingUsers}
                placeholder="Type a name to search…"
              />
            </Col>
            <Col md="auto" className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                disabled={!hasUnsavedChanges || saving || loadingDetail}
                onClick={handleDiscard}
              >
                <FaUndo className="me-2" />
                Discard
              </Button>
              <Button
                variant="primary"
                disabled={!selectedUserId || saving || loadingDetail || !hasUnsavedChanges}
                onClick={handleSaveClick}
              >
                {saving ? (
                  <Spinner size="sm" animation="border" className="me-2" />
                ) : (
                  <FaSave className="me-2" />
                )}
                Save assignments
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {!selectedUserId && (
        <Alert variant="info">Select a user to view and edit their permission overrides.</Alert>
      )}

      {selectedUserId && loadingDetail && (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {selectedUserId && payload && !loadingDetail && (
        <>
          {payload.expiredAssignments?.length > 0 && (
            <Alert variant="secondary" className="mb-4">
              {payload.expiredAssignments.length} expired override
              {payload.expiredAssignments.length === 1 ? "" : "s"} no longer apply. They remain
              in the audit trail until removed on next save.
            </Alert>
          )}

          {payload.user.isHeadOfDepartment && (
            <Alert variant="warning" className="mb-4">
              This user is flagged as <strong>Head of Department</strong>. They receive additional
              department-scoped permissions from the HoD sync job on top of their{" "}
              <code>{payload.user.role}</code> role. Direct grants stack with both.
            </Alert>
          )}

          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <FaUser />
                    <strong>{payload.user.name}</strong>
                  </div>
                  <div className="text-muted small">{payload.user.email}</div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <Badge bg="secondary" className="text-uppercase">
                      {payload.user.role}
                    </Badge>
                    {payload.user.isHeadOfDepartment && (
                      <Badge bg="warning" text="dark">
                        HoD
                      </Badge>
                    )}
                    {payload.user.department?.name && (
                      <Badge bg="light" text="dark">
                        {payload.user.department.name}
                      </Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex flex-wrap gap-3 align-items-center">
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    Inherited: {payload.inherited?.permissions?.length || 0}
                  </Badge>
                  <Badge bg="primary" className="px-3 py-2">
                    Saved overrides: {savedOverrideCount}
                  </Badge>
                  <Badge bg="info" className="px-3 py-2">
                    Net new grants: {netCustomPermissions}
                  </Badge>
                  <Badge bg="danger" className="px-3 py-2">
                    Denials (draft): {denyCount}
                  </Badge>
                  <Badge bg="success" className="px-3 py-2">
                    Effective: {payload.effective?.permissions?.length || 0}
                  </Badge>
                  {hasUnsavedChanges && (
                    <Badge bg="warning" text="dark" className="px-3 py-2">
                      Unsaved changes ({pendingChanges.length})
                    </Badge>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {payload.directAssignments?.length > 0 && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white d-flex align-items-center gap-2">
                <FaHistory />
                <strong>Assignment audit trail</strong>
                <Badge bg="secondary">{payload.directAssignments.length}</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Permission</th>
                      <th>Effect</th>
                      <th>Scope</th>
                      <th>Assigned by</th>
                      <th>Last updated</th>
                      <th>Expires</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.directAssignments.map((row) => (
                      <tr key={row._id || row.permission}>
                        <td>
                          <code className="small">{row.permission}</code>
                        </td>
                        <td>
                          <Badge bg={row.effect === "deny" ? "danger" : "primary"}>
                            {row.effect}
                          </Badge>
                        </td>
                        <td className="small">{scopeLabel(row.scope)}</td>
                        <td className="small">
                          {row.assignedBy?.name || "—"}
                          {row.assignedBy?.email && (
                            <div className="text-muted">{row.assignedBy.email}</div>
                          )}
                        </td>
                        <td className="small">{formatAuditDate(row.updatedAt || row.createdAt)}</td>
                        <td className="small">
                          {row.isExpired ? (
                            <Badge bg="secondary">Expired</Badge>
                          ) : row.expiresAt ? (
                            formatAuditDate(row.expiresAt)
                          ) : (
                            "Never"
                          )}
                        </td>
                        <td className="small text-muted">{row.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="small text-muted mb-1">Search permissions</Form.Label>
                  <Form.Control
                    type="search"
                    placeholder="Filter by key or description…"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="small text-muted mb-1">Show</Form.Label>
                  <Form.Select
                    value={viewFilter}
                    onChange={(e) => setViewFilter(e.target.value)}
                  >
                    {VIEW_FILTERS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {Object.keys(filteredCatalogByModule).length === 0 ? (
            <Alert variant="secondary">No permissions match the current filters.</Alert>
          ) : (
            <Accordion alwaysOpen>
              {Object.entries(filteredCatalogByModule).map(([moduleKey, permissions], idx) => (
                <Accordion.Item eventKey={String(idx)} key={moduleKey}>
                  <Accordion.Header>
                    {MODULE_LABELS[moduleKey] || moduleKey}
                    <Badge bg="secondary" className="ms-2">
                      {permissions.length}
                    </Badge>
                  </Accordion.Header>
                  <Accordion.Body className="p-0">
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Permission</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Scope</th>
                            <th>Expires</th>
                            <th>Note</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {permissions.map((perm) => {
                            const inherited = inheritedSet.has(perm.key);
                            const override = draft[perm.key];
                            const saved = savedDraft[perm.key];
                            const isDenied = override?.effect === "deny";
                            const isCustomGrant = override?.effect === "grant";
                            const isUnsaved =
                              JSON.stringify(saved || null) !== JSON.stringify(override || null);
                            const inheritedScope = inheritedScopes[perm.key];

                            const status = isDenied
                              ? "Denied"
                              : isCustomGrant
                                ? inherited
                                  ? "Custom scope"
                                  : "Custom grant"
                                : inherited
                                  ? "Inherited"
                                  : "None";

                            return (
                              <tr key={perm.key} className={isUnsaved ? "table-warning" : undefined}>
                                <td>
                                  <code className="small">{perm.key}</code>
                                </td>
                                <td className="small text-muted">{perm.description}</td>
                                <td>
                                  <Badge
                                    bg={
                                      isDenied
                                        ? "danger"
                                        : isCustomGrant
                                          ? "primary"
                                          : inherited
                                            ? "secondary"
                                            : "light"
                                    }
                                    text={!inherited && !isCustomGrant && !isDenied ? "dark" : undefined}
                                  >
                                    {status}
                                  </Badge>
                                  {isUnsaved && (
                                    <Badge bg="warning" text="dark" className="ms-1">
                                      unsaved
                                    </Badge>
                                  )}
                                  {inherited && inheritedScope && !override && (
                                    <div className="small text-muted mt-1">
                                      Role scope: {scopeLabel(inheritedScope)}
                                    </div>
                                  )}
                                </td>
                                <td style={{ minWidth: "160px" }}>
                                  {override && override.effect === "grant" && (
                                    <Form.Select
                                      size="sm"
                                      value={override.scope}
                                      onChange={(e) => setGrant(perm.key, e.target.value)}
                                    >
                                      {SCOPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  )}
                                  {isDenied && (
                                    <span className="small text-muted">
                                      {scopeLabel(override.scope)}
                                    </span>
                                  )}
                                </td>
                                <td style={{ minWidth: "140px" }}>
                                  {override && override.effect === "grant" && (
                                    <Form.Control
                                      size="sm"
                                      type="date"
                                      min={new Date().toISOString().slice(0, 10)}
                                      value={override.expiresAt || ""}
                                      onChange={(e) => setExpiresAt(perm.key, e.target.value)}
                                    />
                                  )}
                                </td>
                                <td style={{ minWidth: "180px" }}>
                                  {override && (
                                    <Form.Control
                                      size="sm"
                                      type="text"
                                      placeholder="Reason / ticket ref"
                                      maxLength={500}
                                      value={override.note || ""}
                                      onChange={(e) => setNote(perm.key, e.target.value)}
                                    />
                                  )}
                                </td>
                                <td className="text-end">
                                  <div className="d-inline-flex gap-1 flex-wrap justify-content-end">
                                    <Button
                                      size="sm"
                                      variant={isCustomGrant ? "primary" : "outline-primary"}
                                      onClick={() =>
                                        setGrant(
                                          perm.key,
                                          override?.scope || inheritedScope || "COMPANY"
                                        )
                                      }
                                    >
                                      Grant
                                    </Button>
                                    {(inherited || isCustomGrant) && (
                                      <Button
                                        size="sm"
                                        variant={isDenied ? "danger" : "outline-danger"}
                                        onClick={() => setDeny(perm.key)}
                                      >
                                        Deny
                                      </Button>
                                    )}
                                    {override && (
                                      <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        onClick={() => clearOverride(perm.key)}
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </>
      )}

      <Modal show={showConfirmModal} onHide={() => !saving && setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm permission changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            You are about to save {pendingChanges.length} change
            {pendingChanges.length === 1 ? "" : "s"} for{" "}
            <strong>{payload?.user?.name}</strong>:
          </p>
          <ul className="mb-0">
            {pendingChanges.map((change) => (
              <li key={`${change.permission}-${change.type}`} className="mb-2">
                <code>{change.permission}</code>
                <span className="text-muted"> — {change.detail}</span>
              </li>
            ))}
          </ul>
          {pendingChanges.some((c) => c.type === "deny") && (
            <Alert variant="danger" className="mt-3 mb-0">
              Denials immediately remove inherited permissions for this user.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={saving} onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={performSave}>
            {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Confirm save
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PermissionAssignment;
