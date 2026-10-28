import Lead from "../../models/leadModel.js";
import { applyAttributionUpdate, buildNewLeadPayload } from "./metaLeadMapper.js";
import { redactSecrets } from "./metaSecurity.js";

/**
 * Create a CRM lead or refresh Meta attribution without touching CRM-owned fields.
 * Dedup key is company scope + Meta lead id.
 *
 * @param {object} input
 * @returns {Promise<{ action: "created"|"updated"|"skipped", reason?: string, leadId?: string }>}
 */
export async function upsertMetaLead(input) {
  const leadId = String(input.graphLead?.id || "");
  if (!/^\d+$/.test(leadId)) {
    return { action: "skipped", reason: "invalid_lead_id" };
  }

  const companyScope = input.companyScope;
  const existing = await Lead.findOne({
    "meta.companyScope": companyScope,
    "meta.leadId": leadId,
  });

  if (existing) {
    const payload = buildNewLeadPayload(input);
    applyAttributionUpdate(existing, payload.meta);
    if (typeof existing.markModified === "function") existing.markModified("meta");
    await existing.save();
    return { action: "updated", leadId: String(existing._id) };
  }

  const payload = buildNewLeadPayload(input);
  try {
    const created = await Lead.create(payload);
    return { action: "created", leadId: String(created._id) };
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await Lead.findOne({
        "meta.companyScope": companyScope,
        "meta.leadId": leadId,
      });
      if (raced) {
        applyAttributionUpdate(raced, payload.meta);
        if (typeof raced.markModified === "function") raced.markModified("meta");
        await raced.save();
        return { action: "updated", leadId: String(raced._id) };
      }
    }
    console.error("[Meta] lead upsert failed", {
      leadId,
      message: redactSecrets(error?.message),
    });
    throw error;
  }
}
