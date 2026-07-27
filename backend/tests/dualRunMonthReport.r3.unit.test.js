import { describe, it, expect } from "@jest/globals";
import {
  parseDualRunMonthOptions,
  shapeDualRunMonthResults,
  dualRunMonthRowsToCsv,
} from "../src/services/payroll/dualRunMonthReport.js";

describe("dualRunMonthReport (R3)", () => {
  const sampleRows = [
    {
      employeeId: "a",
      withinTolerance: true,
      netDiff: 0,
      v1Net: 100,
      v2Net: 100,
    },
    {
      employeeId: "b",
      withinTolerance: false,
      netDiff: -50,
      v1Net: 200,
      v2Net: 150,
    },
    {
      employeeId: "c",
      withinTolerance: false,
      netDiff: 10,
      v1Net: 90,
      v2Net: 100,
    },
    { employeeId: "d", error: "no structure" },
  ];

  it("parses format and mismatchesOnly from query or body", () => {
    expect(parseDualRunMonthOptions({ query: {}, body: {} })).toEqual({
      format: "json",
      mismatchesOnly: false,
    });
    expect(
      parseDualRunMonthOptions({
        query: { format: "csv", mismatchesOnly: "true" },
        body: {},
      })
    ).toEqual({ format: "csv", mismatchesOnly: true });
    expect(
      parseDualRunMonthOptions({
        query: {},
        body: { format: "CSV", mismatchesOnly: 1 },
      })
    ).toEqual({ format: "csv", mismatchesOnly: true });
  });

  it("filters mismatchesOnly and sorts by |netDiff| (errors first)", () => {
    const shaped = shapeDualRunMonthResults(sampleRows, {
      mismatchesOnly: true,
    });
    expect(shaped.map((r) => r.employeeId)).toEqual(["d", "b", "c"]);
    expect(shaped.every((r) => r.error || r.withinTolerance === false)).toBe(
      true
    );
  });

  it("keeps matches when mismatchesOnly is false but still sorts", () => {
    const shaped = shapeDualRunMonthResults(sampleRows, {
      mismatchesOnly: false,
    });
    expect(shaped[0].employeeId).toBe("d");
    expect(shaped[1].employeeId).toBe("b");
    expect(shaped.map((r) => r.employeeId)).toContain("a");
  });

  it("builds CSV with full-month summary comment and triage columns", () => {
    const summary = { total: 4, matched: 1, mismatched: 2, failed: 1 };
    const shaped = shapeDualRunMonthResults(sampleRows, {
      mismatchesOnly: true,
    });
    const csv = dualRunMonthRowsToCsv(summary, shaped);
    expect(csv.startsWith("# dual-run-month total=4 matched=1 mismatched=2 failed=1")).toBe(
      true
    );
    expect(csv).toContain(
      "employeeId,withinTolerance,v1Net,v2Net,netDiff,error"
    );
    expect(csv).toContain("b,false,200,150,-50,");
    expect(csv).toContain("d,,,,");
    expect(csv).toContain("no structure");
    expect(csv).not.toContain("\na,true,");
  });
});
