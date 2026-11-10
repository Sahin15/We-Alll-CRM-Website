import StatusChip from "./StatusChip";

/**
 * Employee payroll status for preview vs slip vs paid.
 *
 * @param {{ phase: 'draft'|'issued'|'paid' }} props
 */
const PayrollEmployeeStatusStepper = ({ phase = "draft" }) => {
  const steps = [
    { key: "draft", label: "Draft preview", variant: "preview" },
    { key: "issued", label: "Payslip issued", variant: "credited" },
    { key: "paid", label: "Paid", variant: "paid" },
  ];
  const idx = steps.findIndex((s) => s.key === phase);

  return (
    <div className="payroll-employee-theme">
      <div className="payroll-status-track" aria-label="Payroll status">
        {steps.map((s, i) => (
          <StatusChip
            key={s.key}
            variant={i <= idx ? s.variant : "muted"}
            label={s.label}
          />
        ))}
      </div>
      {phase === "draft" && (
        <p className="small text-muted mb-0">
          This is a draft breakdown — not your official payslip until HR credits
          salary for the period.
        </p>
      )}
    </div>
  );
};

export default PayrollEmployeeStatusStepper;
