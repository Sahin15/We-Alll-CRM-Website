import { describe, it, expect } from "@jest/globals";
import {
  buildPayslipFileName,
  applyPayslipStorageToSlip,
} from "../src/services/payroll/payslipStorage.js";

describe("payslipStorage helpers", () => {
  it("builds stable payslip filenames", () => {
    expect(
      buildPayslipFileName({
        employee: { employeeId: "E001" },
        month: 7,
        year: 2026,
      })
    ).toBe("salary-slip-E001-7-2026.pdf");
  });

  it("applies storage metadata onto a slip object", () => {
    const slip = {};
    applyPayslipStorageToSlip(slip, {
      url: "https://bucket.s3.us-east-1.amazonaws.com/salary-slips/x.pdf",
      provider: "s3",
      key: "salary-slips/x.pdf",
      localPath: "/tmp/x.pdf",
      localRelativePath: "/uploads/salary-slips/x.pdf",
      generatedAt: new Date("2026-07-17T00:00:00.000Z"),
      generatedBy: "abc",
      version: 3,
      fallbackUsed: false,
      uploadError: null,
    });

    expect(slip.pdfUrl).toContain("amazonaws.com");
    expect(slip.pdfStorage).toMatchObject({
      provider: "s3",
      key: "salary-slips/x.pdf",
      path: "/uploads/salary-slips/x.pdf",
      generatedBy: "abc",
      version: 3,
    });
    expect(slip.pdfGeneratedAt).toBeInstanceOf(Date);
  });
});
