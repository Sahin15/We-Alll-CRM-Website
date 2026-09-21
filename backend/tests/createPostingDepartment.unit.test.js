import { describe, it, expect } from "@jest/globals";
import {
  getWorkflowByDepartment,
  getWorkflowConfig,
  DEPARTMENT_WORKFLOWS,
} from "../src/utils/departmentWorkflows.js";

describe("Posting department workflow mapping", () => {
  it("maps Posting department to posting workflow (not standard fallback)", () => {
    const workflow = getWorkflowByDepartment("Posting");
    expect(workflow.type).toBe("posting");
    expect(workflow.name).toBe("Posting");
    expect(DEPARTMENT_WORKFLOWS.posting).toBeDefined();
  });

  it("accepts Posting Department and Content Posting aliases", () => {
    expect(getWorkflowByDepartment("Posting Department").type).toBe("posting");
    expect(getWorkflowByDepartment("Content Posting").type).toBe("posting");
  });

  it("exposes posting workflow via getWorkflowConfig", () => {
    const workflow = getWorkflowConfig("posting");
    expect(workflow.type).toBe("posting");
    expect(workflow.statuses).toEqual(
      expect.arrayContaining(["To Do", "In Progress", "Review", "Done"])
    );
  });
});
