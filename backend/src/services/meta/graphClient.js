import { assertGraphUrl, backoffMs, isRetryableGraphFailure, redactSecrets } from "./metaSecurity.js";
import { MetaHttpError, getGraphVersion } from "./metaConfig.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ query?: Record<string, string|number|undefined>, token?: string, attempt?: number }} [options]
 * @returns {Promise<object>}
 */
export async function graphRequest(method, path, options = {}) {
  const { query = {}, token, attempt = 0 } = options;
  const version = getGraphVersion();
  const resource = path.startsWith("/") ? path : `/${path}`;
  const url = assertGraphUrl(new URL(`https://graph.facebook.com/${version}${resource}`));
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  if (token) url.searchParams.set("access_token", token);

  let response;
  try {
    response = await fetch(url, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    if (timedOut && attempt < 3) {
      await sleep(backoffMs(attempt));
      return graphRequest(method, path, { query, token, attempt: attempt + 1 });
    }
    throw new MetaHttpError(502, timedOut ? "Meta API timed out" : "Meta API request failed", "meta_unavailable");
  }

  const payload = await readJson(response);
  if (!response.ok || payload.error) {
    const code = payload.error?.code;
    if (isRetryableGraphFailure(response.status, code) && attempt < 3) {
      await sleep(backoffMs(attempt));
      return graphRequest(method, path, { query, token, attempt: attempt + 1 });
    }
    const message = redactSecrets(payload.error?.message || `Meta API error (${response.status})`).slice(0, 300);
    const error = new MetaHttpError(response.status === 429 ? 429 : 502, message, "meta_api");
    error.metaCode = code;
    throw error;
  }
  return payload;
}

/**
 * Exchange an authorization code without placing the app secret in the URL or logs.
 * @param {{ code: string, redirectUri: string, appId: string, appSecret: string }} input
 * @returns {Promise<{ accessToken: string, expiresIn: number|null }>}
 */
export async function exchangeCodeForUserToken({ code, redirectUri, appId, appSecret }) {
  const shortLived = await postOAuth({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const longLived = await postOAuth({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLived.access_token,
  });
  return {
    accessToken: longLived.access_token,
    expiresIn: Number(longLived.expires_in) || null,
  };
}

/**
 * @param {Record<string, string>} fields
 * @returns {Promise<object>}
 */
async function postOAuth(fields) {
  const url = assertGraphUrl(new URL(`https://graph.facebook.com/${getGraphVersion()}/oauth/access_token`));
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new MetaHttpError(502, "Meta token exchange failed", "token_exchange_failed");
  }
  const payload = await readJson(response);
  if (!response.ok || payload.error || !payload.access_token) {
    throw new MetaHttpError(502, "Meta token exchange failed", "token_exchange_failed");
  }
  return payload;
}

/**
 * Next Graph cursor, ignoring paging.next so callers cannot be sent off-host.
 * @param {object} body
 * @param {string} previous
 * @param {Set<string>} seen
 * @returns {string|null}
 */
export function nextPageCursor(body, previous, seen) {
  const next = body?.paging?.cursors?.after;
  const hasNext = Boolean(
    body?.paging?.next
    && next
    && next !== previous
    && !seen.has(next)
    && Array.isArray(body?.data)
    && body.data.length
  );
  return hasNext ? next : null;
}

/**
 * Page through a Graph edge using cursors. Never follows paging.next (SSRF).
 * @param {string} path
 * @param {Record<string, string|number|undefined>} query
 * @param {string} token
 * @param {number} [maxPages]
 * @returns {Promise<object[]>}
 */
export async function graphGetAll(path, query, token, maxPages = 20) {
  const items = [];
  let after = "";
  const seen = new Set();
  for (let page = 0; page < maxPages; page += 1) {
    const body = await graphRequest("GET", path, {
      token,
      query: { ...query, limit: query.limit || 50, after: after || undefined },
    });
    const data = Array.isArray(body.data) ? body.data : [];
    items.push(...data);
    const next = nextPageCursor(body, after, seen);
    if (!next) break;
    seen.add(next);
    after = next;
  }
  return items;
}

export const LEAD_FIELDS = [
  "id",
  "created_time",
  "ad_id",
  "ad_name",
  "adset_id",
  "adset_name",
  "campaign_id",
  "campaign_name",
  "form_id",
  "field_data",
  "platform",
  "is_organic",
].join(",");
