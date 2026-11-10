const STEPS = [
  { key: 1, title: "Review", desc: "Breakdowns & queries" },
  { key: 2, title: "Confirm", desc: "Payment date" },
  { key: 3, title: "Issue", desc: "Credit salary" },
];

/** @param {{ activeStep: number, onStep: (n:number)=>void, completedThrough?: number }} props */
const PayrollStepHeader = ({ activeStep, onStep, completedThrough = 0 }) => (
  <div className="payroll-step-header" role="tablist" aria-label="Run payroll steps">
    {STEPS.map((s) => {
      const cls = [
        "payroll-step-pill",
        activeStep === s.key ? "active" : "",
        completedThrough >= s.key ? "completed" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return (
        <button
          key={s.key}
          type="button"
          className={cls}
          role="tab"
          aria-selected={activeStep === s.key}
          onClick={() => onStep(s.key)}
        >
          <div className="fw-semibold small">
            {s.key}. {s.title}
          </div>
          <span className="payroll-step-desc text-muted">{s.desc}</span>
        </button>
      );
    })}
  </div>
);

export default PayrollStepHeader;
