import React from 'react';
import { Alert, Button, Card, Row, Col } from 'react-bootstrap';
import { 
  FaExclamationTriangle, 
  FaPlus, 
  FaSync, 
  FaCog,
  FaInfoCircle,
  FaProjectDiagram,
  FaUsers
} from 'react-icons/fa';

/**
 * NoSlotsAvailable Component
 * 
 * Displays appropriate messaging and actions when no slots are available
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */
const NoSlotsAvailable = ({
  projectId,
  projectName = 'this project',
  reason = 'no-slots', // 'no-slots', 'all-assigned', 'no-project', 'loading-error'
  canCreateSlots = false,
  canManageProject = false,
  onCreateSlot = null,
  onRefresh = null,
  onManageProject = null,
  onSelectDifferentProject = null,
  className = ''
}) => {
  const getReasonConfig = () => {
    const configs = {
      'no-slots': {
        title: 'No Slots Configured',
        message: 'This project doesn\'t have any slots set up yet.',
        icon: FaProjectDiagram,
        variant: 'info',
        suggestions: [
          'Slots need to be created before work items can be assigned',
          'Contact your project manager to set up project slots',
          'Check if slot-based tracking is enabled for this project'
        ]
      },
      'all-assigned': {
        title: 'All Slots Are Assigned',
        message: 'All available slots in this project are currently assigned or completed.',
        icon: FaUsers,
        variant: 'warning',
        suggestions: [
          'Wait for current slots to be completed',
          'Check if additional slots can be created',
          'Consider reassigning existing slots if priorities have changed'
        ]
      },
      'no-project': {
        title: 'No Project Selected',
        message: 'Please select a project first to view available slots.',
        icon: FaExclamationTriangle,
        variant: 'primary',
        suggestions: [
          'Choose a project from the dropdown above',
          'Make sure you have access to projects with slot-based tracking',
          'Contact your administrator if you don\'t see any projects'
        ]
      },
      'loading-error': {
        title: 'Unable to Load Slots',
        message: 'There was an error loading the available slots for this project.',
        icon: FaExclamationTriangle,
        variant: 'danger',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ]
      }
    };

    return configs[reason] || configs['no-slots'];
  };

  const config = getReasonConfig();
  const IconComponent = config.icon;

  const renderActionButtons = () => {
    const buttons = [];

    // Refresh button (always available except for no-project)
    if (reason !== 'no-project' && onRefresh) {
      buttons.push(
        <Button
          key="refresh"
          variant="outline-secondary"
          size="sm"
          onClick={onRefresh}
          className="me-2"
        >
          <FaSync className="me-1" />
          Refresh Slots
        </Button>
      );
    }

    // Create slot button (for project managers)
    if (canCreateSlots && onCreateSlot && (reason === 'no-slots' || reason === 'all-assigned')) {
      buttons.push(
        <Button
          key="create"
          variant="primary"
          size="sm"
          onClick={onCreateSlot}
          className="me-2"
        >
          <FaPlus className="me-1" />
          Create New Slot
        </Button>
      );
    }

    // Manage project button (for project managers)
    if (canManageProject && onManageProject && projectId) {
      buttons.push(
        <Button
          key="manage"
          variant="outline-primary"
          size="sm"
          onClick={onManageProject}
          className="me-2"
        >
          <FaCog className="me-1" />
          Manage Project
        </Button>
      );
    }

    // Select different project button
    if (onSelectDifferentProject && reason !== 'no-project') {
      buttons.push(
        <Button
          key="select-project"
          variant="outline-info"
          size="sm"
          onClick={onSelectDifferentProject}
        >
          <FaProjectDiagram className="me-1" />
          Select Different Project
        </Button>
      );
    }

    return buttons;
  };

  const renderDetailedInfo = () => {
    if (reason === 'no-project') {
      return (
        <Card className="mt-3">
          <Card.Body>
            <h6 className="mb-3">
              <FaInfoCircle className="me-2 text-info" />
              About Slot-Based Work Assignment
            </h6>
            <p className="mb-2">
              Slot-based work assignment helps organize project work into discrete, manageable units:
            </p>
            <ul className="mb-0">
              <li>Each slot represents a specific piece of work or milestone</li>
              <li>Slots can have dependencies, due dates, and effort estimates</li>
              <li>Work items are assigned to specific slots for better tracking</li>
              <li>Project progress is calculated based on slot completion</li>
            </ul>
          </Card.Body>
        </Card>
      );
    }

    if (reason === 'no-slots' && projectId) {
      return (
        <Card className="mt-3">
          <Card.Body>
            <h6 className="mb-3">
              <FaProjectDiagram className="me-2 text-info" />
              Setting Up Slots for {projectName}
            </h6>
            <p className="mb-2">
              To use slot-based work assignment, this project needs to have slots configured:
            </p>
            <Row className="g-3">
              <Col md={6}>
                <div className="border rounded p-3">
                  <h6 className="text-primary">For Project Managers</h6>
                  <ul className="mb-0 small">
                    <li>Go to Project Settings</li>
                    <li>Enable slot-based tracking</li>
                    <li>Create project slots</li>
                    <li>Set up dependencies and timelines</li>
                  </ul>
                </div>
              </Col>
              <Col md={6}>
                <div className="border rounded p-3">
                  <h6 className="text-success">For Team Members</h6>
                  <ul className="mb-0 small">
                    <li>Wait for slots to be created</li>
                    <li>Contact your project manager</li>
                    <li>Use regular work item creation for now</li>
                    <li>Check back later for slot availability</li>
                  </ul>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className={`no-slots-available ${className}`}>
      <Alert variant={config.variant} className="mb-0">
        <div className="d-flex align-items-start">
          <IconComponent className="me-3 mt-1" size={24} />
          <div className="flex-grow-1">
            <h5 className="alert-heading mb-2">{config.title}</h5>
            <p className="mb-3">{config.message}</p>
            
            {config.suggestions && config.suggestions.length > 0 && (
              <div className="mb-3">
                <strong>What you can do:</strong>
                <ul className="mb-0 mt-1">
                  {config.suggestions.map((suggestion, index) => (
                    <li key={index} className="small">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {renderActionButtons().length > 0 && (
              <div className="d-flex flex-wrap gap-2">
                {renderActionButtons()}
              </div>
            )}
          </div>
        </div>
      </Alert>

      {renderDetailedInfo()}
    </div>
  );
};

export default NoSlotsAvailable;