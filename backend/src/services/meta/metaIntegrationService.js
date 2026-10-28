import crypto from "crypto";
import MetaIntegration from "../../models/metaIntegrationModel.js";
import MetaOAuthState from "../../models/metaOAuthStateModel.js";
import { graphGetAll, graphRequest, exchangeCodeForUserToken } from "./graphClient.js";
import {
  MetaHttpError,
  assertRedirectUri,
  buildOAuthUrl,
  getCompanyScope,
  getRequestedScopes,
  isValidOAuthState,
  metaConfigStatus,
  missingPermissions,
  BUSINESS_SCOPES,
  LEAD_RETRIEVAL_SCOPES,
  SUBSCRIPTION_SCOPES,
  INSIGHTS_SCOPES,
} from "./metaConfig.js";
import { syncPageSubscriptions } from "./metaPageSubscription.js";
import { redactSecrets } from "./metaSecurity.js";
import { decryptSecret, encryptSecret } from "./tokenCrypto.js";

const ID_PATTERN = /^\d+$/;
const AD_ACCOUNT_PATTERN = /^act_\d+$/;

/**
 * @param {MetaIntegration|object|null} doc
 * @returns {object|null}
 */
export function toPublicIntegration(doc) {
  if (!doc) return null;
  const source = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: source._id,
    companyScope: source.companyScope,
    status: source.status,
    metaUserId: source.metaUserId || "",
    metaUserName: source.metaUserName || "",
    grantedPermissions: source.grantedPermissions || [],
    missingPermissions: source.missingPermissions || [],
    permissionsKnown: Boolean(source.permissionsKnown),
    userTokenExpiresAt: source.userTokenExpiresAt || null,
    userTokenExpired: Boolean(source.userTokenExpiresAt && new Date(source.userTokenExpiresAt).getTime() < Date.now()),
    pages: (source.pages || []).map((page) => ({
      pageId: page.pageId,
      pageName: page.pageName,
      category: page.category,
      instagramBusinessAccountId: page.instagramBusinessAccountId || "",
      instagramUsername: page.instagramUsername || "",
      selected: Boolean(page.selected),
      leadSubscribed: Boolean(page.leadSubscribed),
      subscriptionError: page.subscriptionError || "",
      hasPageToken: Boolean(page.accessTokenEnc),
    })),
    forms: (source.forms || []).map((form) => ({
      formId: form.formId,
      formName: form.formName,
      pageId: form.pageId,
      status: form.status || "",
      selected: Boolean(form.selected),
    })),
    adAccounts: (source.adAccounts || []).map((account) => ({
      accountId: account.accountId,
      name: account.name,
      currency: account.currency || "",
      accountStatus: account.accountStatus,
      selected: Boolean(account.selected),
    })),
    businessPortfolios: source.businessPortfolios || [],
    assetErrors: source.assetErrors || [],
    lastSyncAt: source.lastSyncAt || null,
    lastSuccessAt: source.lastSuccessAt || null,
    lastError: source.lastError || "",
    lastErrorAt: source.lastErrorAt || null,
    lastWebhookAt: source.lastWebhookAt || null,
    lastWebhookError: source.lastWebhookError || "",
    syncInProgress: Boolean(source.syncLockUntil && new Date(source.syncLockUntil).getTime() > Date.now()),
    connectedAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };
}

/**
 * @param {object} integration
 * @param {{ pageIds?: string[], formIds?: string[], adAccountIds?: string[] }} body
 * @returns {{ pageIds: string[], formIds: string[], adAccountIds: string[] }}
 */
export function normalizeSelection(integration, body) {
  const pageIds = uniqueIds(body?.pageIds, ID_PATTERN);
  const formIds = uniqueIds(body?.formIds, ID_PATTERN);
  const adAccountIds = uniqueIds(body?.adAccountIds, AD_ACCOUNT_PATTERN);
  const knownPages = new Set((integration.pages || []).map((page) => page.pageId));
  const knownAccounts = new Set((integration.adAccounts || []).map((account) => account.accountId));
  const forms = integration.forms || [];

  if (pageIds.some((id) => !knownPages.has(id))) {
    throw new MetaHttpError(400, "One or more Pages are not authorized for this connection", "unknown_asset");
  }
  if (adAccountIds.some((id) => !knownAccounts.has(id))) {
    throw new MetaHttpError(400, "One or more ad accounts are not authorized for this connection", "unknown_asset");
  }
  for (const formId of formIds) {
    const form = forms.find((item) => item.formId === formId);
    if (!form) {
      throw new MetaHttpError(400, "One or more lead forms are not authorized for this connection", "unknown_asset");
    }
    if (!pageIds.includes(form.pageId)) {
      throw new MetaHttpError(400, "Select the Facebook Page that owns each lead form", "unknown_asset");
    }
  }
  return { pageIds, formIds, adAccountIds };
}

/**
 * @param {unknown} values
 * @param {RegExp} pattern
 * @returns {string[]}
 */
function uniqueIds(values, pattern) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || "").trim()).filter((value) => pattern.test(value)))];
}

/**
 * @returns {Promise<object|null>}
 */
export async function findCompanyIntegration() {
  return MetaIntegration.findOne({ companyScope: getCompanyScope() });
}

/**
 * @param {boolean} reauth
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @returns {Promise<{ url: string }>}
 */
export async function beginOAuth(reauth, userId) {
  const config = metaConfigStatus();
  if (!config.configured) {
    throw new MetaHttpError(503, "Meta integration is not configured on the server", "not_configured");
  }
  const redirectUri = assertRedirectUri(process.env.META_REDIRECT_URI);
  const state = crypto.randomBytes(32).toString("hex");
  await MetaOAuthState.create({
    state,
    companyScope: getCompanyScope(),
    userId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    used: false,
  });
  const url = buildOAuthUrl({
    appId: process.env.META_APP_ID,
    redirectUri,
    state,
    scopes: getRequestedScopes(),
    configId: process.env.META_LOGIN_CONFIG_ID || "",
    reauth,
  });
  return { url };
}

/**
 * @param {{ code?: string, state?: string, error?: string }} query
 * @returns {Promise<void>}
 */
export async function completeOAuth(query) {
  if (query.error) {
    throw new MetaHttpError(400, "Meta authorization was denied", "access_denied");
  }
  if (!isValidOAuthState(query.state) || !query.code || String(query.code).length > 2048) {
    throw new MetaHttpError(400, "Meta authorization state is invalid", "invalid_state");
  }
  const config = metaConfigStatus();
  if (!config.configured) {
    throw new MetaHttpError(503, "Meta integration is not configured on the server", "not_configured");
  }

  const companyScope = getCompanyScope();
  const stateDoc = await MetaOAuthState.findOneAndUpdate(
    {
      state: query.state,
      used: false,
      companyScope,
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
    { new: true }
  );
  if (!stateDoc) {
    throw new MetaHttpError(400, "Meta authorization state is invalid or expired", "invalid_state");
  }

  const redirectUri = assertRedirectUri(process.env.META_REDIRECT_URI);
  const token = await exchangeCodeForUserToken({
    code: String(query.code),
    redirectUri,
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
  });

  const profile = await loadProfile(token.accessToken);
  const assets = await loadAssets(token.accessToken);
  const existing = await MetaIntegration.findOne({ companyScope });
  const merged = mergeAssets(existing, assets);

  const expiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000) : null;
  const requested = getRequestedScopes();
  const missing = profile.permissionsKnown ? missingPermissions(profile.granted, requested) : requested;

  await MetaIntegration.findOneAndUpdate(
    { companyScope },
    {
      $set: {
        companyScope,
        status: "connected",
        connectedBy: stateDoc.userId,
        updatedBy: stateDoc.userId,
        metaUserId: profile.id,
        metaUserName: profile.name,
        grantedPermissions: profile.granted,
        missingPermissions: missing,
        permissionsKnown: profile.permissionsKnown,
        userTokenEnc: encryptSecret(token.accessToken),
        userTokenExpiresAt: expiresAt,
        pages: merged.pages,
        forms: merged.forms,
        adAccounts: merged.adAccounts,
        businessPortfolios: merged.businesses,
        assetErrors: assets.errors,
        lastError: "",
        lastWebhookError: "",
      },
      $unset: { disconnectedAt: 1, disconnectedBy: 1 },
    },
    { upsert: true, new: true }
  );
}

/**
 * @param {string} userToken
 */
async function loadProfile(userToken) {
  const me = await graphRequest("GET", "/me", { token: userToken, query: { fields: "id,name" } });
  try {
    const permissions = await graphRequest("GET", "/me/permissions", { token: userToken });
    const granted = (permissions.data || [])
      .filter((row) => row.status === "granted")
      .map((row) => row.permission);
    return { id: String(me.id || ""), name: String(me.name || ""), granted, permissionsKnown: true };
  } catch (error) {
    console.error("[Meta] permission check failed", redactSecrets(error.message));
    return { id: String(me.id || ""), name: String(me.name || ""), granted: [], permissionsKnown: false };
  }
}

/**
 * @param {string} userToken
 */
async function loadAssets(userToken) {
  const errors = [];
  const pagesResult = await safeAsset("pages", () => graphGetAll("/me/accounts", {
    fields: "id,name,access_token,category,instagram_business_account{id,username}",
    limit: 50,
  }, userToken));
  const forms = [];
  const pages = [];
  if (pagesResult.ok) {
    for (const page of pagesResult.data) {
      if (!page?.id) continue;
      const ig = page.instagram_business_account || {};
      pages.push({
        pageId: String(page.id),
        pageName: String(page.name || ""),
        category: String(page.category || ""),
        instagramBusinessAccountId: String(ig.id || ""),
        instagramUsername: String(ig.username || ""),
        accessToken: String(page.access_token || ""),
      });
    }
  } else {
    errors.push(pagesResult.error);
  }

  const businessResult = await safeAsset("businesses", () => graphGetAll("/me/businesses", {
    fields: "id,name",
    limit: 50,
  }, userToken));
  const adResult = await safeAsset("adAccounts", () => graphGetAll("/me/adaccounts", {
    fields: "id,name,account_status,currency",
    limit: 50,
  }, userToken));
  if (!businessResult.ok) errors.push(businessResult.error);
  if (!adResult.ok) errors.push(adResult.error);

  for (const page of pages) {
    if (!page.accessToken) continue;
    const formResult = await safeAsset(`forms:${page.pageId}`, () => graphGetAll(`/${page.pageId}/leadgen_forms`, {
      fields: "id,name,status",
      limit: 50,
    }, page.accessToken));
    if (!formResult.ok) {
      errors.push(formResult.error);
      continue;
    }
    for (const form of formResult.data) {
      if (!form?.id) continue;
      forms.push({
        formId: String(form.id),
        formName: String(form.name || ""),
        pageId: page.pageId,
        status: String(form.status || ""),
      });
    }
  }

  return {
    pages,
    forms,
    businesses: businessResult.ok
      ? businessResult.data.filter((row) => row?.id).map((row) => ({ id: String(row.id), name: String(row.name || "") }))
      : [],
    adAccounts: adResult.ok
      ? adResult.data.filter((row) => row?.id).map((row) => ({
        accountId: String(row.id),
        name: String(row.name || ""),
        currency: String(row.currency || ""),
        accountStatus: row.account_status,
      }))
      : [],
    errors,
  };
}

/**
 * @param {string} resource
 * @param {() => Promise<unknown>} fn
 */
async function safeAsset(resource, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return {
      ok: false,
      error: {
        resource,
        message: redactSecrets(error.message).slice(0, 300),
        at: new Date(),
      },
    };
  }
}

/**
 * Preserve selection flags and replace page tokens.
 * @param {object|null} existing
 * @param {object} assets
 */
function mergeAssets(existing, assets) {
  const previousPages = new Map((existing?.pages || []).map((page) => [page.pageId, page]));
  const previousForms = new Map((existing?.forms || []).map((form) => [form.formId, form]));
  const previousAccounts = new Map((existing?.adAccounts || []).map((account) => [account.accountId, account]));

  return {
    pages: assets.pages.map((page) => {
      const previous = previousPages.get(page.pageId);
      return {
        pageId: page.pageId,
        pageName: page.pageName,
        category: page.category,
        instagramBusinessAccountId: page.instagramBusinessAccountId,
        instagramUsername: page.instagramUsername,
        accessTokenEnc: page.accessToken ? encryptSecret(page.accessToken) : (previous?.accessTokenEnc || ""),
        selected: Boolean(previous?.selected),
        leadSubscribed: Boolean(previous?.leadSubscribed),
        subscriptionError: previous?.subscriptionError || "",
      };
    }),
    forms: assets.forms.map((form) => ({
      ...form,
      selected: Boolean(previousForms.get(form.formId)?.selected),
    })),
    adAccounts: assets.adAccounts.map((account) => ({
      ...account,
      selected: Boolean(previousAccounts.get(account.accountId)?.selected),
    })),
    businesses: assets.businesses,
  };
}

/**
 * @param {import("mongoose").Types.ObjectId|string} userId
 */
export async function refreshAssets(userId) {
  const integration = await requireConnected();
  const userToken = decryptSecret(integration.userTokenEnc);
  if (!userToken) {
    throw new MetaHttpError(409, "Reconnect Meta to refresh Pages and forms", "needs_reauth");
  }
  try {
    const assets = await loadAssets(userToken);
    const merged = mergeAssets(integration, assets);
    integration.pages = merged.pages;
    integration.forms = merged.forms;
    integration.adAccounts = merged.adAccounts;
    integration.businessPortfolios = merged.businesses;
    integration.assetErrors = assets.errors;
    integration.updatedBy = userId;
    integration.status = "connected";
    await integration.save();
    return toPublicIntegration(integration);
  } catch (error) {
    if (error.metaCode && [102, 190, 463, 467].includes(Number(error.metaCode))) {
      integration.status = "needs_reauth";
      integration.lastError = "Meta access expired. Reconnect the account.";
      integration.lastErrorAt = new Date();
      await integration.save();
      throw new MetaHttpError(409, integration.lastError, "needs_reauth");
    }
    throw error;
  }
}

/**
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @param {object} body
 */
export async function saveSelection(userId, body) {
  const integration = await requireConnected();
  const selection = normalizeSelection(integration, body);
  integration.pages.forEach((page) => {
    page.selected = selection.pageIds.includes(page.pageId);
  });
  integration.forms.forEach((form) => {
    form.selected = selection.formIds.includes(form.formId);
  });
  integration.adAccounts.forEach((account) => {
    account.selected = selection.adAccountIds.includes(account.accountId);
  });
  await syncPageSubscriptions(integration, (page) => {
    try {
      return decryptSecret(page.accessTokenEnc);
    } catch {
      return "";
    }
  });
  integration.updatedBy = userId;
  await integration.save();
  return toPublicIntegration(integration);
}

/**
 * @param {import("mongoose").Types.ObjectId|string} userId
 */
export async function disconnectIntegration(userId) {
  const integration = await MetaIntegration.findOne({ companyScope: getCompanyScope() });
  if (!integration || integration.status === "disconnected") {
    return null;
  }

  let userToken = "";
  try {
    userToken = decryptSecret(integration.userTokenEnc);
  } catch {
    userToken = "";
  }

  for (const page of integration.pages) {
    if (!page.leadSubscribed) continue;
    try {
      const pageToken = decryptSecret(page.accessTokenEnc);
      if (pageToken) {
        await graphRequest("DELETE", `/${page.pageId}/subscribed_apps`, { token: pageToken });
      }
    } catch (error) {
      console.error("[Meta] page unsubscribe failed", redactSecrets(error.message));
    }
  }

  if (userToken) {
    try {
      await graphRequest("DELETE", "/me/permissions", { token: userToken });
    } catch (error) {
      console.error("[Meta] token revoke failed", redactSecrets(error.message));
    }
  }

  integration.status = "disconnected";
  integration.userTokenEnc = "";
  integration.userTokenExpiresAt = null;
  integration.pages.forEach((page) => {
    page.accessTokenEnc = "";
    page.selected = false;
    page.leadSubscribed = false;
    page.subscriptionError = "";
  });
  integration.forms.forEach((form) => {
    form.selected = false;
  });
  integration.adAccounts.forEach((account) => {
    account.selected = false;
  });
  integration.disconnectedAt = new Date();
  integration.disconnectedBy = userId;
  integration.syncLockUntil = null;
  integration.updatedBy = userId;
  await integration.save();
  return toPublicIntegration(integration);
}

/**
 * @param {object} page
 * @returns {string}
 */
export function readPageToken(page) {
  return decryptSecret(page?.accessTokenEnc || "");
}

/**
 * @returns {Promise<import("mongoose").Document>}
 */
export async function requireConnected() {
  const integration = await findCompanyIntegration();
  if (!integration || integration.status === "disconnected") {
    throw new MetaHttpError(400, "Connect a Meta account first", "not_connected");
  }
  if (integration.status === "needs_reauth") {
    throw new MetaHttpError(409, "Meta access expired. Reconnect the account.", "needs_reauth");
  }
  return integration;
}

export function leadPermissionGap(integration) {
  if (!integration.permissionsKnown) return [];
  return missingPermissions(integration.grantedPermissions, [
    ...LEAD_RETRIEVAL_SCOPES,
    ...SUBSCRIPTION_SCOPES,
    ...BUSINESS_SCOPES,
    ...INSIGHTS_SCOPES,
  ]);
}

/**
 * Webhook lookup is always scoped to this deployment.
 * @param {string} pageId
 * @returns {object|null}
 */
export function webhookIntegrationQuery(pageId) {
  if (!ID_PATTERN.test(String(pageId || ""))) return null;
  return {
    companyScope: getCompanyScope(),
    status: "connected",
    pages: { $elemMatch: { pageId: String(pageId), selected: true } },
  };
}
