import { Button } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

/** @param {{ show: boolean, onHide: () => void, title: string, children: React.ReactNode }} props */
const PayrollDrawer = ({ show, onHide, title, children }) => {
  if (!show) return null;

  return (
    <>
      <div
        className="payroll-drawer-backdrop"
        onClick={onHide}
        onKeyDown={(e) => e.key === "Escape" && onHide()}
        role="button"
        tabIndex={0}
        aria-label="Close panel"
      />
      <div className="payroll-drawer-panel">
        <div className="d-flex align-items-center justify-content-between border-bottom px-3 py-2">
          <h5 className="mb-0 h6">{title}</h5>
          <Button variant="link" className="text-secondary p-0" onClick={onHide}>
            <FaTimes />
          </Button>
        </div>
        <div className="payroll-drawer-body">{children}</div>
      </div>
    </>
  );
};

export default PayrollDrawer;
