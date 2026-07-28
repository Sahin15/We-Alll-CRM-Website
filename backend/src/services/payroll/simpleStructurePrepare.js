/**
 * Helpers for SMB simple salary structures.
 * Shadows monthlySalary onto basicSalary so legacy slip generate still works.
 */

/**
 * @param {object} body - request body
 * @returns {object} fields to merge into create/update
 */
export function prepareSimpleStructureFields(body = {}) {
  const mode = body.payrollMode === "simple" ? "simple" : body.payrollMode || "legacy";
  if (mode !== "simple") {
    return {
      payrollMode: mode === "legacy" ? "legacy" : mode,
      ...(body.monthlySalary != null ? { monthlySalary: body.monthlySalary } : {}),
      ...(body.tdsEnabled != null ? { tdsEnabled: Boolean(body.tdsEnabled) } : {}),
    };
  }

  const monthly = Number(body.monthlySalary);
  if (!(monthly >= 0) || Number.isNaN(monthly)) {
    throw new Error("monthlySalary is required when payrollMode is simple");
  }

  return {
    payrollMode: "simple",
    monthlySalary: monthly,
    basicSalary: monthly,
    hra: body.hra ?? 0,
    specialAllowance: body.specialAllowance ?? 0,
    transportAllowance: body.transportAllowance ?? 0,
    medicalAllowance: body.medicalAllowance ?? 0,
    tdsEnabled: Boolean(body.tdsEnabled),
    tds: body.tdsEnabled ? Number(body.tds) || 0 : Number(body.tds) || 0,
  };
}
