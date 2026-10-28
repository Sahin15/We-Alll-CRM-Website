import { normalizeLeadPhone } from "../../utils/normalizeLeadPhone.js";

const NAME_KEYS = ["full_name", "fullname", "name"];
const EMAIL_KEYS = ["email", "email_address"];
const PHONE_KEYS = ["phone_number", "phone", "mobile_number"];
const CITY_KEYS = ["city", "town"];
const COMPANY_KEYS = ["company_name", "company"];

/**
 * @param {Array<{ name?: string, values?: string[] }>|undefined} fieldData
 * @param {string[]} keys
 * @returns {string}
 */
export function readField(fieldData, keys) {
  const rows = Array.isArray(fieldData) ? fieldData : [];
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const row of rows) {
    if (!wanted.has(String(row?.name || "").toLowerCase())) continue;
    const values = Array.isArray(row.values) ? row.values : [];
    const text = values.map((value) => String(value || "").trim()).filter(Boolean).join(", ");
    if (text) return text.slice(0, 500);
  }
  return "";
}

/**
 * @param {string|undefined} platform
 * @returns {{ source: "Facebook"|"Instagram", platform: "facebook"|"instagram"|"unknown" }}
 */
export function sourceFromPlatform(platform) {
  const value = String(platform || "").toLowerCase();
  if (value.includes("ig") || value.includes("instagram")) {
    return { source: "Instagram", platform: "instagram" };
  }
  if (value.includes("fb") || value.includes("facebook") || !value) {
    return { source: "Facebook", platform: value ? "facebook" : "unknown" };
  }
  return { source: "Facebook", platform: "unknown" };
}

/**
 * @param {Array<{ name?: string, values?: unknown[] }>|undefined} fieldData
 * @returns {{ name: string, values: string[] }[]}
 */
export function sanitizeFieldData(fieldData) {
  if (!Array.isArray(fieldData)) return [];
  return fieldData.slice(0, 50).map((row) => ({
    name: String(row?.name || "").slice(0, 120),
    values: (Array.isArray(row?.values) ? row.values : []).slice(0, 20).map((value) => String(value ?? "").slice(0, 2000)),
  })).filter((row) => row.name);
}

/**
 * @param {object} input
 * @param {object} input.graphLead
 * @param {string} input.companyScope
 * @param {string} [input.pageId]
 * @param {string} [input.pageName]
 * @param {string} [input.formId]
 * @param {string} [input.formName]
 * @returns {object}
 */
export function buildAttribution(input) {
  const graphLead = input.graphLead || {};
  const fieldData = sanitizeFieldData(graphLead.field_data);
  const mapped = sourceFromPlatform(graphLead.platform);
  const created = graphLead.created_time ? new Date(graphLead.created_time) : null;
  return {
    companyScope: input.companyScope,
    leadId: String(graphLead.id || ""),
    pageId: String(input.pageId || ""),
    pageName: String(input.pageName || "").slice(0, 200),
    formId: String(graphLead.form_id || input.formId || ""),
    formName: String(input.formName || "").slice(0, 200),
    platform: mapped.platform,
    sourcePlatform: String(graphLead.platform || "").slice(0, 40),
    campaignId: String(graphLead.campaign_id || ""),
    campaignName: String(graphLead.campaign_name || "").slice(0, 300),
    adsetId: String(graphLead.adset_id || ""),
    adsetName: String(graphLead.adset_name || "").slice(0, 300),
    adId: String(graphLead.ad_id || ""),
    adName: String(graphLead.ad_name || "").slice(0, 300),
    createdTime: created && !Number.isNaN(created.getTime()) ? created : new Date(),
    isOrganic: Boolean(graphLead.is_organic),
    fieldData,
    city: readField(fieldData, CITY_KEYS),
    rawPhone: readField(fieldData, PHONE_KEYS).slice(0, 40),
    lastSyncedAt: new Date(),
  };
}

/**
 * Keep CRM-owned fields. Attribution is nested under meta only.
 * @param {object} lead
 * @param {object} attribution
 * @returns {object}
 */
export function applyAttributionUpdate(lead, attribution) {
  const preserved = {
    status: lead.status,
    notes: lead.notes,
    assignedTo: lead.assignedTo,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    followUps: lead.followUps,
    meetings: lead.meetings,
    history: lead.history,
    contacts: lead.contacts,
    temperature: lead.temperature,
  };
  const leadId = lead.meta?.leadId || attribution.leadId;
  lead.meta = {
    ...(lead.meta || {}),
    ...attribution,
    leadId,
    importedAt: lead.meta?.importedAt || attribution.lastSyncedAt,
  };
  Object.assign(lead, preserved);
  return lead;
}

/**
 * @param {object} input
 * @param {object} input.graphLead
 * @param {string} input.companyScope
 * @param {import("mongoose").Types.ObjectId|string} [input.integrationId]
 * @param {string} [input.pageId]
 * @param {string} [input.pageName]
 * @param {string} [input.formId]
 * @param {string} [input.formName]
 * @param {import("mongoose").Types.ObjectId|string} [input.performedBy]
 * @returns {object}
 */
export function buildNewLeadPayload(input) {
  const attribution = buildAttribution(input);
  const fieldData = attribution.fieldData;
  const first = readField(fieldData, ["first_name"]);
  const last = readField(fieldData, ["last_name"]);
  const combined = [first, last].filter(Boolean).join(" ").trim();
  const mapped = sourceFromPlatform(input.graphLead?.platform);
  const fullName = readField(fieldData, NAME_KEYS) || combined || `${mapped.source} lead`;
  const email = readField(fieldData, EMAIL_KEYS).toLowerCase();
  const rawPhone = attribution.rawPhone;
  const phoneResult = rawPhone ? normalizeLeadPhone(rawPhone) : { ok: false };
  const companyName = readField(fieldData, COMPANY_KEYS);
  const contacts = [];
  if (email) {
    contacts.push({
      name: fullName,
      type: "Email",
      value: email,
      label: "Primary",
      isPrimary: true,
    });
  }
  if (rawPhone) {
    contacts.push({
      name: fullName,
      type: "Phone",
      value: rawPhone,
      label: "Primary",
      isPrimary: !email,
    });
  }

  const lines = [
    `Imported from Meta Lead Ads (${mapped.source}).`,
    attribution.pageName ? `Page: ${attribution.pageName}` : "",
    attribution.formName ? `Form: ${attribution.formName}` : "",
    attribution.city ? `City: ${attribution.city}` : "",
  ].filter(Boolean);

  const payload = {
    fullName: fullName.slice(0, 200),
    source: mapped.source,
    status: "New",
    notes: lines.join("\n"),
    contacts,
    meta: {
      ...attribution,
      integrationId: input.integrationId,
      importedAt: new Date(),
    },
    history: [
      {
        actionType: "Created",
        description: `Imported from Meta Lead Ads (${mapped.source})`,
        performedBy: input.performedBy || undefined,
        timestamp: new Date(),
      },
    ],
  };

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) payload.email = email;
  if (phoneResult.ok) payload.phone = phoneResult.phoneNumber;
  if (companyName) payload.companyName = companyName.slice(0, 200);
  if (input.performedBy) payload.createdBy = input.performedBy;
  return payload;
}

/**
 * Resume or restart a form cursor.
 * @param {Array<{ formId: string, after?: string, done?: boolean }>|undefined} cursors
 * @param {string} formId
 * @param {boolean} incremental
 * @returns {{ after: string|null, skip: boolean }}
 */
export function cursorForForm(cursors, formId, incremental) {
  if (!incremental) return { after: null, skip: false };
  const row = (cursors || []).find((cursor) => cursor.formId === formId);
  if (row?.done) return { after: null, skip: true };
  return { after: row?.after || null, skip: false };
}
