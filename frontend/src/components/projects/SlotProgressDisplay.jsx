import React, { useState, useEffect } from 'react';
import { Card, Row, Col, ProgressBar, Badge, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { FaInfoCircle, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';

/**
 * SlotProgressDisplay Component
 * 
 * Displays detailed slot-based progress breakdown for a project
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
const SlotProgressDisplay = ({ 
  project, 
  slots = [], 
  showDetailed = true, 
  onSlotClick = null,
  realTimeUpdates = true 
}) => {
  const [progressData, setProgressData] = useState({
    totalSlots: 0,
    completedSlots: 0,
    assignedSlots: 0,
    availableSlots: 0,
    progressPercentage: 0
  });

  useEffect(() => {
    calculateProgressData();
  }, [project, slots]);

  const calculateProgressData = () => {
    if (!project || !slots) {
      setProgressData({
        totalSlots: 0,
        completedSlots: 0,
        assignedSlots: 0,
        availableSlots: 0,
        progressPercentage: 0
      });
      return;
    }

    const totalSlots = project.slotConfiguration?.totalSlots || slots.length || 0;
    const completedSlots = slots.filter(slot => 
      slot.assignmentStatus === 'completed' || 
      slot.completionStatus?.isCompleted
    ).length;
    const assignedSlots = slots.filter(slot => 
      slot.assignmentStatus === 'assigned' || 
      slot.assignmentStatus === 'in-progress'
    ).length;
    const availableSlots = slots.filter(slot => 
      slot.assignmentStatus === 'available'
    ).length;

    const progressPercentage = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

    setProgressData({
      totalSlots,
      completedSlots,
      assignedSlots,
      availableSlots,
      progressPercentage
    });
  };

  const getProgressVariant = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  const getSlotStatusBadge = (slot) => {
    const statusConfig = {
      'available': { bg: 'secondary', text: 'Available' },
      'assigned': { bg: 'primary', text: 'Assigned' },
      'in-progress': { bg: 'warning', text: 'In Progress' },
      'completed': { bg: 'success', text: 'Completed' },
      'blocked': { bg: 'danger', text: 'Blocked' },
      'cancelled': { bg: 'dark', text: 'Cancelled' }
    };

    const config = statusConfig[slot.assignmentStatus] || statusConfig['available'];
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const renderProgressTooltip = (props) => (
    <Tooltip id="progress-tooltip" {...props}>
      <div>
        <strong>Progress Breakdown:</strong><br/>
        Completed: {progressData.completedSlots}/{progressData.totalSlots} slots<br/>
        Assigned: {progressData.assignedSlots} slots<br/>
        Available: {progressData.availableSlots} slots
      </div>
    </Tooltip>
  );

  return (
    <Card className="slot-progress-display">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <FaCheckCircle className="me-2 text-success" />
          Slot-Based Progress
        </h5>
        <OverlayTrigger placement="left" overlay={renderProgressTooltip}>
          <Button variant="link" size="sm" className="p-0">
            <FaInfoCircle className="text-muted" />
          </Button>
        </OverlayTrigger>
      </Card.Header>

      <Card.Body>
        {/* Main Progress Display */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Overall Progress</h6>
            <div className="text-end">
              <span className="h5 mb-0">{progressData.progressPercentage}%</span>
              <div className="small text-muted">
                {progressData.completedSlots} / {progressData.totalSlots} slots
              </div>
            </div>
          </div>
          
          <ProgressBar 
            now={progressData.progressPercentage} 
            variant={getProgressVariant(progressData.progressPercentage)}
            style={{ height: '12px' }}
            className="mb-3"
          />

          {/* Progress Statistics */}
          <Row className="g-3">
            <Col xs={6} md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h4 mb-1 text-primary">{progressData.totalSlots}</div>
                <div className="small text-muted">Total Slots</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h4 mb-1 text-success">{progressData.completedSlots}</div>
                <div className="small text-muted">Completed</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h4 mb-1 text-warning">{progressData.assignedSlots}</div>
                <div className="small text-muted">In Progress</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-center p-2 bg-light rounded">
                <div className="h4 mb-1 text-secondary">{progressData.availableSlots}</div>
                <div className="small text-muted">Available</div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Detailed Slot Breakdown */}
        {showDetailed && slots.length > 0 && (
          <div>
            <h6 className="mb-3">Slot Details</h6>
            <div className="slot-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {slots.map((slot, index) => (
                <div 
                  key={slot._id || index}
                  className={`d-flex justify-content-between align-items-center p-2 border-bottom ${
                    onSlotClick ? 'slot-clickable' : ''
                  }`}
                  onClick={() => onSlotClick && onSlotClick(slot)}
                  style={{ 
                    cursor: onSlotClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (onSlotClick) {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onSlotClick) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      {slot.slotIdentifier || `Slot ${slot.slotNumber || index + 1}`}
                    </div>
                    <div className="small text-muted">
                      {slot.title || slot.description || 'No description'}
                    </div>
                    {slot.assignedTo && (
                      <div className="small text-info">
                        Assigned to: {slot.assignedTo.name || 'Unknown'}
                      </div>
                    )}
                  </div>
                  <div className="text-end">
                    {getSlotStatusBadge(slot)}
                    {slot.dueDate && (
                      <div className="small text-muted mt-1">
                        <FaClock className="me-1" />
                        {new Date(slot.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {slots.length === 0 && (
          <div className="text-center py-4">
            <FaExclamationTriangle className="text-muted mb-2" size={24} />
            <p className="text-muted mb-0">No slots configured for this project</p>
          </div>
        )}
      </Card.Body>

      <style>{`
        .slot-clickable:hover {
          background-color: #f8f9fa !important;
        }
        
        .slot-list::-webkit-scrollbar {
          width: 6px;
        }
        
        .slot-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .slot-list::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        
        .slot-list::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </Card>
  );
};

export default SlotProgressDisplay;