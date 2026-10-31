import mongoose from "mongoose";
import Lead from "../../models/leadModel.js";
import Client from "../../models/clientModel.js";
import { MetaHttpError, getCompanyScope } from "./metaConfig.js";
import { findCompanyIntegration, requireConnected, toPublicIntegration } from "./metaIntegrationService.js";
import { defaultRange, zonedDayRange } from "./metaAnalytics.js";

const META_LEAD_MATCH = {
  "meta.leadId": { $type: "string" },
};

const STATUS_ORDER = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
const AD_ACCOUNT_PATTERN = /^act_\d+$/;

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeMatchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * @param {string} accountName
 * @param {string} pageName
 * @returns {boolean}
 */
export function namesLikelySameClient(accountName, pageName) {
  const accountKey = normalizeMatchText(accountName);
  const pageKey = normalizeMatchText(pageName);
  if (!accountKey || !pageKey) return false;
  if (pageKey === accountKey || pageKey.includes(accountKey) || accountKey.includes(pageKey)) return true;

  const accountTokens = accountKey.split(" ").filter((t) => t.length > 2);
  const pageTokens = pageKey.split(" ").filter((t) => t.length > 2);
  if (!accountTokens.length || !pageTokens.length) return false;

  let shared = 0;
  for (const token of accountTokens) {
    if (pageTokens.some((pt) => pt === token || pt.includes(token) || token.includes(pt))) {
      shared += 1;
    }
  }
  if (shared >= 2) return true;
  if (shared >= 1 && accountTokens.some((t) => t.length >= 5)) return true;
  return shared >= 1 && accountTokens.length === 1;
}

/**
 * Facebook Pages whose leads roll up to this Meta ad account.
 * @param {{ name?: string, clientId?: unknown, pageIds?: string[] }} account
 * @param {Array<{ pageId: string, pageName?: string, selected?: boolean, clientId?: unknown }>} pages
 * @returns {string[]}
 */
export function resolveAccountPageIds(account, pages) {
  const selectedPages = (pages || []).filter((page) => page.selected);
  const known = new Set(selectedPages.map((page) => page.pageId));
  const explicit = (account.pageIds || []).map(String).filter((id) => /^\d+$/.test(id) && known.has(id));
  if (explicit.length) return explicit;
  if (account.clientId) {
    const clientKey = String(account.clientId);
    const byClient = selectedPages
      .filter((page) => page.clientId && String(page.clientId) === clientKey)
      .map((page) => page.pageId);
    if (byClient.length) return byClient;
  }
  const byName = selectedPages
    .filter((page) => namesLikelySameClient(account.name || "", page.pageName || ""))
    .map((page) => page.pageId);
  if (byName.length) return byName;
  return [];
}

/**
 * @param {import("../../models/leadModel.js").default} lead
 * @returns {string}
 */
function displayPhone(lead) {
  const primary = (lead.contacts || []).find((c) => c.type === "Phone" && c.isPrimary);
  const anyPhone = (lead.contacts || []).find((c) => c.type === "Phone");
  const fromContacts = primary?.value || anyPhone?.value;
  if (fromContacts) return String(fromContacts);
  if (lead.meta?.rawPhone) return String(lead.meta.rawPhone);
  if (lead.phone) return String(lead.phone);
  return "";
}

/**
 * @param {import("../../models/leadModel.js").default} lead
 * @returns {string}
 */
function displayEmail(lead) {
  const fromContacts = (lead.contacts || []).find((c) => c.type === "Email");
  if (fromContacts?.value) return String(fromContacts.value);
  return lead.email ? String(lead.email) : "";
}

/**
 * @param {Array<{ name?: string, values?: string[] }>|undefined} fieldData
 * @param {number} max
 * @returns {string}
 */
function fieldPreview(fieldData, max = 3) {
  if (!Array.isArray(fieldData) || !fieldData.length) return "";
  const parts = [];
  for (const field of fieldData) {
    if (!field?.name) continue;
    const value = (field.values || []).filter(Boolean).join(", ");
    if (!value) continue;
    parts.push(`${field.name}: ${value}`);
    if (parts.length >= max) break;
  }
  return parts.join(" · ");
}

/**
 * @param {object} lead
 * @returns {object}
 */
export function serializeMetaLead(lead) {
  const assigned = lead.assignedTo && typeof lead.assignedTo === "object"
    ? { id: String(lead.assignedTo._id || lead.assignedTo), name: lead.assignedTo.name || lead.assignedTo.fullName || "" }
    : lead.assignedTo
      ? { id: String(lead.assignedTo), name: "" }
      : null;

  return {
    id: String(lead._id),
    fullName: lead.fullName || "",
    phone: displayPhone(lead),
    email: displayEmail(lead),
    companyName: lead.companyName || "",
    status: lead.status || "New",
    source: lead.source || "",
    assignedTo: assigned,
    createdAt: lead.createdAt || null,
    meta: {
      leadId: lead.meta?.leadId || "",
      pageId: lead.meta?.pageId || "",
      pageName: lead.meta?.pageName || "",
      formId: lead.meta?.formId || "",
      formName: lead.meta?.formName || "",
      platform: lead.meta?.platform || "",
      sourcePlatform: lead.meta?.sourcePlatform || "",
      campaignId: lead.meta?.campaignId || "",
      campaignName: lead.meta?.campaignName || "",
      adName: lead.meta?.adName || "",
      city: lead.meta?.city || "",
      createdTime: lead.meta?.createdTime || null,
      importedAt: lead.meta?.importedAt || null,
      isOrganic: Boolean(lead.meta?.isOrganic),
      fieldPreview: fieldPreview(lead.meta?.fieldData),
      fieldData: (lead.meta?.fieldData || []).map((row) => ({
        name: row.name || "",
        values: (row.values || []).map(String),
      })),
    },
  };
}

/**
 * @param {{ from?: string, to?: string }} query
 */
export async function getMetaLeadDashboard(query = {}) {
  const companyScope = getCompanyScope();
  const integration = await findCompanyIntegration();
  const timeZone = process.env.META_ANALYTICS_TIMEZONE || process.env.COMPANY_TIMEZONE || "Asia/Kolkata";
  const fallback = defaultRange(timeZone);
  const from = query.from || fallback.from;
  const to = query.to || fallback.to;
  const range = zonedDayRange(from, to, timeZone);

  const match = {
    ...META_LEAD_MATCH,
    "meta.companyScope": companyScope,
    "meta.createdTime": { $gte: range.start, $lte: range.end },
  };

  const allPages = integration?.pages || [];
  const selectedPages = allPages.filter((page) => page.selected);
  const adAccounts = integration?.adAccounts || [];

  const clientIdSet = new Set();
  for (const page of selectedPages) {
    if (page.clientId) clientIdSet.add(String(page.clientId));
  }
  for (const account of adAccounts) {
    if (account.clientId) clientIdSet.add(String(account.clientId));
  }

  const clientDocs = clientIdSet.size
    ? await Client.find({ _id: { $in: [...clientIdSet] } }).select("name company email phone").lean()
    : [];
  const clientNameById = new Map(clientDocs.map((c) => [String(c._id), c.name || c.company || "Client"]));

  const accountPageMap = adAccounts.map((account) => ({
    account,
    pageIds: resolveAccountPageIds(account, allPages),
  }));

  const allScopedPageIds = [...new Set(accountPageMap.flatMap((row) => row.pageIds))];

  const selectedPageIds = selectedPages.map((page) => page.pageId);

  const [byPageInRange, byPageAllTime] = await Promise.all([
    allScopedPageIds.length
      ? Lead.aggregate([
        { $match: { ...match, "meta.pageId": { $in: allScopedPageIds } } },
        {
          $group: {
            _id: "$meta.pageId",
            total: { $sum: 1 },
            lastLeadAt: { $max: "$meta.createdTime" },
            statuses: { $push: "$status" },
          },
        },
      ])
      : [],
    allScopedPageIds.length
      ? Lead.aggregate([
        {
          $match: {
            ...META_LEAD_MATCH,
            "meta.companyScope": companyScope,
            "meta.pageId": { $in: allScopedPageIds },
          },
        },
        {
          $group: {
            _id: "$meta.pageId",
            totalAllTime: { $sum: 1 },
          },
        },
      ])
      : [],
  ]);

  const statsByPage = new Map(byPageInRange.map((row) => [row._id, row]));
  const allTimeByPage = new Map(byPageAllTime.map((row) => [row._id, row.totalAllTime || 0]));

  const accounts = accountPageMap.map(({ account, pageIds }) => {
    const statusCounts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    let total = 0;
    let totalAllTime = 0;
    let lastLeadAt = null;
    for (const pageId of pageIds) {
      totalAllTime += allTimeByPage.get(pageId) || 0;
      const agg = statsByPage.get(pageId);
      if (!agg) continue;
      total += agg.total || 0;
      for (const status of agg.statuses || []) {
        if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      }
      if (agg.lastLeadAt && (!lastLeadAt || new Date(agg.lastLeadAt) > new Date(lastLeadAt))) {
        lastLeadAt = agg.lastLeadAt;
      }
    }

    const clientId = account.clientId ? String(account.clientId) : "";
    const pages = pageIds.map((pageId) => {
      const page = allPages.find((item) => item.pageId === pageId);
      return {
        pageId,
        pageName: page?.pageName || "Facebook Page",
        instagramUsername: page?.instagramUsername || "",
      };
    });

    return {
      accountId: account.accountId,
      name: account.name || account.accountId.replace(/^act_/, "Ad account "),
      currency: account.currency || "",
      selected: Boolean(account.selected),
      clientId,
      clientName: clientId ? (clientNameById.get(clientId) || "") : "",
      configuredPageIds: Array.isArray(account.pageIds) ? account.pageIds.map(String) : [],
      pageIds,
      pages,
      stats: { total, totalAllTime, ...statusCounts },
      lastLeadAt,
      pageMatchAuto: !(account.pageIds || []).length && pageIds.length > 0,
    };
  });

  accounts.sort((a, b) => {
    const aTime = a.lastLeadAt ? new Date(a.lastLeadAt).getTime() : 0;
    const bTime = b.lastLeadAt ? new Date(b.lastLeadAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.stats.total - a.stats.total;
  });

  const importedPagesRaw = await Lead.aggregate([
    {
      $match: {
        ...META_LEAD_MATCH,
        "meta.companyScope": companyScope,
        "meta.pageId": { $type: "string" },
      },
    },
    {
      $group: {
        _id: "$meta.pageId",
        pageName: { $first: "$meta.pageName" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 100 },
  ]);
  const selectedSet = new Set(selectedPageIds);
  const importedPages = importedPagesRaw.map((row) => ({
    pageId: row._id,
    pageName: row.pageName || "Facebook Page",
    count: row.count,
    selected: selectedSet.has(row._id),
  }));

  const totals = accounts.reduce(
    (acc, row) => {
      acc.total += row.stats.total;
      for (const status of STATUS_ORDER) {
        acc.byStatus[status] = (acc.byStatus[status] || 0) + (row.stats[status] || 0);
      }
      return acc;
    },
    { total: 0, byStatus: Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) }
  );

  return {
    from,
    to,
    timezone: timeZone,
    connected: integration?.status === "connected",
    accountCount: accounts.length,
    totals,
    accounts,
    /** Selected Facebook Pages available to attach to an ad account. */
    availablePages: selectedPages.map((page) => ({
      pageId: page.pageId,
      pageName: page.pageName || "Facebook Page",
      instagramUsername: page.instagramUsername || "",
      clientId: page.clientId ? String(page.clientId) : "",
      leadCountAllTime: allTimeByPage.get(page.pageId) || 0,
      leadCountInRange: statsByPage.get(page.pageId)?.total || 0,
    })),
    importedPages,
  };
}

/**
 * @param {{
 *   pageId?: string,
 *   accountId?: string,
 *   status?: string,
 *   search?: string,
 *   from?: string,
 *   to?: string,
 *   page?: number,
 *   limit?: number,
 * }} query
 */
export async function listMetaLeads(query = {}) {
  const companyScope = getCompanyScope();
  const integration = await findCompanyIntegration();
  const timeZone = process.env.META_ANALYTICS_TIMEZONE || process.env.COMPANY_TIMEZONE || "Asia/Kolkata";
  const fallback = defaultRange(timeZone);
  const from = query.from || fallback.from;
  const to = query.to || fallback.to;
  const range = zonedDayRange(from, to, timeZone);

  const pageNum = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const skip = (pageNum - 1) * limit;

  const filter = {
    ...META_LEAD_MATCH,
    "meta.companyScope": companyScope,
    "meta.createdTime": { $gte: range.start, $lte: range.end },
  };

  const accountId = String(query.accountId || "").trim();
  const pageId = String(query.pageId || "").trim();

  if (accountId) {
    if (!AD_ACCOUNT_PATTERN.test(accountId)) {
      return { from, to, page: pageNum, limit, total: 0, leads: [], accountId };
    }
    const account = (integration?.adAccounts || []).find((item) => item.accountId === accountId);
    if (!account) {
      return { from, to, page: pageNum, limit, total: 0, leads: [], accountId };
    }
    const scoped = resolveAccountPageIds(account, integration?.pages || []);
    filter["meta.pageId"] = scoped.length ? { $in: scoped } : { $in: ["__none__"] };
  } else if (pageId) {
    if (!/^\d+$/.test(pageId)) {
      return { from, to, page: pageNum, limit, total: 0, leads: [] };
    }
    filter["meta.pageId"] = pageId;
  } else {
    const selected = (integration?.pages || []).filter((p) => p.selected).map((p) => p.pageId);
    filter["meta.pageId"] = selected.length ? { $in: selected } : { $in: ["__none__"] };
  }

  const status = String(query.status || "").trim();
  if (status && STATUS_ORDER.includes(status)) {
    filter.status = status;
  }

  const search = String(query.search || "").trim();
  if (search.length >= 2) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { fullName: regex },
      { companyName: regex },
      { email: regex },
      { "meta.campaignName": regex },
      { "meta.formName": regex },
      { "meta.rawPhone": regex },
      { "contacts.value": regex },
    ];
  }

  const [total, leads] = await Promise.all([
    Lead.countDocuments(filter),
    Lead.find(filter)
      .sort({ "meta.createdTime": -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name")
      .lean(),
  ]);

  return {
    from,
    to,
    timezone: timeZone,
    page: pageNum,
    limit,
    total,
    leads: leads.map(serializeMetaLead),
  };
}

/**
 * @param {string} pageId
 * @param {string|null} clientId
 * @param {import("mongoose").Types.ObjectId|string} userId
 */
export async function mapPageToClient(pageId, clientId, userId) {
  const integration = await requireConnected();
  if (!/^\d+$/.test(String(pageId || ""))) {
    throw new MetaHttpError(400, "Invalid Facebook Page id", "invalid_page");
  }
  const page = (integration.pages || []).find((item) => item.pageId === String(pageId));
  if (!page) {
    throw new MetaHttpError(400, "Page is not authorized for this connection", "unknown_page");
  }
  if (clientId === null || clientId === "" || clientId === undefined) {
    page.clientId = null;
  } else {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new MetaHttpError(400, "Invalid CRM client id", "invalid_client");
    }
    const exists = await Client.exists({ _id: clientId });
    if (!exists) {
      throw new MetaHttpError(400, "CRM client not found", "invalid_client");
    }
    page.clientId = new mongoose.Types.ObjectId(clientId);
  }
  integration.updatedBy = userId;
  await integration.save();
  return toPublicIntegration(integration);
}

/**
 * @param {string} accountId
 * @param {{ clientId?: string|null, pageIds?: string[] }} body
 * @param {import("mongoose").Types.ObjectId|string} userId
 */
export async function updateAdAccountConfig(accountId, body, userId) {
  const integration = await requireConnected();
  if (!AD_ACCOUNT_PATTERN.test(String(accountId || ""))) {
    throw new MetaHttpError(400, "Invalid Meta ad account id", "invalid_account");
  }
  const account = (integration.adAccounts || []).find((item) => item.accountId === accountId);
  if (!account) {
    throw new MetaHttpError(400, "Ad account is not authorized for this connection", "unknown_account");
  }

  if (body && Object.prototype.hasOwnProperty.call(body, "clientId")) {
    const clientId = body.clientId;
    if (clientId === null || clientId === "" || clientId === undefined) {
      account.clientId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        throw new MetaHttpError(400, "Invalid CRM client id", "invalid_client");
      }
      const exists = await Client.exists({ _id: clientId });
      if (!exists) {
        throw new MetaHttpError(400, "CRM client not found", "invalid_client");
      }
      account.clientId = new mongoose.Types.ObjectId(clientId);
    }
  }

  if (Array.isArray(body?.pageIds)) {
    const known = new Set(
      (integration.pages || []).filter((page) => page.selected).map((page) => page.pageId)
    );
    const pageIds = [...new Set(body.pageIds.map(String).filter((id) => /^\d+$/.test(id) && known.has(id)))];
    account.pageIds = pageIds;
  }

  integration.updatedBy = userId;
  await integration.save();
  return toPublicIntegration(integration);
}
