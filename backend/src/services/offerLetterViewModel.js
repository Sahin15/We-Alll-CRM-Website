import Department from "../models/departmentModel.js";
import { calculateOfferSalary } from "../utils/offerLetterCalculations.js";
import {
  amountInWords,
  employmentTypeLabel,
  formatINR,
  formatOfferDate,
} from "../utils/offerLetterFormat.js";

const pick = (override, ...sources) => {
  for (const s of sources) {
    if (s !== undefined && s !== null && s !== "") return s;
  }
  return override;
};

/**
 * Build Handlebars context for offer-letter.hbs from an Offer document.
 * @param {import('mongoose').Document} offer
 * @param {object} [overrides] - optional form fields from generate request
 */
export async function buildOfferLetterViewModel(offer, overrides = {}) {
  const snap = { ...(offer.variableSnapshot || {}), ...(overrides.variableSnapshot || {}) };

  let departmentName = snap.departmentName || "—";
  const departmentId =
    offer.proposedDepartment?._id || offer.proposedDepartment || null;
  if (departmentId) {
    const dept = await Department.findById(departmentId).select("name").lean();
    departmentName = dept?.name || departmentName;
  }

  const salary = overrides.salary || snap.salary || {};
  const calc = calculateOfferSalary(salary);
  const monthlyGross =
    calc.monthlyGross > 0
      ? calc.monthlyGross
      : Number(overrides.ctc || offer.ctc) / 12 || 0;
  const annualCtc =
    calc.annualCtc > 0 ? calc.annualCtc : Number(overrides.ctc || offer.ctc) || 0;

  const reportingManager =
    pick(
      overrides.reportingManager,
      snap.reportingManager,
      snap.reportingManagerName
        ? [snap.reportingManagerName, snap.reportingManagerTitle].filter(Boolean).join(", ")
        : ""
    ) || "";

  const signatory =
    pick(
      overrides.signatory,
      snap.signatory,
      snap.signatoryName
        ? [snap.signatoryName, snap.signatoryTitle].filter(Boolean).join(", ")
        : ""
    ) || "";

  const offerDate = pick(
    overrides.offerDate,
    snap.offerDate,
    new Date().toISOString().split("T")[0]
  );

  const candidateAddress =
    pick(overrides.candidateAddress, snap.candidateAddress) || "Address.....";

  const customClause = (pick(overrides.customClause, snap.customClause) || "").trim();

  const showReportingManager =
    reportingManager && reportingManager !== "—";

  return {
    offerDate: formatOfferDate(offerDate),
    candidateName: pick(overrides.candidateName, offer.candidateName) || "Candidate",
    candidateAddress,
    jobTitle: pick(overrides.proposedDesignation, offer.proposedDesignation) || "—",
    departmentName,
    workLocation: pick(overrides.workLocation, offer.workLocation) || "—",
    joiningDate: formatOfferDate(
      pick(overrides.proposedJoiningDate, offer.proposedJoiningDate)
    ),
    employmentType: employmentTypeLabel(
      pick(overrides.employmentType, offer.employmentType)
    ),
    probationPeriod:
      pick(overrides.probationPeriod, offer.probationPeriod) || "Three (3) Months",
    noticePeriod:
      pick(overrides.noticePeriod, offer.noticePeriod) || "Thirty (30) Days",
    reportingManager,
    showReportingManager,
    signatory,
    monthlyGrossFormatted: formatINR(monthlyGross, { monthly: true }),
    monthlyGrossWords: amountInWords(monthlyGross),
    annualCtcFormatted: formatINR(annualCtc),
    annualCtcWords: amountInWords(annualCtc),
    customClause,
    hasCustomClause: Boolean(customClause),
  };
}

export default { buildOfferLetterViewModel };
