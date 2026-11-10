const VARIANTS = {
  draft: { bg: "#e9ecef", color: "#495057", label: "Draft" },
  preview: { bg: "#cff4fc", color: "#055160", label: "Preview" },
  credited: { bg: "#d1e7dd", color: "#0f5132", label: "Credited" },
  paid: { bg: "#d1e7dd", color: "#0f5132", label: "Paid" },
  warning: { bg: "#fff3cd", color: "#664d03", label: "Attention" },
  danger: { bg: "#f8d7da", color: "#842029", label: "Blocked" },
  muted: { bg: "#f1f3f5", color: "#6c757d", label: "—" },
};

/** @param {{ variant?: string, label?: string, className?: string }} props */
const StatusChip = ({ variant = "muted", label, className = "" }) => {
  const v = VARIANTS[variant] || VARIANTS.muted;
  return (
    <span
      className={`payroll-status-chip ${className}`}
      style={{ background: v.bg, color: v.color }}
    >
      {label || v.label}
    </span>
  );
};

export default StatusChip;
