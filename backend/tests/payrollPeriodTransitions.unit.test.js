import { describe, it, expect } from "@jest/globals";
import {
  PERIOD_STATUSES,
  canTransition,
  assertTransition,
  assertPeriodAction,
  getAllowedTransitions,
} from "../src/services/payroll/payrollPeriodTransitions.js";

describe("payrollPeriodTransitions", () => {
  it("exposes the four period statuses", () => {
    expect(PERIOD_STATUSES).toEqual(["open", "frozen", "locked", "paid"]);
  });

  it("allows open → frozen", () => {
    expect(canTransition("open", "frozen")).toBe(true);
  });

  it("allows frozen → open (unfreeze) and frozen → locked", () => {
    expect(canTransition("frozen", "open")).toBe(true);
    expect(canTransition("frozen", "locked")).toBe(true);
  });

  it("allows locked → paid and locked → frozen (unlock)", () => {
    expect(canTransition("locked", "paid")).toBe(true);
    expect(canTransition("locked", "frozen")).toBe(true);
  });

  it("rejects invalid jumps", () => {
    expect(canTransition("open", "locked")).toBe(false);
    expect(canTransition("open", "paid")).toBe(false);
    expect(canTransition("frozen", "paid")).toBe(false);
    expect(canTransition("paid", "open")).toBe(false);
    expect(canTransition("paid", "locked")).toBe(false);
  });

  it("lists allowed transitions from each status", () => {
    expect(getAllowedTransitions("open")).toEqual(["frozen"]);
    expect(getAllowedTransitions("frozen")).toEqual(["open", "locked"]);
    expect(getAllowedTransitions("locked")).toEqual(["frozen", "paid"]);
    expect(getAllowedTransitions("paid")).toEqual([]);
  });

  it("assertTransition throws on illegal transition", () => {
    expect(() => assertTransition("open", "locked")).toThrow(
      /Cannot transition payroll period from open to locked/
    );
  });

  it("assertTransition requires unlockReason when unlocking locked → frozen", () => {
    expect(() => assertTransition("locked", "frozen", {})).toThrow(
      /unlockReason is required/
    );
    expect(() =>
      assertTransition("locked", "frozen", { unlockReason: "  " })
    ).toThrow(/unlockReason is required/);
    expect(() =>
      assertTransition("locked", "frozen", { unlockReason: "Fix LOP" })
    ).not.toThrow();
  });

  it("assertTransition succeeds for legal transitions without extra fields", () => {
    expect(() => assertTransition("open", "frozen")).not.toThrow();
    expect(() => assertTransition("frozen", "locked")).not.toThrow();
    expect(() => assertTransition("locked", "paid")).not.toThrow();
  });

  it("assertPeriodAction enforces named action edges", () => {
    expect(assertPeriodAction("freeze", "open")).toEqual({ toStatus: "frozen" });
    expect(assertPeriodAction("lock", "frozen")).toEqual({ toStatus: "locked" });
    expect(() => assertPeriodAction("freeze", "locked")).toThrow(
      /Cannot freeze payroll period while status is locked/
    );
    expect(() => assertPeriodAction("unlock", "locked", {})).toThrow(
      /unlockReason is required/
    );
    expect(
      assertPeriodAction("unlock", "locked", { unlockReason: "Correction" })
    ).toEqual({ toStatus: "frozen" });
  });
});
