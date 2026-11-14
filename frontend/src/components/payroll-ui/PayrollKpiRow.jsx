import { Col, Row, Spinner } from "react-bootstrap";

const TONE_CLASS = {
  primary: "payroll-kpi-tone-primary",
  success: "payroll-kpi-tone-success",
  warning: "payroll-kpi-tone-warning",
  purple: "payroll-kpi-tone-purple",
  info: "payroll-kpi-tone-info",
  danger: "payroll-kpi-tone-danger",
};

/**
 * @param {{
 *   items: Array<{
 *     label: string,
 *     value: string | number,
 *     hint?: string,
 *     Icon?: import("react").ComponentType<{ size?: number }>,
 *     tone?: string,
 *   }>,
 *   loading?: boolean,
 *   variant?: "default" | "hub",
 * }} props
 */
const PayrollKpiRow = ({ items, loading, variant = "default" }) => (
  <Row className="g-2 mb-3">
    {items.map((item) => (
      <Col
        key={item.label}
        xs={6}
        md={4}
        lg={variant === "hub" ? 2 : undefined}
      >
        <div
          className={`payroll-kpi-card${
            variant === "hub" ? " payroll-kpi-card-hub" : ""
          }`}
        >
          {variant === "hub" && item.Icon && (
            <div
              className={`payroll-kpi-icon ${
                TONE_CLASS[item.tone] || TONE_CLASS.primary
              }`}
            >
              <item.Icon size={18} aria-hidden />
            </div>
          )}
          <div className="payroll-kpi-body">
            <div className="text-muted small">{item.label}</div>
            <div
              className={`payroll-kpi-value${
                variant === "hub" ? "" : " text-primary"
              }`}
            >
              {loading ? <Spinner size="sm" animation="border" /> : item.value}
            </div>
            {item.hint && (
              <div className="text-muted payroll-kpi-hint">{item.hint}</div>
            )}
          </div>
        </div>
      </Col>
    ))}
  </Row>
);

export default PayrollKpiRow;
