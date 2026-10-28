import Lead from "../../models/leadModel.js";
import { graphRequest } from "./graphClient.js";
import { INSIGHTS_SCOPES, getCompanyScope } from "./metaConfig.js";
import { readPageToken, findCompanyIntegration } from "./metaIntegrationService.js";
import {
  NEW_STATUS,
  QUALIFIED_STATUS,
  CONVERTED_STATUS,
  LOST_STATUS,
  defaultRange,
  pickLeadAction,
  summarizeAdAccounts,
  summarizeCrmCounts,
  zonedDayRange,
} from "./metaAnalytics.js";
import { redactSecrets } from "./metaSecurity.js";

/**
 * @param {{ from?: string, to?: string }} query
 */
export async function getMetaAnalytics(query) {
  const timeZone = process.env.META_ANALYTICS_TIMEZONE || process.env.COMPANY_TIMEZONE || "Asia/Kolkata";
  const fallback = defaultRange(timeZone);
  const from = query.from || fallback.from;
  const to = query.to || fallback.to;
  const range = zonedDayRange(from, to, timeZone);
  const companyScope = getCompanyScope();
  const match = {
    "meta.companyScope": companyScope,
    "meta.leadId": { $type: "string" },
    "meta.createdTime": { $gte: range.start, $lte: range.end },
  };

  const [counts, byDay, byCampaign, byForm, bySource] = await Promise.all([
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ["$status", NEW_STATUS] }, 1, 0] } },
          qualified: { $sum: { $cond: [{ $eq: ["$status", QUALIFIED_STATUS] }, 1, 0] } },
          converted: { $sum: { $cond: [{ $eq: ["$status", CONVERTED_STATUS] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ["$status", LOST_STATUS] }, 1, 0] } },
        },
      },
    ]),
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$meta.createdTime", timezone: timeZone } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$meta.campaignId",
          name: { $first: "$meta.campaignName" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$meta.formId",
          name: { $first: "$meta.formName" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    Lead.aggregate([
      { $match: match },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const integration = await findCompanyIntegration();
  const advertising = await loadAdvertising(integration, from, to);

  return {
    timezone: timeZone,
    from,
    to,
    crm: {
      ...summarizeCrmCounts(counts[0] || {}),
      byDay: byDay.map((row) => ({ date: row._id, count: row.count })),
      byCampaign: byCampaign.map((row) => ({
        id: row._id || "",
        name: row.name || "Not set",
        count: row.count,
      })),
      byForm: byForm.map((row) => ({
        id: row._id || "",
        name: row.name || "Not set",
        count: row.count,
      })),
      bySource: bySource.map((row) => ({ source: row._id || "Unknown", count: row.count })),
    },
    advertising,
  };
}

/**
 * @param {object|null} integration
 * @param {string} from
 * @param {string} to
 */
async function loadAdvertising(integration, from, to) {
  if (!integration || integration.status !== "connected") {
    return {
      available: false,
      reason: "Connect a Meta account and select an ad account to load advertising metrics.",
      accounts: [],
    };
  }
  if (integration.permissionsKnown && !(integration.grantedPermissions || []).includes(INSIGHTS_SCOPES[0])) {
    return {
      available: false,
      reason: "The ads_read permission was not granted for this connection.",
      accounts: [],
      note: "These figures are Meta advertising metrics. They are not CRM lead counts.",
    };
  }

  const accounts = (integration.adAccounts || []).filter((account) => account.selected);
  if (!accounts.length) {
    return {
      available: false,
      reason: "Select an ad account to load advertising metrics.",
      accounts: [],
      note: "These figures are Meta advertising metrics. They are not CRM lead counts.",
    };
  }

  const userToken = (() => {
    try {
      return readPageToken({ accessTokenEnc: integration.userTokenEnc });
    } catch {
      return "";
    }
  })();
  if (!userToken) {
    return {
      available: false,
      reason: "Meta access needs to be reconnected before insights can be loaded.",
      accounts: [],
    };
  }

  const rows = [];
  for (const account of accounts) {
    try {
      const body = await graphRequest("GET", `/${account.accountId}/insights`, {
        token: userToken,
        query: {
          fields: "spend,impressions,clicks,actions",
          level: "account",
          time_range: JSON.stringify({ since: from, until: to }),
        },
      });
      const insight = Array.isArray(body.data) ? body.data[0] : null;
      if (!insight) {
        rows.push({
          accountId: account.accountId,
          name: account.name,
          currency: account.currency || "",
          spend: 0,
          impressions: 0,
          clicks: 0,
          leadAction: null,
        });
        continue;
      }
      rows.push({
        accountId: account.accountId,
        name: account.name,
        currency: account.currency || "",
        spend: Number(insight.spend || 0),
        impressions: Number(insight.impressions || 0),
        clicks: Number(insight.clicks || 0),
        leadAction: pickLeadAction(insight.actions),
      });
    } catch (error) {
      rows.push({
        accountId: account.accountId,
        name: account.name,
        error: redactSecrets(error.message).slice(0, 300),
      });
    }
  }

  const summary = summarizeAdAccounts(rows);
  summary.insightsNote = "Meta applies this date range in each ad account timezone. CRM lead counts use the office timezone.";
  return summary;
}
