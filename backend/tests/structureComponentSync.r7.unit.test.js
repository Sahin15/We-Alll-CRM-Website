import { describe, it, expect } from "@jest/globals";
import {
  flatToComponents,
  componentsToFlat,
  prepareStructureComponentFields,
  structureComponentsAsCatalog,
} from "../src/services/payroll/structureComponentSync.js";
import { dualRunPayroll } from "../src/services/payroll/payrollEngine.js";

const sampleFlat = {
  basicSalary: 40000,
  hra: 16000,
  specialAllowance: 5000,
  transportAllowance: 2000,
  medicalAllowance: 1250,
  providentFund: 4800,
  professionalTax: 200,
  tds: 1000,
  esi: 0,
};

describe("structureComponentSync (R7)", () => {
  it("flatToComponents maps catalog v1 fields", () => {
    const components = flatToComponents(sampleFlat);
    const basic = components.find((c) => c.code === "BASIC");
    expect(basic.amount).toBe(40000);
    expect(basic.v1Field).toBe("basicSalary");
    expect(components.find((c) => c.code === "HRA").amount).toBe(16000);
  });

  it("round-trips flat ↔ components for mapped fields", () => {
    const components = flatToComponents(sampleFlat);
    const flat = componentsToFlat(components);
    expect(flat).toMatchObject(sampleFlat);
  });

  it("prepareStructureComponentFields hydrates components from flat when omitted", () => {
    const prepared = prepareStructureComponentFields(sampleFlat);
    expect(prepared.components.length).toBeGreaterThan(0);
    expect(prepared.basicSalary).toBe(40000);
    expect(prepared.components.find((c) => c.code === "BASIC").amount).toBe(
      40000
    );
  });

  it("prepareStructureComponentFields lets components win mapped flat amounts", () => {
    const prepared = prepareStructureComponentFields({
      basicSalary: 1,
      components: [
        {
          code: "BASIC",
          name: "Basic",
          type: "earning",
          amount: 50000,
          v1Field: "basicSalary",
        },
        {
          code: "HRA",
          type: "earning",
          amount: 10000,
          v1Field: "hra",
        },
      ],
    });
    expect(prepared.basicSalary).toBe(50000);
    expect(prepared.hra).toBe(10000);
  });

  it("structureComponentsAsCatalog exposes structureAmount for V2", () => {
    const rows = structureComponentsAsCatalog({
      components: [{ code: "BASIC", name: "Basic", type: "earning", amount: 42 }],
    });
    expect(rows[0].structureAmount).toBe(42);
  });

  it("dual-run stays within tolerance for flat-only structures", () => {
    const dual = dualRunPayroll(sampleFlat, { lossOfPay: 500 });
    expect(dual.diff.withinTolerance).toBe(true);
  });

  it("dual-run stays within tolerance when structure.components mirror flat", () => {
    const prepared = prepareStructureComponentFields(sampleFlat);
    const dual = dualRunPayroll(
      { ...sampleFlat, components: prepared.components },
      { lossOfPay: 500 }
    );
    expect(dual.diff.withinTolerance).toBe(true);
  });
});
