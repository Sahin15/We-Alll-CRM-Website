/**
 * Smoke test: Puppeteer + Handlebars offer letter PDF.
 *
 * Prerequisites:
 *   cd backend
 *   npm run puppeteer:install
 *
 * Run:
 *   node scripts/verify-offer-letter-pdf.js
 *
 * Output: backend/tmp-verify-puppeteer-offer.pdf
 *
 * Manual QA (HR UI):
 *   1. Restart backend after code changes.
 *   2. Open Offers → edit/save an offer → Generate PDF.
 *   3. Confirm header/footer on every page, watermark centered, seal on signature block.
 *   4. If body overlaps header/footer, tune PDF_MARGINS in offerLetterPdfService.js.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateOfferLetterPdfFromTemplate } from "../src/services/offerLetterPdfService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockOffer = {
  candidateName: "Test Candidate",
  proposedDesignation: "Software Engineer",
  proposedDepartment: null,
  employmentType: "full-time",
  proposedJoiningDate: new Date("2026-06-01"),
  workLocation: "Kolkata",
  ctc: 240000,
  probationPeriod: "Three (3) Months",
  noticePeriod: "Thirty (30) Days",
  variableSnapshot: {
    candidateAddress: "123 Sample Street, Kolkata, West Bengal",
    offerDate: "2026-01-15",
    signatory: "Amit Kumar, Director",
    reportingManager: "HR Manager",
    salary: {
      basic: 15000,
      hra: 3000,
      mobile: 500,
      special: 1500,
      pfEmployer: 0,
      gratuity: 0,
      pfEmployee: 0,
    },
  },
};

console.log("Generating offer letter PDF (mock offer)…");

let buf;
try {
  buf = await generateOfferLetterPdfFromTemplate(mockOffer);
} catch (err) {
  console.error("FAILED:", err.message);
  if (/Chrome|puppeteer/i.test(String(err.message))) {
    console.error("Fix: cd backend && npm run puppeteer:install");
  }
  process.exit(1);
}

const out = path.join(__dirname, "..", "tmp-verify-puppeteer-offer.pdf");
fs.writeFileSync(out, buf);
console.log(`OK: ${out} (${buf.length} bytes)`);
console.log("Margins: top 32mm, bottom 18mm — see src/assets/images/README.md");

if (buf.length < 10000) {
  console.error("PDF too small — likely empty or broken");
  process.exit(1);
}
if (buf.length > 3_000_000) {
  console.error("PDF too large — check embedded images");
  process.exit(1);
}
