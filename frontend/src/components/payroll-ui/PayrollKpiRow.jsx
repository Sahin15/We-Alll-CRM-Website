import { Col, Row, Spinner } from "react-bootstrap";

/** @param {{ items: Array<{label:string,value:string|number,hint?:string}>, loading?: boolean }} props */
const PayrollKpiRow = ({ items, loading }) => (
  <Row className="g-2 mb-3">
    {items.map((item) => (
      <Col key={item.label} xs={6} md={3} lg>
        <div className="payroll-kpi-card">
          <div className="text-muted small">{item.label}</div>
          <div className="payroll-kpi-value text-primary">
            {loading ? <Spinner size="sm" animation="border" /> : item.value}
          </div>
          {item.hint && (
            <div className="text-muted" style={{ fontSize: "0.7rem" }}>
              {item.hint}
            </div>
          )}
        </div>
      </Col>
    ))}
  </Row>
);

export default PayrollKpiRow;
