import { useState } from "react";
import { Button, Offcanvas } from "react-bootstrap";
import { FaFilter } from "react-icons/fa";
import { useBreakpoint } from "../../context/BreakpointContext";

/**
 * Inline filters on desktop; bottom sheet on app-mobile (≤991px).
 */
const MobileFilterSheet = ({
  children,
  title = "Filters",
  activeFilterCount = 0,
  onApply,
  onClear,
  showApply = true,
}) => {
  const { isAppMobile } = useBreakpoint();
  const [show, setShow] = useState(false);

  if (!isAppMobile) {
    return <div className="mobile-filter-sheet__inline d-flex flex-wrap gap-2 align-items-end mb-3">{children}</div>;
  }

  return (
    <>
      <div className="d-flex gap-2 mb-3">
        <Button
          variant="outline-primary"
          className="touch-target flex-grow-1"
          onClick={() => setShow(true)}
        >
          <FaFilter className="me-2" />
          {title}
          {activeFilterCount > 0 && (
            <span className="badge bg-primary ms-2">{activeFilterCount}</span>
          )}
        </Button>
        {onClear && (
          <Button variant="outline-secondary" className="touch-target" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>

      <Offcanvas placement="bottom" show={show} onHide={() => setShow(false)} className="mobile-filter-offcanvas">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{title}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex flex-column gap-3">{children}</div>
          {showApply && onApply && (
            <Button
              className="w-100 mt-3 touch-target"
              variant="primary"
              onClick={() => {
                onApply();
                setShow(false);
              }}
            >
              Apply filters
            </Button>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default MobileFilterSheet;
