import { describe, it, expect } from "@jest/globals";
import {
  assertStatusIn,
  assertNoBackwardFromDelivered,
  START_WORK_STATUSES,
  SUBMIT_REVIEW_STATUSES,
} from "../src/utils/creativeWorkflowRules.js";
import {
  canPerformCreativeReview,
  isCreativeAssignee,
  canSubmitPostingDone,
  assertCanReviewCreativeWork,
  getProjectDepartmentHeadIds,
} from "../src/utils/creativeWorkflowAuth.js";
import { isCreativeWorkflow } from "../src/utils/creativeStatusMap.js";

describe("creativeWorkflowRules", () => {
  it("allows start from To Do and blocks from Closed", () => {
    expect(() => assertStatusIn("To Do", START_WORK_STATUSES, "Start work")).not.toThrow();
    expect(() => assertStatusIn("Closed", START_WORK_STATUSES, "Start work")).toThrow(
      /Start work is not allowed/
    );
  });

  it("allows submit only from In Progress or Rework In Progress", () => {
    expect(() =>
      assertStatusIn("In Progress", SUBMIT_REVIEW_STATUSES, "Submit for review")
    ).not.toThrow();
    expect(() =>
      assertStatusIn("Changes Requested", SUBMIT_REVIEW_STATUSES, "Submit for review")
    ).toThrow(/Submit for review is not allowed/);
  });

  it("blocks backward transitions from Delivered when slotted", () => {
    const workItem = {
      status: "Delivered",
      slotAssignment: { slotId: "slot123" },
    };
    expect(() => assertNoBackwardFromDelivered(workItem, "In Progress")).toThrow(
      /Cannot change status after delivery/
    );
  });
});

describe("creativeWorkflowAuth", () => {
  const assignerId = "user-assigner";
  const assigneeId = "user-assignee";
  const headId = "user-head";
  const hodId = "user-hod";
  const outsiderId = "user-outsider";

  const workItem = {
    createdBy: assignerId,
    assignedTo: assigneeId,
    postingAssignedTo: "user-posting",
  };

  const project = {
    projectHead: { _id: headId },
    department: { head: { _id: hodId } },
  };

  it("allows assigner, project head, and department HOD to review", () => {
    expect(canPerformCreativeReview({ _id: assignerId }, workItem, project)).toBe(true);
    expect(canPerformCreativeReview({ _id: headId }, workItem, project)).toBe(true);
    expect(canPerformCreativeReview({ _id: hodId }, workItem, project)).toBe(true);
    expect(canPerformCreativeReview({ _id: outsiderId }, workItem, project)).toBe(false);
  });

  it("blocks assignee from reviewing unless they are a project lead", () => {
    expect(() =>
      assertCanReviewCreativeWork({ _id: assigneeId }, workItem, project)
    ).toThrow(/cannot review|Only the assigner/);

    const selfAssigned = { ...workItem, createdBy: headId, assignedTo: headId };
    expect(() =>
      assertCanReviewCreativeWork({ _id: headId }, selfAssigned, project)
    ).not.toThrow();
  });

  it("detects assignee and posting permissions", () => {
    expect(isCreativeAssignee({ _id: assigneeId }, workItem)).toBe(true);
    expect(canSubmitPostingDone({ _id: "user-posting" }, workItem, project)).toBe(true);
    expect(canSubmitPostingDone({ _id: outsiderId }, workItem, project)).toBe(false);
  });

  it("collects department head ids from project", () => {
    const ids = getProjectDepartmentHeadIds(project);
    expect(ids.has(hodId)).toBe(true);
  });
});

describe("creative workflow detection", () => {
  it("includes design-advanced as creative", () => {
    expect(isCreativeWorkflow({ workflowType: "design-advanced" })).toBe(true);
    expect(isCreativeWorkflow({ workflowMode: "creative" })).toBe(true);
  });
});
