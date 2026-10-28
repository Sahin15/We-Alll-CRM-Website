/**
 * Meta Lead Ads configuration.
 * Credentials stay in server environment variables. Nothing here is sent to the browser.
 */

export const DEFAULT_GRAPH_VERSION = "v26.0";

export const DEFAULT_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
  "business_management",
  "ads_read",
];

/** Required before lead import can run. */
export const LEAD_RETRIEVAL_SCOPES = [
  "leads_retrieval",
  "pages_show_list",
  "pages_read_engagement",
];

export const SUBSCRIPTION_SCOPES = ["pages_manage_metadata"];
export const INSIGHTS_SCOPES = ["ads_read"];
export const BUSINESS_SCOPES = ["business_management"];

const GRAPH_VERSION_PATTERN = /^v\d+\.\d+$/;

export class MetaHttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {string} [code]
   */
  constructor(statusCode, message, code) {
    super(message);
    this.name = "MetaHttpError";
    this.statusCode = statusCode;
    this.code = code || "meta_error";
  }
}

/**
 * Deployment company key. This CRM has no tenant collection; one process serves one company.
 * A shared database must set a distinct COMPANY_SCOPE per deployment.
 * @returns {string}
 */
export function getCompanyScope() {
  const raw = String(process.env.COMPANY_SCOPE || "wealll").trim().toLowerCase();
  const scope = raw.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  return scope || "wealll";
}

/**
 * @returns {string}
 */
export function getGraphVersion() {
  const raw = String(process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION).trim();
  if (!GRAPH_VERSION_PATTERN.test(raw)) {
    throw new MetaHttpError(500, "META_GRAPH_API_VERSION must look like v26.0", "not_configured");
  }
  return raw;
}

/**
 * @returns {string[]}
 */
export function getRequestedScopes() {
  const raw = process.env.META_OAUTH_SCOPES;
  if (!raw || !String(raw).trim()) return [...DEFAULT_OAUTH_SCOPES];
  return [...new Set(String(raw).split(",").map((scope) => scope.trim()).filter(Boolean))];
}

/**
 * @param {string[]} granted
 * @param {string[]} requested
 * @returns {string[]}
 */
export function missingPermissions(granted, requested) {
  const grantedSet = new Set(granted || []);
  return (requested || []).filter((scope) => !grantedSet.has(scope));
}

/**
 * @param {string[]} keys
 * @returns {string[]}
 */
export function missingEnv(keys) {
  return keys.filter((key) => !process.env[key] || !String(process.env[key]).trim());
}

/**
 * @returns {{ configured: boolean, missingEnv: string[], webhookConfigured: boolean }}
 */
export function metaConfigStatus() {
  const required = ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI", "META_TOKEN_ENCRYPTION_KEY"];
  const absent = missingEnv(required);
  const webhookMissing = missingEnv(["META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"]);
  return {
    configured: absent.length === 0,
    missingEnv: absent,
    webhookConfigured: webhookMissing.length === 0,
  };
}

/**
 * @param {string} uri
 * @returns {string}
 */
export function assertRedirectUri(uri) {
  let url;
  try {
    url = new URL(String(uri || ""));
  } catch {
    throw new MetaHttpError(500, "META_REDIRECT_URI is not a valid URL", "invalid_redirect");
  }
  if (url.username || url.password) {
    throw new MetaHttpError(500, "META_REDIRECT_URI must not include credentials", "invalid_redirect");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new MetaHttpError(500, "META_REDIRECT_URI must use HTTPS outside local development", "invalid_redirect");
  }
  if (!url.pathname.endsWith("/api/integrations/meta/oauth/callback")) {
    throw new MetaHttpError(
      500,
      "META_REDIRECT_URI must end with /api/integrations/meta/oauth/callback",
      "invalid_redirect"
    );
  }
  return url.toString();
}

/**
 * Browser return URL after OAuth. Built only from FRONTEND_URL.
 * @returns {URL}
 */
export function frontendMetaUrl() {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  let root;
  try {
    root = new URL(base);
  } catch {
    throw new MetaHttpError(500, "FRONTEND_URL is not a valid URL", "not_configured");
  }
  if (root.protocol !== "https:" && root.protocol !== "http:") {
    throw new MetaHttpError(500, "FRONTEND_URL must be an HTTP(S) URL", "not_configured");
  }
  root.pathname = "/leads/meta-ads";
  root.search = "";
  root.hash = "";
  return root;
}

/**
 * @param {object} params
 * @param {string} params.appId
 * @param {string} params.redirectUri
 * @param {string} params.state
 * @param {string[]} params.scopes
 * @param {string} [params.configId]
 * @param {boolean} [params.reauth]
 * @returns {string}
 */
export function buildOAuthUrl({ appId, redirectUri, state, scopes, configId, reauth }) {
  const url = new URL(`https://www.facebook.com/${getGraphVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (configId) {
    url.searchParams.set("config_id", configId);
    url.searchParams.set("override_default_response_type", "true");
  } else {
    url.searchParams.set("scope", scopes.join(","));
  }
  if (reauth) url.searchParams.set("auth_type", "rerequest");
  return url.toString();
}

/**
 * @param {string} state
 * @returns {boolean}
 */
export function isValidOAuthState(state) {
  return typeof state === "string" && /^[a-f0-9]{64}$/.test(state);
}

/**
 * @returns {string}
 */
export function getAnalyticsTimeZone() {
  return process.env.META_ANALYTICS_TIMEZONE || process.env.COMPANY_TIMEZONE || "Asia/Kolkata";
}
