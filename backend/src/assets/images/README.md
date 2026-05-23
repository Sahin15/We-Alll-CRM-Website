# Offer letter PDF images

Used by `offerLetterPdfService.js` (Puppeteer `displayHeaderFooter` + Handlebars body).

| File | Use |
|------|-----|
| `header.png` | Puppeteer `headerTemplate` (Base64 data URL) |
| `footer.png` | Puppeteer `footerTemplate` (Base64 data URL) |
| `watermark.png` | Reference only; body watermark is CSS in `offer-letter.hbs` |
| `seal.png` | Company seal in signature block (resized via sharp) |

## Margin calibration

Default margins in `offerLetterPdfService.js`:

| Edge | Value | Notes |
|------|-------|--------|
| top | `32mm` | Clear space below rendered `header.png` |
| bottom | `18mm` | Clear space above `footer.png` |
| left / right | `15mm` | Body text inset |

If text overlaps the header or footer band on generated PDFs:

1. Open `tmp-verify-puppeteer-offer.pdf` from `node scripts/verify-offer-letter-pdf.js`.
2. Increase `top` or `bottom` by 2–4mm until body text clears the images.
3. Regenerate from HR → Offers → **Generate PDF**.

Header/footer templates require **inline Base64** images (no external URLs).

## Puppeteer / Chrome

- Local: `npm run puppeteer:install` then `npm start` or `npm run dev`.
- Production: set `CHROME_PATH` to a Chromium/Chrome binary; use `--no-sandbox` (already in service).

## Smoke test

```bash
cd backend
npm run puppeteer:install
node scripts/verify-offer-letter-pdf.js
```

