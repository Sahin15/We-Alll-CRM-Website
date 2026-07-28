import {
  prepareSimpleStructureFields,
} from "../src/services/payroll/simpleStructurePrepare.js";

describe("prepareSimpleStructureFields", () => {
  it("requires monthlySalary in simple mode", () => {
    expect(() =>
      prepareSimpleStructureFields({ payrollMode: "simple" })
    ).toThrow(/monthlySalary/i);
  });

  it("shadows monthlySalary onto basicSalary", () => {
    const fields = prepareSimpleStructureFields({
      payrollMode: "simple",
      monthlySalary: 45000,
      tdsEnabled: true,
      tds: 2000,
    });
    expect(fields.basicSalary).toBe(45000);
    expect(fields.monthlySalary).toBe(45000);
    expect(fields.payrollMode).toBe("simple");
    expect(fields.tdsEnabled).toBe(true);
  });

  it("leaves legacy mode without forcing monthlySalary", () => {
    const fields = prepareSimpleStructureFields({ payrollMode: "legacy" });
    expect(fields.payrollMode).toBe("legacy");
  });
});
