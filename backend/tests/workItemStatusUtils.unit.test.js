import { describe, it, expect } from "@jest/globals";
import {
  computeDueDateFlags,
  getEffectiveStatusForUser,
  isPendingForUser,
  syncGlobalStatusFromAssignees,
} from "../src/utils/workItemStatusUtils.js";

describe("workItemStatusUtils", () => {
  it("uses per-assignee status for multi-assignee work items", () => {
    const workItem = {
      status: "In Progress",
      assignedToMultiple: ["user-a", "user-b"],
      assigneeStatuses: [
        { assigneeId: "user-a", status: "Done" },
        { assigneeId: "user-b", status: "In Progress" },
      ],
    };

    expect(getEffectiveStatusForUser(workItem, "user-a")).toBe("Done");
    expect(isPendingForUser(workItem, "user-a")).toBe(false);
    expect(isPendingForUser(workItem, "user-b")).toBe(true);
  });

  it("does not mark same-day due items as overdue", () => {
    const today = new Date("2026-07-28T15:00:00");
    const workItem = {
      status: "To Do",
      dueDate: new Date("2026-07-28T00:00:00.000Z"),
    };

    const flags = computeDueDateFlags(workItem, "user-a", today);
    expect(flags.isOverdue).toBe(false);
    expect(flags.isDueToday).toBe(true);
    expect(flags.daysUntilDue).toBe(0);
  });

  it("promotes global status to Done when all assignees are Done", () => {
    const workItem = {
      status: "In Progress",
      assignedToMultiple: ["user-a", "user-b"],
      assigneeStatuses: [
        { assigneeId: "user-a", status: "Done" },
        { assigneeId: "user-b", status: "Done" },
      ],
    };

    syncGlobalStatusFromAssignees(workItem);
    expect(workItem.status).toBe("Done");
  });
});
