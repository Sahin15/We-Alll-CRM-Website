import { GmailHttpError } from "./gmailConfig.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * @param {string} pathAndQuery
 * @param {string} accessToken
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function gmailRequest(pathAndQuery, accessToken, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  let response;
  try {
    response = await fetchImpl(`${GMAIL_API}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
  } catch {
    throw new GmailHttpError(502, "Gmail could not be reached", "gmail_unavailable");
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (response.status === 401) {
    throw new GmailHttpError(401, "Gmail authorization expired", "unauthorized");
  }
  if (!response.ok) {
    throw new GmailHttpError(502, "Gmail request failed", "gmail_error");
  }
  return data;
}

/**
 * @param {{ code: string, redirectUri: string, clientId: string, clientSecret: string, fetchImpl?: typeof fetch }} input
 */
export async function exchangeAuthCode(input) {
  return postToken({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  }, input.fetchImpl);
}

/**
 * @param {{ refreshToken: string, clientId: string, clientSecret: string, fetchImpl?: typeof fetch }} input
 */
export async function refreshAccessToken(input) {
  return postToken({
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
  }, input.fetchImpl);
}

/**
 * @param {Record<string, string>} body
 * @param {typeof fetch} [fetchImpl]
 */
async function postToken(body, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(body),
    });
  } catch {
    throw new GmailHttpError(502, "Google sign-in could not be reached", "gmail_unavailable");
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!response.ok || !data.access_token) {
    const code = data.error === "invalid_grant" ? "needs_reauth" : "gmail_error";
    throw new GmailHttpError(response.status === 400 ? 409 : 502, "Gmail authorization failed", code);
  }
  return data;
}

/**
 * @param {string} accessToken
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function getGmailProfile(accessToken, options = {}) {
  return gmailRequest("/profile", accessToken, options);
}

