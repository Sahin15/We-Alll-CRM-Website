import {
  isEmployeeQueryEntry,
  isHrCorrectionQuery,
  resolvePendingEmployeeQueries,
} from "../src/utils/salaryPreviewQueries.js";

describe("salaryPreviewQueries", () => {
  test("detects HR correction log lines", () => {
    expect(isHrCorrectionQuery({ query: "HR Correction: fixed LOP" })).toBe(true);
    expect(isEmployeeQueryEntry({ query: "Please review my leave" })).toBe(true);
    expect(isEmployeeQueryEntry({ query: "HR Correction: x" })).toBe(false);
  });

  test("resolvePendingEmployeeQueries marks employee queries resolved", () => {
    const preview = {
      status: "query_raised",
      employeeQueries: [
        { query: "Need review", status: "pending" },
        { query: "HR Correction: note", status: "resolved" },
      ],
    };
    resolvePendingEmployeeQueries(preview, "hr1", "Correction applied: note");
    expect(preview.employeeQueries[0].status).toBe("resolved");
    expect(preview.status).toBe("under_review");
  });
});
