import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import sharp from "sharp";
import { getOfferLetterImages } from "../utils/imageToBase64.js";
import { ensurePuppeteerChrome } from "../utils/ensurePuppeteerChrome.js";
import { buildOfferLetterViewModel } from "./offerLetterViewModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "offer-letter.hbs");

/** Calibrated for header.png / footer.png — pixel margins match constrained image heights */
const PDF_MARGINS = {
  top: "160px",
  bottom: "110px",
  left: "40px",
  right: "40px",
};

let compiledTemplate = null;
let puppeteerModule = null;

async function getPuppeteer() {
  if (puppeteerModule) return puppeteerModule;
  try {
    puppeteerModule = await import("puppeteer");
    return puppeteerModule;
  } catch {
    throw new Error(
      "Puppeteer is not installed. Run: cd backend && npm install puppeteer"
    );
  }
}

function getCompiledTemplate() {
  if (!compiledTemplate) {
    const source = fs.readFileSync(TEMPLATE_PATH, "utf8");
    compiledTemplate = Handlebars.compile(source);
  }
  return compiledTemplate;
}

async function getSealDataUrl() {
  const imagesDir = path.join(__dirname, "..", "assets", "images");
  const sealPath = path.join(imagesDir, "seal.png");
  if (!fs.existsSync(sealPath)) return null;

  const buffer = await sharp(sealPath)
    .resize(150, 150, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function buildHeaderTemplate(headerDataUrl) {
  return `<div style="width:100%;display:flex;justify-content:center;align-items:center;padding:0;margin:0;font-size:10px;-webkit-print-color-adjust:exact;">
  <img src="${headerDataUrl}" style="max-height:130px;object-fit:contain;width:auto;" />
</div>`;
}

function buildFooterTemplate(footerDataUrl) {
  return `<div style="width:100%;text-align:center;display:flex;justify-content:center;align-items:center;padding:0;margin:0;font-size:10px;-webkit-print-color-adjust:exact;">
  <img src="${footerDataUrl}" style="max-height:80px;object-fit:contain;width:auto;" />
</div>`;
}

/**
 * Generate offer letter PDF from Offer document (Handlebars + Puppeteer).
 * @param {import('mongoose').Document} offer
 * @param {object} [overrides]
 * @returns {Promise<Buffer>}
 */
export async function generateOfferLetterPdfFromTemplate(offer, overrides = {}) {
  const viewModel = await buildOfferLetterViewModel(offer, overrides);
  viewModel.sealDataUrl = await getSealDataUrl();

  const html = getCompiledTemplate()(viewModel);
  const { header, footer } = getOfferLetterImages();

  const puppeteerPkg = await getPuppeteer();
  const puppeteer = puppeteerPkg.default || puppeteerPkg;
  const chromePath = await ensurePuppeteerChrome({ silent: true });

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 90000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: buildHeaderTemplate(header),
      footerTemplate: buildFooterTemplate(footer),
      margin: PDF_MARGINS,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export default { generateOfferLetterPdfFromTemplate };
