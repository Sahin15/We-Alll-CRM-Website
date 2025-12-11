import React from 'react';
import { Container } from 'react-bootstrap';
import AdminWorkOverview from '../../components/admin/AdminWorkOverview';

/**
 * Admin Work Calendar Overview Page
 * Comprehensive admin view of all work calendars
 */
const AdminWorkCalendarOverview = () => {
  return (
    <Container fluid className="py-4">
      <AdminWorkOverview />
    </Container>
  );
};

export default AdminWorkCalendarOverview;