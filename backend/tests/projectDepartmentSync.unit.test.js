import { describe, it, expect } from "@jest/globals";
import { ensureProjectDepartmentsFromUsers } from "../src/utils/projectDepartmentSync.js";

describe("ensureProjectDepartmentsFromUsers", () => {
  it("adds a member department to project.departments when missing", () => {
    const project = { departments: ["aaaaaaaaaaaaaaaaaaaaaaaa"] };
    const postingUser = { department: "bbbbbbbbbbbbbbbbbbbbbbbb" };

    const added = ensureProjectDepartmentsFromUsers(project, [postingUser]);

    expect(added).toEqual(["bbbbbbbbbbbbbbbbbbbbbbbb"]);
    expect(project.departments.map(String)).toEqual(
      expect.arrayContaining([
        "aaaaaaaaaaaaaaaaaaaaaaaa",
        "bbbbbbbbbbbbbbbbbbbbbbbb",
      ])
    );
  });

  it("does not duplicate an existing department", () => {
    const deptId = "cccccccccccccccccccccccc";
    const project = { departments: [deptId] };
    const user = { department: { _id: deptId, name: "Posting" } };

    const added = ensureProjectDepartmentsFromUsers(project, [user]);

    expect(added).toEqual([]);
    expect(project.departments).toHaveLength(1);
  });

  it("sets legacy department when empty", () => {
    const project = { departments: [] };
    const user = { department: "dddddddddddddddddddddddd" };

    ensureProjectDepartmentsFromUsers(project, [user]);

    expect(String(project.department)).toBe("dddddddddddddddddddddddd");
  });
});
