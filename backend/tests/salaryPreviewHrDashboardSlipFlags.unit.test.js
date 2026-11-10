import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesPath = path.join(
  __dirname,
  "../src/routes/salaryPreviewRoutes.js"
);

describe("hr-dashboard slip flags", () => {
  it("attaches slip flags after live net batch", () => {
    const src = fs.readFileSync(routesPath, "utf8");
    const block = src.slice(
      src.indexOf("/hr-dashboard/:month/:year"),
      src.indexOf("/reconcile/:month/:year")
    );
    expect(block).toMatch(/attachSlipFlagsToPreviews/);
  });
});
