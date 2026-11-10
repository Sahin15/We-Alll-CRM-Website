import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.join(
  __dirname,
  "../src/models/salaryPreviewModel.js"
);

describe("salary preview regenerate ack preservation", () => {
  it("preserves acknowledgment when net salary unchanged on upsert", () => {
    const src = fs.readFileSync(modelPath, "utf8");
    const fnStart = src.indexOf("generatePreview = async");
    expect(fnStart).toBeGreaterThan(-1);
    const block = src.slice(fnStart, fnStart + 12000);
    expect(block).toMatch(/netUnchanged/);
    expect(block).toMatch(/acknowledgedBy/);
    expect(block).toMatch(/status = "acknowledged"/);
    expect(block).toMatch(/HR correction: Salary breakdown updated/);
  });
});
