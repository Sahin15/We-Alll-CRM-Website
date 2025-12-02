import { Modal, Button } from "react-bootstrap";
import { FaExclamationTriangle, FaTrash, FaCheck, FaTimes } from "react-icons/fa";

const ConfirmDialog = ({
  show,
  onHide,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger', 'warning', 'primary', 'success'
  icon = null,
  isLoading = false,
}) => {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case "danger":
        return <FaTrash size={40} className="text-danger" />;
      case "warning":
        return <FaExclamationTriangle size={40} className="text-warning" />;
      case "success":
        return <FaCheck size={40} className="text-success" />;
      default:
        return <FaExclamationTriangle size={40} className="text-primary" />;
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={!isLoading}>
      <Modal.Header closeButton={!isLoading}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center py-4">
        <div className="mb-3">{getIcon()}</div>
        <p className="mb-0">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isLoading}>
          <FaTimes className="me-2" />
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Processing...
            </>
          ) : (
            <>
              <FaCheck className="me-2" />
              {confirmText}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDialog;
