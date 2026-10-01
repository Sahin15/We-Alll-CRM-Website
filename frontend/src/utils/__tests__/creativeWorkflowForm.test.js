import {
  getDefaultUseCreativeWorkflow,
  buildCreativeWorkflowPayload,
} from "../creativeWorkflowForm";

describe("creativeWorkflowForm", () => {
  test("defaults creative on for Graphic assignee", () => {
    const on = getDefaultUseCreativeWorkflow(null, [
      { department: { name: "Graphic" } },
    ]);
    expect(on).toBe(true);
  });

  test("buildCreativeWorkflowPayload returns standard when off", () => {
    expect(buildCreativeWorkflowPayload(false, null, [])).toEqual({
      useCreativeWorkflow: false,
      workflowMode: "standard",
      workflowType: "standard",
    });
  });
});
