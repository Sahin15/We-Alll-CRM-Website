import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Dropdown, Spinner } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import calendarApi from '../../api/calendarApi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './DepartmentCalendarView.css';

const localizer = momentLocalizer(moment);

/**
 * Department-specific calendar view with workflow stages
 */
const DepartmentCalendarView = ({ departmentId, departmentName }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState(null);
  const [currentView, setCurrentView] = useState('timeline');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    eventType: 'all',
    workflowStage: 'all',
    assignedTo: 'all',
  });

  useEffect(() => {
    if (departmentId) {
      loadDepartmentCalendar();
    }
  }, [departmentId, selectedDate, filters]);

  const loadDepartmentCalendar = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on current view
      const startDate = moment(selectedDate).startOf('month').toDate();
      const endDate = moment(selectedDate).endOf('month').toDate();
      
      const response = await calendarApi.getDepartmentCalendar(departmentId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        view: currentView,
      });
      
      setCalendarData(response.data);
    } catch (error) {
      console.error('Error loading department calendar:', error);
      toast.error('Failed to load department calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Transform events for calendar display
  const getCalendarEvents = () => {
    if (!calendarData?.events) return [];
    
    return calendarData.events
      .filter(event => {
        if (filters.eventType !== 'all' && event.eventType !== filters.eventType) return false;
        if (filters.workflowStage !== 'all' && event.workflowStage !== filters.workflowStage) return false;
        if (filters.assignedTo !== 'all' && !event.assignedTo.some(a => a.user._id === filters.assignedTo)) return false;
        return true;
      })
      .map(event => ({
        id: event._id,
        title: event.title,
        start: new Date(event.startDate),
        end: new Date(event.endDate),
        allDay: event.isAllDay,
        resource: event,
      }));
  };

  // Get workflow stage colors
  const getStageColor = (stage) => {
    if (!calendarData?.workflow?.calendarConfig?.colorScheme) return '#3B82F6';
    return calendarData.workflow.calendarConfig.colorScheme[stage] || '#3B82F6';
  };

  // Event style getter for calendar
  const eventStyleGetter = (event) => {
    const resource = event.resource;
    let backgroundColor = resource.color || '#3B82F6';
    
    if (resource.workflowStage) {
      backgroundColor = getStageColor(resource.workflowStage);
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: resource.status === 'completed' ? 0.7 : 1,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="text-center py-5">
        <p>No calendar data available</p>
      </div>
    );
  }

  return (
    <Container fluid className="department-calendar-view">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>{departmentName} Calendar</h2>
              <p className="text-muted mb-0">
                {calendarData.department.employeeCount} team members • 
                {calendarData.analytics.activeProjects} active projects
              </p>
            </div>
            
            {/* View Controls */}
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" size="sm">
                  View: {currentView}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleViewChange('timeline')}>
                    Timeline
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleViewChange('kanban')}>
                    Kanban
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleViewChange('calendar')}>
                    Calendar
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              
              <Button 
                variant="primary" 
                size="sm"
                onClick={loadDepartmentCalendar}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-2">
              <div className="d-flex gap-3 align-items-center">
                <small className="text-muted fw-bold">Filters:</small>
                
                {/* Event Type Filter */}
                <Dropdown size="sm">
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Type: {filters.eventType}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterChange('eventType', 'all')}>
                      All Types
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('eventType', 'work-item')}>
                      Work Items
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('eventType', 'meeting')}>
                      Meetings
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('eventType', 'deadline')}>
                      Deadlines
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                {/* Workflow Stage Filter */}
                {calendarData.workflow?.stages && (
                  <Dropdown size="sm">
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      Stage: {filters.workflowStage}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleFilterChange('workflowStage', 'all')}>
                        All Stages
                      </Dropdown.Item>
                      {calendarData.workflow.stages.map(stage => (
                        <Dropdown.Item 
                          key={stage.id}
                          onClick={() => handleFilterChange('workflowStage', stage.id)}
                        >
                          <Badge 
                            bg="light" 
                            text="dark"
                            style={{ backgroundColor: getStageColor(stage.id) }}
                            className="me-2"
                          >
                            ●
                          </Badge>
                          {stage.name}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                )}

                {/* Team Member Filter */}
                <Dropdown size="sm">
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Assignee: {filters.assignedTo === 'all' ? 'All' : 'Selected'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterChange('assignedTo', 'all')}>
                      All Team Members
                    </Dropdown.Item>
                    {calendarData.department.employees?.map(employee => (
                      <Dropdown.Item 
                        key={employee._id}
                        onClick={() => handleFilterChange('assignedTo', employee._id)}
                      >
                        {employee.name}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Main Calendar View */}
        <Col lg={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {currentView === 'calendar' && (
                <Calendar
                  localizer={localizer}
                  events={getCalendarEvents()}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 600 }}
                  onSelectEvent={handleEventSelect}
                  eventPropGetter={eventStyleGetter}
                  views={['month', 'week', 'day']}
                  defaultView="month"
                  popup
                />
              )}

              {currentView === 'timeline' && (
                <div className="timeline-view">
                  <h5 className="mb-3">Workflow Timeline</h5>
                  {calendarData.workflow?.stages?.map(stage => (
                    <div key={stage.id} className="timeline-stage mb-4">
                      <div className="d-flex align-items-center mb-2">
                        <Badge 
                          bg="light" 
                          text="dark"
                          style={{ backgroundColor: getStageColor(stage.id) }}
                          className="me-2"
                        >
                          ●
                        </Badge>
                        <h6 className="mb-0">{stage.name}</h6>
                        <Badge bg="secondary" className="ms-2">
                          {calendarData.workItemsByStage?.[stage.id]?.length || 0} items
                        </Badge>
                      </div>
                      
                      <div className="stage-items">
                        {calendarData.workItemsByStage?.[stage.id]?.map(workItem => (
                          <div key={workItem._id} className="stage-item p-2 mb-2 border rounded">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{workItem.title}</strong>
                                <div className="text-muted small">
                                  Assigned to: {workItem.assignedTo?.name}
                                </div>
                              </div>
                              <Badge 
                                bg={workItem.dueDate < new Date() ? 'danger' : 'primary'}
                              >
                                {moment(workItem.dueDate).format('MMM DD')}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentView === 'kanban' && (
                <div className="kanban-view">
                  <h5 className="mb-3">Kanban Board</h5>
                  <div className="d-flex gap-3" style={{ overflowX: 'auto' }}>
                    {calendarData.workflow?.stages?.map(stage => (
                      <div key={stage.id} className="kanban-column" style={{ minWidth: '250px' }}>
                        <div className="kanban-header p-2 rounded-top" style={{ backgroundColor: getStageColor(stage.id) }}>
                          <h6 className="text-white mb-0">{stage.name}</h6>
                          <small className="text-white-50">
                            {calendarData.workItemsByStage?.[stage.id]?.length || 0} items
                          </small>
                        </div>
                        
                        <div className="kanban-body border border-top-0 rounded-bottom p-2" style={{ minHeight: '400px' }}>
                          {calendarData.workItemsByStage?.[stage.id]?.map(workItem => (
                            <Card key={workItem._id} className="mb-2 kanban-card">
                              <Card.Body className="p-2">
                                <Card.Title className="h6 mb-1">{workItem.title}</Card.Title>
                                <Card.Text className="small text-muted mb-1">
                                  {workItem.assignedTo?.name}
                                </Card.Text>
                                <div className="d-flex justify-content-between align-items-center">
                                  <Badge 
                                    bg={workItem.priority === 'high' ? 'danger' : 
                                        workItem.priority === 'medium' ? 'warning' : 'secondary'}
                                  >
                                    {workItem.priority}
                                  </Badge>
                                  <small className="text-muted">
                                    {moment(workItem.dueDate).format('MMM DD')}
                                  </small>
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col lg={3}>
          {/* Department Analytics */}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Department Overview</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <span>Total Projects:</span>
                <Badge bg="primary">{calendarData.analytics.totalProjects}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Active Projects:</span>
                <Badge bg="success">{calendarData.analytics.activeProjects}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Total Work Items:</span>
                <Badge bg="info">{calendarData.analytics.totalWorkItems}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Completed:</span>
                <Badge bg="success">{calendarData.analytics.completedWorkItems}</Badge>
              </div>
              <div className="d-flex justify-content-between">
                <span>Overdue:</span>
                <Badge bg="danger">{calendarData.analytics.overdueWorkItems}</Badge>
              </div>
            </Card.Body>
          </Card>

          {/* Workflow Legend */}
          {calendarData.workflow?.stages && (
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-light">
                <h6 className="mb-0">Workflow Stages</h6>
              </Card.Header>
              <Card.Body>
                {calendarData.workflow.stages.map(stage => (
                  <div key={stage.id} className="d-flex align-items-center mb-2">
                    <Badge 
                      bg="light" 
                      text="dark"
                      style={{ backgroundColor: getStageColor(stage.id) }}
                      className="me-2"
                    >
                      ●
                    </Badge>
                    <span className="small">{stage.name}</span>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Recent Projects */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Recent Projects</h6>
            </Card.Header>
            <Card.Body>
              {calendarData.projects?.slice(0, 5).map(project => (
                <div key={project._id} className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <div className="fw-bold small">{project.name}</div>
                    <div className="text-muted small">
                      {project.client?.name || 'Internal'}
                    </div>
                  </div>
                  <Badge 
                    bg={project.status === 'In Progress' ? 'success' : 
                        project.status === 'Completed' ? 'primary' : 'secondary'}
                  >
                    {project.progress}%
                  </Badge>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DepartmentCalendarView;