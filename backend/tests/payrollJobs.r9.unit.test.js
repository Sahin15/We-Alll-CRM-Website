import { describe, it, expect } from "@jest/globals";
import {
  isValidPayrollJobType,
  summarizePayrollJobResult,
  createCaptureResponse,
  PAYROLL_JOB_TYPES,
  PAYROLL_JOB_STATUSES,
} from "../src/services/payroll/payrollJobService.js";

describe("payrollJobService (R9)", () => {
  it("exposes job types and statuses", () => {
    expect(PAYROLL_JOB_TYPES).toEqual(["bulk_generate", "bulk_email"]);
    expect(PAYROLL_JOB_STATUSES).toContain("queued");
    expect(PAYROLL_JOB_STATUSES).toContain("completed");
  });

  it("validates job types", () => {
    expect(isValidPayrollJobType("bulk_generate")).toBe(true);
    expect(isValidPayrollJobType("bulk_email")).toBe(true);
    expect(isValidPayrollJobType("cron")).toBe(false);
  });

  it("summarizes controller results including skipped", () => {
    expect(
      summarizePayrollJobResult({
        summary: { total: 10, success: 7, failed: 1, skipped: 2 },
      })
    ).toEqual({ total: 10, success: 7, failed: 1, skipped: 2 });
  });

  it("capture response records status and json body", () => {
    const res = createCaptureResponse();
    res.status(202).json({ ok: true });
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true });
  });
});
