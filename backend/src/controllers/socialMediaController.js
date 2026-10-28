import mongoose from "mongoose";
import Client from "../models/clientModel.js";
import Department from "../models/departmentModel.js";
import SocialAccount from "../models/socialAccountModel.js";
import SocialPost from "../models/socialPostModel.js";
import SocialSettings from "../models/socialSettingsModel.js";
import {
  cleanHttpsUrl,
  getSocialCompanyScope,
  dayKey,
  escapeRegex,
  initialPostStatus,
  normalizePlatforms,
  percentChange,
  POST_STATUSES,
  resolvePostAction,
  sanitizeMetrics,
  serviceCompanyFromFilter,
  SOCIAL_PLATFORMS,
} from "../services/social/socialRules.js";

const CLIENT_STATUSES = ["Active", "On Hold", "Lost"];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {import("express").Response} res
 * @param {Error & { statusCode?: number }} error
 * @param {string} label
 */
function sendError(res, error, label) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(`[social] ${label}`, error);
  return res.status(status).json({
    success: false,
    error: status >= 500 ? "Something went wrong while loading social media" : error.message,
  });
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function asObjectId(value) {
  const id = String(value || "");
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

/**
 * @param {string} company
 * @returns {Promise<import("mongoose").Types.ObjectId[]|null>}
 */
async function clientIdsForCompany(company) {
  const serviceCompany = serviceCompanyFromFilter(company);
  if (!serviceCompany) return null;
  return Client.find({ serviceCompany }).distinct("_id");
}

/**
 * @param {object} post
 */
function presentPost(post) {
  const client = post.client && typeof post.client === "object" ? post.client : null;
  return {
    id: post._id,
    clientId: client?._id || post.client,
    clientName: client?.name || "",
    clientCompany: client?.company || "",
    serviceCompany: client?.serviceCompany || "",
    title: post.title,
    content: post.content,
    platforms: post.platforms || [],
    mediaUrl: post.mediaUrl || "",
    status: post.status,
    scheduledAt: post.scheduledAt || null,
    publishedAt: post.publishedAt || null,
    approvalNote: post.approvalNote || "",
    metrics: {
      reach: post.metrics?.reach ?? null,
      clicks: post.metrics?.clicks ?? null,
      engagementRate: post.metrics?.engagementRate ?? null,
    },
    createdAt: post.createdAt,
  };
}

/**
 * @param {object} account
 */
function presentAccount(account) {
  const client = account.client && typeof account.client === "object" ? account.client : null;
  return {
    id: account._id,
    clientId: client?._id || account.client,
    clientName: client?.name || "",
    serviceCompany: client?.serviceCompany || "",
    platform: account.platform,
    accountName: account.accountName,
    handle: account.handle,
    profileUrl: account.profileUrl || "",
    status: account.status,
    followers: account.followers ?? null,
    notes: account.notes || "",
    connectedAt: account.connectedAt || account.createdAt || null,
  };
}

async function loadSettings() {
  const companyScope = getSocialCompanyScope();
  let settings = await SocialSettings.findOne({ companyScope });
  if (!settings) {
    settings = await SocialSettings.create({ companyScope });
  }
  return settings;
}

function presentSettings(settings) {
  return {
    timezone: settings.timezone,
    contentQueue: settings.contentQueue,
    autoHashtags: settings.autoHashtags,
    defaultPostType: settings.defaultPostType,
    workflow: settings.workflow,
  };
}

/**
 * @param {import("express").Request} req
 */
async function companyClientFilter(req) {
  const ids = await clientIdsForCompany(req.query.company);
  if (!ids) return {};
  return { client: { $in: ids } };
}

/**
 * @param {object} filter
 * @param {string|null} clientId
 * @returns {object|null}
 */
function restrictClient(filter, clientId) {
  if (!clientId) return filter;
  const limited = filter.client?.$in;
  if (limited && !limited.some((id) => String(id) === String(clientId))) return null;
  return { ...filter, client: clientId };
}

export const getSocialClients = async (req, res) => {
  try {
    if (req.query.countsOnly === "1") {
      const [all, weAlll, kolkataDigital] = await Promise.all([
        Client.countDocuments(),
        Client.countDocuments({ serviceCompany: "We Alll" }),
        Client.countDocuments({ serviceCompany: "Kolkata Digital" }),
      ]);
      return res.json({ success: true, data: [], companyCounts: { all, weAlll, kolkataDigital } });
    }
    const search = String(req.query.search || "").trim().slice(0, 80);
    const status = CLIENT_STATUSES.includes(req.query.status) ? req.query.status : "";
    const serviceCompany = serviceCompanyFromFilter(req.query.company);
    const departmentName = String(req.query.department || "").trim().slice(0, 80);
    const filter = {};
    if (status) filter.status = status;
    if (serviceCompany) filter.serviceCompany = serviceCompany;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { company: pattern }, { industry: pattern }];
    }
    if (departmentName) {
      const department = await Department.findOne({
        name: new RegExp(`^${escapeRegex(departmentName)}$`, "i"),
      }).select("_id");
      if (!department) {
        return res.json({ success: true, data: [], total: 0, departments: [], companyCounts: null });
      }
      filter.assignedDepartments = department._id;
    }

    const [clients, departments, all, weAlll, kolkataDigital] = await Promise.all([
      Client.find(filter)
        .select("name email company serviceCompany status industry ownername")
        .sort({ name: 1 })
        .limit(200)
        .lean(),
      Department.find().select("name").sort({ name: 1 }).limit(100).lean(),
      Client.countDocuments(),
      Client.countDocuments({ serviceCompany: "We Alll" }),
      Client.countDocuments({ serviceCompany: "Kolkata Digital" }),
    ]);

    const ids = clients.map((client) => client._id);
    const [accounts, postGroups] = await Promise.all([
      SocialAccount.find({ client: { $in: ids }, status: "connected" })
        .select("client platform")
        .lean(),
      SocialPost.aggregate([
        { $match: { client: { $in: ids } } },
        { $group: { _id: { client: "$client", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

    const accountsByClient = new Map();
    accounts.forEach((account) => {
      const key = String(account.client);
      const list = accountsByClient.get(key) || [];
      list.push(account.platform);
      accountsByClient.set(key, list);
    });
    const countsByClient = new Map();
    postGroups.forEach((row) => {
      const key = String(row._id.client);
      const current = countsByClient.get(key) || { scheduled: 0, pending: 0, published: 0, total: 0 };
      current.total += row.count;
      if (row._id.status === "scheduled") current.scheduled += row.count;
      if (row._id.status === "pending" || row._id.status === "changes_requested") current.pending += row.count;
      if (row._id.status === "published") current.published += row.count;
      countsByClient.set(key, current);
    });

    const data = clients.map((client) => ({
      id: client._id,
      name: client.name,
      email: client.email,
      company: client.company || "",
      serviceCompany: client.serviceCompany || "",
      status: client.status || "Active",
      industry: client.industry || "",
      ownerName: client.ownername || "",
      platforms: [...new Set(accountsByClient.get(String(client._id)) || [])],
      counts: countsByClient.get(String(client._id)) || { scheduled: 0, pending: 0, published: 0, total: 0 },
    }));

    return res.json({
      success: true,
      data,
      total: data.length,
      limited: data.length === 200,
      departments: departments.map((item) => item.name),
      companyCounts: { all, weAlll, kolkataDigital },
    });
  } catch (error) {
    return sendError(res, error, "getSocialClients");
  }
};

export const getSocialAccounts = async (req, res) => {
  try {
    const clientId = asObjectId(req.query.clientId);
    if (req.query.clientId && !clientId) {
      return res.status(400).json({ success: false, error: "Choose a valid client" });
    }
    const filter = restrictClient(await companyClientFilter(req), clientId);
    if (!filter) return res.json({ success: true, data: [] });
    if (req.query.platform) {
      normalizePlatforms([req.query.platform]);
      filter.platform = req.query.platform;
    }
    if (req.query.status === "connected" || req.query.status === "disconnected") {
      filter.status = req.query.status;
    }
    const accounts = await SocialAccount.find(filter)
      .populate("client", "name serviceCompany company")
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean();
    return res.json({ success: true, data: accounts.map(presentAccount) });
  } catch (error) {
    return sendError(res, error, "getSocialAccounts");
  }
};

export const createSocialAccount = async (req, res) => {
  try {
    const clientId = asObjectId(req.body.clientId);
    if (!clientId) return res.status(400).json({ success: false, error: "Choose a client" });
    const client = await Client.findById(clientId).select("_id");
    if (!client) return res.status(404).json({ success: false, error: "Client not found" });
    const platforms = normalizePlatforms([req.body.platform]);
    const accountName = String(req.body.accountName || "").trim();
    const handle = String(req.body.handle || "").trim().replace(/^@+/, "").toLowerCase();
    if (!accountName || !handle) {
      return res.status(400).json({ success: false, error: "Account name and handle are required" });
    }
    const followers = req.body.followers === "" || req.body.followers == null
      ? undefined
      : Number(req.body.followers);
    if (followers != null && (!Number.isFinite(followers) || followers < 0)) {
      return res.status(400).json({ success: false, error: "Followers must be zero or greater" });
    }
    const account = await SocialAccount.create({
      client: clientId,
      platform: platforms[0],
      accountName,
      handle,
      profileUrl: cleanHttpsUrl(req.body.profileUrl),
      status: req.body.status === "disconnected" ? "disconnected" : "connected",
      followers,
      notes: String(req.body.notes || "").trim().slice(0, 1000),
      connectedAt: new Date(),
      createdBy: req.user?._id,
    });
    const saved = await SocialAccount.findById(account._id).populate("client", "name serviceCompany company").lean();
    return res.status(201).json({ success: true, data: presentAccount(saved) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "That handle is already saved for this client on the same platform",
      });
    }
    return sendError(res, error, "createSocialAccount");
  }
};

export const updateSocialAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: "Account not found" });
    if (req.body.accountName != null) account.accountName = String(req.body.accountName).trim();
    if (req.body.handle != null) account.handle = String(req.body.handle).trim().replace(/^@+/, "").toLowerCase();
    if (!account.accountName || !account.handle) {
      return res.status(400).json({ success: false, error: "Account name and handle are required" });
    }
    if (req.body.profileUrl != null) account.profileUrl = cleanHttpsUrl(req.body.profileUrl);
    if (req.body.status === "connected" || req.body.status === "disconnected") account.status = req.body.status;
    if (req.body.notes != null) account.notes = String(req.body.notes).trim().slice(0, 1000);
    if (Object.prototype.hasOwnProperty.call(req.body, "followers")) {
      if (req.body.followers === "" || req.body.followers == null) {
        account.followers = undefined;
      } else {
        const followers = Number(req.body.followers);
        if (!Number.isFinite(followers) || followers < 0) {
          return res.status(400).json({ success: false, error: "Followers must be zero or greater" });
        }
        account.followers = followers;
      }
    }
    await account.save();
    const saved = await SocialAccount.findById(account._id).populate("client", "name serviceCompany company").lean();
    return res.json({ success: true, data: presentAccount(saved) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "That handle is already saved for this client on the same platform",
      });
    }
    return sendError(res, error, "updateSocialAccount");
  }
};

export const deleteSocialAccount = async (req, res) => {
  try {
    const account = await SocialAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: "Account not found" });
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error, "deleteSocialAccount");
  }
};

/**
 * @param {import("express").Request} req
 */
async function postFilter(req) {
  const clientId = asObjectId(req.query.clientId);
  if (req.query.clientId && !clientId) {
    const error = new Error("Choose a valid client");
    error.statusCode = 400;
    throw error;
  }
  const filter = restrictClient(await companyClientFilter(req), clientId);
  if (!filter) return { _id: null };
  if (req.query.status) {
    const statuses = String(req.query.status).split(",").map((item) => item.trim()).filter((item) => POST_STATUSES.includes(item));
    if (!statuses.length) {
      const error = new Error("Choose a valid post status");
      error.statusCode = 400;
      throw error;
    }
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (req.query.platform) {
    normalizePlatforms([req.query.platform]);
    filter.platforms = req.query.platform;
  }
  const search = String(req.query.search || "").trim().slice(0, 80);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: pattern }, { content: pattern }];
  }
  if (req.query.from || req.query.to) {
    const range = {};
    if (req.query.from) range.$gte = new Date(String(req.query.from));
    if (req.query.to) range.$lte = new Date(String(req.query.to));
    if (Object.values(range).some((value) => Number.isNaN(value.getTime()))) {
      const error = new Error("Choose a valid date range");
      error.statusCode = 400;
      throw error;
    }
    const window = [{ scheduledAt: range }, { publishedAt: range }];
    filter.$and = [...(filter.$and || []), { $or: window }];
  }
  return filter;
}

export const getSocialPosts = async (req, res) => {
  try {
    const posts = await SocialPost.find(await postFilter(req))
      .populate("client", "name serviceCompany company")
      .sort({ scheduledAt: 1, createdAt: -1 })
      .limit(500)
      .lean();
    return res.json({ success: true, data: posts.map(presentPost) });
  } catch (error) {
    return sendError(res, error, "getSocialPosts");
  }
};

/**
 * @param {object} body
 */
function readPostBody(body) {
  const clientId = asObjectId(body.clientId);
  if (!clientId) {
    const error = new Error("Choose a client");
    error.statusCode = 400;
    throw error;
  }
  const content = String(body.content || "").trim();
  if (!content || content.length > 5000) {
    const error = new Error("Write the post content");
    error.statusCode = 400;
    throw error;
  }
  const title = String(body.title || "").trim().slice(0, 160) || content.split("\n")[0].slice(0, 160);
  return {
    clientId,
    title,
    content,
    platforms: normalizePlatforms(body.platforms),
    mediaUrl: cleanHttpsUrl(body.mediaUrl),
  };
}

export const createSocialPost = async (req, res) => {
  try {
    const body = readPostBody(req.body);
    const client = await Client.findById(body.clientId).select("_id");
    if (!client) return res.status(404).json({ success: false, error: "Client not found" });
    const next = initialPostStatus(req.body.action || "draft", req.body.scheduledAt);
    if (next.error) return res.status(400).json({ success: false, error: next.error });
    const post = await SocialPost.create({
      ...body,
      client: body.clientId,
      status: next.status,
      scheduledAt: next.scheduledAt,
      publishedAt: next.publishedAt,
      createdBy: req.user?._id,
    });
    const saved = await SocialPost.findById(post._id).populate("client", "name serviceCompany company").lean();
    return res.status(201).json({ success: true, data: presentPost(saved) });
  } catch (error) {
    return sendError(res, error, "createSocialPost");
  }
};

export const updateSocialPost = async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });
    if (post.status === "published") {
      if (req.body.metrics) {
        const current = typeof post.metrics?.toObject === "function" ? post.metrics.toObject() : { ...(post.metrics || {}) };
        delete current._id;
        post.metrics = { ...current, ...sanitizeMetrics(req.body.metrics) };
      }
      await post.save();
    } else {
      const body = readPostBody({ ...post.toObject(), ...req.body, clientId: req.body.clientId || post.client });
      const client = await Client.findById(body.clientId).select("_id");
      if (!client) return res.status(404).json({ success: false, error: "Client not found" });
      post.client = body.clientId;
      post.title = body.title;
      post.content = body.content;
      post.platforms = body.platforms;
      post.mediaUrl = body.mediaUrl;
      if (req.body.scheduledAt) {
        const when = new Date(req.body.scheduledAt);
        if (Number.isNaN(when.getTime())) {
          return res.status(400).json({ success: false, error: "Choose a valid schedule date" });
        }
        post.scheduledAt = when;
      }
      if (req.body.metrics) post.metrics = sanitizeMetrics(req.body.metrics);
      await post.save();
    }
    const saved = await SocialPost.findById(post._id).populate("client", "name serviceCompany company").lean();
    return res.json({ success: true, data: presentPost(saved) });
  } catch (error) {
    return sendError(res, error, "updateSocialPost");
  }
};

export const actOnSocialPost = async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });
    const next = resolvePostAction(post, req.params.action, {
      note: req.body?.note,
      scheduledAt: req.body?.scheduledAt,
    });
    if (next.error) return res.status(400).json({ success: false, error: next.error });
    if (next.status) post.status = next.status;
    if (next.scheduledAt) post.scheduledAt = next.scheduledAt;
    if (next.publishedAt) post.publishedAt = next.publishedAt;
    if (next.approvalNote != null) post.approvalNote = next.approvalNote;
    if (next.approvedAt) {
      post.approvedAt = next.approvedAt;
      post.approvedBy = req.user?._id;
    }
    await post.save();
    const saved = await SocialPost.findById(post._id).populate("client", "name serviceCompany company").lean();
    return res.json({ success: true, data: presentPost(saved) });
  } catch (error) {
    return sendError(res, error, "actOnSocialPost");
  }
};

export const getSocialOverview = async (req, res) => {
  try {
    const clientFilter = await companyClientFilter(req);
    const now = new Date();
    const start = new Date(now.getTime() - 30 * DAY_MS);
    const previous = new Date(now.getTime() - 60 * DAY_MS);
    const countPosts = (status, from, to) => SocialPost.countDocuments({
      ...clientFilter,
      ...(status ? { status } : {}),
      createdAt: { $gte: from, $lt: to },
    });
    const [
      connectedAccounts,
      scheduledPosts,
      pendingApproval,
      publishedPosts,
      accountsNow,
      accountsPrev,
      scheduledNow,
      scheduledPrev,
      pendingNow,
      pendingPrev,
      publishedNow,
      publishedPrev,
      recent,
      rangePosts,
      platformGroups,
      clientGroups,
    ] = await Promise.all([
      SocialAccount.countDocuments({ ...clientFilter, status: "connected" }),
      SocialPost.countDocuments({ ...clientFilter, status: "scheduled" }),
      SocialPost.countDocuments({ ...clientFilter, status: { $in: ["pending", "changes_requested"] } }),
      SocialPost.countDocuments({ ...clientFilter, status: "published" }),
      SocialAccount.countDocuments({ ...clientFilter, status: "connected", createdAt: { $gte: start, $lt: now } }),
      SocialAccount.countDocuments({ ...clientFilter, status: "connected", createdAt: { $gte: previous, $lt: start } }),
      countPosts("scheduled", start, now),
      countPosts("scheduled", previous, start),
      countPosts("pending", start, now),
      countPosts("pending", previous, start),
      countPosts("published", start, now),
      countPosts("published", previous, start),
      SocialPost.find(clientFilter)
        .populate("client", "name serviceCompany company")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      SocialPost.find({
        ...clientFilter,
        $or: [
          { publishedAt: { $gte: start, $lte: now } },
          { scheduledAt: { $gte: start, $lte: now } },
        ],
      }).select("status publishedAt scheduledAt").lean(),
      SocialAccount.aggregate([
        { $match: { ...clientFilter, status: "connected" } },
        { $group: { _id: "$platform", count: { $sum: 1 } } },
      ]),
      SocialPost.aggregate([
        { $match: clientFilter },
        {
          $group: {
            _id: "$client",
            scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
            published: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
            pending: {
              $sum: {
                $cond: [{ $in: ["$status", ["pending", "changes_requested"]] }, 1, 0],
              },
            },
          },
        },
        { $sort: { published: -1, scheduled: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const publishing = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
      const key = dayKey(new Date(now.getTime() - offset * DAY_MS));
      publishing.push({ date: key, published: 0, scheduled: 0, failed: 0 });
    }
    const byDate = new Map(publishing.map((row) => [row.date, row]));
    rangePosts.forEach((post) => {
      const stamp = post.status === "published" ? post.publishedAt : post.scheduledAt;
      const row = stamp ? byDate.get(dayKey(stamp)) : null;
      if (!row) return;
      if (post.status === "published") row.published += 1;
      else if (post.status === "failed") row.failed += 1;
      else row.scheduled += 1;
    });

    const platformCounts = new Map(platformGroups.map((row) => [row._id, row.count]));
    const clients = await Client.find({ _id: { $in: clientGroups.map((row) => row._id) } })
      .select("name")
      .lean();
    const clientNames = new Map(clients.map((client) => [String(client._id), client.name]));
    const accountCounts = await SocialAccount.aggregate([
      { $match: { client: { $in: clientGroups.map((row) => row._id) }, status: "connected" } },
      { $group: { _id: "$client", count: { $sum: 1 } } },
    ]);
    const connectedByClient = new Map(accountCounts.map((row) => [String(row._id), row.count]));

    return res.json({
      success: true,
      data: {
        counts: { connectedAccounts, scheduledPosts, pendingApproval, publishedPosts },
        deltas: {
          connectedAccounts: percentChange(accountsNow, accountsPrev),
          scheduledPosts: percentChange(scheduledNow, scheduledPrev),
          pendingApproval: percentChange(pendingNow, pendingPrev),
          publishedPosts: percentChange(publishedNow, publishedPrev),
        },
        platforms: SOCIAL_PLATFORMS.map((item) => ({
          id: item.id,
          label: item.label,
          accounts: platformCounts.get(item.id) || 0,
        })),
        publishing,
        recentPosts: recent.map(presentPost),
        clients: clientGroups.map((row) => ({
          id: row._id,
          name: clientNames.get(String(row._id)) || "Client",
          connected: connectedByClient.get(String(row._id)) || 0,
          scheduled: row.scheduled,
          published: row.published,
          pending: row.pending,
        })),
      },
    });
  } catch (error) {
    return sendError(res, error, "getSocialOverview");
  }
};

export const getSocialAnalytics = async (req, res) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const clientFilter = await companyClientFilter(req);
    const now = new Date();
    const start = new Date(now.getTime() - days * DAY_MS);
    const posts = await SocialPost.find({
      ...clientFilter,
      createdAt: { $gte: start, $lte: now },
    }).populate("client", "name serviceCompany company").lean();
    const accounts = await SocialAccount.find({ ...clientFilter, status: "connected" })
      .select("platform followers")
      .lean();

    const byPlatform = SOCIAL_PLATFORMS.map((item) => ({
      id: item.id,
      label: item.label,
      posts: posts.filter((post) => post.platforms?.includes(item.id)).length,
    }));
    const publishing = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      publishing.push({ date: dayKey(new Date(now.getTime() - offset * DAY_MS)), published: 0, scheduled: 0, failed: 0 });
    }
    const byDate = new Map(publishing.map((row) => [row.date, row]));
    posts.forEach((post) => {
      const stamp = post.publishedAt || post.scheduledAt || post.createdAt;
      const row = byDate.get(dayKey(stamp));
      if (!row) return;
      if (post.status === "published") row.published += 1;
      else if (post.status === "failed") row.failed += 1;
      else if (post.status === "scheduled") row.scheduled += 1;
    });

    const withReach = posts.filter((post) => post.metrics?.reach != null);
    const withClicks = posts.filter((post) => post.metrics?.clicks != null);
    const withRate = posts.filter((post) => post.metrics?.engagementRate != null);
    const withFollowers = accounts.filter((account) => account.followers != null);
    const topPosts = [...posts]
      .filter((post) => post.status === "published")
      .sort((a, b) => (b.metrics?.reach || 0) - (a.metrics?.reach || 0) || new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, 6)
      .map(presentPost);

    return res.json({
      success: true,
      data: {
        days,
        counts: {
          posts: posts.length,
          published: posts.filter((post) => post.status === "published").length,
          scheduled: posts.filter((post) => post.status === "scheduled").length,
          pending: posts.filter((post) => post.status === "pending" || post.status === "changes_requested").length,
          failed: posts.filter((post) => post.status === "failed").length,
        },
        recorded: {
          reach: withReach.length ? withReach.reduce((sum, post) => sum + post.metrics.reach, 0) : null,
          clicks: withClicks.length ? withClicks.reduce((sum, post) => sum + post.metrics.clicks, 0) : null,
          engagementRate: withRate.length
            ? Math.round((withRate.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / withRate.length) * 10) / 10
            : null,
          followers: withFollowers.length
            ? withFollowers.reduce((sum, account) => sum + account.followers, 0)
            : null,
          followerAccounts: withFollowers.length,
        },
        byPlatform,
        publishing,
        topPosts,
      },
    });
  } catch (error) {
    return sendError(res, error, "getSocialAnalytics");
  }
};

export const getSocialSettings = async (req, res) => {
  try {
    const settings = await loadSettings();
    return res.json({ success: true, data: presentSettings(settings) });
  } catch (error) {
    return sendError(res, error, "getSocialSettings");
  }
};

export const updateSocialSettings = async (req, res) => {
  try {
    const settings = await loadSettings();
    const timezones = ["Asia/Kolkata", "UTC"];
    const queues = ["general", "client", "campaign"];
    const types = ["image", "video", "carousel", "text"];
    const workflows = ["internal", "client_approval"];
    if (!timezones.includes(req.body.timezone)) {
      return res.status(400).json({ success: false, error: "Choose a supported timezone" });
    }
    if (!queues.includes(req.body.contentQueue) || !types.includes(req.body.defaultPostType) || !workflows.includes(req.body.workflow)) {
      return res.status(400).json({ success: false, error: "Check the publishing defaults" });
    }
    settings.timezone = req.body.timezone;
    settings.contentQueue = req.body.contentQueue;
    settings.autoHashtags = Boolean(req.body.autoHashtags);
    settings.defaultPostType = req.body.defaultPostType;
    settings.workflow = req.body.workflow;
    await settings.save();
    return res.json({ success: true, data: presentSettings(settings) });
  } catch (error) {
    return sendError(res, error, "updateSocialSettings");
  }
};
