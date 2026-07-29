/**
 * Employer statutory contributions (R8 foundation).
 * Does not change employee net — ER lines are CTC / compliance only.
 * Rates are documented defaults; override via env or options.
 */

/**
 * @returns {boolean}
 */
export function isEmployerStatutoryEnabled() {
  return (
    String(process.env.PAYROLL_EMPLOYER_STATUTORY || "").toLowerCase() ===
    "true"
  );
}

/**
 * Default India mid-market simplification (not a full EPFO/ESIC rules engine).
 * Override with options or env where needed later.
 */
export const DEFAULT_EMPLOYER_STATUTORY_RATES = Object.freeze({
  /** Employer PF as fraction of BASIC */
  pfErRate: 0.12,
  /** Employer ESI as fraction of wage base (BASIC+HRA+SPECIAL+TRANSPORT+MEDICAL) */
  esiErRate: 0.0325,
});

/**
 * @param {object} [options]
 * @returns {{ pfErRate: number, esiErRate: number }}
 */
export function resolveEmployerStatutoryRates(options = {}) {
  const pfEnv = process.env.PAYROLL_PF_ER_RATE;
  const esiEnv = process.env.PAYROLL_ESI_ER_RATE;
  return {
    pfErRate:
      options.pfErRate != null
        ? Number(options.pfErRate)
        : pfEnv != null && pfEnv !== ""
          ? Number(pfEnv)
          : DEFAULT_EMPLOYER_STATUTORY_RATES.pfErRate,
    esiErRate:
      options.esiErRate != null
        ? Number(options.esiErRate)
        : esiEnv != null && esiEnv !== ""
          ? Number(esiEnv)
          : DEFAULT_EMPLOYER_STATUTORY_RATES.esiErRate,
  };
}

/**
 * Wage base for simplified ESI ER (monthly).
 * @param {object} structure
 * @returns {number}
 */
export function esiWageBaseFromStructure(structure = {}) {
  return (
    (Number(structure.basicSalary) || 0) +
    (Number(structure.hra) || 0) +
    (Number(structure.specialAllowance) || 0) +
    (Number(structure.transportAllowance) || 0) +
    (Number(structure.medicalAllowance) || 0)
  );
}

/**
 * Compute employer PF/ESI amounts from a flat structure.
 *
 * @param {object} structure
 * @param {object} [options]
 * @returns {{ pfEr: number, esiEr: number, rates: object, wageBase: number }}
 */
export function calculateEmployerContributions(structure = {}, options = {}) {
  const rates = resolveEmployerStatutoryRates(options);
  const basic = Number(structure.basicSalary) || 0;
  const wageBase = esiWageBaseFromStructure(structure);
  const pfEr = Math.round(basic * rates.pfErRate);
  // If employee ESI is zero and not forced, skip ESI ER (common when over wage threshold)
  const forceEsi = Boolean(options.forceEsiEr);
  const employeeEsi = Number(structure.esi) || 0;
  const esiEr =
    forceEsi || employeeEsi > 0
      ? Math.round(wageBase * rates.esiErRate)
      : 0;

  return { pfEr, esiEr, rates, wageBase };
}

/**
 * Build employer line items for V2 / reporting.
 * @param {object} structure
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function buildEmployerContributionLines(structure = {}, options = {}) {
  const { pfEr, esiEr } = calculateEmployerContributions(structure, options);
  const lines = [];
  if (pfEr > 0) {
    lines.push({
      code: "PF_ER",
      name: "Provident Fund (Employer)",
      type: "employer",
      amount: pfEr,
      taxable: false,
      statutory: true,
    });
  }
  if (esiEr > 0) {
    lines.push({
      code: "ESI_ER",
      name: "ESI (Employer)",
      type: "employer",
      amount: esiEr,
      taxable: false,
      statutory: true,
    });
  }
  return lines;
}

/**
 * Monthly CTC = employee gross + employer contributions.
 * Annual CTC = monthly * 12 (same convention as structure.ctc on gross alone).
 *
 * @param {number} grossSalary
 * @param {number|Array<{amount?: number}>} employerTotalOrLines
 * @returns {{ monthlyCtc: number, annualCtc: number, employerTotal: number }}
 */
export function computeCtcWithEmployer(grossSalary, employerTotalOrLines) {
  const employerTotal = Array.isArray(employerTotalOrLines)
    ? employerTotalOrLines.reduce((s, l) => s + (Number(l.amount) || 0), 0)
    : Number(employerTotalOrLines) || 0;
  const monthlyCtc = (Number(grossSalary) || 0) + employerTotal;
  return {
    monthlyCtc,
    annualCtc: monthlyCtc * 12,
    employerTotal,
  };
}
