import { Badge } from "react-bootstrap";
import { FaClock, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";

const PaymentStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: {
      bg: "warning",
      text: "Pending Verification",
      icon: <FaClock className="me-1" />,
    },
    verified: {
      bg: "success",
      text: "Verified",
      icon: <FaCheckCircle className="me-1" />,
    },
    rejected: {
      bg: "danger",
      text: "Rejected",
      icon: <FaTimesCircle className="me-1" />,
    },
    paid: {
      bg: "success",
      text: "Paid",
      icon: <FaCheckCircle className="me-1" />,
    },
    overdue: {
      bg: "danger",
      text: "Overdue",
      icon: <FaExclamationTriangle className="me-1" />,
    },
    partial: {
      bg: "info",
      text: "Partial Payment",
      icon: <FaClock className="me-1" />,
    },
    cancelled: {
      bg: "secondary",
      text: "Cancelled",
      icon: <FaTimesCircle className="me-1" />,
    },
  };

  const config = statusConfig[status?.toLowerCase()] || {
    bg: "secondary",
    text: status || "Unknown",
    icon: null,
  };

  return (
    <Badge bg={config.bg} className="d-inline-flex align-items-center">
      {config.icon}
      {config.text}
    </Badge>
  );
};

export default PaymentStatusBadge;
