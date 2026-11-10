/**
 * Date-only display for payslip paymentDate (UTC calendar — avoids local TZ shift).
 *
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatSlipPaymentDateDisplay(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(d);
}
