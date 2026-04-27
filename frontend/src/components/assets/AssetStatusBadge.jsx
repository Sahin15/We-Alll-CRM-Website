import React from 'react';
import './AssetStatusBadge.css';

const AssetStatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'available':
        return 'badge-available';
      case 'assigned':
        return 'badge-assigned';
      case 'under_repair':
        return 'badge-under-repair';
      case 'lost':
        return 'badge-lost';
      case 'retired':
        return 'badge-retired';
      default:
        return 'badge-default';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'assigned':
        return 'Assigned';
      case 'under_repair':
        return 'Under Repair';
      case 'lost':
        return 'Lost';
      case 'retired':
        return 'Retired';
      default:
        return status;
    }
  };

  return (
    <span className={`asset-status-badge ${getStatusClass()}`}>
      {getStatusLabel()}
    </span>
  );
};

export default AssetStatusBadge;
