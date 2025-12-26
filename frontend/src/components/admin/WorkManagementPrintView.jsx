import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { FaPrint, FaTimes } from 'react-icons/fa';
import moment from 'moment';
import './WorkManagementPrintView.css';

/**
 * Work Management Print View Component
 * Provides a printable/PDF-exportable view of work management data
 * Similar to the attendance report print view
 */
const WorkManagementPrintView = ({ workData, filters, analytics, onClose }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for smooth transition
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'overdue': return 'danger';
      case 'scheduled': return 'secondary';
      case 'cancelled': return 'dark';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Preparing print view...</p>
      </Container>
    );
  }

  return (
    <div className="work-management-print-view">
      {/* No-print controls */}
      <div className="no-print print-controls">
        <Button variant="primary" onClick={handlePrint} className="me-2">
          <FaPrint className="me-2" />
          Print / Save as PDF
        </Button>
        <Button variant="secondary" onClick={onClose}>
          <FaTimes className="me-2" />
          Close
        </Button>
      </div>

      {/* Printable content */}
      <Container className="print-content">
        {/* Header */}
        <div className="print-header text-center mb-4">
          <h1 className="mb-2">Work Management Report</h1>
          <p className="text-muted mb-1">
            Generated on: {moment().format('MMMM DD, YYYY [at] HH:mm')}
          </p>
          {filters && Object.keys(filters).length > 0 && (
            <p className="text-muted small">
              Filters Applied: {Object.entries(filters)
                .filter(([key, value]) => value && value !== 'all')
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </p>
          )}
        </div>

        {/* Analytics Summary */}
        {analytics && analytics.overall && (
          <Card className="mb-4 print-section">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Analytics Summary</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} sm={6} className="mb-3">
                  <div className="stat-box">
                    <div className="stat-label">Total Work</div>
                    <div className="stat-value">{analytics.overall.totalWork || 0}</div>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <div className="stat-box">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value text-success">
                      {analytics.overall.completedWork || 0}
                      <small className="ms-2">
                        ({analytics.overall.totalWork > 0 
                          ? Math.round((analytics.overall.completedWork / analytics.overall.totalWork) * 100) 
                          : 0}%)
                      </small>
                    </div>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <div className="stat-box">
                    <div className="stat-label">In Progress</div>
                    <div className="stat-value text-primary">
                      {analytics.overall.inProgressWork || 0}
                    </div>
                  </div>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <div className="stat-box">
                    <div className="stat-label">Overdue</div>
                    <div className="stat-value text-danger">
                      {analytics.overall.overdueWork || 0}
                    </div>
                  </div>
                </Col>
              </Row>

              {analytics.overall.totalEstimatedHours > 0 && (
                <Row className="mt-3">
                  <Col md={4} sm={6} className="mb-3">
                    <div className="stat-box">
                      <div className="stat-label">Estimated Hours</div>
                      <div className="stat-value">{analytics.overall.totalEstimatedHours || 0}</div>
                    </div>
                  </Col>
                  <Col md={4} sm={6} className="mb-3">
                    <div className="stat-box">
                      <div className="stat-label">Actual Hours</div>
                      <div className="stat-value">{analytics.overall.totalActualHours || 0}</div>
                    </div>
                  </Col>
                  <Col md={4} sm={6} className="mb-3">
                    <div className="stat-box">
                      <div className="stat-label">Efficiency</div>
                      <div className="stat-value">
                        {analytics.overall.totalEstimatedHours > 0
                          ? Math.round((analytics.overall.totalActualHours / analytics.overall.totalEstimatedHours) * 100)
                          : 0}%
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Work Entries Table */}
        <Card className="print-section">
          <Card.Header className="bg-secondary text-white">
            <h5 className="mb-0">Work Entries ({workData.length})</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table striped bordered hover responsive className="mb-0 print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {workData.length > 0 ? (
                  workData.map((work, index) => (
                    <tr key={work._id || index}>
                      <td>{index + 1}</td>
                      <td className="work-title">{work.title || 'N/A'}</td>
                      <td>{work.client?.name || 'Internal'}</td>
                      <td>{work.assignedTo?.name || 'Unassigned'}</td>
                      <td>
                        <Badge bg={getStatusBadgeClass(work.status)}>
                          {work.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getPriorityBadgeClass(work.priority)}>
                          {work.priority || 'Medium'}
                        </Badge>
                      </td>
                      <td>{work.startDate ? moment(work.startDate).format('MM/DD/YYYY') : 'N/A'}</td>
                      <td>{work.dueDate ? moment(work.dueDate).format('MM/DD/YYYY') : 'N/A'}</td>
                      <td>{work.completionPercentage || 0}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted">
                      No work entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        {/* Footer */}
        <div className="print-footer text-center mt-4">
          <p className="text-muted small mb-0">
            This report was generated by the Work Management System
          </p>
          <p className="text-muted small">
            © {moment().format('YYYY')} - All Rights Reserved
          </p>
        </div>
      </Container>
    </div>
  );
};

export default WorkManagementPrintView;
