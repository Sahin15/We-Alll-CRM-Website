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
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { metaIntegrationApi } from "../../api/metaIntegrationApi";
import { clientApi } from "../../api/clientApi";
import { leadApi } from "../../api/leadApi";
import "./MetaAdsIntegration.css";

const ERROR_TEXT = {
  access_denied: "Meta authorization was cancelled.",
  invalid_state: "The Meta login session expired. Start the connection again.",
  not_configured: "Meta is not configured on the server yet.",
  token_exchange_failed: "Meta did not return an access token.",
  invalid_redirect: "The server redirect URL is not valid.",
  meta_error: "Meta could not complete the connection.",
};

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

/** @param {string} iso YYYY-MM-DD */
function formatShortDate(iso) {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatLeadRangeLabel(from, to) {
  if (!from || !to) return "";
  return `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

function statusBadge(status) {
  if (status === "connected") return <Badge bg="success">Connected</Badge>;
  if (status === "needs_reauth") return <Badge bg="warning" text="dark">Reconnect required</Badge>;
  return <Badge bg="secondary">Not connected</Badge>;
}

function leadStatusVariant(status) {
  switch (status) {
    case "New":
      return "primary";
    case "Qualified":
    case "Won":
      return "success";
    case "Lost":
      return "danger";
    default:
      return "info";
  }
}

const LEAD_HINT_SKIP_FIELDS = new Set([
  "full_name",
  "fullname",
  "name",
  "phone",
  "phone_number",
  "email",
  "city",
]);

function humanizeFieldName(name) {
  return String(name || "")
    .replace(/_/g, " ")
    .replace(/\?$/g, "")
    .trim();
}

/**
 * Short secondary line under the lead name (city + extra form answers).
 * @param {{ meta?: { city?: string, fieldData?: Array<{ name?: string, values?: string[] }> } }} lead
 * @returns {string}
 */
function leadDetailHint(lead) {
  const parts = [];
  const city = String(lead.meta?.city || "").trim();
  if (city) parts.push(city);

  const fields = Array.isArray(lead.meta?.fieldData) ? lead.meta.fieldData : [];
  for (const row of fields) {
    const key = String(row.name || "").toLowerCase();
    if (LEAD_HINT_SKIP_FIELDS.has(key)) continue;
    const value = (row.values || []).filter(Boolean).join(", ");
    if (!value) continue;
    parts.push(`${humanizeFieldName(row.name)}: ${value}`);
    if (parts.length >= (city ? 2 : 3)) break;
  }
  return parts.join(" · ");
}

function accountLabel(account) {
  if (account.name && !/^\d+$/.test(account.name)) return account.name;
  return account.name || account.accountId.replace(/^act_/, "Account ");
}

/** Backend caps at 100 clients per page — load every page for the mapping dropdown. */
async function fetchAllCrmClients() {
  const rows = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 100) {
    const response = await clientApi.getAllClients({ page, limit: 100 });
    const batch = Array.isArray(response?.data) ? response.data : [];
    rows.push(...batch);
    hasMore = Boolean(response?.pagination?.hasMore) && batch.length > 0;
    page += 1;
  }
  return rows;
}

function normalizeMatchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function namesLikelySameClient(accountName, pageName) {
  const accountKey = normalizeMatchText(accountName);
  const pageKey = normalizeMatchText(pageName);
  if (!accountKey || !pageKey) return false;
  if (pageKey === accountKey || pageKey.includes(accountKey) || accountKey.includes(pageKey)) return true;
  const accountTokens = accountKey.split(" ").filter((t) => t.length > 2);
  const pageTokens = pageKey.split(" ").filter((t) => t.length > 2);
  if (!accountTokens.length || !pageTokens.length) return false;
  let shared = 0;
  for (const token of accountTokens) {
    if (pageTokens.some((pt) => pt === token || pt.includes(token) || token.includes(pt))) shared += 1;
  }
  if (shared >= 2) return true;
  if (shared >= 1 && accountTokens.some((t) => t.length >= 5)) return true;
  return shared >= 1 && accountTokens.length === 1;
}

const MetaAdsIntegration = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runningId, setRunningId] = useState("");
  const [crmClients, setCrmClients] = useState([]);
  const [showConnection, setShowConnection] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [clientPickerSearch, setClientPickerSearch] = useState("");

  const [pageIds, setPageIds] = useState([]);
  const [formIds, setFormIds] = useState([]);
  const [adAccountIds, setAdAccountIds] = useState([]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [leadFilters, setLeadFilters] = useState({ status: "", search: "", page: 1 });
  const [leadsPayload, setLeadsPayload] = useState({ leads: [], total: 0, limit: 25 });

  const [draftClientId, setDraftClientId] = useState("");
  const [draftPageIds, setDraftPageIds] = useState([]);

  const selectedAccountId = searchParams.get("account") || "";
  const integration = status?.integration;
  const canManage = Boolean(status?.canManage);
  const accounts = dashboard?.accounts || [];
  const availablePages = dashboard?.availablePages || [];
  const importedPages = dashboard?.importedPages || [];

  const activeAccount = useMemo(
    () => accounts.find((row) => row.accountId === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const matchingImportedPages = useMemo(() => {
    if (!activeAccount) return [];
    const label = accountLabel(activeAccount);
    return importedPages.filter((row) => namesLikelySameClient(label, row.pageName));
  }, [activeAccount, importedPages]);

  const applySelection = useCallback((next) => {
    setPageIds((next?.pages || []).filter((page) => page.selected).map((page) => page.pageId));
    setFormIds((next?.forms || []).filter((form) => form.selected).map((form) => form.formId));
    setAdAccountIds((next?.adAccounts || []).filter((account) => account.selected).map((account) => account.accountId));
  }, []);

  const loadDashboard = useCallback(async (range) => {
    const params = {};
    if (range?.from) params.from = range.from;
    if (range?.to) params.to = range.to;
    const response = await metaIntegrationApi.getDashboard(params);
    setDashboard(response.data.dashboard);
    if (!range?.from && response.data.dashboard) {
      setFrom(response.data.dashboard.from);
      setTo(response.data.dashboard.to);
    }
    return response.data.dashboard;
  }, []);

  const loadLeads = useCallback(async (accountId, range, filters) => {
    if (!accountId) {
      setLeadsPayload({ leads: [], total: 0, limit: 25 });
      return;
    }
    const params = {
      accountId,
      page: filters.page,
      limit: 25,
      search: filters.search || undefined,
      status: filters.status || undefined,
    };
    if (range?.from) params.from = range.from;
    if (range?.to) params.to = range.to;
    const response = await metaIntegrationApi.getLeads(params);
    setLeadsPayload({
      leads: response.data.leads || [],
      total: response.data.total || 0,
      limit: response.data.limit || 25,
    });
  }, []);

  const selectAccount = useCallback((accountId, range, filters, closePicker = true) => {
    const next = new URLSearchParams(searchParams);
    if (accountId) next.set("account", accountId);
    else next.delete("account");
    setSearchParams(next, { replace: true });
    setLeadFilters((current) => ({ ...current, page: 1 }));
    loadLeads(accountId, range, { ...filters, page: 1 });
    if (closePicker) setShowAccountPicker(false);
  }, [searchParams, setSearchParams, loadLeads]);

  const loadAll = useCallback(async () => {
    const [statusResponse, runsResponse, dash] = await Promise.all([
      metaIntegrationApi.getStatus(),
      metaIntegrationApi.getSyncRuns(),
      loadDashboard(),
    ]);
    setStatus(statusResponse.data);
    applySelection(statusResponse.data.integration);
    setRuns(runsResponse.data.runs || []);

    const list = dash?.accounts || [];
    const urlAccount = searchParams.get("account");
    const pick = list.find((row) => row.accountId === urlAccount)?.accountId
      || list.find((row) => row.stats?.total > 0)?.accountId
      || list[0]?.accountId
      || "";
    if (pick && pick !== urlAccount) {
      selectAccount(pick, { from: dash?.from, to: dash?.to }, leadFilters);
    } else if (pick) {
      await loadLeads(pick, { from: dash?.from, to: dash?.to }, leadFilters);
    }
  }, [applySelection, loadDashboard, loadLeads, leadFilters, searchParams, selectAccount]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const allClients = await fetchAllCrmClients();
        if (active) setCrmClients(allClients);
        await loadAll();
      } catch (error) {
        if (active) toast.error(error.response?.data?.error || "Could not load Meta Lead Ads");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeAccount) {
      setDraftClientId("");
      setDraftPageIds([]);
      setClientPickerSearch("");
      return;
    }
    setDraftClientId(activeAccount.clientId || "");
    setDraftPageIds(activeAccount.configuredPageIds?.length ? activeAccount.configuredPageIds : activeAccount.pageIds || []);
    setClientPickerSearch("");
  }, [activeAccount]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "1") toast.success("Meta account connected");
    if (error) toast.error(ERROR_TEXT[error] || ERROR_TEXT.meta_error);
    if (connected || error) {
      searchParams.delete("connected");
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!runningId) return undefined;
    const timer = setInterval(async () => {
      try {
        const response = await metaIntegrationApi.getSyncRuns();
        const nextRuns = response.data.runs || [];
        setRuns(nextRuns);
        const current = nextRuns.find((run) => run._id === runningId);
        if (current && current.status !== "running") {
          setRunningId("");
          if (current.status === "failed") toast.error(current.error || "Meta sync failed");
          else toast.success("Meta sync finished");
          const dash = await loadDashboard({ from, to });
          if (selectedAccountId) {
            await loadLeads(selectedAccountId, { from, to }, leadFilters);
          } else if (dash?.accounts?.[0]) {
            selectAccount(dash.accounts[0].accountId, { from, to }, leadFilters);
          }
        }
      } catch {
        setRunningId("");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [runningId, from, to, loadDashboard, loadLeads, leadFilters, selectedAccountId, selectAccount]);

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim().toLowerCase();
    let list = showAllAccounts ? accounts : accounts.filter((row) => row.selected || row.stats?.total > 0);
    if (!showAllAccounts && !list.length) list = accounts;
    if (!q) return list;
    return list.filter((row) => {
      const hay = `${accountLabel(row)} ${row.clientName || ""} ${row.currency || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [accounts, accountQuery, showAllAccounts]);

  const clientOptions = useMemo(() => {
    const options = crmClients.map((client) => ({
      id: client._id,
      label: client.name || client.company || client.email || "Client",
      searchText: normalizeMatchText(`${client.name} ${client.company} ${client.email}`),
    }));
    options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return options;
  }, [crmClients]);

  const filteredClientOptions = useMemo(() => {
    const q = normalizeMatchText(clientPickerSearch);
    if (!q) return clientOptions;
    return clientOptions.filter((opt) => opt.searchText.includes(q) || opt.label.toLowerCase().includes(q));
  }, [clientOptions, clientPickerSearch]);

  const suggestedClientId = useMemo(() => {
    if (!activeAccount) return "";
    const accountKey = normalizeMatchText(accountLabel(activeAccount));
    if (!accountKey) return "";
    const exact = clientOptions.find((opt) => normalizeMatchText(opt.label) === accountKey);
    if (exact) return exact.id;
    const partial = clientOptions.find(
      (opt) => opt.searchText.includes(accountKey) || accountKey.includes(normalizeMatchText(opt.label))
    );
    return partial?.id || "";
  }, [activeAccount, clientOptions]);

  const toggle = (list, setList, id) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };

  const runAction = async (name, action) => {
    setBusy(name);
    try {
      await action();
    } catch (error) {
      toast.error(error.response?.data?.error || "Request failed");
    } finally {
      setBusy("");
    }
  };

  const changeLeadStatus = async (leadId, nextStatus, event) => {
    event.stopPropagation();
    await runAction("status", async () => {
      await leadApi.updateLeadStatus(leadId, nextStatus);
      setLeadsPayload((current) => ({
        ...current,
        leads: current.leads.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)),
      }));
      await loadDashboard({ from, to });
      toast.success("Lead status updated");
    });
  };

  const saveAccountConfig = () => {
    if (!selectedAccountId) return;
    runAction("account-config", async () => {
      const response = await metaIntegrationApi.configureAdAccount(selectedAccountId, {
        clientId: draftClientId || null,
        pageIds: draftPageIds,
      });
      setStatus((current) => ({ ...current, integration: response.data.integration }));
      const dash = await loadDashboard({ from, to });
      await loadLeads(selectedAccountId, { from: dash?.from || from, to: dash?.to || to }, leadFilters);
      toast.success("Account mapping saved");
    });
  };

  const totalLeadPages = Math.max(1, Math.ceil((leadsPayload.total || 0) / (leadsPayload.limit || 25)));

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-3 meta-leads-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="mb-1">Meta Lead Ads</h2>
          <p className="text-muted mb-2">
            Pick an ad account, link your CRM client and Facebook Pages, then work leads for that account only.
          </p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            {statusBadge(integration?.status)}
            {integration?.metaUserName && <span className="text-muted small">{integration.metaUserName}</span>}
          </div>
        </div>
        <div className="meta-page-toolbar">
          <div className="meta-date-range-row">
            <div className="meta-date-range-inputs">
              <Form.Control
                type="date"
                size="sm"
                className="meta-date-input"
                aria-label="From date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="meta-date-separator" aria-hidden="true">
                to
              </span>
              <Form.Control
                type="date"
                size="sm"
                className="meta-date-input"
                aria-label="To date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={busy === "range"}
              onClick={() => runAction("range", async () => {
                const dash = await loadDashboard({ from, to });
                if (selectedAccountId) await loadLeads(selectedAccountId, { from, to }, leadFilters);
                else if (dash?.accounts?.[0]) selectAccount(dash.accounts[0].accountId, { from, to }, leadFilters);
              })}
            >
              Apply dates
            </Button>
            <Button
              size="sm"
              variant="link"
              className="text-decoration-none meta-date-preset"
              onClick={() => runAction("range", async () => {
                const dash = await loadDashboard({});
                if (dash?.from) setFrom(dash.from);
                if (dash?.to) setTo(dash.to);
                if (selectedAccountId) await loadLeads(selectedAccountId, { from: dash?.from, to: dash?.to }, leadFilters);
              })}
            >
              Last 30 days
            </Button>
          </div>
          <div className="meta-page-actions">
            {integration?.status === "connected" && (
              <Button size="sm" variant="outline-primary" onClick={() => setShowAccountPicker(true)}>
                Ad accounts
              </Button>
            )}
            <Button size="sm" variant="outline-secondary" onClick={() => setShowConnection(true)}>
              Connection
            </Button>
            {canManage && integration?.status === "connected" && (
              <Button
                size="sm"
                variant="primary"
                disabled={busy === "sync" || Boolean(runningId)}
                onClick={() => runAction("sync", async () => {
                  const response = await metaIntegrationApi.syncNow();
                  setRunningId(response.data.runId);
                  toast.info("Sync started");
                })}
              >
                {runningId ? "Syncing…" : "Sync now"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {!status?.configured && (
        <Alert variant="warning">Server missing Meta credentials in environment variables.</Alert>
      )}

      {!integration || integration.status === "disconnected" ? (
        <Alert variant="light" className="border">
          Connect Meta under Connection, then select ad accounts, Pages, and lead forms.
        </Alert>
      ) : (
        <div className="meta-workspace-full">
          {!activeAccount ? (
            <Alert variant="light" className="border d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span>Select an ad account to open the lead workspace.</span>
              <Button size="sm" onClick={() => setShowAccountPicker(true)}>Choose ad account</Button>
            </Alert>
          ) : (
            <>
              <Card className="mb-3 meta-account-context-bar">
                <Card.Body className="meta-account-context-body">
                  <div className="meta-account-context-inner">
                    <div className="meta-account-context-main">
                      <span className="meta-account-context-kicker">Current ad account</span>
                      <h4 className="meta-account-context-name mb-0">{accountLabel(activeAccount)}</h4>
                      <p className="meta-account-context-meta mb-0">
                        {activeAccount.currency || "—"}
                        {activeAccount.clientName ? ` · CRM: ${activeAccount.clientName}` : ""}
                        {activeAccount.pages?.length
                          ? ` · Pages: ${activeAccount.pages.map((p) => p.pageName).join(", ")}${activeAccount.pageMatchAuto ? " (matched by name)" : ""}`
                          : " · No Facebook Pages linked — map Pages in Account mapping"}
                      </p>
                    </div>
                    <div className="meta-account-context-side">
                      <div className="meta-stat-grid meta-stat-grid--context">
                        {["New", "Contacted", "Qualified", "Won"].map((key) => (
                          <div key={key} className="meta-stat-cell meta-stat-cell--context">
                            <strong>{activeAccount.stats[key] ?? 0}</strong>
                            <span>{key}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="light"
                        className="meta-account-switch-btn"
                        onClick={() => setShowAccountPicker(true)}
                      >
                        Switch account
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {!!matchingImportedPages.length && !activeAccount.pageIds?.length && (
                <Alert variant="warning" className="mb-3">
                  <strong>Leads exist but this ad account is not linked to a Page yet.</strong>
                  <ul className="mb-2 mt-2 small">
                    {matchingImportedPages.map((row) => (
                      <li key={row.pageId}>
                        {row.count} lead(s) on Facebook Page &quot;{row.pageName}&quot;
                        {!row.selected ? " — enable this Page under Connection, then map it below" : " — tick it in Account mapping and save"}
                      </li>
                    ))}
                  </ul>
                  {canManage && matchingImportedPages.some((row) => row.selected) && (
                    <Button
                      size="sm"
                      disabled={busy === "account-config"}
                      onClick={() => {
                        const ids = matchingImportedPages.filter((row) => row.selected).map((row) => row.pageId);
                        setDraftPageIds(ids);
                        runAction("account-config", async () => {
                          const response = await metaIntegrationApi.configureAdAccount(selectedAccountId, {
                            clientId: draftClientId || null,
                            pageIds: ids,
                          });
                          setStatus((current) => ({ ...current, integration: response.data.integration }));
                          const dash = await loadDashboard({ from, to });
                          await loadLeads(selectedAccountId, { from: dash?.from || from, to: dash?.to || to }, leadFilters);
                          toast.success("Facebook Page(s) linked to this ad account");
                        });
                      }}
                    >
                      Link matching Page(s) now
                    </Button>
                  )}
                </Alert>
              )}

              <Accordion className="mb-3" defaultActiveKey={activeAccount.pageIds?.length ? undefined : "mapping"}>
                <Accordion.Item eventKey="mapping">
                  <Accordion.Header>
                    Account mapping — link Facebook Pages (required for leads to show)
                  </Accordion.Header>
                  <Accordion.Body>
                    {canManage ? (
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group className="mb-2">
                            <Form.Label className="small text-muted d-flex justify-content-between">
                              <span>CRM client ({clientOptions.length} in CRM)</span>
                              {suggestedClientId && !draftClientId && (
                                <Button
                                  size="sm"
                                  variant="link"
                                  className="p-0"
                                  onClick={() => setDraftClientId(suggestedClientId)}
                                >
                                  Use suggested match
                                </Button>
                              )}
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              className="mb-1"
                              placeholder="Type to filter clients…"
                              value={clientPickerSearch}
                              onChange={(e) => setClientPickerSearch(e.target.value)}
                            />
                            <Form.Select
                              size="sm"
                              value={draftClientId}
                              onChange={(e) => setDraftClientId(e.target.value)}
                            >
                              <option value="">— Select client —</option>
                              {filteredClientOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}{opt.id === suggestedClientId ? " (name match)" : ""}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-2">
                            <Form.Label className="small text-muted">Facebook Pages for this account&apos;s leads</Form.Label>
                            {!availablePages.length ? (
                              <p className="small text-muted mb-0">Select Pages under Connection first.</p>
                            ) : (
                              <div className="meta-scroll-list border rounded p-2">
                                {availablePages.map((page) => (
                                  <Form.Check
                                    key={page.pageId}
                                    type="checkbox"
                                    id={`map-${activeAccount.accountId}-${page.pageId}`}
                                    label={`${page.pageName}${page.instagramUsername ? ` (@${page.instagramUsername})` : ""}${page.leadCountAllTime ? ` · ${page.leadCountAllTime} lead(s) imported` : ""}${namesLikelySameClient(accountLabel(activeAccount), page.pageName) ? " · name match" : ""}`}
                                    checked={draftPageIds.includes(page.pageId)}
                                    onChange={() => toggle(draftPageIds, setDraftPageIds, page.pageId)}
                                  />
                                ))}
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                        <Col xs={12}>
                          <Button size="sm" disabled={busy === "account-config"} onClick={saveAccountConfig}>
                            Save account mapping
                          </Button>
                        </Col>
                      </Row>
                    ) : (
                      activeAccount.clientName && <Badge bg="dark">CRM client: {activeAccount.clientName}</Badge>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>

              <Card className="meta-leads-full-section">
                  <Card.Header className="bg-white meta-leads-header">
                    <div className="meta-leads-header-bar">
                      <div className="meta-leads-header-left">
                        <span className="meta-leads-header-title">Leads</span>
                        <span className="meta-leads-header-meta text-muted">
                          <strong className="text-body">{leadsPayload.total}</strong>
                          {from && to ? (
                            <>
                              {" · "}
                              <span title={`${from} to ${to}`}>{formatLeadRangeLabel(from, to)}</span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <div className="meta-leads-header-filters">
                        <Form.Select
                          id="meta-leads-status-filter"
                          size="sm"
                          className="meta-leads-status-filter"
                          aria-label="Filter by status"
                          value={leadFilters.status}
                          onChange={(e) => setLeadFilters((c) => ({ ...c, status: e.target.value, page: 1 }))}
                        >
                          <option value="">All statuses</option>
                          {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Form.Select>
                        <InputGroup size="sm" className="meta-leads-search-group">
                          <Form.Control
                            id="meta-leads-search"
                            placeholder="Search leads…"
                            value={leadFilters.search}
                            onChange={(e) => setLeadFilters((c) => ({ ...c, search: e.target.value, page: 1 }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                loadLeads(selectedAccountId, { from, to }, leadFilters);
                              }
                            }}
                          />
                          <Button
                            variant="outline-secondary"
                            disabled={busy === "leads"}
                            onClick={() => loadLeads(selectedAccountId, { from, to }, leadFilters)}
                          >
                            {busy === "leads" ? "…" : "Search"}
                          </Button>
                        </InputGroup>
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {!activeAccount.pageIds?.length ? (
                      <Alert variant="info" className="m-3 mb-0">
                        No Facebook Page is linked to this ad account. Open <strong>Account mapping</strong> above,
                        tick the Page that receives this client&apos;s lead ads (often the same name as the ad account),
                        then <strong>Save account mapping</strong>. If the Page is missing, enable it under <strong>Connection</strong> first.
                      </Alert>
                    ) : !leadsPayload.leads.length ? (
                      <p className="text-muted p-3 mb-0">No leads for this account in the selected date range.</p>
                    ) : (
                      <div className="table-responsive meta-leads-table-wrap">
                        <Table hover className="mb-0 meta-leads-table">
                          <colgroup>
                            <col className="meta-col-lead" />
                            <col className="meta-col-form" />
                            <col className="meta-col-page" />
                            <col className="meta-col-status" />
                            <col className="meta-col-date" />
                            <col className="meta-col-action" />
                          </colgroup>
                          <thead className="meta-leads-table-head">
                            <tr>
                              <th scope="col">Lead</th>
                              <th scope="col">Form / campaign</th>
                              <th scope="col">Page</th>
                              <th scope="col">Status</th>
                              <th scope="col">Submitted</th>
                              <th scope="col" className="text-end">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leadsPayload.leads.map((lead) => {
                              const hint = leadDetailHint(lead);
                              return (
                                <tr key={lead.id} className="meta-lead-row">
                                  <td className="meta-lead-cell">
                                    <div className="meta-lead-stack">
                                      <button
                                        type="button"
                                        className="meta-lead-link meta-lead-name"
                                        onClick={() => navigate(`/leads/${lead.id}`)}
                                      >
                                        {lead.fullName || "Unknown"}
                                      </button>
                                      {lead.phone ? (
                                        <a className="meta-lead-contact-line" href={`tel:${lead.phone}`}>
                                          {lead.phone}
                                        </a>
                                      ) : (
                                        <span className="meta-lead-contact-line meta-lead-muted">No phone</span>
                                      )}
                                      {lead.email ? (
                                        <a className="meta-lead-contact-line meta-lead-email" href={`mailto:${lead.email}`}>
                                          {lead.email}
                                        </a>
                                      ) : (
                                        <span className="meta-lead-contact-line meta-lead-muted">No email</span>
                                      )}
                                      {hint ? <div className="meta-lead-hint">{hint}</div> : null}
                                    </div>
                                  </td>
                                  <td className="meta-lead-cell">
                                    <div className="meta-lead-line">{lead.meta?.formName || "—"}</div>
                                    <div className="meta-lead-line meta-lead-muted">
                                      {lead.meta?.campaignName || lead.meta?.adName || "—"}
                                    </div>
                                  </td>
                                  <td className="meta-lead-cell meta-lead-line">{lead.meta?.pageName || "—"}</td>
                                  <td className="meta-lead-cell meta-lead-status">
                                    {canManage ? (
                                      <Form.Select
                                        size="sm"
                                        value={lead.status}
                                        onChange={(e) => changeLeadStatus(lead.id, e.target.value, e)}
                                      >
                                        {LEAD_STATUSES.map((s) => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </Form.Select>
                                    ) : (
                                      <Badge bg={leadStatusVariant(lead.status)}>{lead.status}</Badge>
                                    )}
                                  </td>
                                  <td className="meta-lead-cell meta-lead-date">
                                    {formatWhen(lead.meta?.createdTime)}
                                  </td>
                                  <td className="meta-lead-cell meta-lead-action-cell">
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      className="meta-lead-open-btn"
                                      onClick={() => navigate(`/leads/${lead.id}`)}
                                    >
                                      Open
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Card.Body>
                  {leadsPayload.total > leadsPayload.limit && (
                    <Card.Footer className="d-flex justify-content-between bg-white">
                      <span className="text-muted small">Page {leadFilters.page} of {totalLeadPages}</span>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={leadFilters.page <= 1}
                          onClick={() => {
                            const next = { ...leadFilters, page: leadFilters.page - 1 };
                            setLeadFilters(next);
                            loadLeads(selectedAccountId, { from, to }, next);
                          }}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={leadFilters.page >= totalLeadPages}
                          onClick={() => {
                            const next = { ...leadFilters, page: leadFilters.page + 1 };
                            setLeadFilters(next);
                            loadLeads(selectedAccountId, { from, to }, next);
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </Card.Footer>
                  )}
                </Card>
              </>
            )}
        </div>
      )}

      <Modal
        show={showAccountPicker}
        onHide={() => setShowAccountPicker(false)}
        size="lg"
        scrollable
        contentClassName="meta-account-picker-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Ad accounts</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 meta-account-picker-modal">
          <div className="p-3 border-bottom bg-white">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <span className="text-muted small">Showing {filteredAccounts.length} of {accounts.length}</span>
              <Button
                size="sm"
                variant="link"
                className="p-0 text-decoration-none"
                onClick={() => setShowAllAccounts((value) => !value)}
              >
                {showAllAccounts ? "Active only" : "Show all"}
              </Button>
            </div>
            <p className="text-muted small mb-2 mb-md-0">
              Lead counts use the same date range as the toolbar
              {from && to ? ` (${formatLeadRangeLabel(from, to)})` : ""}. All-time totals appear in the subtitle.
            </p>
            <Form.Control
              size="sm"
              placeholder="Search ad accounts…"
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
            />
          </div>
          <div className="meta-account-list meta-account-list--modal">
            {!filteredAccounts.length && (
              <p className="text-muted small p-3 mb-0">No ad accounts returned. Refresh under Connection.</p>
            )}
            {filteredAccounts.map((account) => {
              const active = account.accountId === selectedAccountId;
              return (
                <button
                  key={account.accountId}
                  type="button"
                  className={`meta-account-item w-100 text-start border-0 ${active ? "active" : ""}`}
                  onClick={() => selectAccount(account.accountId, { from, to }, leadFilters)}
                >
                  <div className="meta-account-item-title">
                    <span className="meta-account-item-name">{accountLabel(account)}</span>
                    <Badge
                      bg={(account.stats.total ?? 0) ? "primary" : "secondary"}
                      className="meta-account-item-count"
                      title={`${account.stats.total ?? 0} in selected date range · ${account.stats.totalAllTime ?? 0} all time on linked Page(s)`}
                    >
                      {account.stats.total ?? 0}
                    </Badge>
                  </div>
                  <div className="meta-account-item-meta">
                    {account.clientName ? (
                      <span>CRM: {account.clientName}</span>
                    ) : (
                      <span>No CRM client linked</span>
                    )}
                    {account.currency && <span>{` · ${account.currency}`}</span>}
                    {(account.stats.totalAllTime ?? 0) > 0 && (
                      <span>{` · ${account.stats.totalAllTime} all-time`}</span>
                    )}
                  </div>
                  {!account.selected && (
                    <span className="meta-account-item-flag">Insights not selected</span>
                  )}
                </button>
              );
            })}
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showConnection} onHide={() => setShowConnection(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Meta connection</Modal.Title>
        </Modal.Header>
        <Modal.Body className="meta-connection-panel">
          <div className="d-flex flex-wrap gap-2 mb-3">
            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="outline-primary"
                  disabled={!status?.configured || busy === "connect"}
                  onClick={() => runAction("connect", async () => {
                    const response = await metaIntegrationApi.startOAuth(
                      integration?.status === "connected" || integration?.status === "needs_reauth"
                    );
                    window.location.assign(response.data.url);
                  })}
                >
                  {integration?.status === "connected" ? "Reconnect Meta" : "Connect Meta"}
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={busy === "refresh"}
                  onClick={() => runAction("refresh", async () => {
                    const response = await metaIntegrationApi.refreshAssets();
                    setStatus((current) => ({ ...current, integration: response.data.integration }));
                    applySelection(response.data.integration);
                    toast.success("Refreshed from Meta");
                  })}
                >
                  Refresh assets
                </Button>
              </>
            )}
          </div>

          <strong className="d-block mb-2">Facebook Pages</strong>
          <div className="meta-scroll-list mb-3">
            {integration?.pages?.map((page) => (
              <Form.Check
                key={page.pageId}
                type="checkbox"
                disabled={!canManage}
                checked={pageIds.includes(page.pageId)}
                onChange={() => {
                  const selected = pageIds.includes(page.pageId);
                  const nextPages = selected ? pageIds.filter((id) => id !== page.pageId) : [...pageIds, page.pageId];
                  setPageIds(nextPages);
                  if (selected) {
                    const remove = new Set(
                      (integration.forms || []).filter((f) => f.pageId === page.pageId).map((f) => f.formId)
                    );
                    setFormIds((current) => current.filter((id) => !remove.has(id)));
                  }
                }}
                label={page.pageName || page.pageId}
              />
            ))}
          </div>

          <strong className="d-block mb-2">Lead forms</strong>
          <div className="meta-scroll-list mb-3">
            {(integration?.forms || []).filter((f) => pageIds.includes(f.pageId)).map((form) => (
              <Form.Check
                key={form.formId}
                type="checkbox"
                disabled={!canManage}
                checked={formIds.includes(form.formId)}
                onChange={() => toggle(formIds, setFormIds, form.formId)}
                label={form.formName || form.formId}
              />
            ))}
          </div>

          <strong className="d-block mb-2">Ad accounts</strong>
          <div className="meta-scroll-list mb-3">
            {integration?.adAccounts?.map((account) => (
              <Form.Check
                key={account.accountId}
                type="checkbox"
                disabled={!canManage}
                checked={adAccountIds.includes(account.accountId)}
                onChange={() => toggle(adAccountIds, setAdAccountIds, account.accountId)}
                label={`${account.name || account.accountId}${account.currency ? ` · ${account.currency}` : ""}`}
              />
            ))}
          </div>

          {canManage && (
            <Button
              className="mb-3"
              disabled={busy === "save"}
              onClick={() => runAction("save", async () => {
                const response = await metaIntegrationApi.saveSelection({ pageIds, formIds, adAccountIds });
                setStatus((current) => ({ ...current, integration: response.data.integration }));
                applySelection(response.data.integration);
                const dash = await loadDashboard({ from, to });
                if (selectedAccountId) await loadLeads(selectedAccountId, { from, to }, leadFilters);
                else if (dash?.accounts?.[0]) selectAccount(dash.accounts[0].accountId, { from, to }, leadFilters);
                toast.success("Selection saved");
              })}
            >
              Save import selection
            </Button>
          )}

          <Accordion>
            <Accordion.Item eventKey="sync">
              <Accordion.Header>Sync history</Accordion.Header>
              <Accordion.Body className="p-0">
                <Table size="sm" responsive className="mb-0">
                  <thead>
                    <tr><th>When</th><th>Status</th><th>Created</th><th>Failed</th></tr>
                  </thead>
                  <tbody>
                    {runs.slice(0, 8).map((run) => (
                      <tr key={run._id}>
                        <td>{formatWhen(run.startedAt)}</td>
                        <td>{run.status}</td>
                        <td>{run.stats?.created ?? 0}</td>
                        <td>{run.stats?.failed ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MetaAdsIntegration;
