import { dedupeSlipsByEmployeePeriodStages } from "../src/services/payroll/salarySlipListQuery.js";

describe("salarySlipListQuery", () => {
  test("dedupeSlipsByEmployeePeriodStages returns group by employee period", () => {
    const stages = dedupeSlipsByEmployeePeriodStages();
    expect(stages).toHaveLength(3);
    expect(stages[1].$group._id).toEqual({
      employee: "$employee",
      month: "$month",
      year: "$year",
    });
    expect(stages[1].$group.doc).toEqual({ $first: "$$ROOT" });
  });
});
