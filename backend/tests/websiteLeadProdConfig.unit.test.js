import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  validateWebsiteLeadProductionConfig,
  getWebsiteLeadAllowedOrigins,
} from "../src/middleware/websiteLeadMiddleware.js";

describe("website lead production config", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  beforeEach(() => {
    delete process.env.WEBSITE_LEAD_ALLOWED_ORIGINS;
    delete process.env.APP_ENV;
    process.env.NODE_ENV = "test";
  });

  it("allows unset allowlist outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.APP_ENV = "development";
    expect(validateWebsiteLeadProductionConfig().ok).toBe(true);
    expect(getWebsiteLeadAllowedOrigins().length).toBeGreaterThan(0);
  });

  it("fails production when WEBSITE_LEAD_ALLOWED_ORIGINS is missing", () => {
    process.env.APP_ENV = "production";
    process.env.NODE_ENV = "production";
    const result = validateWebsiteLeadProductionConfig();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/must be set/i);
  });

  it("fails production when allowlist includes localhost", () => {
    process.env.APP_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.WEBSITE_LEAD_ALLOWED_ORIGINS =
      "https://wealll.com,http://localhost";
    const result = validateWebsiteLeadProductionConfig();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/localhost/i);
  });

  it("passes production with marketing origins only", () => {
    process.env.APP_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.WEBSITE_LEAD_ALLOWED_ORIGINS =
      "https://wealll.com,https://www.wealll.com";
    expect(validateWebsiteLeadProductionConfig().ok).toBe(true);
    expect(getWebsiteLeadAllowedOrigins()).toEqual([
      "https://wealll.com",
      "https://www.wealll.com",
    ]);
  });

  it("UAT (APP_ENV=uat) keeps localhost-capable defaults without hard fail", () => {
    process.env.APP_ENV = "uat";
    process.env.NODE_ENV = "production";
    delete process.env.WEBSITE_LEAD_ALLOWED_ORIGINS;
    expect(validateWebsiteLeadProductionConfig().ok).toBe(true);
  });
});
