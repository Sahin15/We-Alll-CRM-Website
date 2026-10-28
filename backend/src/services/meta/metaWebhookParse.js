/**
 * Pure Meta webhook payload checks. Kept separate so tests do not load Mongo models.
 */

/**
 * @param {object|null|undefined} event
 * @param {number} [now]
 * @returns {"new"|"duplicate"|"in_flight"|"retry"|"exhausted"}
 */
export function classifyDelivery(event, now = Date.now()) {
  if (!event) return "new";
  if (event.status === "processed" || event.status === "skipped") return "duplicate";
  if ((event.attempts || 0) >= 5) return "exhausted";
  const updated = new Date(event.updatedAt || event.receivedAt || 0).getTime();
  if (event.status === "pending" && now - updated < 2 * 60 * 1000) return "in_flight";
  return "retry";
}

/**
 * @param {object} payload
 * @returns {Array<{ leadgenId: string, pageId: string, formId: string }>}
 */
export function extractLeadgenChanges(payload) {
  if (!payload || payload.object !== "page" || !Array.isArray(payload.entry)) return [];
  const changes = [];
  for (const entry of payload.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== "leadgen") continue;
      const value = change.value || {};
      const leadgenId = String(value.leadgen_id || "");
      const pageId = String(value.page_id || entry.id || "");
      const formId = String(value.form_id || "");
      if (!/^\d+$/.test(leadgenId) || !/^\d+$/.test(pageId)) continue;
      changes.push({ leadgenId, pageId, formId });
    }
  }
  return changes;
}
