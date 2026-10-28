import MetaIntegration from "../../models/metaIntegrationModel.js";
import MetaWebhookEvent from "../../models/metaWebhookEventModel.js";
import { LEAD_FIELDS, graphRequest } from "./graphClient.js";
import { getCompanyScope } from "./metaConfig.js";
import { upsertMetaLead } from "./metaLeadStore.js";
import { readPageToken, webhookIntegrationQuery } from "./metaIntegrationService.js";
import { classifyDelivery, extractLeadgenChanges } from "./metaWebhookParse.js";
import { isMetaAuthFailure, redactSecrets } from "./metaSecurity.js";

export { classifyDelivery, extractLeadgenChanges };

/**
 * @param {object} payload
 */
export async function processWebhookPayload(payload) {
  const changes = extractLeadgenChanges(payload);
  for (const change of changes) {
    try {
      await processLeadgenNotification(change);
    } catch (error) {
      console.error("[Meta] leadgen notification failed", {
        leadgenId: change.leadgenId,
        message: redactSecrets(error.message),
      });
    }
  }
}

/**
 * @param {{ leadgenId: string, pageId: string, formId: string }} change
 */
async function processLeadgenNotification(change) {
  const query = webhookIntegrationQuery(change.pageId);
  if (!query) return;
  const integration = await MetaIntegration.findOne(query);
  if (!integration) return;

  const form = (integration.forms || []).find((item) => item.formId === change.formId && item.selected);
  const page = (integration.pages || []).find((item) => item.pageId === change.pageId && item.selected);
  if (!page) return;

  let event = await MetaWebhookEvent.findOne({
    companyScope: integration.companyScope,
    leadgenId: change.leadgenId,
  });
  const decision = classifyDelivery(event);
  if (decision === "duplicate" || decision === "in_flight" || decision === "exhausted") return;

  if (!event) {
    try {
      event = await MetaWebhookEvent.create({
        companyScope: integration.companyScope,
        leadgenId: change.leadgenId,
        pageId: change.pageId,
        formId: change.formId,
        status: "pending",
        attempts: 1,
        receivedAt: new Date(),
      });
    } catch (error) {
      if (error?.code === 11000) return;
      throw error;
    }
  } else {
    event.attempts += 1;
    event.status = "pending";
    await event.save();
  }

  if (!form) {
    event.status = "skipped";
    event.lastError = "Lead form is not selected for sync";
    event.processedAt = new Date();
    await event.save();
    return;
  }

  try {
    const token = readPageToken(page);
    if (!token) throw new Error("Page access token is missing");
    const graphLead = await graphRequest("GET", `/${change.leadgenId}`, {
      token,
      query: { fields: LEAD_FIELDS },
    });
    await upsertMetaLead({
      graphLead,
      companyScope: integration.companyScope,
      integrationId: integration._id,
      pageId: page.pageId,
      pageName: page.pageName,
      formId: form.formId,
      formName: form.formName,
    });
    event.status = "processed";
    event.lastError = "";
    event.processedAt = new Date();
    await event.save();
    await MetaIntegration.updateOne(
      { _id: integration._id, companyScope: getCompanyScope() },
      { $set: { lastWebhookAt: new Date(), lastSuccessAt: new Date(), lastWebhookError: "" } }
    );
  } catch (error) {
    event.status = "failed";
    event.lastError = redactSecrets(error.message).slice(0, 300);
    await event.save();
    const update = {
      lastWebhookAt: new Date(),
      lastWebhookError: event.lastError,
    };
    if (isMetaAuthFailure(error.metaCode)) {
      update.status = "needs_reauth";
      update.lastError = "Meta access expired or was revoked. Reconnect the account.";
      update.lastErrorAt = new Date();
    }
    await MetaIntegration.updateOne(
      { _id: integration._id, companyScope: integration.companyScope },
      { $set: update }
    );
  }
}
