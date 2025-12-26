import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import EmployeeWorkCalendar from '../../components/calendar/EmployeeWorkCalendar';

/**
 * Employee Work View Page
 * Shows a specific employee's work calendar and details
 */
const EmployeeWorkView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/employees')}
                className="me-3"
                style={{ borderRadius: '10px' }}
              >
                <FaArrowLeft className="me-2" />
                Back to Employees
              </Button>
              <div>
                <h4 className="mb-1 fw-bold text-dark">
                  <FaCalendarAlt className="me-2 text-primary" />
                  Employee Work Details
                </h4>
                <p className="mb-0 text-muted">
                  View work calendar, assignments, and project details
                </p>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Employee Work Calendar */}
      <EmployeeWorkCalendar employeeId={userId} />
    </Container>
  );
};

export default EmployeeWorkView;