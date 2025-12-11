import React from 'react';
import { Container } from 'react-bootstrap';
import EmployeeWorkCalendar from '../../components/calendar/EmployeeWorkCalendar';

/**
 * My Work Calendar Page
 * Employee's personal work calendar view
 */
const MyWorkCalendar = () => {
  return (
    <Container fluid className="py-4">
      <EmployeeWorkCalendar />
    </Container>
  );
};

export default MyWorkCalendar;