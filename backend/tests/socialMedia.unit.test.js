import { describe, expect, it } from "@jest/globals";
import {
  dayKey,
  initialPostStatus,
  normalizePlatforms,
  percentChange,
  resolvePostAction,
  sanitizeMetrics,
  serviceCompanyFromFilter,
} from "../src/services/social/socialRules.js";

describe("social workspace rules", () => {
  it("keeps a single copy of each supported platform", () => {
    expect(normalizePlatforms(["instagram", "Instagram", "facebook"])).toEqual(["instagram", "facebook"]);
  });

  it("rejects an unknown platform", () => {
    expect(() => normalizePlatforms(["myspace"])).toThrow("supported platform");
  });

  it("maps the company chips onto the existing client companies", () => {
    expect(serviceCompanyFromFilter("we-alll")).toBe("We Alll");
    expect(serviceCompanyFromFilter("kolkata-digital")).toBe("Kolkata Digital");
    expect(serviceCompanyFromFilter("other")).toBe("");
  });

  it("does not invent a percentage when the previous period is empty", () => {
    expect(percentChange(4, 0)).toBeNull();
    expect(percentChange(12, 10)).toBe(20);
  });

  it("uses the India calendar day around midnight IST", () => {
    expect(dayKey(new Date("2026-01-14T18:29:00.000Z"))).toBe("2026-01-14");
    expect(dayKey(new Date("2026-01-14T18:30:00.000Z"))).toBe("2026-01-15");
  });

  it("requires a schedule date before a post can be scheduled", () => {
    expect(initialPostStatus("schedule", null).error).toMatch(/schedule date/);
    expect(initialPostStatus("draft").status).toBe("draft");
  });

  it("approves a pending post without changing it into a published result", () => {
    const next = resolvePostAction({ status: "pending", scheduledAt: null }, "approve", {
      now: new Date("2026-10-28T08:00:00.000Z"),
    });
    expect(next.status).toBe("scheduled");
    expect(next.publishedAt).toBeUndefined();
  });

  it("requires a note when changes are requested", () => {
    expect(resolvePostAction({ status: "pending" }, "request-changes").error).toMatch(/note/);
  });

  it("leaves recorded metrics empty when none were entered", () => {
    expect(sanitizeMetrics({})).toEqual({});
    expect(sanitizeMetrics({ reach: 1200, engagementRate: 8.25 }).reach).toBe(1200);
    expect(sanitizeMetrics({ reach: 1200, engagementRate: 8.25 }).engagementRate).toBe(8.3);
  });
});
