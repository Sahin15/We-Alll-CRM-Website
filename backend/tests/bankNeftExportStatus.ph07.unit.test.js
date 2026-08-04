import { describe, it, expect } from "@jest/globals";
import {
  BANK_NEFT_ALLOWED_STATUSES,
  DEFAULT_BANK_EXPORT_STATUS,
  BankExportStatusError,
  assertBankNeftExportStatus,
} from "../src/services/payroll/reporting/exportManifest.js";
import { getReportingCapabilities } from "../src/services/payroll/reporting/payrollReportService.js";

describe("PH-07 bank NEFT export status gate", () => {
  it("defaults bank export to approved", () => {
    expect(DEFAULT_BANK_EXPORT_STATUS).toBe("approved");
  });

  it("allows approved and V1 post-generate statuses", () => {
    for (const status of BANK_NEFT_ALLOWED_STATUSES) {
      expect(assertBankNeftExportStatus(status)).toBe(status);
    }
  });

  it("blocks draft and generated", () => {
    expect(() => assertBankNeftExportStatus("generated")).toThrow(
      BankExportStatusError
    );
    expect(() => assertBankNeftExportStatus("draft")).toThrow(
      BankExportStatusError
    );
    try {
      assertBankNeftExportStatus("generated");
    } catch (error) {
      expect(error.code).toBe("BANK_EXPORT_STATUS");
      expect(error.httpStatus).toBe(400);
      expect(error.details.allowedStatuses).toContain("approved");
      expect(error.details.allowedStatuses).not.toContain("generated");
    }
  });

  it("exposes allowed statuses on reporting capabilities", () => {
    const caps = getReportingCapabilities();
    expect(caps.defaultBankExportStatus).toBe("approved");
    expect(caps.bankExportAllowedStatuses).toEqual([
      ...BANK_NEFT_ALLOWED_STATUSES,
    ]);
    expect(caps.bankExportAllowedStatuses).not.toContain("generated");
    expect(caps.bankExportAllowedStatuses).not.toContain("draft");
  });
});
