import mongoose from "mongoose";
import EmailAccount from "../models/emailAccountModel.js";
import EmailMessage from "../models/emailMessageModel.js";
import {
  GMAIL_LIMITS,
  GmailHttpError,
  frontendInboxUrl,
  gmailConfigStatus,
} from "../services/gmail/gmailConfig.js";
import { beginGmailOAuth, completeGmailOAuth } from "../services/gmail/gmailOAuthService.js";
import { buildMessageFilter, getOwnedMessageDetail, syncInboxForUser } from "../services/gmail/emailSyncService.js";
import { toPublicAccount, toPublicMessage } from "../services/gmail/gmailPresenter.js";

const PUBLIC_CALLBACK_CODES = new Set([
  "access_denied",
  "invalid_state",
  "not_configured",
  "needs_reauth",
  "gmail_error",
  "gmail_unavailable",
]);

function sendError(res, error) {
  if (error instanceof GmailHttpError) {
    console.error("[gmail] request failed", error.code);
    return res.status(error.status).json({ success: false, error: error.message });
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ success: false, error: "That email id is not valid" });
  }
  console.error("[gmail] request failed");
  return res.status(500).json({ success: false, error: "Email request failed" });
}

export const listAccounts = async (req, res) => {
  try {
    const account = await EmailAccount.findOne({
      user: req.user._id,
      provider: "gmail",
      isActive: true,
    })
      .select("provider email displayName syncStatus lastSyncedAt lastSyncError isActive createdAt")
      .lean();
    return res.json({
      success: true,
      configured: gmailConfigStatus().configured,
      accounts: account ? [toPublicAccount(account)] : [],
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const connectGmail = async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    const result = await beginGmailOAuth(req.user._id, email);
    return res.json({ success: true, url: result.url });
  } catch (error) {
    return sendError(res, error);
  }
};

export const gmailCallback = async (req, res) => {
  let target;
  try {
    target = frontendInboxUrl();
  } catch (error) {
    console.error("[gmail] oauth callback failed", "not_configured");
    return res.status(500).json({ success: false, error: "Gmail is not configured on the server" });
  }
  try {
    await completeGmailOAuth({
      code: typeof req.query.code === "string" ? req.query.code : "",
      state: typeof req.query.state === "string" ? req.query.state : "",
      error: typeof req.query.error === "string" ? req.query.error : "",
    });
    target.searchParams.set("connected", "1");
  } catch (error) {
    const code = error instanceof GmailHttpError && PUBLIC_CALLBACK_CODES.has(error.code)
      ? error.code
      : "gmail_error";
    target.searchParams.set("error", code);
    console.error("[gmail] oauth callback failed", code);
  }
  return res.redirect(target.toString());
};

export const listMessages = async (req, res) => {
  try {
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 100);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 30, 1),
      GMAIL_LIMITS.listPageMax
    );
    const filter = buildMessageFilter(req.user._id, {
      q: typeof req.query.q === "string" ? req.query.q : "",
      unread: typeof req.query.unread === "string" ? req.query.unread : "",
    });
    const [messages, total] = await Promise.all([
      EmailMessage.find(filter).sort({ receivedAt: -1 }).skip((page - 1) * limit).limit(limit),
      EmailMessage.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      messages: messages.map(toPublicMessage),
      page,
      limit,
      total,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMessage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "That email id is not valid" });
    }
    const detail = await getOwnedMessageDetail(req.user._id, req.params.id);
    return res.json({ success: true, ...detail });
  } catch (error) {
    return sendError(res, error);
  }
};

export const syncInbox = async (req, res) => {
  try {
    const result = await syncInboxForUser(req.user._id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const disconnectAccount = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "That account id is not valid" });
    }
    const account = await EmailAccount.findOne({
      _id: req.params.id,
      user: req.user._id,
      provider: "gmail",
    });
    if (!account) {
      return res.status(404).json({ success: false, error: "No connected Gmail account was found" });
    }
    await EmailMessage.deleteMany({ user: req.user._id, emailAccount: account._id });
    await account.deleteOne();
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
};
