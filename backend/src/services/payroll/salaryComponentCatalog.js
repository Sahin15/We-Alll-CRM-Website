/**
 * Salary component catalog helpers (Milestone 2).
 * Pure validation + V1 default seed definitions — no DB.
 */

export const COMPONENT_TYPES = Object.freeze([
  "earning",
  "deduction",
  "employer",
]);

export const CALC_METHODS = Object.freeze([
  "fixed",
  "formula",
  "manual",
  "attendance",
]);

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * Normalize a raw code to uppercase snake style.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeComponentCode(raw) {
  return String(raw || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function isValidComponentCode(code) {
  return typeof code === "string" && CODE_PATTERN.test(code);
}

/**
 * Validate and normalize a create/update payload.
 * @param {object} input
 * @param {{ partial?: boolean }} [options]
 * @returns {object}
 */
export function assertComponentPayload(input = {}, options = {}) {
  const partial = Boolean(options.partial);
  const result = {};

  if (!partial || input.code !== undefined) {
    const code = normalizeComponentCode(input.code);
    if (!isValidComponentCode(code)) {
      throw new Error(
        "Invalid component code (use uppercase letters, numbers, underscore; start with a letter)"
      );
    }
    result.code = code;
  }

  if (!partial || input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) {
      throw new Error("Component name is required");
    }
    result.name = name;
  }

  if (!partial || input.type !== undefined) {
    if (!COMPONENT_TYPES.includes(input.type)) {
      throw new Error(
        `Invalid component type (expected one of: ${COMPONENT_TYPES.join(", ")})`
      );
    }
    result.type = input.type;
  }

  if (!partial || input.calcMethod !== undefined) {
    const calcMethod = input.calcMethod || "fixed";
    if (!CALC_METHODS.includes(calcMethod)) {
      throw new Error(
        `Invalid calcMethod (expected one of: ${CALC_METHODS.join(", ")})`
      );
    }
    result.calcMethod = calcMethod;
  } else if (!partial) {
    result.calcMethod = "fixed";
  }

  if (!partial || input.taxable !== undefined) {
    result.taxable = input.taxable !== undefined ? Boolean(input.taxable) : true;
  }

  if (!partial || input.statutory !== undefined) {
    result.statutory =
      input.statutory !== undefined ? Boolean(input.statutory) : false;
  }

  if (!partial || input.isActive !== undefined) {
    result.isActive =
      input.isActive !== undefined ? Boolean(input.isActive) : true;
  }

  if (input.defaultFormula !== undefined) {
    result.defaultFormula =
      typeof input.defaultFormula === "string"
        ? input.defaultFormula.trim()
        : "";
  } else if (!partial) {
    result.defaultFormula = "";
  }

  if (input.description !== undefined) {
    result.description =
      typeof input.description === "string" ? input.description.trim() : "";
  } else if (!partial) {
    result.description = "";
  }

  if (input.displayOrder !== undefined) {
    const order = Number(input.displayOrder);
    result.displayOrder = Number.isFinite(order) ? order : 0;
  } else if (!partial) {
    result.displayOrder = 0;
  }

  if (input.v1Field !== undefined) {
    result.v1Field =
      typeof input.v1Field === "string" ? input.v1Field.trim() : "";
  }

  return result;
}

/**
 * Default catalog entries mapped from V1 SalaryStructure flat fields.
 * @returns {Array<object>}
 */
export function getDefaultSalaryComponents() {
  return [
    {
      code: "BASIC",
      name: "Basic Salary",
      type: "earning",
      taxable: true,
      statutory: false,
      calcMethod: "fixed",
      displayOrder: 10,
      v1Field: "basicSalary",
      description: "V1 basicSalary",
    },
    {
      code: "HRA",
      name: "House Rent Allowance",
      type: "earning",
      taxable: true,
      statutory: false,
      calcMethod: "fixed",
      displayOrder: 20,
      v1Field: "hra",
      description: "V1 hra",
    },
    {
      code: "SPECIAL_ALLOWANCE",
      name: "Special Allowance",
      type: "earning",
      taxable: true,
      statutory: false,
      calcMethod: "fixed",
      displayOrder: 30,
      v1Field: "specialAllowance",
      description: "V1 specialAllowance",
    },
    {
      code: "TRANSPORT_ALLOWANCE",
      name: "Transport Allowance",
      type: "earning",
      taxable: true,
      statutory: false,
      calcMethod: "fixed",
      displayOrder: 40,
      v1Field: "transportAllowance",
      description: "V1 transportAllowance",
    },
    {
      code: "MEDICAL_ALLOWANCE",
      name: "Medical Allowance",
      type: "earning",
      taxable: true,
      statutory: false,
      calcMethod: "fixed",
      displayOrder: 50,
      v1Field: "medicalAllowance",
      description: "V1 medicalAllowance",
    },
    {
      code: "PF_EE",
      name: "Provident Fund (Employee)",
      type: "deduction",
      taxable: false,
      statutory: true,
      calcMethod: "fixed",
      displayOrder: 110,
      v1Field: "providentFund",
      description: "V1 providentFund",
    },
    {
      code: "PROFESSIONAL_TAX",
      name: "Professional Tax",
      type: "deduction",
      taxable: false,
      statutory: true,
      calcMethod: "fixed",
      displayOrder: 120,
      v1Field: "professionalTax",
      description: "V1 professionalTax",
    },
    {
      code: "TDS",
      name: "Tax Deducted at Source",
      type: "deduction",
      taxable: false,
      statutory: true,
      calcMethod: "fixed",
      displayOrder: 130,
      v1Field: "tds",
      description: "V1 tds",
    },
    {
      code: "ESI_EE",
      name: "ESI (Employee)",
      type: "deduction",
      taxable: false,
      statutory: true,
      calcMethod: "fixed",
      displayOrder: 140,
      v1Field: "esi",
      description: "V1 esi",
    },
    {
      code: "PF_ER",
      name: "Provident Fund (Employer)",
      type: "employer",
      taxable: false,
      statutory: true,
      calcMethod: "formula",
      defaultFormula: "round(BASIC * 0.12)",
      displayOrder: 210,
      v1Field: "",
      description: "R8 employer PF (default 12% of BASIC); CTC only — not employee net",
    },
    {
      code: "ESI_ER",
      name: "ESI (Employer)",
      type: "employer",
      taxable: false,
      statutory: true,
      calcMethod: "formula",
      defaultFormula:
        "round((BASIC + HRA + SPECIAL_ALLOWANCE + TRANSPORT_ALLOWANCE + MEDICAL_ALLOWANCE) * 0.0325)",
      displayOrder: 220,
      v1Field: "",
      description:
        "R8 employer ESI (default 3.25% of wage base); computed when EE ESI > 0",
    },
  ].map((row) => assertComponentPayload(row));
}
