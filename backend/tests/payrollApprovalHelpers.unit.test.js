import { describe, it, expect } from "@jest/globals";
import {
  APPROVAL_STAGES,
  APPROVAL_ACTIONS,
  assertApprovalAction,
  assertCanActOnCurrentStage,
  assertWorkflowType,
  buildStandardStages,
} from "../src/services/payroll/payrollApprovalHelpers.js";

describe("payrollApprovalHelpers", () => {
  it("exposes stages and actions", () => {
    expect(APPROVAL_STAGES).toEqual([
      "hr_review",
      "finance_approval",
      "management_signoff",
    ]);
    expect(APPROVAL_ACTIONS).toContain("approved");
    expect(APPROVAL_ACTIONS).toContain("rejected");
  });

  it("validates actions and types", () => {
    expect(() => assertApprovalAction("approved")).not.toThrow();
    expect(() => assertApprovalAction("skip")).toThrow(/Invalid approval action/);
    expect(() => assertWorkflowType("bulk_approval")).not.toThrow();
    expect(() => assertWorkflowType("other")).toThrow(/Invalid workflow type/);
  });

  it("builds three stages with deadlines", () => {
    const now = new Date("2026-07-17T00:00:00.000Z");
    const stages = buildStandardStages(
      { hr: "h1", finance: "f1", management: "m1" },
      now
    );
    expect(stages).toHaveLength(3);
    expect(stages[0].stage).toBe("hr_review");
    expect(stages[1].approver).toBe("f1");
    expect(stages[2].order).toBe(2);
    expect(stages[0].deadline.getTime()).toBeGreaterThan(now.getTime());
  });

  it("assertCanActOnCurrentStage enforces current approver", () => {
    const workflow = {
      overallStatus: "in_progress",
      currentStage: 0,
      stages: [
        { stage: "hr_review", approver: "hr-user", status: "pending", order: 0 },
      ],
    };
    expect(assertCanActOnCurrentStage(workflow, "hr-user").stageIndex).toBe(0);
    expect(() => assertCanActOnCurrentStage(workflow, "other")).toThrow(
      /Unauthorized/
    );
    expect(() =>
      assertCanActOnCurrentStage(
        { ...workflow, overallStatus: "completed" },
        "hr-user"
      )
    ).toThrow(/not awaiting/);
  });
});
