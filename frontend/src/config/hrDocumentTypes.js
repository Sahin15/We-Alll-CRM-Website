/** Registry of HR printable documents — offer letters use server template `backend/src/templates/offer-letter.hbs`. */
export const HR_DOCUMENT_TYPES = [
  {
    slug: "offer_letter",
    title: "Offer Letter",
    pdfSource: "server",
    template: "offer-letter.hbs",
  },
];

export default HR_DOCUMENT_TYPES;
