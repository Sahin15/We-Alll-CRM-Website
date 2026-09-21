import {
  CANONICAL_DEPARTMENT_NAMES,
  DEPARTMENT_NAME_ALIASES,
  isCanonicalDepartmentName,
  isCreativeDepartmentName,
  isHrDepartmentName,
  isPostingDepartmentName,
  getCreativeWorkflowTypeForDepartment,
  resolveCanonicalDepartmentName,
} from "../src/constants/departmentNames.js";
import { getWorkflowByDepartment } from "../src/utils/departmentWorkflows.js";

describe("departmentNames constants", () => {
  test("canonical list has one name per department (no duplicates)", () => {
    expect(CANONICAL_DEPARTMENT_NAMES).toEqual(
      expect.arrayContaining([
        "Sales",
        "Telecaller",
        "Posting",
        "Social Media",
        "Development",
        "Graphics",
        "Video Production",
        "Content Writing",
        "HR",
        "Digital Marketing",
      ])
    );
    expect(CANONICAL_DEPARTMENT_NAMES.length).toBe(13);
    expect(new Set(CANONICAL_DEPARTMENT_NAMES).size).toBe(13);
  });

  test("legacy aliases resolve to canonical names", () => {
    expect(resolveCanonicalDepartmentName("video")).toBe("Video Production");
    expect(resolveCanonicalDepartmentName("Posting Department")).toBe("Posting");
    expect(resolveCanonicalDepartmentName("Content Posting")).toBe("Posting");
    expect(resolveCanonicalDepartmentName("Engineering")).toBe("Development");
    expect(resolveCanonicalDepartmentName("Design")).toBe("Graphics");
    expect(resolveCanonicalDepartmentName("Human Resources")).toBe("HR");
    expect(resolveCanonicalDepartmentName("Marketing")).toBe("Social Media");
    expect(resolveCanonicalDepartmentName("Content")).toBe("Content Writing");
  });

  test("resolveCanonicalDepartmentName normalizes casing for canonical names", () => {
    expect(resolveCanonicalDepartmentName("sales")).toBe("Sales");
    expect(resolveCanonicalDepartmentName(" POSTING ")).toBe("Posting");
    expect(resolveCanonicalDepartmentName("Unknown")).toBeNull();
  });

  test("isCanonicalDepartmentName accepts canonical and alias names", () => {
    expect(isCanonicalDepartmentName("digital marketing")).toBe(true);
    expect(isCanonicalDepartmentName("Video")).toBe(true);
    expect(isCanonicalDepartmentName("Unknown")).toBe(false);
  });

  test("alias map does not include canonical duplicates", () => {
    Object.values(DEPARTMENT_NAME_ALIASES).forEach((canonical) => {
      expect(CANONICAL_DEPARTMENT_NAMES).toContain(canonical);
    });
  });

  test("creative and posting helpers use canonical names", () => {
    expect(isCreativeDepartmentName("Graphics")).toBe(true);
    expect(isCreativeDepartmentName("Design")).toBe(true);
    expect(isCreativeDepartmentName("Video Production")).toBe(true);
    expect(isCreativeDepartmentName("Video")).toBe(true);
    expect(isCreativeDepartmentName("Sales")).toBe(false);

    expect(isPostingDepartmentName("Posting")).toBe(true);
    expect(isPostingDepartmentName("Posting Department")).toBe(true);

    expect(isHrDepartmentName("HR")).toBe(true);
    expect(isHrDepartmentName("Human Resources")).toBe(true);

    expect(getCreativeWorkflowTypeForDepartment("Graphics")).toBe("design");
    expect(getCreativeWorkflowTypeForDepartment("Design")).toBe("design");
    expect(getCreativeWorkflowTypeForDepartment("Video Production")).toBe(
      "video-production"
    );
    expect(getCreativeWorkflowTypeForDepartment("Sales")).toBeNull();
  });

  test("getWorkflowByDepartment resolves canonical and legacy graphics names", () => {
    expect(getWorkflowByDepartment("Graphics").type).toBe("design");
    expect(getWorkflowByDepartment("Design").type).toBe("design");
    expect(getWorkflowByDepartment("Video Production").type).toBe(
      "video-production"
    );
    expect(getWorkflowByDepartment("Video").type).toBe("video-production");
  });
});
