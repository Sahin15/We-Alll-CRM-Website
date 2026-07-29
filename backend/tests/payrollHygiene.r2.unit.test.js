import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import NotificationService from "../src/services/notificationService.js";
import salaryStructureRoutes from "../src/routes/salaryStructureRoutes.js";
import salarySlipRoutes from "../src/routes/salarySlipRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {import("express").Router} router
 * @param {"get"|"post"|"put"|"delete"|"patch"} method
 * @returns {string[]}
 */
function routePaths(router, method) {
  return router.stack
    .filter((layer) => layer.route && layer.route.methods?.[method])
    .map((layer) => layer.route.path);
}

describe("R2 payroll hygiene", () => {
  it("does not register DELETE /salary-structures/all", () => {
    const deletes = routePaths(salaryStructureRoutes, "delete");
    expect(deletes).not.toContain("/all");
    expect(deletes).toContain("/:id");
  });

  it("registers static salary-slip GET paths before /:id", () => {
    const gets = routePaths(salarySlipRoutes, "get");
    const idIndex = gets.indexOf("/:id");
    expect(idIndex).toBeGreaterThan(-1);

    for (const staticPath of [
      "/",
      "/my-slips",
      "/employee/:employeeId",
      "/reports/payroll-summary",
      "/stats/overview",
    ]) {
      const idx = gets.indexOf(staticPath);
      expect(idx).toBeGreaterThan(-1);
      expect(idx).toBeLessThan(idIndex);
    }
  });

  it("keeps sendSalarySlipNotification wired for deploy", () => {
    expect(typeof NotificationService.sendSalarySlipNotification).toBe(
      "function"
    );

    const controllerSrc = readFileSync(
      join(__dirname, "../src/controllers/salarySlipController.js"),
      "utf8"
    );
    expect(controllerSrc).toContain("sendSalarySlipNotification");

    const modelSrc = readFileSync(
      join(__dirname, "../src/models/notificationModel.js"),
      "utf8"
    );
    expect(modelSrc).toContain("salary_slip_generated");
  });
});
