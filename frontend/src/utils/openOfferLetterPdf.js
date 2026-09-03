import { toast } from "react-toastify";
import { offerApi } from "../api/offerApi";

/**
 * Open offer letter PDF from the hiring pipeline template (Puppeteer + Handlebars).
 * Uses the preview endpoint so the letter matches the editor, not a stale S3 upload.
 * @param {string} offerId
 */
export async function openOfferLetterPdf(offerId) {
  if (!offerId) return;
  try {
    const res = await offerApi.preview(String(offerId));
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const opened = window.open(url, "_blank");
    if (!opened) {
      toast.warn("Allow pop-ups to view the PDF");
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 120000);
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to open offer letter PDF");
  }
}

export default openOfferLetterPdf;
