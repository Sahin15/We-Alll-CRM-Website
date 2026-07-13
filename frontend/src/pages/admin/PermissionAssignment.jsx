import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { FaSave, FaShieldAlt, FaUser } from "react-icons/fa";
import authzApi from "../../api/authzApi";
import { userApi } from "../../api/userApi";
import toast from "../../utils/toast";

const SCOPE_OPTIONS = [
  { value: "SELF", label: "Self only" },
  { value: "OWN_DEPARTMENT", label: "Own department" },
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

/**
 * @param {Record<string, { permission: string, scope: string, effect: string, note?: string }>} draft
 * @returns {Array<{ permission: string, scope: string, effect: string, note?: string }>}
 */
function draftToAssignments(draft) {
  return Object.values(draft);
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
      return;
    }

    try {
      setLoadingDetail(true);
      const data = await authzApi.getUserAssignments(userId);
      setPayload(data);

      const nextDraft = {};
      for (const row of data.directAssignments || []) {
        nextDraft[row.permission] = {
          permission: row.permission,
          scope: row.scope,
          effect: row.effect,
          note: row.note || "",
        };
      }
      setDraft(nextDraft);
    } catch (error) {
      console.error("[PermissionAssignment] user load failed:", error);
      toast.error(error.response?.data?.error || "Failed to load user permissions");
      setPayload(null);
      setDraft({});
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadUserAssignments(selectedUserId);
  }, [selectedUserId, loadUserAssignments]);

  const inheritedSet = useMemo(
    () => new Set(payload?.inherited?.permissions || []),
    [payload]
  );

  const setGrant = (permission, scope = "COMPANY") => {
    setDraft((prev) => ({
      ...prev,
      [permission]: { permission, scope, effect: "grant", note: prev[permission]?.note || "" },
    }));
  };

  const setDeny = (permission) => {
    setDraft((prev) => ({
      ...prev,
      [permission]: {
        permission,
        scope: prev[permission]?.scope || "SELF",
        effect: "deny",
        note: prev[permission]?.note || "",
      },
    }));
  };

  const clearOverride = (permission) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[permission];
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    try {
      setSaving(true);
      const updated = await authzApi.updateUserAssignments(
        selectedUserId,
        draftToAssignments(draft)
      );
      setPayload(updated);

      const nextDraft = {};
      for (const row of updated.directAssignments || []) {
        nextDraft[row.permission] = {
          permission: row.permission,
          scope: row.scope,
          effect: row.effect,
          note: row.note || "",
        };
      }
      setDraft(nextDraft);
      toast.success("Permission assignments saved");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  const customGrantCount = Object.values(draft).filter((d) => d.effect === "grant").length;
  const denyCount = Object.values(draft).filter((d) => d.effect === "deny").length;

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-1 d-flex align-items-center gap-2">
            <FaShieldAlt className="text-primary" />
            Permission Assignment
          </h4>
          <p className="text-muted mb-0">
            Grant or revoke specific permissions for a user on top of their role defaults.
          </p>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={6}>
              <Form.Label>Select user</Form.Label>
              {loadingUsers ? (
                <Spinner size="sm" animation="border" />
              ) : (
                <Form.Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Choose a user…</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) — {u.role}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Col>
            <Col md="auto">
              <Button
                variant="primary"
                disabled={!selectedUserId || saving || loadingDetail}
                onClick={handleSave}
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
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <FaUser />
                    <strong>{payload.user.name}</strong>
                  </div>
                  <div className="text-muted small">{payload.user.email}</div>
                  <Badge bg="secondary" className="mt-2 text-uppercase">
                    {payload.user.role}
                  </Badge>
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
                    Custom grants: {customGrantCount}
                  </Badge>
                  <Badge bg="danger" className="px-3 py-2">
                    Denials: {denyCount}
                  </Badge>
                  <Badge bg="success" className="px-3 py-2">
                    Effective: {payload.effective?.permissions?.length || 0}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Accordion alwaysOpen>
            {Object.entries(catalogByModule)
              .filter(([moduleKey]) => moduleKey !== "platform")
              .map(([moduleKey, permissions], idx) => (
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
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permissions.map((perm) => {
                          const inherited = inheritedSet.has(perm.key);
                          const override = draft[perm.key];
                          const isDenied = override?.effect === "deny";
                          const isCustomGrant = override?.effect === "grant";
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
                            <tr key={perm.key}>
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
                              </td>
                              <td style={{ minWidth: "160px" }}>
                                {isCustomGrant && (
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
                              </td>
                              <td className="text-end">
                                <div className="d-inline-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant={isCustomGrant ? "primary" : "outline-primary"}
                                    onClick={() => setGrant(perm.key, override?.scope || "COMPANY")}
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
        </>
      )}
    </Container>
  );
};

export default PermissionAssignment;
