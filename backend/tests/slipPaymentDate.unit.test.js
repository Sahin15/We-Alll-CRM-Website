import { describe, it, expect, afterEach } from "@jest/globals";
import {
  resolveSlipPaymentDate,
  formatSlipPaymentDateDisplay,
} from "../src/services/payroll/slipPaymentDate.js";

describe("slipPaymentDate", () => {
  const originalRequire = process.env.REQUIRE_PERIOD_PAYMENT_DATE;

  afterEach(() => {
    if (originalRequire === undefined) {
      delete process.env.REQUIRE_PERIOD_PAYMENT_DATE;
    } else {
      process.env.REQUIRE_PERIOD_PAYMENT_DATE = originalRequire;
    }
  });

  it("defaults October pay period to 1 Oct not 1 Nov (month index fix)", () => {
    const d = resolveSlipPaymentDate({ year: 2026, month: 10 });
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(1);
  });

  it("prefers explicit paymentDate over period", () => {
    const d = resolveSlipPaymentDate({
      year: 2026,
      month: 10,
      paymentDate: "2026-11-15T00:00:00.000Z",
      periodSalaryPaymentDate: new Date("2026-11-01"),
    });
    expect(d.toISOString()).toBe("2026-11-15T00:00:00.000Z");
  });

  it("uses period salaryPaymentDate when body omitted", () => {
    const d = resolveSlipPaymentDate({
      year: 2026,
      month: 10,
      periodSalaryPaymentDate: new Date("2026-11-15T12:00:00.000Z"),
    });
    expect(d.getTime()).toBe(new Date("2026-11-15T12:00:00.000Z").getTime());
  });

  it("throws when REQUIRE_PERIOD_PAYMENT_DATE and no dates", () => {
    process.env.REQUIRE_PERIOD_PAYMENT_DATE = "true";
    expect(() => resolveSlipPaymentDate({ year: 2026, month: 10 })).toThrow(
      /required/i
    );
  });

  it("formats with UTC date parts", () => {
    expect(
      formatSlipPaymentDateDisplay("2026-11-15T00:00:00.000Z", "en-IN")
    ).toMatch(/15/);
    expect(
      formatSlipPaymentDateDisplay("2026-11-15T00:00:00.000Z", "en-IN")
    ).toMatch(/2026/);
  });
});
