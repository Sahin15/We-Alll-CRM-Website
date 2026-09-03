import { describe, it, expect } from "@jest/globals";
import { escapeCsvField, rowsToCsv } from "../src/services/payroll/reporting/csvUtils.js";
import {
  buildGenericBankCsv,
  getBankExportFormat,
  listBankExportFormats,
} from "../src/services/payroll/reporting/bankExportFormats.js";
import {
  buildPfRegister,
  buildTdsRegister,
  getComplianceRegisterBuilder,
} from "../src/services/payroll/reporting/complianceRegisterBuilders.js";
import {
  DEFAULT_BANK_EXPORT_STATUS,
  buildExportManifest,
  EXPORT_TYPES,
  REPORTING_LIFECYCLE_STATUSES,
} from "../src/services/payroll/reporting/exportManifest.js";

describe("csvUtils", () => {
  it("escapes quotes and commas", () => {
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(rowsToCsv(["a", "b"], [{ a: 1, b: "x,y" }])).toContain('"x,y"');
  });
});

describe("bankExportFormats", () => {
  it("registers generic_csv and lists formats", () => {
    expect(getBankExportFormat("generic_csv").id).toBe("generic_csv");
    expect(listBankExportFormats().some((f) => f.id === "generic_csv")).toBe(true);
    expect(() => getBankExportFormat("hdfc_neft")).toThrow(/Unknown bank export format/);
  });

  it("builds NEFT-ready rows and skips missing bank data", () => {
    const result = buildGenericBankCsv({
      slips: [
        {
          _id: "1",
          netSalary: 50000,
          month: 7,
          year: 2026,
          payPeriod: "July 2026",
          employee: {
            employeeId: "E1",
            name: "Ada",
            bankDetails: {
              accountNumber: "123",
              ifscCode: "HDFC0001",
              accountHolderName: "Ada Lovelace",
              bankName: "HDFC",
            },
          },
        },
        {
          _id: "2",
          netSalary: 100,
          employee: {
            employeeId: "E2",
            name: "No Bank",
            bankDetails: {},
          },
        },
      ],
    });

    expect(result.employeeCount).toBe(1);
    expect(result.totalAmount).toBe(50000);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("missing_account_number");
    expect(result.csv).toContain("Ada Lovelace");
    expect(result.csv).toContain("50000.00");
  });
});

describe("complianceRegisterBuilders", () => {
  it("builds PF and TDS registers", () => {
    const slips = [
      {
        month: 7,
        year: 2026,
        payPeriod: "July 2026",
        totalEarnings: 60000,
        earnings: { basicSalary: 30000 },
        deductions: { providentFund: 1800, tds: 2000 },
        ytd: { tds: 8000 },
        employee: {
          employeeId: "E1",
          name: "Ada",
          governmentIds: { uanNumber: "UAN1", panNumber: "ABCDE1234F" },
        },
      },
    ];

    const pf = buildPfRegister({ slips });
    expect(pf.employeeCount).toBe(1);
    expect(pf.totalAmount).toBe(1800);
    expect(pf.csv).toContain("UAN1");

    const tds = buildTdsRegister({ slips });
    expect(tds.totalAmount).toBe(2000);
    expect(tds.csv).toContain("ABCDE1234F");
    expect(getComplianceRegisterBuilder("esi").id).toBe("esi");
  });
});

describe("exportManifest", () => {
  it("defaults bank export to approved and documents lifecycle", () => {
    expect(DEFAULT_BANK_EXPORT_STATUS).toBe("approved");
    expect(REPORTING_LIFECYCLE_STATUSES).toContain("under_review");
    expect(REPORTING_LIFECYCLE_STATUSES).toContain("exported");
    expect(REPORTING_LIFECYCLE_STATUSES).toContain("reconciled");

    const manifest = buildExportManifest({
      exportType: EXPORT_TYPES.BANK_NEFT,
      month: 7,
      year: 2026,
      payrollStatusFilter: "approved",
      employeeCount: 2,
      totalAmount: 1000,
      generatedBy: "u1",
      fileLocation: "/uploads/payroll-exports/x.csv",
    });

    expect(manifest.payrollPeriod).toEqual({ month: 7, year: 2026 });
    expect(manifest.exportStatus).toBe("completed");
    expect(manifest.fileLocation).toContain("payroll-exports");
  });
});
