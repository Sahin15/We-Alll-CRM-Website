import { describe, expect, test } from "@jest/globals";
import { applyCreativeWorkflowFromRequest } from "../src/utils/creativeWorkflowRequest.js";

describe("applyCreativeWorkflowFromRequest", () => {
  test("sets standard workflow when useCreativeWorkflow is false", () => {
    const data = { workflowType: "design" };
    applyCreativeWorkflowFromRequest(data, { useCreativeWorkflow: false });
    expect(data.workflowMode).toBe("standard");
    expect(data.workflowType).toBe("standard");
  });

  test("sets creative design workflow when toggled on", () => {
    const data = {};
    applyCreativeWorkflowFromRequest(
      data,
      { useCreativeWorkflow: true },
      { assigneeDepartmentNames: ["Graphic"] }
    );
    expect(data.workflowMode).toBe("creative");
    expect(data.workflowType).toBe("design");
  });
});
