import { describe, it, expect } from "@jest/globals";
import {
  isPastMember,
  mergeActiveEmployeeFilter,
  mergeExcludePastMembersFilter,
  PAST_MEMBER_STATUSES,
  stripPastMembersFromProject,
} from "../src/utils/employeeQueryUtils.js";

describe("employeeQueryUtils", () => {
  it("identifies past member statuses", () => {
    for (const status of PAST_MEMBER_STATUSES) {
      expect(isPastMember(status)).toBe(true);
    }
    expect(isPastMember("active")).toBe(false);
    expect(isPastMember("inactive")).toBe(false);
  });

  it("builds active employee query", () => {
    expect(mergeActiveEmployeeFilter({ department: "dept1" })).toEqual({
      department: "dept1",
      status: "active",
      isActive: { $ne: false },
    });
  });

  it("builds exclude-past-members query", () => {
    expect(mergeExcludePastMembersFilter({ role: "employee" })).toEqual({
      role: "employee",
      status: { $nin: PAST_MEMBER_STATUSES },
    });
  });

  it("active filter excludes terminated and offboarded statuses", () => {
    const query = mergeActiveEmployeeFilter();
    expect(query.status).toBe("active");
    expect(PAST_MEMBER_STATUSES.includes(query.status)).toBe(false);
  });

  it("strips past members from populated project rosters", () => {
    const project = {
      projectHead: { _id: "h1", name: "Head", status: "offboarded" },
      assignedUsers: [
        { _id: "u1", name: "Active", status: "active" },
        { _id: "u2", name: "Past", status: "terminated" },
      ],
      teamMembers: [
        { user: { _id: "u3", name: "Still Here", status: "active" } },
        { user: { _id: "u4", name: "Gone", status: "offboarded" } },
      ],
    };

    stripPastMembersFromProject(project);

    expect(project.projectHead).toBeNull();
    expect(project.assignedUsers).toHaveLength(1);
    expect(project.assignedUsers[0]._id).toBe("u1");
    expect(project.teamMembers).toHaveLength(1);
    expect(project.teamMembers[0].user._id).toBe("u3");
  });
});
