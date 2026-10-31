import crypto from "crypto";
import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { applyAttributionUpdate, buildNewLeadPayload, cursorForForm, sourceFromPlatform } from "../src/services/meta/metaLeadMapper.js";
import { encryptSecret, decryptSecret } from "../src/services/meta/tokenCrypto.js";
import {
  assertGraphUrl,
  isRetryableGraphFailure,
  redactSecrets,
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from "../src/services/meta/metaSecurity.js";
import {
  buildOAuthUrl,
  getCompanyScope,
  missingPermissions,
} from "../src/services/meta/metaConfig.js";
import { nextPageCursor } from "../src/services/meta/graphClient.js";
import {
  pickLeadAction,
  ratio,
  summarizeAdAccounts,
  summarizeCrmCounts,
  zonedDate,
} from "../src/services/meta/metaAnalytics.js";
import { classifyDelivery, extractLeadgenChanges } from "../src/services/meta/metaWebhookParse.js";
import { normalizeSelection, toPublicIntegration, webhookIntegrationQuery } from "../src/services/meta/metaIntegrationService.js";
import { namesLikelySameClient, resolveAccountPageIds } from "../src/services/meta/metaLeadDashboardService.js";

const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.unstable_mockModule("../src/models/leadModel.js", () => ({
  default: {
    findOne: mockFindOne,
    create: mockCreate,
  },
}));

const { upsertMetaLead } = await import("../src/services/meta/metaLeadStore.js");

describe("Meta token storage", () => {
  const previous = process.env.META_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.META_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("round-trips a token and does not store the plaintext", () => {
    const token = "EAA" + "B".repeat(40);
    const stored = encryptSecret(token);
    expect(stored).not.toContain(token);
    expect(stored.startsWith("v1:")).toBe(true);
    expect(decryptSecret(stored)).toBe(token);
  });

  it("redacts tokens from error text", () => {
    const text = redactSecrets("failed access_token=EAA1234567890abcdefEXTRA&client_secret=super");
    expect(text).not.toContain("EAA1234567890abcdefEXTRA");
    expect(text).not.toContain("super");
    expect(text).toContain("[redacted]");
  });

  afterAll(() => {
    process.env.META_TOKEN_ENCRYPTION_KEY = previous;
  });
});

describe("Meta OAuth and tenant scope", () => {
  const previousScope = process.env.COMPANY_SCOPE;

  it("builds an authorization URL without the app secret", () => {
    const url = buildOAuthUrl({
      appId: "123",
      redirectUri: "https://office.example.com/api/integrations/meta/oauth/callback",
      state: "ab".repeat(32),
      scopes: ["leads_retrieval", "pages_show_list"],
      reauth: true,
    });
    expect(url).toContain("client_id=123");
    expect(url).toContain("leads_retrieval");
    expect(url).not.toContain("client_secret");
    expect(url.startsWith("https://www.facebook.com/")).toBe(true);
  });

  it("scopes webhook lookup to this deployment and rejects non-numeric page ids", () => {
    process.env.COMPANY_SCOPE = "We Alll UAT";
    expect(getCompanyScope()).toBe("we-alll-uat");
    expect(webhookIntegrationQuery("12345").companyScope).toBe("we-alll-uat");
    expect(webhookIntegrationQuery("not-a-page")).toBeNull();
    process.env.COMPANY_SCOPE = previousScope;
  });

  it("rejects Pages that were not returned for this connection", () => {
    const integration = {
      pages: [{ pageId: "10" }],
      forms: [{ formId: "20", pageId: "10" }],
      adAccounts: [{ accountId: "act_30" }],
    };
    expect(() => normalizeSelection(integration, { pageIds: ["999"], formIds: [], adAccountIds: [] })).toThrow(
      /not authorized/
    );
    expect(normalizeSelection(integration, { pageIds: ["10"], formIds: ["20"], adAccountIds: ["act_30"] })).toEqual({
      pageIds: ["10"],
      formIds: ["20"],
      adAccountIds: ["act_30"],
    });
  });

  it("does not return tokens in the public integration payload", () => {
    const secret = "EAA" + "C".repeat(30);
    const pub = toPublicIntegration({
      _id: "1",
      companyScope: "wealll",
      status: "connected",
      userTokenEnc: `v1:secret:${secret}`,
      pages: [{ pageId: "1", pageName: "Page", accessTokenEnc: secret, selected: true }],
      forms: [],
      adAccounts: [],
    });
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("accessTokenEnc");
    expect(serialized).not.toContain("userTokenEnc");
    expect(pub.pages[0].hasPageToken).toBe(true);
  });
});

describe("Meta webhooks", () => {
  it("accepts the verification challenge only with the configured token", () => {
    expect(verifyWebhookChallenge({
      mode: "subscribe",
      token: "expected",
      challenge: "98765",
      expected: "expected",
    })).toEqual({ ok: true, challenge: "98765" });
    expect(verifyWebhookChallenge({
      mode: "subscribe",
      token: "wrong",
      challenge: "98765",
      expected: "expected",
    }).ok).toBe(false);
  });

  it("verifies the SHA-256 signature against the raw body", () => {
    const body = Buffer.from('{"object":"page"}');
    const digest = crypto.createHmac("sha256", "app-secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, `sha256=${digest}`, "app-secret")).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${digest}`, "other-secret")).toBe(false);
    expect(verifyWebhookSignature(undefined, `sha256=${digest}`, "app-secret")).toBe(false);
  });

  it("treats a repeated leadgen delivery as a duplicate and ignores other fields", () => {
    const payload = {
      object: "page",
      entry: [{
        id: "55",
        changes: [
          { field: "feed", value: { leadgen_id: "1" } },
          { field: "leadgen", value: { leadgen_id: "99", page_id: "55", form_id: "77" } },
        ],
      }],
    };
    expect(extractLeadgenChanges(payload)).toEqual([{ leadgenId: "99", pageId: "55", formId: "77" }]);
    expect(classifyDelivery({ status: "processed" })).toBe("duplicate");
    expect(classifyDelivery({ status: "failed", attempts: 2, updatedAt: new Date(Date.now() - 60000) })).toBe("retry");
    expect(classifyDelivery({ status: "failed", attempts: 5 })).toBe("exhausted");
  });
});

describe("Meta lead mapping", () => {
  it("creates a New lead and does not mark it qualified", () => {
    const payload = buildNewLeadPayload({
      companyScope: "wealll",
      pageId: "55",
      pageName: "We Alll",
      formId: "77",
      formName: "Quote",
      graphLead: {
        id: "99",
        created_time: "2026-10-01T10:00:00+0000",
        platform: "ig",
        campaign_name: "October",
        field_data: [
          { name: "full_name", values: ["Asha Roy"] },
          { name: "email", values: ["asha@example.com"] },
          { name: "phone_number", values: ["+91 98765 43210"] },
          { name: "city", values: ["Kolkata"] },
        ],
      },
    });
    expect(payload.status).toBe("New");
    expect(payload.source).toBe("Instagram");
    expect(payload.fullName).toBe("Asha Roy");
    expect(payload.phone).toBe(9876543210);
    expect(payload.meta.leadId).toBe("99");
    expect(payload.meta.city).toBe("Kolkata");
    expect(payload.assignedTo).toBeUndefined();
  });

  it("refreshes attribution without changing CRM-owned fields", () => {
    const lead = {
      status: "Qualified",
      notes: "Called yesterday",
      assignedTo: "owner",
      fullName: "Asha Roy",
      email: "asha@example.com",
      phone: 9876543210,
      followUps: [{ followUpType: "Call" }],
      meetings: [],
      history: [{ actionType: "Created" }],
      contacts: [{ type: "Email", value: "asha@example.com" }],
      temperature: "Warm",
      meta: { leadId: "99", importedAt: new Date("2026-10-01T00:00:00Z") },
    };
    applyAttributionUpdate(lead, {
      leadId: "100",
      status: "New",
      notes: "overwrite",
      campaignName: "October",
      companyScope: "wealll",
    });
    expect(lead.status).toBe("Qualified");
    expect(lead.notes).toBe("Called yesterday");
    expect(lead.assignedTo).toBe("owner");
    expect(lead.fullName).toBe("Asha Roy");
    expect(lead.followUps).toHaveLength(1);
    expect(lead.meta.leadId).toBe("99");
    expect(lead.meta.campaignName).toBe("October");
  });

  it("updates an existing Meta lead instead of creating another", async () => {
    const existing = {
      _id: "lead-1",
      status: "Won",
      notes: "Customer",
      assignedTo: "owner",
      fullName: "Asha Roy",
      meta: { leadId: "99" },
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValueOnce(existing);
    const result = await upsertMetaLead({
      companyScope: "wealll",
      graphLead: {
        id: "99",
        platform: "fb",
        field_data: [{ name: "full_name", values: ["Changed Name"] }],
      },
    });
    expect(result).toEqual({ action: "updated", leadId: "lead-1" });
    expect(existing.status).toBe("Won");
    expect(existing.fullName).toBe("Asha Roy");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("maps Instagram separately from Facebook", () => {
    expect(sourceFromPlatform("ig").source).toBe("Instagram");
    expect(sourceFromPlatform("fb").source).toBe("Facebook");
  });
});

describe("Meta sync recovery", () => {
  it("resumes an incremental cursor and restarts a full sync", () => {
    const cursors = [{ formId: "7", after: "cursor-1", done: false }];
    expect(cursorForForm(cursors, "7", true)).toEqual({ after: "cursor-1", skip: false });
    expect(cursorForForm([{ formId: "7", done: true }], "7", true).skip).toBe(true);
    expect(cursorForForm(cursors, "7", false)).toEqual({ after: null, skip: false });
  });

  it("does not follow a non-Graph paging URL", () => {
    const seen = new Set();
    const next = nextPageCursor({
      data: [{ id: "1" }],
      paging: { cursors: { after: "cursor-2" }, next: "https://evil.example/steal" },
    }, "", seen);
    expect(next).toBe("cursor-2");
    expect(() => assertGraphUrl("http://169.254.169.254/latest/meta-data")).toThrow(/non-HTTPS/);
    expect(() => assertGraphUrl("https://evil.example/graph")).toThrow(/non-Graph/);
    expect(isRetryableGraphFailure(429, undefined)).toBe(true);
    expect(isRetryableGraphFailure(400, 190)).toBe(false);
  });

  it("reports which requested permissions are missing", () => {
    expect(missingPermissions(["pages_show_list"], ["pages_show_list", "leads_retrieval"])).toEqual(["leads_retrieval"]);
  });
});

describe("Meta analytics", () => {
  it("uses the office timezone boundary and does not invent rates", () => {
    expect(zonedDate("2026-01-15", "Asia/Kolkata", false).toISOString()).toBe("2026-01-14T18:30:00.000Z");
    expect(ratio(1, 0)).toBeNull();
    const summary = summarizeCrmCounts({ total: 4, new: 2, qualified: 1, converted: 1, lost: 0 });
    expect(summary.qualificationRate).toBe(0.25);
    expect(summary.conversionRate).toBe(0.25);
    expect(summarizeCrmCounts({ total: 0 }).qualificationRate).toBeNull();
  });

  it("does not invent cost per lead when Meta omits lead actions or currencies differ", () => {
    expect(pickLeadAction([{ action_type: "link_click", value: "4" }])).toBeNull();
    const missing = summarizeAdAccounts([
      { currency: "INR", spend: 100, impressions: 10, clicks: 2, leadAction: null },
    ]);
    expect(missing.available).toBe(true);
    expect(missing.spend).toBe(100);
    expect(missing.costPerLead).toBeNull();
    expect(missing.costPerLeadReason).toMatch(/did not return a lead action/);

    const mixed = summarizeAdAccounts([
      { currency: "INR", spend: 100, impressions: 10, clicks: 1, leadAction: { actionType: "lead", count: 2 } },
      { currency: "USD", spend: 50, impressions: 5, clicks: 1, leadAction: { actionType: "lead", count: 1 } },
    ]);
    expect(mixed.spend).toBeNull();
    expect(mixed.costPerLead).toBeNull();
    expect(mixed.impressions).toBe(15);
  });
});

describe("Meta ad account page resolution", () => {
  it("matches selected Pages by name when no explicit mapping exists", () => {
    const pages = [
      { pageId: "111", pageName: "Jayita Makeover", selected: true },
      { pageId: "222", pageName: "Other Brand", selected: true },
    ];
    expect(resolveAccountPageIds({ name: "jayita makeover", pageIds: [] }, pages)).toEqual(["111"]);
  });

  it("matches when only a distinctive shared token overlaps (jayita vs jotyita)", () => {
    expect(namesLikelySameClient("jayita makeover", "Jotyita Makeover Studio")).toBe(true);
  });
});
