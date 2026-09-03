import { describe, it, expect, afterEach } from "@jest/globals";
import {
  DEFAULT_PAYROLL_JOB_STALE_MS,
  getPayrollJobStaleMs,
  isStaleRunningPayrollJob,
  resolvePayrollJobActivityAt,
  isValidPayrollJobType,
  summarizePayrollJobResult,
  createCaptureResponse,
  PAYROLL_JOB_TYPES,
  PAYROLL_JOB_STATUSES,
} from "../src/services/payroll/payrollJobService.js";

describe("payrollJobService (R9 + PH-09)", () => {
  const originalStale = process.env.PAYROLL_JOB_STALE_MS;

  afterEach(() => {
    if (originalStale === undefined) delete process.env.PAYROLL_JOB_STALE_MS;
    else process.env.PAYROLL_JOB_STALE_MS = originalStale;
  });

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

  it("defaults stale TTL to 15 minutes", () => {
    delete process.env.PAYROLL_JOB_STALE_MS;
    expect(getPayrollJobStaleMs()).toBe(DEFAULT_PAYROLL_JOB_STALE_MS);
    process.env.PAYROLL_JOB_STALE_MS = "30000";
    expect(getPayrollJobStaleMs()).toBe(DEFAULT_PAYROLL_JOB_STALE_MS);
    process.env.PAYROLL_JOB_STALE_MS = "120000";
    expect(getPayrollJobStaleMs()).toBe(120000);
  });

  it("detects stale running jobs from heartbeat/startedAt (PH-09)", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const staleMs = 15 * 60 * 1000;

    expect(
      isStaleRunningPayrollJob(
        {
          status: "running",
          heartbeatAt: new Date("2026-08-04T11:30:00.000Z"),
        },
        now,
        staleMs
      )
    ).toBe(true);

    expect(
      isStaleRunningPayrollJob(
        {
          status: "running",
          heartbeatAt: new Date("2026-08-04T11:50:00.000Z"),
        },
        now,
        staleMs
      )
    ).toBe(false);

    expect(
      resolvePayrollJobActivityAt({
        startedAt: new Date("2026-08-04T11:00:00.000Z"),
      }).toISOString()
    ).toBe("2026-08-04T11:00:00.000Z");

    expect(
      isStaleRunningPayrollJob({ status: "queued" }, now, staleMs)
    ).toBe(false);
  });
});
