const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n) => {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
};

const threeDigits = (n) => {
  if (n === 0) return "";
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
};

/** Convert integer amount to Indian English words (Rupees only). */
export const amountInWords = (amount) => {
  const n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero";

  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (remainder) parts.push(threeDigits(remainder));

  return `${parts.join(" ").replace(/\s+/g, " ").trim()} Rupees Only`;
};

export const formatINR = (amount, { monthly = false } = {}) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
  return monthly ? `${formatted} per month` : formatted;
};

export const formatOfferDate = (date) => {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const employmentTypeLabel = (type) => {
  const map = {
    "full-time": "Full-Time",
    "part-time": "Part-Time",
    intern: "Intern",
    freelancer: "Freelancer",
    contract: "Contract",
  };
  return map[type] || type || "Full-Time";
};
