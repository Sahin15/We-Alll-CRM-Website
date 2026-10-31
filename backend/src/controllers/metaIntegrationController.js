import { can } from "../authz/policyEngine.js";
import {
  frontendMetaUrl,
  getGraphVersion,
  getRequestedScopes,
  metaConfigStatus,
  MetaHttpError,
} from "../services/meta/metaConfig.js";
import {
  beginOAuth,
  completeOAuth,
  disconnectIntegration,
  findCompanyIntegration,
  refreshAssets,
  saveSelection,
  toPublicIntegration,
} from "../services/meta/metaIntegrationService.js";
import { getMetaAnalytics } from "../services/meta/metaAnalyticsService.js";
import {
  getMetaLeadDashboard,
  listMetaLeads,
  mapPageToClient,
  updateAdAccountConfig,
} from "../services/meta/metaLeadDashboardService.js";
import { listSyncRuns, startSync } from "../services/meta/metaSyncService.js";
import { processWebhookPayload } from "../services/meta/metaWebhookService.js";
import { redactSecrets, verifyWebhookChallenge, verifyWebhookSignature } from "../services/meta/metaSecurity.js";

const PUBLIC_ERROR_CODES = new Set([
  "access_denied",
  "invalid_state",
  "not_configured",
  "token_exchange_failed",
  "invalid_redirect",
]);

/**
 * @param {object|undefined} user
 * @returns {boolean}
 */
function userCanManageMeta(user) {
  if (!user) return false;
  if (["admin", "superadmin", "manager"].includes(user.role)) return true;
  return Boolean(can(user, "crm.meta.manage")?.allowed);
}

/**
 * @param {import("express").Response} res
 * @param {Error & { statusCode?: number, code?: string }} error
 */
function sendError(res, error) {
  const status = error.statusCode || 500;
  if (!(error instanceof MetaHttpError)) {
    console.error("[Meta]", redactSecrets(error.message));
  }
  return res.status(status).json({
    success: false,
    error: error instanceof MetaHttpError ? error.message : "Meta integration request failed",
    code: error.code || undefined,
  });
}

export const getStatus = async (req, res) => {
  try {
    const config = metaConfigStatus();
    const integration = await findCompanyIntegration();
    let graphVersion = "";
    try {
      graphVersion = getGraphVersion();
    } catch {
      graphVersion = "";
    }
    return res.json({
      success: true,
      configured: config.configured,
      missingEnv: config.missingEnv,
      webhookConfigured: config.webhookConfigured,
      graphVersion,
      requestedScopes: getRequestedScopes(),
      canManage: userCanManageMeta(req.user),
      integration: toPublicIntegration(integration),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const startOAuth = async (req, res) => {
  try {
    const result = await beginOAuth(req.query.reauth === "1", req.user._id);
    return res.json({ success: true, url: result.url });
  } catch (error) {
    return sendError(res, error);
  }
};

export const oauthCallback = async (req, res) => {
  let target;
  try {
    target = frontendMetaUrl();
  } catch (error) {
    console.error("[Meta] oauth callback failed", "not_configured");
    return res.status(500).json({ success: false, error: "Meta integration request failed" });
  }
  try {
    await completeOAuth({
      code: typeof req.query.code === "string" ? req.query.code : "",
      state: typeof req.query.state === "string" ? req.query.state : "",
      error: typeof req.query.error === "string" ? req.query.error : "",
    });
    target.searchParams.set("connected", "1");
  } catch (error) {
    const code = PUBLIC_ERROR_CODES.has(error.code) ? error.code : "meta_error";
    target.searchParams.set("error", code);
    console.error("[Meta] oauth callback failed", code);
  }
  return res.redirect(target.toString());
};

export const refreshMetaAssets = async (req, res) => {
  try {
    const integration = await refreshAssets(req.user._id);
    return res.json({ success: true, integration });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateSelection = async (req, res) => {
  try {
    const integration = await saveSelection(req.user._id, req.body || {});
    return res.json({ success: true, integration });
  } catch (error) {
    return sendError(res, error);
  }
};

export const syncNow = async (req, res) => {
  try {
    const incremental = req.body?.incremental === true;
    const run = await startSync({ userId: req.user._id, incremental, trigger: "manual" });
    return res.status(202).json({ success: true, ...run });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getSyncRuns = async (req, res) => {
  try {
    const runs = await listSyncRuns();
    return res.json({ success: true, runs });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const analytics = await getMetaAnalytics({
      from: typeof req.query.from === "string" ? req.query.from : "",
      to: typeof req.query.to === "string" ? req.query.to : "",
    });
    return res.json({ success: true, analytics });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getLeadDashboard = async (req, res) => {
  try {
    const dashboard = await getMetaLeadDashboard({
      from: typeof req.query.from === "string" ? req.query.from : "",
      to: typeof req.query.to === "string" ? req.query.to : "",
    });
    return res.json({ success: true, dashboard });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMetaLeads = async (req, res) => {
  try {
    const result = await listMetaLeads({
      pageId: typeof req.query.pageId === "string" ? req.query.pageId : "",
      accountId: typeof req.query.accountId === "string" ? req.query.accountId : "",
      status: typeof req.query.status === "string" ? req.query.status : "",
      search: typeof req.query.search === "string" ? req.query.search : "",
      from: typeof req.query.from === "string" ? req.query.from : "",
      to: typeof req.query.to === "string" ? req.query.to : "",
      page: typeof req.query.page === "string" ? req.query.page : "",
      limit: typeof req.query.limit === "string" ? req.query.limit : "",
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updatePageClient = async (req, res) => {
  try {
    const pageId = typeof req.params.pageId === "string" ? req.params.pageId : "";
    const clientId = req.body?.clientId ?? null;
    const integration = await mapPageToClient(pageId, clientId, req.user._id);
    return res.json({ success: true, integration });
  } catch (error) {
    return sendError(res, error);
  }
};

export const configureAdAccount = async (req, res) => {
  try {
    const accountId = typeof req.params.accountId === "string" ? req.params.accountId : "";
    const integration = await updateAdAccountConfig(accountId, req.body || {}, req.user._id);
    return res.json({ success: true, integration });
  } catch (error) {
    return sendError(res, error);
  }
};

export const disconnect = async (req, res) => {
  try {
    const integration = await disconnectIntegration(req.user._id);
    return res.json({ success: true, integration });
  } catch (error) {
    return sendError(res, error);
  }
};

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"] || req.query.hub?.mode;
  const token = req.query["hub.verify_token"] || req.query.hub?.verify_token;
  const challenge = req.query["hub.challenge"] || req.query.hub?.challenge;
  const result = verifyWebhookChallenge({
    mode,
    token,
    challenge,
    expected: process.env.META_WEBHOOK_VERIFY_TOKEN,
  });
  if (!result.ok) return res.status(403).json({ success: false, error: "Webhook verification failed" });
  return res.status(200).type("text/plain").send(result.challenge);
};

export const receiveWebhook = (req, res) => {
  const valid = verifyWebhookSignature(req.rawBody, req.get("x-hub-signature-256"), process.env.META_APP_SECRET);
  if (!valid) return res.status(403).json({ success: false, error: "Invalid signature" });

  let payload;
  try {
    payload = JSON.parse(Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : "{}");
  } catch {
    return res.status(400).json({ success: false, error: "Invalid payload" });
  }

  res.status(200).json({ success: true });
  setImmediate(() => {
    processWebhookPayload(payload).catch((error) => {
      console.error("[Meta] webhook processing failed", redactSecrets(error.message));
    });
  });
};
