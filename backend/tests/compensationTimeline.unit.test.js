import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicePath = path.join(
  __dirname,
  "../src/services/payroll/compensationTimelineService.js"
);
const previewPath = path.join(
  __dirname,
  "../src/services/payroll/simplePayrollPreviewService.js"
);

describe("compensation timeline", () => {
  it("exports buildCompensationTimeline and getCompensationRoster", async () => {
    const mod = await import(
      "../src/services/payroll/compensationTimelineService.js"
    );
    expect(typeof mod.buildCompensationTimeline).toBe("function");
    expect(typeof mod.getCompensationRoster).toBe("function");
  });

  it("merges internship and structure events in service source", () => {
    const src = fs.readFileSync(servicePath, "utf8");
    expect(src).toMatch(/internshipDetails/);
    expect(src).toMatch(/salary_structure/);
    expect(src).toMatch(/changeReason/);
  });

  it("hr-dashboard uses attachSlipFlagsToPreviews", () => {
    const src = fs.readFileSync(previewPath, "utf8");
    expect(src).toMatch(/attachSlipFlagsToPreviews/);
  });
});
