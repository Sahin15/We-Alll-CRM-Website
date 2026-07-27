/**
 * SalaryStructure flat ↔ components[] sync (R7 foundation).
 * Flat V1 fields remain the shadow source of truth for V1 engine and rollback.
 */

import {
  getDefaultSalaryComponents,
  normalizeComponentCode,
  CALC_METHODS,
  COMPONENT_TYPES,
} from "./salaryComponentCatalog.js";

/** Codes that map to a single flat SalaryStructure number field */
export const STRUCTURE_V1_FIELD_BY_CODE = Object.freeze({
  BASIC: "basicSalary",
  HRA: "hra",
  SPECIAL_ALLOWANCE: "specialAllowance",
  TRANSPORT_ALLOWANCE: "transportAllowance",
  MEDICAL_ALLOWANCE: "medicalAllowance",
  PF_EE: "providentFund",
  PROFESSIONAL_TAX: "professionalTax",
  TDS: "tds",
  ESI_EE: "esi",
});

const FLAT_MONEY_FIELDS = Object.freeze([
  "basicSalary",
  "hra",
  "specialAllowance",
  "transportAllowance",
  "medicalAllowance",
  "providentFund",
  "professionalTax",
  "tds",
  "esi",
]);

/**
 * @param {object} structure - flat SalaryStructure-like object
 * @param {Array<object>} [catalog]
 * @returns {Array<object>}
 */
export function flatToComponents(structure = {}, catalog = null) {
  const rows = catalog || getDefaultSalaryComponents();
  return rows
    .filter((c) => c.isActive !== false)
    .map((c, index) => {
      const v1Field = c.v1Field || STRUCTURE_V1_FIELD_BY_CODE[c.code] || "";
      const amount =
        v1Field && structure[v1Field] != null
          ? Number(structure[v1Field]) || 0
          : 0;
      return {
        code: c.code,
        name: c.name,
        type: c.type,
        amount,
        calcMethod: c.calcMethod || "fixed",
        formula: c.defaultFormula || "",
        taxable: Boolean(c.taxable),
        statutory: Boolean(c.statutory),
        v1Field,
        displayOrder:
          c.displayOrder != null ? Number(c.displayOrder) : (index + 1) * 10,
      };
    });
}

/**
 * Map known component amounts back onto flat fields.
 * Unknown codes are ignored (left for V2-only / formula lines).
 *
 * @param {Array<object>} components
 * @returns {Record<string, number>}
 */
export function componentsToFlat(components = []) {
  const flat = {};
  for (const field of FLAT_MONEY_FIELDS) {
    flat[field] = 0;
  }

  for (const raw of components || []) {
    if (!raw || !raw.code) continue;
    const code = normalizeComponentCode(raw.code);
    const v1Field =
      (typeof raw.v1Field === "string" && raw.v1Field.trim()) ||
      STRUCTURE_V1_FIELD_BY_CODE[code] ||
      "";
    if (!v1Field || !FLAT_MONEY_FIELDS.includes(v1Field)) continue;
    flat[v1Field] = Number(raw.amount) || 0;
  }

  return flat;
}

/**
 * Normalize inbound components[] for persistence.
 * @param {unknown} input
 * @param {Array<object>} [catalog]
 * @returns {Array<object>}
 */
export function normalizeStructureComponents(input, catalog = null) {
  if (!Array.isArray(input)) {
    throw new Error("components must be an array");
  }
  const byCode = new Map(
    (catalog || getDefaultSalaryComponents()).map((c) => [c.code, c])
  );

  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`components[${index}] is invalid`);
    }
    const code = normalizeComponentCode(raw.code);
    if (!code) {
      throw new Error(`components[${index}].code is required`);
    }
    const seed = byCode.get(code) || {};
    const calcMethod = raw.calcMethod || seed.calcMethod || "fixed";
    if (!CALC_METHODS.includes(calcMethod)) {
      throw new Error(`components[${index}] has invalid calcMethod`);
    }
    const type = raw.type || seed.type || "earning";
    if (!COMPONENT_TYPES.includes(type)) {
      throw new Error(`components[${index}] has invalid type`);
    }

    return {
      code,
      name: (raw.name || seed.name || code).toString().trim(),
      type,
      amount: Number(raw.amount) || 0,
      calcMethod,
      formula:
        typeof raw.formula === "string"
          ? raw.formula.trim()
          : typeof raw.defaultFormula === "string"
            ? raw.defaultFormula.trim()
            : seed.defaultFormula || "",
      taxable:
        raw.taxable !== undefined ? Boolean(raw.taxable) : seed.taxable !== false,
      statutory:
        raw.statutory !== undefined
          ? Boolean(raw.statutory)
          : Boolean(seed.statutory),
      v1Field:
        (typeof raw.v1Field === "string" && raw.v1Field.trim()) ||
        seed.v1Field ||
        STRUCTURE_V1_FIELD_BY_CODE[code] ||
        "",
      displayOrder:
        raw.displayOrder != null
          ? Number(raw.displayOrder) || 0
          : seed.displayOrder != null
            ? Number(seed.displayOrder)
            : (index + 1) * 10,
    };
  });
}

/**
 * Prepare create/update fields: keep flat shadow in sync with components[].
 *
 * - If `components` provided and non-empty → normalize, write mapped amounts onto flat.
 * - Else → hydrate `components` from flat via catalog defaults.
 *
 * @param {object} body
 * @returns {object} fields to merge into SalaryStructure
 */
export function prepareStructureComponentFields(body = {}) {
  const catalog = getDefaultSalaryComponents();
  const componentsProvided = Object.prototype.hasOwnProperty.call(
    body,
    "components"
  );
  const hasComponents =
    componentsProvided &&
    Array.isArray(body.components) &&
    body.components.length > 0;

  const baseFlat = {
    basicSalary: Number(body.basicSalary) || 0,
    hra: Number(body.hra) || 0,
    specialAllowance: Number(body.specialAllowance) || 0,
    transportAllowance: Number(body.transportAllowance) || 0,
    medicalAllowance: Number(body.medicalAllowance) || 0,
    providentFund: Number(body.providentFund) || 0,
    professionalTax: Number(body.professionalTax) || 0,
    tds: Number(body.tds) || 0,
    esi: Number(body.esi) || 0,
  };

  if (hasComponents) {
    const components = normalizeStructureComponents(body.components, catalog);
    const fromComponents = componentsToFlat(components);
    return {
      ...baseFlat,
      ...fromComponents,
      components,
    };
  }

  return {
    ...baseFlat,
    components: flatToComponents(baseFlat, catalog),
  };
}

/**
 * Whether V2 should evaluate structure.components instead of the global catalog.
 * @param {object} structure
 * @returns {boolean}
 */
export function structureHasComponents(structure) {
  return Array.isArray(structure?.components) && structure.components.length > 0;
}

/**
 * Build catalog-like rows from structure.components for the V2 engine.
 * @param {object} structure
 * @returns {Array<object>}
 */
export function structureComponentsAsCatalog(structure) {
  return (structure.components || []).map((c) => ({
    code: c.code,
    name: c.name || c.code,
    type: c.type || "earning",
    taxable: c.taxable !== false,
    statutory: Boolean(c.statutory),
    calcMethod: c.calcMethod || "fixed",
    defaultFormula: c.formula || c.defaultFormula || "",
    v1Field: c.v1Field || STRUCTURE_V1_FIELD_BY_CODE[c.code] || "",
    isActive: true,
    /** Fixed amount from the structure line */
    structureAmount: Number(c.amount) || 0,
  }));
}
