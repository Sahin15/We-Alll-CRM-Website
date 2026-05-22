import PDFDocument from "pdfkit";
import { getCompanySettings } from "../config/companySettings.js";

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const fmtCurrency = (amount, display) => {
  if (display) return display;
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")} per annum`;
};

/**
 * Generate offer letter PDF buffer
 */
export const generateOfferLetterPdf = async (data) => {
  const company = getCompanySettings();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const letterDate = fmtDate(data.letterDate || new Date());

      doc.fontSize(18).font("Helvetica-Bold").text(company.legalName, { align: "center" });
      doc.fontSize(9).font("Helvetica").text(company.tagline, { align: "center" });
      doc.fontSize(8).text(company.address, { align: "center" });
      if (company.email) doc.text(company.email, { align: "center" });
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica").text(`Date: ${letterDate}`, { align: "right" });
      if (data.offerNumber) {
        doc.text(`Ref: ${data.offerNumber}`, { align: "right" });
      }
      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("OFFER OF EMPLOYMENT");
      doc.moveDown(0.75);

      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${data.candidateName || "Candidate"},`);
      doc.moveDown(0.5);

      doc.text(
        `We are pleased to offer you the position of ${data.proposedDesignation || "—"} at ${company.legalName}, subject to the terms and conditions set out in this letter.`,
        { align: "justify" }
      );
      doc.moveDown(0.5);

      const rows = [
        ["Position", data.proposedDesignation || "—"],
        ["Department", data.departmentName || "—"],
        ["Employment Type", (data.employmentType || "full-time").replace(/-/g, " ")],
        ["Proposed Joining Date", fmtDate(data.proposedJoiningDate)],
        ["Work Location", data.workLocation || "—"],
        ["Annual CTC", fmtCurrency(data.ctc, data.ctcDisplay)],
        ["Probation Period", data.probationPeriod || "6 months"],
        ["Notice Period", data.noticePeriod || "30 days"],
        ["Offer Valid Until", fmtDate(data.offerValidTill)],
      ];

      rows.forEach(([label, value]) => {
        doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
        doc.font("Helvetica").text(String(value));
      });

      doc.moveDown(0.75);

      if (data.customClause) {
        doc.text(data.customClause, { align: "justify" });
        doc.moveDown(0.5);
      }

      doc.text(
        "This offer is contingent upon satisfactory verification of your documents and references. Please confirm your acceptance by the validity date mentioned above.",
        { align: "justify" }
      );
      doc.moveDown(1);

      doc.text("We look forward to welcoming you to our team.");
      doc.moveDown(2);

      doc.text("Yours sincerely,");
      doc.moveDown(2);
      doc.font("Helvetica-Bold").text(company.signatoryName);
      doc.font("Helvetica").text(company.signatoryTitle);
      doc.text(company.legalName);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const createPdfBuffer = (draw) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      draw(doc, getCompanySettings());
      doc.end();
    } catch (e) {
      reject(e);
    }
  });

const letterHeader = (doc, company, data) => {
  doc.fontSize(18).font("Helvetica-Bold").text(company.legalName, { align: "center" });
  doc.fontSize(9).font("Helvetica").text(company.tagline, { align: "center" });
  doc.fontSize(8).text(company.address, { align: "center" });
  if (company.email) doc.text(company.email, { align: "center" });
  doc.moveDown(1);
  doc.fontSize(10).font("Helvetica").text(`Date: ${fmtDate(data.letterDate || new Date())}`, { align: "right" });
  if (data.reference) doc.text(`Ref: ${data.reference}`, { align: "right" });
  doc.moveDown(1);
};

const letterFooter = (doc, company) => {
  doc.moveDown(1.5);
  doc.text("Yours sincerely,");
  doc.moveDown(2);
  doc.font("Helvetica-Bold").text(company.signatoryName);
  doc.font("Helvetica").text(company.signatoryTitle);
  doc.text(company.legalName);
};

const printDetailRows = (doc, rows) => {
  rows.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(String(value ?? "—"));
  });
};

/**
 * Generate post-join HR document PDF by template slug
 */
export const generateHrDocumentPdf = async (slug, variables) => {
  const v = variables;
  const name = v.employeeName || "Employee";

  const bodies = {
    joining_letter: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("LETTER OF JOINING");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `We are pleased to confirm your joining at ${company.legalName}. Please report on the date and location mentioned below.`,
        { align: "justify" }
      );
      doc.moveDown(0.5);
      printDetailRows(doc, [
        ["Employee ID", v.employeeId],
        ["Designation", v.designation],
        ["Department", v.departmentName],
        ["Joining Date", fmtDate(v.joiningDate)],
        ["Reporting To", v.reportingManagerName],
        ["Work Location", v.workLocation],
        ["Office Timings", v.officeTimings],
        ["Documents to Bring", v.documentsToBring],
      ]);
      if (v.customClause) {
        doc.moveDown(0.5);
        doc.text(v.customClause, { align: "justify" });
      }
      doc.moveDown(0.5);
      doc.text("We welcome you to the team and wish you a successful journey with us.");
      letterFooter(doc, company);
    },
    employment_contract: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("EMPLOYMENT AGREEMENT");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`This Employment Agreement is entered into between ${company.legalName} and ${name}.`);
      doc.moveDown(0.5);
      printDetailRows(doc, [
        ["Designation", v.designation],
        ["Department", v.departmentName],
        ["Start Date", fmtDate(v.joiningDate)],
        ["Employment Type", (v.employmentType || "full-time").replace(/-/g, " ")],
        ["Compensation", v.ctcDisplay || "As per company records"],
        ["Probation", v.probationPeriod],
        ["Notice Period", v.noticePeriod],
        ["Work Location", v.workLocation],
      ]);
      if (v.customClause) {
        doc.moveDown(0.5);
        doc.text(v.customClause, { align: "justify" });
      }
      doc.moveDown(0.5);
      doc.text(
        "The employee agrees to abide by all company policies, maintain confidentiality, and perform duties assigned by the management.",
        { align: "justify" }
      );
      letterFooter(doc, company);
    },
    nda: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("NON-DISCLOSURE AGREEMENT");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `You agree not to disclose confidential information of ${company.legalName}, including client data, business plans, source code, and internal processes, ${v.confidentialityTerm || "during and after employment"}.`,
        { align: "justify" }
      );
      if (v.customClause) {
        doc.moveDown(0.5);
        doc.text(v.customClause, { align: "justify" });
      }
      letterFooter(doc, company);
    },
    policy_acknowledgment: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("POLICY ACKNOWLEDGMENT");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `This is to acknowledge that you have read, understood, and agree to comply with the following company policies:`,
        { align: "justify" }
      );
      doc.moveDown(0.5);
      doc.text(v.policyList || "Company policies as shared by HR.");
      doc.moveDown(0.5);
      doc.text(`Acknowledgment date: ${fmtDate(v.acknowledgmentDate || new Date())}`);
      letterFooter(doc, company);
    },
    increment_letter: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("SALARY INCREMENT LETTER");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `Further to your ${v.incrementReason || "performance review"}, we are pleased to revise your compensation as below:`,
        { align: "justify" }
      );
      doc.moveDown(0.5);
      printDetailRows(doc, [
        ["Designation", v.designation],
        ["Previous CTC", v.previousCtcDisplay],
        ["Revised CTC", v.newCtcDisplay],
        ["Effective Date", fmtDate(v.effectiveDate)],
      ]);
      letterFooter(doc, company);
    },
    bonus_letter: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("BONUS LETTER");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `We are pleased to inform you that you have been awarded a bonus of ${v.bonusAmountDisplay || "—"} for ${v.bonusPeriod || "the applicable period"}.`,
        { align: "justify" }
      );
      if (v.payoutDate) {
        doc.text(`Expected payout date: ${fmtDate(v.payoutDate)}`);
      }
      letterFooter(doc, company);
    },
    promotion_letter: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("PROMOTION LETTER");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `Congratulations on your promotion from ${v.previousDesignation || "—"} to ${v.newDesignation || v.designation || "—"}, effective ${fmtDate(v.effectiveDate)}.`,
        { align: "justify" }
      );
      if (v.newCtcDisplay) {
        doc.moveDown(0.5);
        doc.text(`Revised CTC: ${v.newCtcDisplay}`);
      }
      letterFooter(doc, company);
    },
    experience_certificate: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("EXPERIENCE CERTIFICATE");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text("To Whom It May Concern,");
      doc.moveDown(0.5);
      doc.text(
        `This is to certify that ${name} was employed with ${company.legalName} as ${v.designation || "—"} from ${fmtDate(v.joiningDate)} to ${fmtDate(v.relievingDate)}. Conduct during employment was ${v.conductRemark || "satisfactory"}.`,
        { align: "justify" }
      );
      doc.moveDown(0.5);
      doc.text("We wish them success in future endeavours.");
      letterFooter(doc, company);
    },
    experience_letter: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("EXPERIENCE LETTER");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text("To Whom It May Concern,");
      doc.moveDown(0.5);
      doc.text(
        `This is to certify that ${name} was employed with ${company.legalName} as ${v.designation || "—"} from ${fmtDate(v.joiningDate)} to ${fmtDate(v.relievingDate)}. Conduct during employment was ${v.conductRemark || "satisfactory"}.`,
        { align: "justify" }
      );
      doc.moveDown(0.5);
      doc.text("We wish them success in future endeavours.");
      letterFooter(doc, company);
    },
    relieving_letter: (doc, company) => {
      letterHeader(doc, company, v);
      doc.fontSize(12).font("Helvetica-Bold").text("RELIEVING LETTER");
      doc.moveDown(0.75);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Dear ${name},`);
      doc.moveDown(0.5);
      doc.text(
        `This is to confirm that you have been relieved from your duties at ${company.legalName} with effect from ${fmtDate(v.relievingDate)}.`,
        { align: "justify" }
      );
      doc.moveDown(0.5);
      printDetailRows(doc, [
        ["Employee ID", v.employeeId],
        ["Designation", v.designation],
        ["Date of Joining", fmtDate(v.joiningDate)],
        ["Resignation Date", fmtDate(v.resignationDate)],
        ["Relieving Date", fmtDate(v.relievingDate)],
      ]);
      doc.text("We thank you for your contributions and wish you the best.");
      letterFooter(doc, company);
    },
  };

  const draw = bodies[slug];
  if (!draw) {
    throw new Error(`Unknown document template: ${slug}`);
  }

  return createPdfBuffer(draw);
};

export default { generateOfferLetterPdf, generateHrDocumentPdf };
