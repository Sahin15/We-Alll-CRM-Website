import { describe, it, expect, afterEach } from "@jest/globals";
import {
  isPayrollBulkApproveEnabled,
  isBulkApprovePrivilegedRole,
  assertBulkApproveAllowed,
  getBulkApproveCapabilities,
  BulkApproveForbiddenError,
} from "../src/services/payroll/bulkApproveGuard.js";

describe("PH-13 bulkApproveGuard", () => {
  const original = process.env.PAYROLL_ALLOW_BULK_APPROVE;

  afterEach(() => {
    if (original === undefined) delete process.env.PAYROLL_ALLOW_BULK_APPROVE;
    else process.env.PAYROLL_ALLOW_BULK_APPROVE = original;
  });

  it("is disabled by default", () => {
    delete process.env.PAYROLL_ALLOW_BULK_APPROVE;
    expect(isPayrollBulkApproveEnabled()).toBe(false);
    expect(getBulkApproveCapabilities({ role: "admin" }).bulkApproveAllowed).toBe(
      false
    );
  });

  it("allows only admin/superadmin when flag is on", () => {
    process.env.PAYROLL_ALLOW_BULK_APPROVE = "true";
    expect(isBulkApprovePrivilegedRole({ role: "admin" })).toBe(true);
    expect(isBulkApprovePrivilegedRole({ role: "superadmin" })).toBe(true);
    expect(isBulkApprovePrivilegedRole({ role: "hr" })).toBe(false);
    expect(isBulkApprovePrivilegedRole({ role: "accounts" })).toBe(false);
  });

  it("requires flag, role, confirmBypass, and reason", () => {
    delete process.env.PAYROLL_ALLOW_BULK_APPROVE;
    expect(() =>
      assertBulkApproveAllowed({
        user: { role: "admin" },
        confirmBypass: true,
        comments: "Emergency month close",
      })
    ).toThrow(BulkApproveForbiddenError);

    process.env.PAYROLL_ALLOW_BULK_APPROVE = "true";
    expect(() =>
      assertBulkApproveAllowed({
        user: { role: "hr" },
        confirmBypass: true,
        comments: "Emergency month close",
      })
    ).toThrow(/admin/);

    expect(() =>
      assertBulkApproveAllowed({
        user: { role: "admin" },
        confirmBypass: false,
        comments: "Emergency month close",
      })
    ).toThrow(/confirmBypass/);

    expect(() =>
      assertBulkApproveAllowed({
        user: { role: "admin" },
        confirmBypass: true,
        comments: "short",
      })
    ).toThrow(/reason/);

    expect(
      assertBulkApproveAllowed({
        user: { role: "admin" },
        confirmBypass: true,
        comments: "Emergency month close",
      })
    ).toBe(true);
  });
});
