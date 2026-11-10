import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicePath = path.join(
  __dirname,
  "../src/services/salaryPreviewService.js"
);

describe("salary preview list performance hygiene", () => {
  it("getPreviewsForMonth does not sync and save each preview on list load", () => {
    const src = fs.readFileSync(servicePath, "utf8");
    const fnStart = src.indexOf("async getPreviewsForMonth");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBlock = src.slice(fnStart, fnStart + 1200);
    expect(fnBlock).not.toMatch(/syncSimplePreviewIfNeeded/);
    expect(fnBlock).toMatch(/options\.reconcile === true/);
  });

  it("getPreviewStatistics does not reconcile on every statistics call", () => {
    const src = fs.readFileSync(servicePath, "utf8");
    const fnStart = src.indexOf("async getPreviewStatistics");
    const fnBlock = src.slice(fnStart, fnStart + 400);
    expect(fnBlock).not.toMatch(/reconcilePendingQueriesForPeriod/);
  });
});
