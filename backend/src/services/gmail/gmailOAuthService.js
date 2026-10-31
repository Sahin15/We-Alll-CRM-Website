import crypto from "crypto";
import EmailAccount from "../../models/emailAccountModel.js";
import EmailMessage from "../../models/emailMessageModel.js";
import GmailOAuthState from "../../models/gmailOAuthStateModel.js";
import {
  GMAIL_LIMITS,
  GMAIL_READONLY_SCOPE,
  GmailHttpError,
  assertRedirectUri,
  gmailConfigStatus,
  normalizeGmailAddress,
  safeGmailError,
} from "./gmailConfig.js";
import { exchangeAuthCode, getGmailProfile } from "./gmailClient.js";
import { encryptSecret } from "./tokenCrypto.js";
import { syncAccountInbox } from "./emailSyncService.js";
import { toPublicAccount } from "./gmailPresenter.js";

export { toPublicAccount };

/**
 * @param {{ clientId: string, redirectUri: string, state: string, scope?: string, loginHint?: string }} input
 * @returns {string}
 */
export function buildGoogleAuthUrl(input) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.scope || GMAIL_READONLY_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);
  if (input.loginHint) url.searchParams.set("login_hint", input.loginHint);
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
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @param {string} email Gmail address shown on Google's sign-in page
 * @returns {Promise<{ url: string }>}
 */
export async function beginGmailOAuth(userId, email) {
  const loginHint = normalizeGmailAddress(email);
  const config = gmailConfigStatus();
  if (!config.configured) {
    throw new GmailHttpError(503, "Gmail is not configured on the server", "not_configured");
  }
  const redirectUri = assertRedirectUri(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  const state = crypto.randomBytes(32).toString("hex");
  await GmailOAuthState.create({
    state,
    userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    used: false,
  });
  const url = buildGoogleAuthUrl({
    clientId: process.env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
    loginHint,
  });
  return { url };
}

/**
 * @param {{ code?: string, state?: string, error?: string, fetchImpl?: typeof fetch }} query
 */
export async function completeGmailOAuth(query) {
  if (query.error) {
    if (isValidOAuthState(query.state)) {
      await GmailOAuthState.updateOne({ state: query.state, used: false }, { $set: { used: true } });
    }
    throw new GmailHttpError(400, "Google authorization was cancelled", "access_denied");
  }
  if (!isValidOAuthState(query.state) || !query.code || String(query.code).length > 2048) {
    throw new GmailHttpError(400, "Gmail authorization state is invalid", "invalid_state");
  }
  const config = gmailConfigStatus();
  if (!config.configured) {
    throw new GmailHttpError(503, "Gmail is not configured on the server", "not_configured");
  }
  const stateDoc = await GmailOAuthState.findOneAndUpdate(
    { state: query.state, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true } },
    { new: true }
  );
  if (!stateDoc) {
    throw new GmailHttpError(400, "Gmail authorization state is invalid or expired", "invalid_state");
  }

  const redirectUri = assertRedirectUri(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  const token = await exchangeAuthCode({
    code: String(query.code),
    redirectUri,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    fetchImpl: query.fetchImpl,
  });
  const profile = await getGmailProfile(token.access_token, { fetchImpl: query.fetchImpl });
  const email = String(profile.emailAddress || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new GmailHttpError(502, "Gmail did not return an account address", "gmail_error");
  }

  const existing = await EmailAccount.findOne({ user: stateDoc.userId, provider: "gmail" })
    .select("+encryptedRefreshToken");
  if (existing && existing.email !== email) {
    await EmailMessage.deleteMany({ user: stateDoc.userId, emailAccount: existing._id });
  }

  const expiry = new Date(Date.now() + (Number(token.expires_in) || 3600) * 1000);
  const update = {
    email,
    displayName: email,
    encryptedAccessToken: encryptSecret(token.access_token),
    tokenExpiry: expiry,
    scopes: String(token.scope || GMAIL_READONLY_SCOPE).split(" ").filter(Boolean),
    syncStatus: "idle",
    lastSyncError: "",
    isActive: true,
  };
  if (token.refresh_token) {
    update.encryptedRefreshToken = encryptSecret(token.refresh_token);
  } else if (!existing?.encryptedRefreshToken) {
    throw new GmailHttpError(409, "Google did not return a refresh token. Disconnect and connect again.", "needs_reauth");
  }

  await EmailAccount.findOneAndUpdate(
    { user: stateDoc.userId, provider: "gmail" },
    { $set: update, $setOnInsert: { user: stateDoc.userId, provider: "gmail" } },
    { upsert: true, new: true }
  );

  const saved = await EmailAccount.findOne({ user: stateDoc.userId, provider: "gmail" })
    .select("+encryptedAccessToken +encryptedRefreshToken");
  try {
    await syncAccountInbox(saved, {
      limit: GMAIL_LIMITS.callbackSyncMessages,
      fetchImpl: query.fetchImpl,
    });
  } catch (error) {
    const code = error instanceof GmailHttpError ? error.code : "sync_error";
    console.error("[gmail] initial sync failed", code);
  }
  return { userId: stateDoc.userId, email };
}

export { safeGmailError };
