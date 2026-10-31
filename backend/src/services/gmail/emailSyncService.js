import EmailAccount from "../../models/emailAccountModel.js";
import EmailMessage from "../../models/emailMessageModel.js";
import { GMAIL_LIMITS, GmailHttpError, safeGmailError } from "./gmailConfig.js";
import { extractBodies, normalizeGmailMessage } from "./mime.js";
import { sanitizeEmailHtml } from "./htmlSanitize.js";
import { callGmail } from "./accessToken.js";
import { toPublicAccount, toPublicMessage } from "./gmailPresenter.js";

/**
 * Inbox queries are always scoped to the authenticated user.
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @param {{ q?: string, unread?: string }} query
 */
export function buildMessageFilter(userId, query = {}) {
  const filter = { user: userId };
  if (query.unread === "1" || query.unread === "true") filter.isRead = false;
  const q = String(query.q || "").trim().slice(0, GMAIL_LIMITS.searchMaxLength);
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { subject: { $regex: safe, $options: "i" } },
      { snippet: { $regex: safe, $options: "i" } },
      { "from.email": { $regex: safe, $options: "i" } },
      { "from.name": { $regex: safe, $options: "i" } },
    ];
  }
  return filter;
}

/**
 * @param {object} account
 * @param {object} raw
 */
export async function upsertGmailMessage(account, raw) {
  const parsed = normalizeGmailMessage(raw);
  if (!parsed?.gmailMessageId) return null;
  return EmailMessage.findOneAndUpdate(
    { emailAccount: account._id, gmailMessageId: parsed.gmailMessageId },
    {
      $set: {
        user: account.user,
        threadId: parsed.threadId,
        from: parsed.from,
        to: parsed.to,
        cc: parsed.cc,
        subject: parsed.subject,
        snippet: parsed.snippet,
        receivedAt: parsed.receivedAt,
        isRead: parsed.isRead,
        labels: parsed.labels,
        syncedAt: new Date(),
      },
      $setOnInsert: {
        emailAccount: account._id,
        gmailMessageId: parsed.gmailMessageId,
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * @param {object} account document with encrypted tokens selected
 * @param {{ limit?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<{ synced: number }>}
 */
export async function syncAccountInbox(account, options = {}) {
  const limit = Math.min(options.limit || GMAIL_LIMITS.manualSyncMessages, GMAIL_LIMITS.manualSyncMessages);
  const fetchOptions = { fetchImpl: options.fetchImpl };
  let pageToken = "";
  let synced = 0;
  const seen = new Set();

  while (synced < limit) {
    const page = await listInboxWithAuth(account, {
      pageToken,
      maxResults: Math.min(GMAIL_LIMITS.pageSize, limit - synced),
      fetchImpl: options.fetchImpl,
    });
    const ids = Array.isArray(page.messages) ? page.messages : [];
    if (!ids.length) break;
    for (const item of ids) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      const raw = await getMessageWithAuth(account, item.id, "metadata", fetchOptions);
      await upsertGmailMessage(account, raw);
      synced += 1;
      if (synced >= limit) break;
    }
    if (!page.nextPageToken || page.nextPageToken === pageToken) break;
    pageToken = page.nextPageToken;
  }

  account.syncStatus = "idle";
  account.lastSyncedAt = new Date();
  account.lastSyncError = "";
  if (typeof account.save === "function") await account.save();
  return { synced };
}

async function listInboxWithAuth(account, options) {
  const params = new URLSearchParams();
  params.set("q", "in:inbox");
  params.set("maxResults", String(options.maxResults || GMAIL_LIMITS.pageSize));
  if (options.pageToken) params.set("pageToken", options.pageToken);
  return callGmail(account, `/messages?${params.toString()}`, { fetchImpl: options.fetchImpl });
}

async function getMessageWithAuth(account, messageId, format, options) {
  const params = new URLSearchParams();
  params.set("format", format);
  if (format === "metadata") {
    for (const name of ["From", "To", "Cc", "Subject", "Date"]) params.append("metadataHeaders", name);
  }
  return callGmail(account, `/messages/${encodeURIComponent(messageId)}?${params.toString()}`, options);
}

/**
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @param {{ limit?: number, fetchImpl?: typeof fetch }} [options]
 */
export async function syncInboxForUser(userId, options = {}) {
  const account = await lockAccountForSync(userId);
  if (!account) {
    const current = await EmailAccount.findOne({ user: userId, provider: "gmail", isActive: true });
    if (!current) throw new GmailHttpError(404, "No connected Gmail account was found", "not_found");
    return {
      alreadyRunning: true,
      synced: 0,
      account: toPublicAccount(current),
    };
  }
  try {
    const result = await syncAccountInbox(account, options);
    return { alreadyRunning: false, synced: result.synced, account: toPublicAccount(account) };
  } catch (error) {
    account.syncStatus = "error";
    account.lastSyncError = safeGmailError(error instanceof GmailHttpError ? error.message : "Gmail sync failed");
    if (typeof account.save === "function") await account.save();
    throw error;
  }
}

async function lockAccountForSync(userId) {
  const staleBefore = new Date(Date.now() - GMAIL_LIMITS.syncLockMs);
  return EmailAccount.findOneAndUpdate(
    {
      user: userId,
      provider: "gmail",
      isActive: true,
      $or: [
        { syncStatus: { $ne: "syncing" } },
        { updatedAt: { $lt: staleBefore } },
      ],
    },
    { $set: { syncStatus: "syncing", lastSyncError: "" } },
    { new: true }
  ).select("+encryptedAccessToken +encryptedRefreshToken");
}

/**
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @param {string} messageId
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function getOwnedMessageDetail(userId, messageId, options = {}) {
  const message = await EmailMessage.findOne({ _id: messageId, user: userId });
  if (!message) throw new GmailHttpError(404, "Email not found", "not_found");

  const account = await EmailAccount.findOne({
    _id: message.emailAccount,
    user: userId,
    isActive: true,
  }).select("+encryptedAccessToken +encryptedRefreshToken");
  if (!account) throw new GmailHttpError(404, "Email not found", "not_found");

  let bodyHtml = "";
  let bodyText = "";
  let current = message;
  try {
    const raw = await getMessageWithAuth(account, message.gmailMessageId, "full", options);
    const bodies = extractBodies(raw.payload);
    bodyHtml = sanitizeEmailHtml(bodies.html);
    bodyText = bodies.text;
    const saved = await upsertGmailMessage(account, raw);
    if (saved) current = saved;
  } catch (error) {
    if (error instanceof GmailHttpError && error.code === "needs_reauth") throw error;
    console.error("[gmail] message body failed", error instanceof GmailHttpError ? error.code : "gmail_error");
  }

  let thread = [];
  if (message.threadId) {
    try {
      const params = new URLSearchParams();
      params.set("format", "metadata");
      for (const name of ["From", "To", "Cc", "Subject", "Date"]) params.append("metadataHeaders", name);
      const rawThread = await callGmail(
        account,
        `/threads/${encodeURIComponent(message.threadId)}?${params.toString()}`,
        options
      );
      const items = Array.isArray(rawThread.messages) ? rawThread.messages : [];
      const capped = items.slice(-GMAIL_LIMITS.threadMessages);
      for (const item of capped) {
        await upsertGmailMessage(account, item);
      }
    } catch (error) {
      console.error("[gmail] thread failed", error instanceof GmailHttpError ? error.code : "gmail_error");
    }
    const siblings = await EmailMessage.find({ user: userId, threadId: message.threadId })
      .sort({ receivedAt: 1 })
      .limit(GMAIL_LIMITS.threadMessages);
    thread = siblings.map(toPublicMessage);
  }

  return {
    message: { ...toPublicMessage(current), bodyHtml, bodyText },
    thread,
  };
}

