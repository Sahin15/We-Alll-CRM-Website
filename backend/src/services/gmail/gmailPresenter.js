/**
 * @param {object|null} account
 */
export function toPublicAccount(account) {
  if (!account) return null;
  return {
    id: String(account._id),
    provider: account.provider,
    email: account.email,
    displayName: account.displayName || "",
    syncStatus: account.syncStatus || "idle",
    lastSyncedAt: account.lastSyncedAt || null,
    lastSyncError: account.lastSyncError || "",
    isActive: Boolean(account.isActive),
    connectedAt: account.createdAt || null,
  };
}

/**
 * @param {object} message
 */
export function toPublicMessage(message) {
  return {
    id: String(message._id),
    threadId: message.threadId || "",
    from: message.from || { name: "", email: "" },
    to: message.to || [],
    cc: message.cc || [],
    subject: message.subject || "(no subject)",
    snippet: message.snippet || "",
    receivedAt: message.receivedAt,
    isRead: Boolean(message.isRead),
    labels: message.labels || [],
  };
}
