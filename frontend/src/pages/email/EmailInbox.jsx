import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { FaEnvelope, FaSyncAlt, FaUnlink } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { gmailInboxApi } from "../../api/gmailInboxApi";
import "./EmailInbox.css";

const ERROR_TEXT = {
  access_denied: "Google sign-in was cancelled.",
  invalid_state: "The Gmail connection expired before it finished. Try connecting again.",
  not_configured: "Gmail is not configured on the server yet.",
  needs_reauth: "Gmail needs to be connected again.",
  gmail_error: "Gmail could not be connected.",
  gmail_unavailable: "Google could not be reached. Try again in a moment.",
};

function apiError(error, fallback) {
  return error?.response?.data?.error || fallback;
}

function senderLabel(from) {
  return from?.name || from?.email || "Unknown sender";
}

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isGmailAddress(value) {
  return /^[a-z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(String(value || "").trim());
}

function recipientLine(people) {
  return (people || [])
    .map((person) => person.name || person.email)
    .filter(Boolean)
    .join(", ");
}

const ACCOUNT_CACHE_KEY = "wealll.gmail.accounts";

function readAccountCache() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ACCOUNT_CACHE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.accounts)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAccountCache(configured, accounts) {
  try {
    sessionStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify({ configured, accounts }));
  } catch {
    // The inbox still works if the browser blocks session storage.
  }
}

function isAbort(error) {
  return error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";
}

export default function EmailInbox() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const cachedAccounts = useRef(readAccountCache());
  const [accounts, setAccounts] = useState(() => cachedAccounts.current?.accounts || []);
  const [configured, setConfigured] = useState(() => cachedAccounts.current?.configured !== false);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [gmailAddress, setGmailAddress] = useState("");
  const [connecting, setConnecting] = useState(false);

  const account = accounts[0] || null;
  const skipSearch = useRef(true);

  const loadMessages = useCallback(async (nextQuery, nextUnread, signal) => {
    const { data } = await gmailInboxApi.listMessages({
      q: nextQuery || undefined,
      unread: nextUnread ? "1" : undefined,
      limit: 40,
    }, signal);
    setMessages(data.messages || []);
  }, []);

  const loadAccounts = useCallback(async (signal) => {
    const { data } = await gmailInboxApi.listAccounts(signal);
    const nextAccounts = data.accounts || [];
    const nextConfigured = Boolean(data.configured);
    setConfigured(nextConfigured);
    setAccounts(nextAccounts);
    writeAccountCache(nextConfigured, nextAccounts);
    return nextAccounts;
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");
    if (connected === "1") setNotice("Gmail is connected. Recent inbox messages are syncing.");
    if (oauthError) setError(ERROR_TEXT[oauthError] || "Gmail could not be connected.");
    if (connected || oauthError) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    (async () => {
      setError("");
      try {
        const nextAccounts = await loadAccounts(controller.signal);
        if (!active || !nextAccounts.length) return;
        setMessagesLoading(true);
        try {
          await loadMessages("", false, controller.signal);
        } finally {
          if (active) setMessagesLoading(false);
        }
      } catch (err) {
        if (active && !isAbort(err)) setError(apiError(err, "Email inbox could not be loaded"));
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadAccounts, loadMessages]);

  useEffect(() => {
    const officeEmail = String(user?.email || "").trim().toLowerCase();
    if (isGmailAddress(officeEmail)) {
      setGmailAddress((current) => current || officeEmail);
    }
  }, [user]);

  useEffect(() => {
    if (!account) return undefined;
    if (skipSearch.current) {
      skipSearch.current = false;
      return undefined;
    }
    const handle = setTimeout(() => {
      loadMessages(query, unreadOnly).catch((err) => {
        setError(apiError(err, "Emails could not be searched"));
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [query, unreadOnly, account, loadMessages]);

  const connect = async (event) => {
    event.preventDefault();
    const email = gmailAddress.trim().toLowerCase();
    if (!isGmailAddress(email)) {
      setError("Enter the Gmail address you want to connect, such as name@gmail.com.");
      return;
    }
    setError("");
    setConnecting(true);
    try {
      const { data } = await gmailInboxApi.connect(email);
      if (!data?.url) throw new Error("missing url");
      window.location.assign(data.url);
    } catch (err) {
      setConnecting(false);
      setError(apiError(err, "Gmail could not be connected"));
    }
  };

  const refresh = async () => {
    setSyncing(true);
    setError("");
    try {
      const { data } = await gmailInboxApi.sync();
      if (data.account) setAccounts([data.account]);
      await loadMessages(query, unreadOnly);
      setNotice(data.alreadyRunning ? "A refresh is already running." : "Inbox refreshed.");
    } catch (err) {
      setError(apiError(err, "Inbox could not be refreshed"));
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!account) return;
    if (!window.confirm(`Disconnect ${account.email}? Synced messages will be removed from WeAlll Office.`)) return;
    setError("");
    try {
      await gmailInboxApi.disconnect(account.id);
      setAccounts([]);
      writeAccountCache(configured, []);
      setMessages([]);
      setSelected(null);
      setThread([]);
      setNotice("Gmail disconnected.");
    } catch (err) {
      setError(apiError(err, "Gmail could not be disconnected"));
    }
  };

  const openMessage = async (id) => {
    setOpening(true);
    setError("");
    try {
      const { data } = await gmailInboxApi.getMessage(id);
      setSelected(data.message);
      setThread(data.thread || []);
    } catch (err) {
      setError(apiError(err, "That email could not be opened"));
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="container-fluid py-3 email-inbox-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h1 className="h3 mb-1">Email Inbox</h1>
          <p className="text-muted mb-0">
            {account ? account.email : "Connect your Gmail address, then read it here."}
          </p>
        </div>
        {account && (
          <div className="email-inbox-toolbar">
            <Button variant="primary" onClick={refresh} disabled={syncing}>
              <FaSyncAlt className="me-2" />
              {syncing ? "Refreshing..." : "Refresh Inbox"}
            </Button>
            <Button variant="outline-danger" onClick={disconnect}>
              <FaUnlink className="me-2" />
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {notice && <Alert variant="success" dismissible onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {!configured && (
        <Alert variant="warning">
          Gmail is not configured on the server yet. Add the Google OAuth settings, then try again.
        </Alert>
      )}

      {!account ? (
        <section className="email-connect-card">
          <div className="email-connect-icon" aria-hidden="true"><FaEnvelope /></div>
          <h2 className="h4 mb-2">Connect your email</h2>
          <p className="text-muted">
            Enter your Gmail address. You’ll go to Google’s sign-in page for that address.
            After you allow access, you can read the inbox here.
          </p>
          <Form onSubmit={connect}>
            <Form.Group className="mb-3" controlId="gmail-address">
              <Form.Label>Gmail address</Form.Label>
              <Form.Control
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@gmail.com"
                value={gmailAddress}
                onChange={(event) => setGmailAddress(event.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={connecting}>
              {connecting ? "Opening Google sign-in..." : "Continue to Google"}
            </Button>
          </Form>
          <p className="text-muted small mb-0 mt-3">
            WeAlll Office does not ask for your Gmail password. Google confirms the account.
          </p>
        </section>
      ) : (
        <div className={`email-shell ${selected ? "is-reading" : ""}`}>
          <section className="email-list-pane">
            <div className="p-3 border-bottom">
              <Form.Control
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sender or subject"
                aria-label="Search emails"
              />
              <div className="btn-group btn-group-sm mt-2" role="group" aria-label="Email filter">
                <Button variant={unreadOnly ? "outline-primary" : "primary"} onClick={() => setUnreadOnly(false)}>All</Button>
                <Button variant={unreadOnly ? "primary" : "outline-primary"} onClick={() => setUnreadOnly(true)}>Unread</Button>
              </div>
              {account.lastSyncError && <div className="text-danger small mt-2">{account.lastSyncError}</div>}
            </div>
            <div className="email-list">
              {messagesLoading && messages.length === 0 ? (
                <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
              ) : messages.length === 0 ? (
                <p className="text-muted p-3 mb-0">No emails match this view. Refresh the inbox to fetch recent messages.</p>
              ) : messages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`email-row ${item.isRead ? "" : "is-unread"} ${selected?.id === item.id ? "is-active" : ""}`}
                  onClick={() => openMessage(item.id)}
                >
                  <span className="email-dot" aria-hidden="true" />
                  <span>
                    <span className="email-meta">
                      <span className="email-sender">{senderLabel(item.from)}</span>
                      <span className="text-muted small">{formatWhen(item.receivedAt)}</span>
                    </span>
                    <span className="email-subject d-block">{item.subject || "(no subject)"}</span>
                    <span className="email-snippet d-block text-muted small">{item.snippet}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="email-detail-pane">
            <div className="email-detail-body">
              <Button variant="link" className="d-md-none px-0" onClick={() => setSelected(null)}>Back to inbox</Button>
              {!selected ? (
                <p className="text-muted mb-0">Select an email to read it.</p>
              ) : (
                <>
                  <h2 className="h5">{selected.subject || "(no subject)"}</h2>
                  <p className="mb-1"><strong>{senderLabel(selected.from)}</strong> {selected.from?.email ? `<${selected.from.email}>` : ""}</p>
                  <p className="text-muted small mb-2">
                    To: {recipientLine(selected.to) || "—"}
                    {selected.cc?.length ? ` · Cc: ${recipientLine(selected.cc)}` : ""}
                    {" · "}
                    {formatWhen(selected.receivedAt)}
                  </p>
                  {thread.length > 1 && (
                    <div className="email-thread">
                      {thread.map((item) => (
                        <button key={item.id} type="button" onClick={() => openMessage(item.id)}>
                          {senderLabel(item.from)} — {item.subject || "(no subject)"}
                        </button>
                      ))}
                    </div>
                  )}
                  {opening && <Spinner animation="border" size="sm" />}
                  {selected.bodyHtml ? (
                    <iframe
                      className="email-frame"
                      title="Email content"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#212529;margin:0;word-wrap:break-word;}img{max-width:100%;height:auto;}a{color:#0d6efd;}</style></head><body>${selected.bodyHtml}</body></html>`}
                    />
                  ) : (
                    <pre className="email-plain">{selected.bodyText || selected.snippet || "This email has no readable content."}</pre>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
