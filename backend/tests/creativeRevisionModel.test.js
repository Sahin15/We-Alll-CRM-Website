import { describe, it, expect } from "@jest/globals";
import CreativeRevision from "../src/models/creativeRevisionModel.js";

describe("CreativeRevision model", () => {
  it("defines required conceptual fields from the revision model spec", () => {
    const paths = CreativeRevision.schema.paths;
    expect(paths.revisionNumber).toBeDefined();
    expect(paths.parentRevision).toBeDefined();
    expect(paths.createdBy).toBeDefined();
    expect(paths.assignedTo).toBeDefined();
    expect(paths.reason).toBeDefined();
    expect(paths.feedback).toBeDefined();
    expect(paths.attachments).toBeDefined();
    expect(paths.estimatedHours).toBeDefined();
    expect(paths.actualHours).toBeDefined();
    expect(paths.status).toBeDefined();
    expect(paths.reviewNotes).toBeDefined();
    expect(paths.approvalNotes).toBeDefined();
    expect(paths.workItem).toBeDefined();
  });

  it("does not define slotAssignment or assignedSlot paths", () => {
    const paths = CreativeRevision.schema.paths;
    expect(paths.slotAssignment).toBeUndefined();
    expect(paths.assignedSlot).toBeUndefined();
  });

  it("allows draft through delivered revision statuses", () => {
    const statuses = CreativeRevision.schema.path("status").enumValues;
    expect(statuses).toEqual(
      expect.arrayContaining([
        "draft",
        "submitted",
        "changes_requested",
        "rejected",
        "approved",
        "superseded",
        "delivered",
      ])
    );
  });
});
