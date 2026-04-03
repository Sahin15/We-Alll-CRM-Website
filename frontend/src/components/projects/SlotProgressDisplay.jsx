import React, { useState, useEffect } from 'react';
import { Card, Row, Col, ProgressBar, Badge, Button, Tooltip, OverlayTrigger, Modal, Form, Alert } from 'react-bootstrap';
import { FaInfoCircle, FaCheckCircle, FaClock, FaExclamationTriangle, FaEdit, FaUser } from 'react-icons/fa';

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
  onSlotReassign = null,
  availableUsers = [],
  realTimeUpdates = true 
}) => {
  const [progressData, setProgressData] = useState({
    totalSlots: 0,
    completedSlots: 0,
    assignedSlots: 0,
    availableSlots: 0,
    progressPercentage: 0
  });

  // Slot reassignment modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState('');
  
  // Month selection state
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    calculateProgressData();
    initializeMonths();
  }, [project, slots]);

  useEffect(() => {
    calculateProgressData();
  }, [selectedMonth]);

  const initializeMonths = () => {
    if (!slots || slots.length === 0) {
      setAvailableMonths([]);
      setSelectedMonth(null);
      return;
    }

    // Get unique months from slots
    const months = [...new Set(slots.map(s => s.period?.periodIdentifier))].filter(Boolean);
    months.sort(); // Sort chronologically
    setAvailableMonths(months);

    // Determine current month in YYYY-MM format
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentPeriodIdentifier = `${currentYear}-${currentMonth}`;

    // Set current month as default if available, otherwise first available month
    const defaultMonth = months.includes(currentPeriodIdentifier) ? currentPeriodIdentifier : months[0];
    setSelectedMonth(defaultMonth);
  };

  const calculateProgressData = () => {
    if (!project || !slots || !selectedMonth) {
      setProgressData({
        totalSlots: 0,
        completedSlots: 0,
        assignedSlots: 0,
        availableSlots: 0,
        progressPercentage: 0
      });
      return;
    }

    // Filter slots for selected month only
    const monthSlots = slots.filter(slot => slot.period?.periodIdentifier === selectedMonth);

    const totalSlots = monthSlots.length || 0;
    const completedSlots = monthSlots.filter(slot => 
      slot.assignmentStatus === 'completed' || 
      slot.completionStatus?.isCompleted
    ).length;
    const assignedSlots = monthSlots.filter(slot => 
      slot.assignmentStatus === 'assigned' || 
      slot.assignmentStatus === 'in-progress'
    ).length;
    const availableSlots = monthSlots.filter(slot => 
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

  const formatDateDMY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatMonthDisplay = (periodIdentifier) => {
    if (!periodIdentifier) return periodIdentifier;
    // Format: "2024-03" -> "March 2024"
    const [year, month] = periodIdentifier.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
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

  // Handle slot click for reassignment
  const handleSlotClick = (slot) => {
    if (slot.assignmentStatus === 'assigned' && slot.assignedWorkItem) {
      setSelectedSlot(slot);
      setSelectedUser(slot.assignedWorkItem?.assignedTo?._id || '');
      setShowReassignModal(true);
      setReassignError('');
    } else if (onSlotClick) {
      onSlotClick(slot);
    }
  };

  // Handle slot reassignment
  const handleReassignSlot = async () => {
    if (!selectedSlot || !selectedUser) {
      setReassignError('Please select a user to assign the slot to.');
      return;
    }

    try {
      setReassignLoading(true);
      setReassignError('');

      if (onSlotReassign) {
        await onSlotReassign(selectedSlot, selectedUser);
      }

      setShowReassignModal(false);
      setSelectedSlot(null);
      setSelectedUser('');
    } catch (error) {
      setReassignError(error.message || 'Failed to reassign slot. Please try again.');
    } finally {
      setReassignLoading(false);
    }
  };

  // Close reassignment modal
  const handleCloseReassignModal = () => {
    setShowReassignModal(false);
    setSelectedSlot(null);
    setSelectedUser('');
    setReassignError('');
  };

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
        {/* Month Selector - Only show if multiple months available */}
        {availableMonths.length > 1 && (
          <div className="mb-4 p-3 bg-light rounded">
            <div className="d-flex align-items-center gap-3">
              <label className="mb-0 fw-semibold">📅 Select Month:</label>
              <Form.Select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ maxWidth: '300px' }}
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {formatMonthDisplay(month)}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        )}

        {/* Main Progress Display */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              {selectedMonth ? `${formatMonthDisplay(selectedMonth)} - Overall Progress` : 'Overall Progress'}
            </h6>
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

        {/* Detailed Slot Breakdown - Only for selected month */}
        {showDetailed && selectedMonth && (
          <div>
            <h6 className="mb-3">Slot Details - {formatMonthDisplay(selectedMonth)}</h6>
            <div className="slot-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {slots
                .filter(slot => slot.period?.periodIdentifier === selectedMonth)
                .sort((a, b) => {
                  const statusOrder = { 'assigned': 1, 'in-progress': 2, 'completed': 3, 'available': 4 };
                  const aOrder = statusOrder[a.assignmentStatus] || 5;
                  const bOrder = statusOrder[b.assignmentStatus] || 5;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return (a.slotNumber || 0) - (b.slotNumber || 0);
                })
                .map((slot, index) => (
                <div 
                  key={slot._id || index}
                  className={`d-flex justify-content-between align-items-center p-2 border-bottom ${
                    slot.assignmentStatus === 'assigned' || slot.assignedWorkItem ? 'bg-light' : ''
                  }`}
                >
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center">
                      {/* Clickable Slot Number */}
                      <Button
                        variant={slot.assignmentStatus === 'assigned' ? 'primary' : 'outline-secondary'}
                        size="sm"
                        className="me-2"
                        onClick={() => handleSlotClick(slot)}
                        disabled={slot.assignmentStatus !== 'assigned'}
                        title={slot.assignmentStatus === 'assigned' ? 'Click to reassign this slot' : 'Slot not assigned'}
                        style={{ minWidth: '60px' }}
                      >
                        <FaEdit className="me-1" size={10} />
                        {slot.slotNumber || index + 1}
                      </Button>
                      
                      <div>
                        <div className="fw-semibold small">
                          {slot.assignmentStatus === 'assigned' && slot.assignedWorkItem ? 
                            slot.assignedWorkItem.title : 
                            (slot.title && slot.title !== `Slot ${slot.slotNumber} - Work Assignment` ? 
                              slot.title : 
                              'Available for assignment'
                            )
                          }
                        </div>
                        {(slot.assignmentStatus === 'assigned' && slot.assignedWorkItem) && (
                          <div className="small text-info d-flex align-items-center">
                            <FaUser className="me-1" size={10} />
                            Assigned to: {slot.assignedWorkItem?.assignedTo?.name || 'Unknown'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    {getSlotStatusBadge(slot)}
                    {slot.dueDate && (
                      <div className="small text-muted mt-1">
                        <FaClock className="me-1" />
                        {formatDateDMY(slot.dueDate)}
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

      {/* Slot Reassignment Modal */}
      <Modal show={showReassignModal} onHide={handleCloseReassignModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEdit className="me-2" />
            Reassign Slot {selectedSlot?.slotNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reassignError && (
            <Alert variant="danger" className="mb-3">
              {reassignError}
            </Alert>
          )}
          
          <div className="mb-3">
            <h6>Current Assignment:</h6>
            <div className="p-2 bg-light rounded">
              <div><strong>Work Item:</strong> {selectedSlot?.assignedWorkItem?.title}</div>
              <div><strong>Current Assignee:</strong> {selectedSlot?.assignedWorkItem?.assignedTo?.name}</div>
            </div>
          </div>

          <Form.Group>
            <Form.Label>
              <strong>Reassign to:</strong>
            </Form.Label>
            <Form.Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              disabled={reassignLoading}
            >
              <option value="">Select a user...</option>
              {availableUsers.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Select a new user to assign this work item to.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleCloseReassignModal}
            disabled={reassignLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleReassignSlot}
            disabled={reassignLoading || !selectedUser}
          >
            {reassignLoading ? 'Reassigning...' : 'Reassign Slot'}
          </Button>
        </Modal.Footer>
      </Modal>

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