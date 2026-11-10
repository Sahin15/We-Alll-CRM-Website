import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.join(__dirname, "../src/models/salaryPreviewModel.js");

describe("salary preview — no review deadline", () => {
  it("generatePreview does not set a 5-day reviewDeadline", () => {
    const src = fs.readFileSync(modelPath, "utf8");
    expect(src).not.toMatch(/setDate\(reviewDeadline\.getDate\(\) \+ 5\)/);
    expect(src).toMatch(/reviewDeadline: null/);
  });

  it("submitQuery does not block on isReviewExpired", () => {
    const src = fs.readFileSync(modelPath, "utf8");
    const submitStart = src.indexOf("submitQuery = async");
    expect(submitStart).toBeGreaterThan(-1);
    const block = src.slice(submitStart, submitStart + 800);
    expect(block).not.toMatch(/Review period has expired/);
  });
});
