import { Modal, Button, Spinner } from "react-bootstrap";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";
import "../../styles/modal-mobile.css";

const ConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title,
  message,
  subMessage,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  icon = "clock",
  loading = false,
  additionalInfo = null
}) => {
  const getIcon = () => {
    switch (icon) {
      case "clock":
        return <FaClock className="text-primary fs-1 mb-3" />;
      case "warning":
        return <FaExclamationTriangle className="text-warning fs-1 mb-3" />;
      default:
        return <FaClock className="text-primary fs-1 mb-3" />;
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered
      backdrop="static"
      keyboard={false}
      className="confirm-modal"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center py-3">
          {getIcon()}
          <h5 className="mb-3">{message}</h5>
          {subMessage && (
            <p className="text-muted mb-3">{subMessage}</p>
          )}
          {additionalInfo && (
            <div className="alert alert-info mb-0">
              {additionalInfo}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button 
          variant="outline-secondary" 
          onClick={onHide} 
          disabled={loading}
          className="w-mobile-100"
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={loading}
          className="w-mobile-100"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Processing...
            </>
          ) : (
            confirmText
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
