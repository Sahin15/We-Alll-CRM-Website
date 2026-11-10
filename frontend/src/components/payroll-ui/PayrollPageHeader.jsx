/** @param {{ title: string, description?: string, badge?: string, actions?: React.ReactNode }} props */
const PayrollPageHeader = ({ title, description, badge, actions }) => (
  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
    <div>
      <div className="d-flex align-items-center gap-2 mb-1">
        <h1 className="h4 mb-0">{title}</h1>
        {badge && (
          <span className="badge bg-light text-dark border">{badge}</span>
        )}
      </div>
      {description && <p className="text-muted small mb-0">{description}</p>}
    </div>
    {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export default PayrollPageHeader;
