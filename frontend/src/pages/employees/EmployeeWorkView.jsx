import React from 'react';
import { useParams } from 'react-router-dom';
import EnhancedEmployeeWorkView from './EnhancedEmployeeWorkView';

/**
 * Employee Work View Page (Legacy)
 * Redirects to the enhanced version
 * @deprecated Use EnhancedEmployeeWorkView instead
 */
const EmployeeWorkView = () => {
  return <EnhancedEmployeeWorkView />;
};

export default EmployeeWorkView;