import MetaIntegration from "../../models/metaIntegrationModel.js";
import MetaSyncRun from "../../models/metaSyncRunModel.js";
import { LEAD_FIELDS, graphRequest, nextPageCursor } from "./graphClient.js";
import {
  LEAD_RETRIEVAL_SCOPES,
  MetaHttpError,
  getCompanyScope,
  missingPermissions,
} from "./metaConfig.js";
import { cursorForForm } from "./metaLeadMapper.js";
import { upsertMetaLead } from "./metaLeadStore.js";
import { readPageToken, requireConnected } from "./metaIntegrationService.js";
import { isMetaAuthFailure, redactSecrets } from "./metaSecurity.js";

/**
 * @param {{ userId?: string, incremental?: boolean, trigger?: "manual"|"reconciliation" }} input
 */
export async function startSync({ userId, incremental = false, trigger = "manual" }) {
  const integration = await requireConnected();
  if (integration.permissionsKnown) {
    const missing = missingPermissions(integration.grantedPermissions, LEAD_RETRIEVAL_SCOPES);
    if (missing.length) {
      throw new MetaHttpError(
        400,
        `Meta did not grant: ${missing.join(", ")}. Reconnect and approve the missing permissions.`,
        "missing_permissions"
      );
    }
  }
  const selectedForms = (integration.forms || []).filter((form) => form.selected);
  if (!selectedForms.length) {
    throw new MetaHttpError(400, "Select at least one lead form before syncing", "no_forms");
  }

  const locked = await MetaIntegration.findOneAndUpdate(
    {
      _id: integration._id,
      companyScope: integration.companyScope,
      $or: [{ syncLockUntil: null }, { syncLockUntil: { $lte: new Date() } }],
    },
    { $set: { syncLockUntil: new Date(Date.now() + 15 * 60 * 1000) } },
    { new: true }
  );
  if (!locked) {
    throw new MetaHttpError(409, "A Meta sync is already running", "sync_busy");
  }

  let run;
  try {
    run = await MetaSyncRun.create({
      companyScope: locked.companyScope,
      integrationId: locked._id,
      trigger,
      status: "running",
      incremental: Boolean(incremental),
      startedAt: new Date(),
      startedBy: userId || null,
      stats: { fetched: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
    });
  } catch (error) {
    await MetaIntegration.updateOne(
      { _id: locked._id, companyScope: locked.companyScope },
      { $set: { syncLockUntil: null } }
    );
    throw error;
  }

  setImmediate(() => {
    executeSync(run._id).catch((error) => {
      console.error("[Meta] sync failed", redactSecrets(error.message));
    });
  });

  return { runId: String(run._id), status: "running" };
}

/**
 * Scheduled recovery for leads missed by webhooks.
 */
export async function reconcileMetaLeads() {
  if (String(process.env.META_RECONCILE_ENABLED || "true").toLowerCase() === "false") {
    return { skipped: true, reason: "disabled" };
  }
  const integration = await MetaIntegration.findOne({
    companyScope: getCompanyScope(),
    status: "connected",
  });
  if (!integration) return { skipped: true, reason: "not_connected" };
  try {
    return await startSync({ incremental: true, trigger: "reconciliation" });
  } catch (error) {
    if (error.code === "sync_busy" || error.code === "no_forms" || error.code === "missing_permissions") {
      return { skipped: true, reason: error.code };
    }
    console.error("[Meta] reconciliation failed", redactSecrets(error.message));
    return { skipped: true, reason: "failed" };
  }
}

/**
 * @param {import("mongoose").Types.ObjectId|string} runId
 */
async function executeSync(runId) {
  const run = await MetaSyncRun.findOne({ _id: runId, companyScope: getCompanyScope() });
  if (!run) return;
  const integration = await MetaIntegration.findOne({
    _id: run.integrationId,
    companyScope: run.companyScope,
  });
  if (!integration) {
    run.status = "failed";
    run.error = "Integration record was not found";
    run.finishedAt = new Date();
    await run.save();
    return;
  }

  const maxLeads = Math.min(Math.max(Number(process.env.META_SYNC_MAX_LEADS) || 5000, 1), 20000);
  let cursors = run.incremental
    ? (integration.cursors || []).map((row) => (typeof row.toObject === "function" ? row.toObject() : { ...row }))
    : [];
  let stoppedEarly = false;

  try {
    if (!run.incremental) {
      await MetaIntegration.updateOne(
        { _id: integration._id, companyScope: run.companyScope },
        { $set: { cursors: [] } }
      );
    }
    const forms = (integration.forms || []).filter((form) => form.selected);
    for (const form of forms) {
      if (run.stats.fetched >= maxLeads) {
        stoppedEarly = true;
        break;
      }
      const position = cursorForForm(cursors, form.formId, run.incremental);
      if (position.skip) continue;
      const page = (integration.pages || []).find((item) => item.pageId === form.pageId && item.selected);
      if (!page) {
        run.stats.failed += 1;
        continue;
      }
      let token = "";
      try {
        token = readPageToken(page);
      } catch (error) {
        await markAuthFailure(integration, error);
        throw error;
      }
      if (!token) {
        run.stats.failed += 1;
        run.error = "A selected Page is missing an access token. Reconnect Meta.";
        continue;
      }

      let after = position.after;
      const seen = new Set();
      let formDone = false;
      while (!formDone && run.stats.fetched < maxLeads) {
        let body;
        try {
          body = await graphRequest("GET", `/${form.formId}/leads`, {
            token,
            query: {
              fields: LEAD_FIELDS,
              limit: 50,
              after: after || undefined,
            },
          });
        } catch (error) {
          if (isMetaAuthFailure(error.metaCode)) {
            await markAuthFailure(integration, error);
            throw error;
          }
          run.stats.failed += 1;
          run.error = redactSecrets(error.message).slice(0, 300);
          break;
        }

        const rows = Array.isArray(body.data) ? body.data : [];
        for (const graphLead of rows) {
          if (run.stats.fetched >= maxLeads) {
            stoppedEarly = true;
            break;
          }
          run.stats.fetched += 1;
          try {
            const result = await upsertMetaLead({
              graphLead,
              companyScope: run.companyScope,
              integrationId: integration._id,
              pageId: page.pageId,
              pageName: page.pageName,
              formId: form.formId,
              formName: form.formName,
              performedBy: run.startedBy,
            });
            if (result.action === "created") run.stats.created += 1;
            else if (result.action === "updated") run.stats.updated += 1;
            else run.stats.skipped += 1;
          } catch (error) {
            run.stats.failed += 1;
            run.error = redactSecrets(error.message).slice(0, 300);
          }
        }

        const next = nextPageCursor(body, after || "", seen);
        if (!next || stoppedEarly) {
          formDone = !next && !stoppedEarly;
          break;
        }
        seen.add(next);
        after = next;
        cursors = upsertCursor(cursors, form.formId, after, false);
        await MetaIntegration.updateOne(
          { _id: integration._id, companyScope: run.companyScope },
          { $set: { cursors } }
        );
      }

      cursors = upsertCursor(cursors, form.formId, formDone ? "" : after, formDone);
      await MetaIntegration.updateOne(
        { _id: integration._id, companyScope: run.companyScope },
        { $set: { cursors } }
      );
    }

    run.status = run.stats.failed > 0 || stoppedEarly ? "partial" : "success";
    if (stoppedEarly && !run.error) {
      run.error = "Sync paused at the configured lead limit. The next reconciliation continues from the checkpoint.";
    }
    run.finishedAt = new Date();
    await run.save();
    await MetaIntegration.updateOne(
      { _id: integration._id, companyScope: run.companyScope },
      {
        $set: {
          lastSyncAt: new Date(),
          ...(run.stats.created + run.stats.updated > 0 ? { lastSuccessAt: new Date() } : {}),
          lastError: run.status === "success" ? "" : run.error,
          lastErrorAt: run.status === "success" ? null : new Date(),
        },
      }
    );
  } catch (error) {
    run.status = "failed";
    run.error = redactSecrets(error.message).slice(0, 300);
    run.finishedAt = new Date();
    await run.save();
    if (!isMetaAuthFailure(error.metaCode) && error.code !== "needs_reauth") {
      await MetaIntegration.updateOne(
        { _id: integration._id, companyScope: run.companyScope },
        { $set: { lastSyncAt: new Date(), lastError: run.error, lastErrorAt: new Date() } }
      );
    }
  } finally {
    await MetaIntegration.updateOne(
      { _id: integration._id, companyScope: run.companyScope },
      { $set: { syncLockUntil: null } }
    );
  }
}

/**
 * @param {object[]} cursors
 * @param {string} formId
 * @param {string|null} after
 * @param {boolean} done
 */
function upsertCursor(cursors, formId, after, done) {
  const next = cursors.filter((row) => row.formId !== formId);
  next.push({ formId, after: after || "", done: Boolean(done), updatedAt: new Date() });
  return next;
}

/**
 * @param {object} integration
 * @param {Error & { metaCode?: number, code?: string }} error
 */
async function markAuthFailure(integration, error) {
  if (!isMetaAuthFailure(error.metaCode) && error.code !== "needs_reauth") return;
  await MetaIntegration.updateOne(
    { _id: integration._id, companyScope: integration.companyScope },
    {
      $set: {
        status: "needs_reauth",
        lastError: "Meta access expired or was revoked. Reconnect the account.",
        lastErrorAt: new Date(),
      },
    }
  );
}

/**
 * @returns {Promise<object[]>}
 */
export async function listSyncRuns() {
  return MetaSyncRun.find({ companyScope: getCompanyScope() })
    .sort({ startedAt: -1 })
    .limit(20)
    .select("trigger status incremental startedAt finishedAt stats error")
    .lean();
}
