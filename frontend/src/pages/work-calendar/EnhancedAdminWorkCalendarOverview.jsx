import React from 'react';
import { Container } from 'react-bootstrap';
import EnhancedAdminWorkOverview from '../../components/admin/EnhancedAdminWorkOverview';

/**
 * Enhanced Admin Work Calendar Overview Page
 * Professional spreadsheet interface with client-focused filtering
 */
const EnhancedAdminWorkCalendarOverview = () => {
  return (
    <Container fluid className="py-4">
      <EnhancedAdminWorkOverview />
    </Container>
  );
};

export default EnhancedAdminWorkCalendarOverview;