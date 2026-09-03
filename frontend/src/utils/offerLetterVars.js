import { calculateOfferSalary } from "./offerLetterCalculations";
import {
  amountInWords,
  employmentTypeLabel,
  formatINR,
  formatOfferDate,
} from "./offerLetterFormat";

export const buildOfferLetterVars = ({
  form,
  offer,
  departments = [],
}) => {
  const snap = offer?.variableSnapshot || {};
  const salary = form?.salary || snap.salary || {};
  const calc = calculateOfferSalary(salary);

  const deptId =
    form?.proposedDepartment ||
    offer?.proposedDepartment?._id ||
    offer?.proposedDepartment;
  const departmentName =
    departments.find((d) => d._id === deptId)?.name ||
    offer?.proposedDepartment?.name ||
    snap.departmentName ||
    "—";

  const joiningDate = form?.proposedJoiningDate || offer?.proposedJoiningDate;
  const offerDate =
    form?.offerDate || snap.offerDate || new Date().toISOString().split("T")[0];

  const monthlyGross = calc.monthlyGross;
  const annualCtc = calc.annualCtc || Number(form?.ctc || offer?.ctc) || 0;

  const reportingManager =
    form?.reportingManager ||
    snap.reportingManager ||
    (snap.reportingManagerName
      ? [snap.reportingManagerName, snap.reportingManagerTitle].filter(Boolean).join(", ")
      : "") ||
    "";

  const signatory =
    form?.signatory ||
    snap.signatory ||
    (snap.signatoryName
      ? [snap.signatoryName, snap.signatoryTitle].filter(Boolean).join(", ")
      : "") ||
    "";

  return {
    offerNumber: offer?.offerNumber || "",
    offerDate: formatOfferDate(offerDate),
    candidateName: form?.candidateName || offer?.candidateName || "Candidate",
    candidateAddress: form?.candidateAddress || snap.candidateAddress || "Address.....",
    jobTitle: form?.proposedDesignation || offer?.proposedDesignation || "—",
    departmentName,
    workLocation: form?.workLocation || offer?.workLocation || "—",
    joiningDate: formatOfferDate(joiningDate),
    employmentType: employmentTypeLabel(form?.employmentType || offer?.employmentType),
    probationPeriod: form?.probationPeriod || offer?.probationPeriod || "Three (3) Months",
    noticePeriod: form?.noticePeriod || offer?.noticePeriod || "Thirty (30) Days",
    reportingManager: reportingManager || "—",
    signatory,
    monthlyGrossFormatted: formatINR(monthlyGross, { monthly: true }),
    monthlyGrossWords: amountInWords(monthlyGross),
    annualCtcFormatted: formatINR(annualCtc),
    annualCtcWords: amountInWords(annualCtc),
    customClause: form?.customClause || snap.customClause || "",
    calc,
  };
};

export const formToVariableSnapshot = (form) => ({
  candidateAddress: form.candidateAddress || "",
  offerDate: form.offerDate || "",
  reportingManager: form.reportingManager || "",
  signatory: form.signatory || "",
  salary: {
    basic: form.salary?.basic ?? "",
    hra: form.salary?.hra ?? "",
    mobile: form.salary?.mobile ?? "",
    special: form.salary?.special ?? "",
    pfEmployer: form.salary?.pfEmployer ?? "",
    gratuity: form.salary?.gratuity ?? "",
    pfEmployee: form.salary?.pfEmployee ?? "",
  },
  customClause: form.customClause || "",
});

export const validateOfferForLetter = (form, offer) => {
  const name = form?.candidateName || offer?.candidateName;
  const address = form?.candidateAddress || offer?.variableSnapshot?.candidateAddress;
  const designation = form?.proposedDesignation || offer?.proposedDesignation;
  const joining = form?.proposedJoiningDate || offer?.proposedJoiningDate;
  const salary = form?.salary || offer?.variableSnapshot?.salary || {};
  const calc = calculateOfferSalary(salary);
  const hasSalary =
    calc.totalEarnings > 0 || calc.othersTotal > 0 || Number(form?.ctc || offer?.ctc) > 0;

  const errors = [];
  if (!name?.trim()) errors.push("Candidate name");
  if (!address?.trim()) errors.push("Candidate address");
  if (!designation?.trim()) errors.push("Job title / designation");
  if (!joining) errors.push("Joining date");
  if (!hasSalary) errors.push("At least one salary component or CTC");

  return errors;
};
