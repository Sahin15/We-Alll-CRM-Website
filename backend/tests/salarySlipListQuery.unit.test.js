import { dedupeSlipsByEmployeePeriodStages } from "../src/services/payroll/salarySlipListQuery.js";

describe("salarySlipListQuery", () => {
  test("dedupeSlipsByEmployeePeriodStages returns group by employee period", () => {
    const stages = dedupeSlipsByEmployeePeriodStages();
    expect(stages.length).toBeGreaterThanOrEqual(4);

    const groupStage = stages.find((s) => s.$group);
    expect(groupStage).toBeDefined();
    expect(groupStage.$group._id).toEqual({
      employee: "$_employeeKey",
      month: "$month",
      year: "$year",
    });
    expect(groupStage.$group.doc).toEqual({ $first: "$$ROOT" });
  });
});
