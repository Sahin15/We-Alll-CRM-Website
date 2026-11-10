import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerPath = path.join(
  __dirname,
  "../src/controllers/salarySlipController.js"
);

describe("salarySlipController payment date hygiene", () => {
  it("does not use off-by-one new Date(year, month, 1) for paymentDate", () => {
    const src = fs.readFileSync(controllerPath, "utf8");
    expect(src).not.toMatch(/paymentDate: paymentDate \|\| new Date\(year, month, 1\)/);
    expect(src).toContain("resolveSlipPaymentDate");
  });
});
