import React from "react";
import "./LicenseStatusBadge.css";

const LicenseStatusBadge = ({ status, size = "md" }) => {
  const getStatusClass = () => {
    switch (status) {
      case "Active":
        return "badge-active";
      case "Expired":
        return "badge-expired";
      case "Inactive":
        return "badge-inactive";
      case "Revoked":
        return "badge-revoked";
      default:
        return "badge-default";
    }
  };

  return (
    <span className={`license-status-badge ${getStatusClass()} ${size}`}>
      {status}
    </span>
  );
};

export default LicenseStatusBadge;
