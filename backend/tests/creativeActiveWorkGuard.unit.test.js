import { describe, it, expect } from "@jest/globals";
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  HOLD_STATUSES,
  RESUME_STATUSES,
} from "../src/utils/creativeWorkflowRules.js";

describe("creativeActiveWorkGuard rules", () => {
  it("active statuses exclude On Hold so held tasks free the assignee", () => {
    expect(ACTIVE_ASSIGNMENT_STATUSES).toEqual(["In Progress", "Rework In Progress"]);
    expect(ACTIVE_ASSIGNMENT_STATUSES).not.toContain("On Hold");
  });

  it("hold and resume statuses align with workflow", () => {
    expect(HOLD_STATUSES).toContain("In Progress");
    expect(HOLD_STATUSES).toContain("Rework In Progress");
    expect(RESUME_STATUSES).toEqual(["On Hold"]);
  });
});
