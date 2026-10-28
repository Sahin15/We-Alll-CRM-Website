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
  Table,
} from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { metaIntegrationApi } from "../../api/metaIntegrationApi";

const ERROR_TEXT = {
  access_denied: "Meta authorization was cancelled.",
  invalid_state: "The Meta login session expired. Start the connection again.",
  not_configured: "Meta is not configured on the server yet.",
  token_exchange_failed: "Meta did not return an access token. Check the redirect URL in the Meta app.",
  invalid_redirect: "The server redirect URL is not valid.",
  meta_error: "Meta could not complete the connection.",
};

function formatWhen(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function formatRate(value) {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined) return "—";
  const number = Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${currency} ${number}` : number;
}

function statusBadge(status) {
  if (status === "connected") return <Badge bg="success">Connected</Badge>;
  if (status === "needs_reauth") return <Badge bg="warning" text="dark">Reconnect required</Badge>;
  return <Badge bg="secondary">Not connected</Badge>;
}

const MetaAdsIntegration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(null);
  const [pageIds, setPageIds] = useState([]);
  const [formIds, setFormIds] = useState([]);
  const [adAccountIds, setAdAccountIds] = useState([]);
  const [runs, setRuns] = useState([]);
  const [runningId, setRunningId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const integration = status?.integration;
  const canManage = Boolean(status?.canManage);

  const applySelection = useCallback((next) => {
    setPageIds((next?.pages || []).filter((page) => page.selected).map((page) => page.pageId));
    setFormIds((next?.forms || []).filter((form) => form.selected).map((form) => form.formId));
    setAdAccountIds((next?.adAccounts || []).filter((account) => account.selected).map((account) => account.accountId));
  }, []);

  const loadAnalytics = useCallback(async (range) => {
    const response = await metaIntegrationApi.getAnalytics(range?.from ? range : undefined);
    setAnalytics(response.data.analytics);
    if (!range?.from && response.data.analytics) {
      setFrom(response.data.analytics.from);
      setTo(response.data.analytics.to);
    }
  }, []);

  const loadAll = useCallback(async () => {
    const [statusResponse, runsResponse] = await Promise.all([
      metaIntegrationApi.getStatus(),
      metaIntegrationApi.getSyncRuns(),
    ]);
    setStatus(statusResponse.data);
    applySelection(statusResponse.data.integration);
    setRuns(runsResponse.data.runs || []);
    await loadAnalytics();
  }, [applySelection, loadAnalytics]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadAll();
      } catch (error) {
        if (active) toast.error(error.response?.data?.error || "Could not load Meta integration");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadAll]);

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
          const statusResponse = await metaIntegrationApi.getStatus();
          setStatus(statusResponse.data);
          applySelection(statusResponse.data.integration);
          await loadAnalytics({ from, to });
        }
      } catch {
        setRunningId("");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [runningId, applySelection, from, to, loadAnalytics]);

  const visibleForms = useMemo(() => {
    return (integration?.forms || []).filter((form) => pageIds.includes(form.pageId));
  }, [integration, pageIds]);

  const toggle = (list, setList, id) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };

  const runAction = async (name, action) => {
    setBusy(name);
    try {
      await action();
    } catch (error) {
      toast.error(error.response?.data?.error || "Meta request failed");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  const crm = analytics?.crm;
  const ads = analytics?.advertising;

  return (
    <Container fluid className="py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="mb-1">Meta Lead Ads</h2>
          <p className="text-muted mb-2">Connect Facebook and Instagram lead forms to the existing CRM pipeline.</p>
          {statusBadge(integration?.status)}
          {integration?.metaUserName && <span className="ms-2 text-muted">{integration.metaUserName}</span>}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {canManage && (
            <Button
              variant={integration?.status === "connected" ? "outline-primary" : "primary"}
              disabled={!status?.configured || busy === "connect"}
              onClick={() => runAction("connect", async () => {
                const response = await metaIntegrationApi.startOAuth(integration?.status === "connected" || integration?.status === "needs_reauth");
                window.location.assign(response.data.url);
              })}
            >
              {integration?.status === "connected" || integration?.status === "needs_reauth" ? "Reconnect" : "Connect Meta"}
            </Button>
          )}
          {canManage && integration?.status === "connected" && (
            <Button variant="outline-danger" disabled={busy === "disconnect"} onClick={() => {
              if (!window.confirm("Disconnect Meta and remove stored access tokens?")) return;
              runAction("disconnect", async () => {
                await metaIntegrationApi.disconnect();
                toast.success("Meta disconnected");
                await loadAll();
              });
            }}>
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {!status?.configured && (
        <Alert variant="warning">
          The server is missing {status?.missingEnv?.join(", ") || "Meta environment variables"}. Tokens stay on the server and are not entered here.
        </Alert>
      )}

      {integration?.status === "needs_reauth" && (
        <Alert variant="warning">Meta access expired or was revoked. Reconnect before the next sync.</Alert>
      )}

      {!!integration?.missingPermissions?.length && (
        <Alert variant="warning">
          Meta did not grant: {integration.missingPermissions.join(", ")}. Lead import, Page subscription, and ad insights only run for permissions that were actually granted.
        </Alert>
      )}

      <Row className="g-3 mb-3">
        <Col md={3}><Card className="h-100"><Card.Body><div className="text-muted small">Last successful sync</div><strong>{formatWhen(integration?.lastSuccessAt)}</strong></Card.Body></Card></Col>
        <Col md={3}><Card className="h-100"><Card.Body><div className="text-muted small">Last webhook</div><strong>{formatWhen(integration?.lastWebhookAt)}</strong></Card.Body></Card></Col>
        <Col md={6}><Card className="h-100"><Card.Body><div className="text-muted small">Last error</div><strong>{integration?.lastError || integration?.lastWebhookError || "None"}</strong></Card.Body></Card></Col>
      </Row>

      {!integration || integration.status === "disconnected" ? (
        <Alert variant="light" className="border">No Meta account is connected for this office. Use Connect Meta after the server credentials are in place.</Alert>
      ) : (
        <>
          <Card className="mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <strong>Authorized assets</strong>
              {canManage && (
                <Button size="sm" variant="outline-secondary" disabled={busy === "refresh"} onClick={() => runAction("refresh", async () => {
                  const response = await metaIntegrationApi.refreshAssets();
                  setStatus((current) => ({ ...current, integration: response.data.integration }));
                  applySelection(response.data.integration);
                  toast.success("Pages and forms refreshed");
                })}>
                  Refresh
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {(integration.businessPortfolios || []).length > 0 && (
                <p className="mb-3"><span className="text-muted">Business portfolios: </span>{integration.businessPortfolios.map((item) => item.name || item.id).join(", ")}</p>
              )}
              {!integration.pages?.length && <Alert variant="light" className="border">No Facebook Pages were returned for this user. Confirm pages_show_list was granted.</Alert>}
              {integration.pages?.map((page) => (
                <Form.Check
                  key={page.pageId}
                  className="mb-2"
                  type="checkbox"
                  disabled={!canManage}
                  checked={pageIds.includes(page.pageId)}
                  onChange={() => {
                    const selected = pageIds.includes(page.pageId);
                    const nextPages = selected
                      ? pageIds.filter((id) => id !== page.pageId)
                      : [...pageIds, page.pageId];
                    setPageIds(nextPages);
                    if (selected) {
                      const remove = new Set(
                        (integration.forms || [])
                          .filter((form) => form.pageId === page.pageId)
                          .map((form) => form.formId)
                      );
                      setFormIds((current) => current.filter((id) => !remove.has(id)));
                    }
                  }}
                  label={`${page.pageName || "Untitled Page"} (${page.pageId})${page.instagramUsername ? ` · Instagram @${page.instagramUsername}` : ""}`}
                  id={`page-${page.pageId}`}
                />
              ))}
              {integration.pages?.some((page) => page.subscriptionError) && (
                <Alert variant="warning" className="mt-3 mb-0">
                  {integration.pages.filter((page) => page.subscriptionError).map((page) => (
                    <div key={page.pageId}>{page.pageName}: {page.subscriptionError}</div>
                  ))}
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Header className="bg-white"><strong>Lead forms</strong></Card.Header>
            <Card.Body>
              {!visibleForms.length && <p className="text-muted mb-0">Select a Page to choose its lead forms. Forms are not imported until they are selected.</p>}
              {visibleForms.map((form) => (
                <Form.Check
                  key={form.formId}
                  className="mb-2"
                  type="checkbox"
                  disabled={!canManage}
                  checked={formIds.includes(form.formId)}
                  onChange={() => toggle(formIds, setFormIds, form.formId)}
                  label={`${form.formName || "Untitled form"} (${form.formId})${form.status ? ` · ${form.status}` : ""}`}
                  id={`form-${form.formId}`}
                />
              ))}
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Header className="bg-white"><strong>Ad accounts</strong></Card.Header>
            <Card.Body>
              {!integration.adAccounts?.length && <p className="text-muted mb-0">No ad accounts were returned. Insights stay unavailable until ads_read is granted and an account is selected.</p>}
              {integration.adAccounts?.map((account) => (
                <Form.Check
                  key={account.accountId}
                  className="mb-2"
                  type="checkbox"
                  disabled={!canManage}
                  checked={adAccountIds.includes(account.accountId)}
                  onChange={() => toggle(adAccountIds, setAdAccountIds, account.accountId)}
                  label={`${account.name || account.accountId}${account.currency ? ` · ${account.currency}` : ""}`}
                  id={`act-${account.accountId}`}
                />
              ))}
              {canManage && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <Button disabled={busy === "save"} onClick={() => runAction("save", async () => {
                    const response = await metaIntegrationApi.saveSelection({ pageIds, formIds, adAccountIds });
                    setStatus((current) => ({ ...current, integration: response.data.integration }));
                    applySelection(response.data.integration);
                    toast.success("Selection saved");
                  })}>
                    Save selection
                  </Button>
                  <Button variant="outline-primary" disabled={busy === "sync" || Boolean(runningId)} onClick={() => runAction("sync", async () => {
                    const response = await metaIntegrationApi.syncNow();
                    setRunningId(response.data.runId);
                    toast.info("Sync started");
                  })}>
                    {runningId ? "Syncing…" : "Sync now"}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      <Card className="mb-3">
        <Card.Header className="bg-white d-flex flex-wrap justify-content-between gap-2">
          <strong>CRM lead analytics</strong>
          <div className="d-flex gap-2">
            <Form.Control type="date" size="sm" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Form.Control type="date" size="sm" value={to} onChange={(event) => setTo(event.target.value)} />
            <Button size="sm" variant="outline-primary" onClick={() => runAction("analytics", () => loadAnalytics({ from, to }))}>Apply</Button>
          </div>
        </Card.Header>
        <Card.Body>
          <p className="text-muted small">These counts are CRM leads imported from Meta. New imports stay New until someone qualifies them. Timezone: {analytics?.timezone || "Asia/Kolkata"}.</p>
          <Row className="g-3 mb-3">
            {[
              ["Total leads", crm?.total ?? "—"],
              ["New", crm?.new ?? "—"],
              ["Qualified", crm?.qualified ?? "—"],
              ["Won", crm?.converted ?? "—"],
              ["Lost", crm?.lost ?? "—"],
              ["Qualification rate", formatRate(crm?.qualificationRate)],
              ["Lead-to-customer rate", formatRate(crm?.conversionRate)],
            ].map(([label, value]) => (
              <Col key={label} sm={6} md={3}>
                <Card className="h-100 border"><Card.Body><div className="text-muted small">{label}</div><h4 className="mb-0">{value}</h4></Card.Body></Card>
              </Col>
            ))}
          </Row>
          {crm?.byDay?.length ? (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={crm.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Leads" stroke="#0d6efd" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Alert variant="light" className="border">No Meta leads in this date range.</Alert>
          )}
          {!!crm?.byCampaign?.length && (
            <div style={{ width: "100%", height: 260 }} className="mt-3">
              <ResponsiveContainer>
                <BarChart data={crm.byCampaign}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill="#198754" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header className="bg-white"><strong>Advertising metrics</strong></Card.Header>
        <Card.Body>
          <p className="text-muted small">{ads?.note || ads?.insightsNote || "Advertising metrics come from Meta Insights and are separate from CRM lead counts."}</p>
          {!ads?.available ? (
            <Alert variant="light" className="border mb-0">{ads?.reason || "Advertising data is unavailable."}</Alert>
          ) : (
            <>
              {ads.spendUnavailableReason && <Alert variant="info">{ads.spendUnavailableReason}</Alert>}
              <Row className="g-3">
                <Col sm={6} md={3}><Card className="border"><Card.Body><div className="text-muted small">Spend</div><strong>{formatMoney(ads.spend, ads.currency)}</strong></Card.Body></Card></Col>
                <Col sm={6} md={3}><Card className="border"><Card.Body><div className="text-muted small">Impressions</div><strong>{ads.impressions ?? "—"}</strong></Card.Body></Card></Col>
                <Col sm={6} md={3}><Card className="border"><Card.Body><div className="text-muted small">Clicks</div><strong>{ads.clicks ?? "—"}</strong></Card.Body></Card></Col>
                <Col sm={6} md={3}><Card className="border"><Card.Body><div className="text-muted small">Cost per lead</div><strong>{ads.costPerLead === null || ads.costPerLead === undefined ? "—" : formatMoney(ads.costPerLead, ads.currency)}</strong><div className="text-muted small">{ads.costPerLeadReason || ads.metaLeadActions?.actionType || ""}</div></Card.Body></Card></Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header className="bg-white"><strong>Sync history</strong></Card.Header>
        <Card.Body className="p-0">
          {!runs.length ? (
            <p className="text-muted p-3 mb-0">No syncs have run yet.</p>
          ) : (
            <Table responsive hover className="mb-0">
              <thead><tr><th>When</th><th>Trigger</th><th>Status</th><th>Created</th><th>Updated</th><th>Failed</th><th>Note</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run._id}>
                    <td>{formatWhen(run.startedAt)}</td>
                    <td>{run.trigger}</td>
                    <td>{run.status}</td>
                    <td>{run.stats?.created ?? 0}</td>
                    <td>{run.stats?.updated ?? 0}</td>
                    <td>{run.stats?.failed ?? 0}</td>
                    <td>{run.error || ""}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Accordion>
        <Accordion.Item eventKey="setup">
          <Accordion.Header>Meta Developer setup still required</Accordion.Header>
          <Accordion.Body>
            <ol className="mb-0">
              <li>Create a Meta app and add Facebook Login and Webhooks.</li>
              <li>Set the OAuth redirect to the server callback <code>/api/integrations/meta/oauth/callback</code>.</li>
              <li>Set the Page webhook callback to <code>/api/integrations/meta/webhook</code> and subscribe the app to the <code>leadgen</code> field.</li>
              <li>Saving a Page here subscribes that Page to the app. The app webhook itself is configured in Meta Developer settings.</li>
              <li>Request <code>leads_retrieval</code>, <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_metadata</code>, <code>business_management</code>, and <code>ads_read</code>. App review is required before other businesses can grant them.</li>
            </ol>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};

export default MetaAdsIntegration;
