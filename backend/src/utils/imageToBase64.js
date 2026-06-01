import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, "..", "assets", "images");

const cache = new Map();

/**
 * Read an image from backend/src/assets/images and return a data URL.
 * @param {string} filename
 * @param {string} [mime='image/png']
 */
export function imageToBase64(filename, mime = "image/png") {
  const key = `${filename}:${mime}`;
  if (cache.has(key)) return cache.get(key);

  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  cache.set(key, dataUrl);
  return dataUrl;
}

/** Header, footer, watermark, and seal for offer letter PDFs. */
export function getOfferLetterImages() {
  return {
    header: imageToBase64("header.png"),
    footer: imageToBase64("footer.png"),
    watermark: imageToBase64("watermark.png"),
    seal: fs.existsSync(path.join(IMAGES_DIR, "seal.png"))
      ? imageToBase64("seal.png")
      : null,
  };
}

export default { imageToBase64, getOfferLetterImages };
