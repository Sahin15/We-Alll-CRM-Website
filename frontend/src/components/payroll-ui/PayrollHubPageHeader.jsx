import { Button } from "react-bootstrap";
import {
  FaChartBar,
  FaCoins,
  FaFileInvoiceDollar,
  FaHistory,
  FaUsers,
  FaWallet,
} from "react-icons/fa";

/**
 * Hero-style header for Payroll Hub (V2).
 *
 * @param {{ onLegacyTools?: () => void }} props
 */
const PayrollHubPageHeader = ({ onLegacyTools }) => (
  <header className="payroll-hub-hero-header">
    <div className="payroll-hub-hero-header__glow" aria-hidden />
    <div className="payroll-hub-hero-header__inner">
      <div className="payroll-hub-hero-header__main">
        <span className="payroll-hub-hero-header__icon-wrap" aria-hidden>
          <FaWallet size={26} />
        </span>
        <div className="payroll-hub-hero-header__text">
          <p className="payroll-hub-hero-header__eyebrow mb-0">
            <FaCoins className="me-1" aria-hidden />
            Salary management
          </p>
          <h1 className="payroll-hub-hero-header__title mb-1">Payroll Hub</h1>
          <p className="payroll-hub-hero-header__desc mb-0">
            Manage employee compensation, payroll processing, payslips and
            salary payments.
          </p>
          <ul className="payroll-hub-hero-header__features">
            <li>
              <FaUsers aria-hidden />
              Compensation
            </li>
            <li>
              <FaCoins aria-hidden />
              Run payroll
            </li>
            <li>
              <FaFileInvoiceDollar aria-hidden />
              Payslips
            </li>
            <li>
              <FaChartBar aria-hidden />
              Finance desk
            </li>
          </ul>
        </div>
      </div>
      {onLegacyTools ? (
        <Button
          variant="light"
          size="sm"
          className="payroll-hub-hero-header__legacy"
          onClick={onLegacyTools}
        >
          <FaHistory className="me-2" aria-hidden />
          Legacy tools
        </Button>
      ) : null}
    </div>
  </header>
);

export default PayrollHubPageHeader;
