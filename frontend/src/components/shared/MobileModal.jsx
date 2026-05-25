import { Modal } from "react-bootstrap";
import { useBreakpoint } from "../../context/BreakpointContext";

/**
 * Full-screen modal on compact screens; standard centered modal on desktop.
 */
const MobileModal = ({
  show,
  onHide,
  title,
  children,
  footer,
  size = "lg",
  centered = true,
  ...rest
}) => {
  const { isCompact } = useBreakpoint();

  return (
    <Modal
      show={show}
      onHide={onHide}
      size={isCompact ? undefined : size}
      fullscreen={isCompact ? "sm-down" : undefined}
      centered={!isCompact && centered}
      className={isCompact ? "mobile-modal" : undefined}
      {...rest}
    >
      {title && (
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
      )}
      <Modal.Body>{children}</Modal.Body>
      {footer && (
        <Modal.Footer className={isCompact ? "mobile-modal-footer sticky-bottom" : undefined}>
          {footer}
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default MobileModal;
