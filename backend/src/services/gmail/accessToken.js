import { GmailHttpError } from "./gmailConfig.js";
import { gmailRequest, refreshAccessToken } from "./gmailClient.js";
import { decryptSecret, encryptSecret } from "./tokenCrypto.js";

/**
 * Loads a usable access token, refreshing it when it is near expiry.
 * The token is returned to server code only and is never placed on an API response.
 * @param {object} account mongoose document with token fields selected
 * @param {{ fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<string>}
 */
export async function getValidAccessToken(account, options = {}) {
  const expiry = account.tokenExpiry ? new Date(account.tokenExpiry).getTime() : 0;
  const current = decryptSecret(account.encryptedAccessToken);
  if (current && expiry > Date.now() + 60 * 1000) return current;

  const refreshToken = decryptSecret(account.encryptedRefreshToken);
  if (!refreshToken) {
    throw new GmailHttpError(409, "Reconnect Gmail to continue.", "needs_reauth");
  }
  let tokens;
  try {
    tokens = await refreshAccessToken({
      refreshToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    account.syncStatus = "error";
    account.lastSyncError = "Reconnect Gmail to continue.";
    if (typeof account.save === "function") await account.save();
    if (error instanceof GmailHttpError) throw error;
    throw new GmailHttpError(409, "Reconnect Gmail to continue.", "needs_reauth");
  }
  account.encryptedAccessToken = encryptSecret(tokens.access_token);
  if (tokens.refresh_token) account.encryptedRefreshToken = encryptSecret(tokens.refresh_token);
  account.tokenExpiry = new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000);
  if (typeof account.save === "function") await account.save();
  return tokens.access_token;
}

/**
 * @param {object} account
 * @param {string} pathAndQuery
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function callGmail(account, pathAndQuery, options = {}) {
  let token = await getValidAccessToken(account, options);
  try {
    return await gmailRequest(pathAndQuery, token, options);
  } catch (error) {
    if (!(error instanceof GmailHttpError) || error.code !== "unauthorized") throw error;
    account.tokenExpiry = new Date(0);
    token = await getValidAccessToken(account, options);
    return gmailRequest(pathAndQuery, token, options);
  }
}
