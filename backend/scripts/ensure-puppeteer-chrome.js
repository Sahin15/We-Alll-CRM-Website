/**
 * Ensures Puppeteer Chrome is installed before PDF generation.
 * Run manually: npm run puppeteer:install
 */
import { ensurePuppeteerChrome } from "../src/utils/ensurePuppeteerChrome.js";

try {
  await ensurePuppeteerChrome();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
