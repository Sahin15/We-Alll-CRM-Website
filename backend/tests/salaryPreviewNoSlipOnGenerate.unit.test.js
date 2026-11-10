import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const previewModelPath = path.join(
  __dirname,
  "../src/models/salaryPreviewModel.js"
);

describe("salary preview generate regression", () => {
  it("generatePreview static does not create SalarySlip records", () => {
    const src = fs.readFileSync(previewModelPath, "utf8");
    const staticStart = src.indexOf("generatePreview = async");
    expect(staticStart).toBeGreaterThan(-1);
    const staticBlock = src.slice(staticStart, staticStart + 6000);
    expect(staticBlock).not.toMatch(/SalarySlip\.create/);
    expect(staticBlock).not.toMatch(/new SalarySlip/);
  });
});
