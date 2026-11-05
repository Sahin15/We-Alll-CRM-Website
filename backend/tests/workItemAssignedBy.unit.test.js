import { getEffectiveAssignedById } from "../src/utils/workItemAssignedBy.js";

describe("getEffectiveAssignedById", () => {
  test("prefers assignedBy over createdBy", () => {
    const item = {
      assignedBy: "user-assigner",
      createdBy: "user-creator",
    };
    expect(getEffectiveAssignedById(item)).toBe("user-assigner");
  });

  test("falls back to slotAssignment.assignedBy", () => {
    const item = {
      createdBy: "user-creator",
      slotAssignment: { assignedBy: "user-slot" },
    };
    expect(getEffectiveAssignedById(item)).toBe("user-slot");
  });

  test("falls back to createdBy for legacy rows", () => {
    const item = { createdBy: { _id: "user-creator" } };
    expect(getEffectiveAssignedById(item)).toBe("user-creator");
  });
});
