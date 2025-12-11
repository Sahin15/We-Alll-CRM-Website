import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Dropdown, Spinner, Form, Modal } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import workCalendarApi from '../../api/workCalendarApi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './EmployeeWorkCalendar.css';

const localizer = momentLocalizer(moment);

/**
 * Employee Work Calendar Component
 * Shows personal work calendar with filtering and different views
 */
const EmployeeWorkCalendar = ({ employeeId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState(null);
  const [currentView, setCurrentView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    workType: 'all',
    project: 'all',
    priority: 'all',
    view: 'calendar'
  });

  const currentEmployeeId = employeeId || user?.id;

  useEffect(() => {
    if (currentEmployeeId) {
      loadEmployeeWorkCalendar();
    }
  }, [currentEmployeeId, selectedDate, filters]);

  const loadEmployeeWorkCalendar = async () => {
    try {
      setLoading(true);
      

      
      // Test: Check if APIs are working
      try {
        // Test work calendar API with detailed diagnostics
        const testResponse = await fetch('http://localhost:5000/api/work-calendar/test', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        const testData = await testResponse.json();

        
        if (testData.workItemsCount === 0) {
          toast.info('No work items found in "My Work". Please create some work items first.');

        } else {

          
          // If work items exist, test the sync
          const syncTestResponse = await fetch('http://localhost:5000/api/work-calendar/sync-my-work', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          const syncTestData = await syncTestResponse.json();

          
          if (syncTestData.success) {
            if (syncTestData.data.syncedCount > 0) {
              toast.success(`✅ Synced ${syncTestData.data.syncedCount} work items to calendar!`);
            } else if (syncTestData.data.skippedCount > 0) {
              toast.info(`ℹ️ ${syncTestData.data.skippedCount} work items already in calendar`);
            }
          }
        }
      } catch (testError) {
        console.error('❌ API Test Failed:', testError);
        toast.error('Failed to connect to work calendar API');
      }
      
      // Calculate date range based on current view
      const startDate = moment(selectedDate).startOf('month').subtract(1, 'week').toDate();
      const endDate = moment(selectedDate).endOf('month').add(1, 'week').toDate();
      

      
      // First, trigger sync to ensure work items are in calendar
      if (currentEmployeeId === user?.id) {

        try {
          const syncResponse = await workCalendarApi.syncMyWorkItemsToCalendar();

          if (syncResponse.data.syncedCount > 0) {
            toast.success(`Synced ${syncResponse.data.syncedCount} work items to calendar`);
          }
        } catch (syncError) {
          console.error('Sync failed:', syncError);
          toast.error(`Sync failed: ${syncError.response?.data?.message || syncError.message}`);
        }
      }
      

      const response = await workCalendarApi.getEmployeeWorkCalendar(currentEmployeeId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...filters
      });
      

      
      // Check if data is nested under 'data' property
      if (response.data?.data) {

      }
      
      // Fix: Extract the actual data from the nested structure
      const actualData = response.data.data || response.data;
      
      if (actualData?.workCalendar?.length > 0) {
        
        // Test date parsing
        actualData.workCalendar.forEach(entry => {
          // Check if pre-formatted or raw
          const startProp = entry.start || entry.startDate;
          const endProp = entry.end || entry.endDate;
          const startDate = new Date(startProp);
          const endDate = new Date(endProp);
          
          // Date parsing for entry - validate dates
          const isValid = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime());
        });
      } else {

      }
      
      setCalendarData(actualData);
      
      // Force a re-render to ensure calendar updates
      setTimeout(() => {

      }, 100);
    } catch (error) {
      console.error('Error loading employee work calendar:', error);
      toast.error(`Failed to load work calendar: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setFilters(prev => ({ ...prev, view }));
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event.resource);
    setShowEventModal(true);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleDateNavigate = (date) => {
    setSelectedDate(date);
  };

  // Transform work calendar entries for calendar display
  const getCalendarEvents = () => {

    
    if (!calendarData?.workCalendar) {

      return [];
    }
    
    const events = calendarData.workCalendar.map(entry => {
      // Check if this is already formatted by backend or needs transformation
      const isPreFormatted = entry.start && entry.end && entry.id;
      
      if (isPreFormatted) {
        // Backend already formatted the event - use as is

        return {
          id: entry.id,
          title: entry.title,
          start: new Date(entry.start),
          end: new Date(entry.end),
          allDay: entry.allDay || false,
          resource: entry.resource || entry,
        };
      } else {
        // Transform raw work calendar entry
        const sourceIndicator = entry.isAutoGenerated && entry.sourceModel === 'WorkItem' ? '📋 ' : '';
        const projectInfo = entry.project?.name ? ` (${entry.project.name})` : '';
        
        const event = {
          id: entry._id,
          title: `${sourceIndicator}${entry.title}${projectInfo}`,
          start: new Date(entry.startDate),
          end: new Date(entry.endDate),
          allDay: entry.isAllDay || false,
          resource: entry,
        };
        

        return event;
      }
    });
    

    return events;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'scheduled': '#6c757d',
      'in-progress': '#0d6efd',
      'completed': '#198754',
      'cancelled': '#dc3545',
      'postponed': '#fd7e14',
      'overdue': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#28a745',
      'medium': '#ffc107',
      'high': '#fd7e14',
      'urgent': '#dc3545'
    };
    return colors[priority] || '#6c757d';
  };

  // Event style getter for calendar
  const eventStyleGetter = (event) => {
    const resource = event.resource;
    const backgroundColor = getStatusColor(resource.status);
    const borderColor = getPriorityColor(resource.priority);
    
    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '4px',
        opacity: resource.status === 'completed' ? 0.7 : 1,
        color: 'white',
        display: 'block',
      },
    };
  };

  const handleCreateWork = () => {
    setShowCreateModal(true);
  };

  const handleSyncWorkItems = async () => {
    try {
      setLoading(true);
      const response = await workCalendarApi.syncMyWorkItemsToCalendar();
      toast.success(`Sync completed! ${response.data.syncedCount} new entries added.`);
      loadEmployeeWorkCalendar();
    } catch (error) {
      console.error('Error syncing work items:', error);
      toast.error('Failed to sync work items');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkStatus = async (entryId, newStatus) => {
    try {
      await workCalendarApi.updateWorkCalendarEntry(entryId, { status: newStatus });
      toast.success('Work status updated successfully');
      loadEmployeeWorkCalendar();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error updating work status:', error);
      toast.error('Failed to update work status');
    }
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
        <p>No work calendar data available</p>
      </div>
    );
  }

  return (
    <Container fluid className="employee-work-calendar">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                {currentEmployeeId === user?.id ? 'My Work Calendar' : `${calendarData.employee?.name}'s Work Calendar`}
              </h2>
              <p className="text-muted mb-0">
                {calendarData?.analytics?.totalWork || 0} total work entries • 
                {calendarData?.analytics?.completedWork || 0} completed • 
                {calendarData?.analytics?.overdueWork || 0} overdue
              </p>
              {currentEmployeeId === user?.id && (
                <div className="mt-1">
                  <small className="text-info d-block">
                    📅 Your work items from "My Work" are automatically synced to this calendar
                  </small>
                  <small className="text-muted">
                    📋 = Work Item • 📅 = Manual Entry
                  </small>
                </div>
              )}
            </div>
            
            {/* View Controls */}
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" size="sm">
                  View: {currentView}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleViewChange('calendar')}>
                    Calendar
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleViewChange('timeline')}>
                    Timeline
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleViewChange('list')}>
                    List
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              
              {currentEmployeeId === user?.id && (
                <>
                  <Button 
                    variant="success" 
                    size="sm"
                    onClick={handleCreateWork}
                  >
                    Add Work
                  </Button>
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={handleSyncWorkItems}
                  >
                    Sync My Work
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={() => {
                  setSelectedDate(new Date());
                  loadEmployeeWorkCalendar();
                }}
              >
                Today
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={loadEmployeeWorkCalendar}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Integration Status */}
      {currentEmployeeId === user?.id && (
        <Row className="mb-3">
          <Col>
            <div className={`alert py-2 mb-0 ${calendarData ? 'alert-info' : 'alert-warning'}`}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>📋 My Work Integration:</strong> 
                  <span className="ms-2">
                    {calendarData ? (
                      <>
                        {calendarData.workItems?.length || 0} work items • 
                        {calendarData.workCalendar?.filter(entry => entry.isAutoGenerated)?.length || 0} synced to calendar
                      </>
                    ) : (
                      'Loading integration status...'
                    )}
                  </span>
                </div>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={handleSyncWorkItems}
                    disabled={loading}
                  >
                    {loading ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => window.open('/my-work', '_blank')}
                  >
                    View My Work
                  </Button>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Row className="mb-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-2">
              <div className="d-flex gap-3 align-items-center flex-wrap">
                <small className="text-muted fw-bold">Filters:</small>
                
                {/* Status Filter */}
                <Dropdown size="sm">
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Status: {filters.status}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterChange('status', 'all')}>
                      All Status
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('status', 'scheduled')}>
                      Scheduled
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('status', 'in-progress')}>
                      In Progress
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('status', 'completed')}>
                      Completed
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('status', 'overdue')}>
                      Overdue
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                {/* Work Type Filter */}
                <Dropdown size="sm">
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Type: {filters.workType}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterChange('workType', 'all')}>
                      All Types
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('workType', 'work-item')}>
                      Work Items
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('workType', 'meeting')}>
                      Meetings
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('workType', 'deadline')}>
                      Deadlines
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('workType', 'review')}>
                      Reviews
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                {/* Priority Filter */}
                <Dropdown size="sm">
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Priority: {filters.priority}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleFilterChange('priority', 'all')}>
                      All Priorities
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('priority', 'urgent')}>
                      Urgent
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('priority', 'high')}>
                      High
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('priority', 'medium')}>
                      Medium
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleFilterChange('priority', 'low')}>
                      Low
                    </Dropdown.Item>
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
                <div>
                  <Calendar
                    localizer={localizer}
                    events={getCalendarEvents()}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 600 }}
                    onSelectEvent={handleEventSelect}
                    onNavigate={handleDateNavigate}
                    eventPropGetter={eventStyleGetter}
                    views={['month', 'week', 'day', 'agenda']}
                    defaultView="month"
                    date={selectedDate}
                    popup
                    showMultiDayTimes
                    step={30}
                    timeslots={2}
                  />
                </div>
              )}

              {currentView === 'timeline' && (
                <div className="timeline-view">
                  <h5 className="mb-3">Work Timeline</h5>
                  {calendarData.workCalendar
                    ?.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                    .map(work => (
                    <div key={work._id} className="timeline-item mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{work.title}</h6>
                          <p className="text-muted small mb-2">{work.description}</p>
                          <div className="d-flex gap-2 mb-2">
                            <Badge bg={work.status === 'completed' ? 'success' : 
                                      work.status === 'in-progress' ? 'primary' : 
                                      work.status === 'overdue' ? 'danger' : 'secondary'}>
                              {work.status}
                            </Badge>
                            <Badge bg={work.priority === 'urgent' ? 'danger' : 
                                      work.priority === 'high' ? 'warning' : 
                                      work.priority === 'medium' ? 'info' : 'light'}>
                              {work.priority}
                            </Badge>
                            <Badge bg="light" text="dark">{work.workType}</Badge>
                          </div>
                          <small className="text-muted">
                            {moment(work.startDate).format('MMM DD, YYYY HH:mm')} - 
                            {moment(work.endDate).format('MMM DD, YYYY HH:mm')}
                          </small>
                        </div>
                        <div className="text-end">
                          {work.project && (
                            <div className="small text-muted mb-1">
                              Project: {work.project.name}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleEventSelect({ resource: work })}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentView === 'list' && (
                <div className="list-view">
                  <h5 className="mb-3">Work List</h5>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Project</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Due Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calendarData.workCalendar?.map(work => (
                          <tr key={work._id}>
                            <td>
                              <div>
                                <strong>{work.title}</strong>
                                <div className="small text-muted">{work.workType}</div>
                              </div>
                            </td>
                            <td>{work.project?.name || 'No Project'}</td>
                            <td>
                              <Badge bg={work.status === 'completed' ? 'success' : 
                                        work.status === 'in-progress' ? 'primary' : 
                                        work.status === 'overdue' ? 'danger' : 'secondary'}>
                                {work.status}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={work.priority === 'urgent' ? 'danger' : 
                                        work.priority === 'high' ? 'warning' : 
                                        work.priority === 'medium' ? 'info' : 'light'}>
                                {work.priority}
                              </Badge>
                            </td>
                            <td>
                              {work.dueDate ? moment(work.dueDate).format('MMM DD, YYYY') : 'No due date'}
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleEventSelect({ resource: work })}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col lg={3}>
          {/* Analytics */}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Work Analytics</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <span>Total Work:</span>
                <Badge bg="primary">{calendarData?.analytics?.totalWork || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Completed:</span>
                <Badge bg="success">{calendarData?.analytics?.completedWork || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>In Progress:</span>
                <Badge bg="info">{calendarData?.analytics?.inProgressWork || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Scheduled:</span>
                <Badge bg="secondary">{calendarData?.analytics?.scheduledWork || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Overdue:</span>
                <Badge bg="danger">{calendarData?.analytics?.overdueWork || 0}</Badge>
              </div>
              
              <hr />
              
              <div className="d-flex justify-content-between mb-2">
                <span>Est. Hours:</span>
                <span>{calendarData?.analytics?.totalEstimatedHours || 0}h</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Actual Hours:</span>
                <span>{calendarData?.analytics?.totalActualHours || 0}h</span>
              </div>
              {calendarData?.analytics?.averageEfficiency && (
                <div className="d-flex justify-content-between">
                  <span>Efficiency:</span>
                  <Badge bg={calendarData.analytics.averageEfficiency >= 90 ? 'success' : 
                            calendarData.analytics.averageEfficiency >= 70 ? 'warning' : 'danger'}>
                    {calendarData.analytics.averageEfficiency}%
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Priority Breakdown */}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Priority Breakdown</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <span>Urgent:</span>
                <Badge bg="danger">{calendarData?.analytics?.workloadByPriority?.urgent || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>High:</span>
                <Badge bg="warning">{calendarData?.analytics?.workloadByPriority?.high || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Medium:</span>
                <Badge bg="info">{calendarData?.analytics?.workloadByPriority?.medium || 0}</Badge>
              </div>
              <div className="d-flex justify-content-between">
                <span>Low:</span>
                <Badge bg="light" text="dark">{calendarData?.analytics?.workloadByPriority?.low || 0}</Badge>
              </div>
            </Card.Body>
          </Card>

          {/* Recent Work Items */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">My Work Items</h6>
            </Card.Header>
            <Card.Body>
              {calendarData.workItems && calendarData.workItems.length > 0 ? (
                calendarData.workItems.slice(0, 5).map(item => (
                  <div key={item._id} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-bold small">{item.title}</div>
                      <div className="text-muted small">
                        Due: {moment(item.dueDate).format('MMM DD')}
                        {item.project?.name && ` • ${item.project.name}`}
                      </div>
                    </div>
                    <Badge 
                      bg={item.status === 'Done' ? 'success' : 
                          item.status === 'In Progress' ? 'primary' : 
                          item.status === 'Review' ? 'warning' : 'secondary'}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-muted small text-center py-3">
                  No work items found.
                  <br />
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={handleSyncWorkItems}
                    className="p-0 mt-1"
                  >
                    Sync My Work
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Event Details Modal */}
      <Modal show={showEventModal} onHide={() => setShowEventModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Work Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div>
              <h5>{selectedEvent.title}</h5>
              {selectedEvent.description && (
                <p className="text-muted">{selectedEvent.description}</p>
              )}
              
              <Row>
                <Col md={6}>
                  <strong>Status:</strong>
                  <Badge 
                    bg={selectedEvent.status === 'completed' ? 'success' : 
                        selectedEvent.status === 'in-progress' ? 'primary' : 
                        selectedEvent.status === 'overdue' ? 'danger' : 'secondary'}
                    className="ms-2"
                  >
                    {selectedEvent.status}
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Priority:</strong>
                  <Badge 
                    bg={selectedEvent.priority === 'urgent' ? 'danger' : 
                        selectedEvent.priority === 'high' ? 'warning' : 
                        selectedEvent.priority === 'medium' ? 'info' : 'light'}
                    className="ms-2"
                  >
                    {selectedEvent.priority}
                  </Badge>
                </Col>
              </Row>
              
              <hr />
              
              <Row>
                <Col md={6}>
                  <strong>Start:</strong> {moment(selectedEvent.startDate).format('MMM DD, YYYY HH:mm')}
                </Col>
                <Col md={6}>
                  <strong>End:</strong> {moment(selectedEvent.endDate).format('MMM DD, YYYY HH:mm')}
                </Col>
              </Row>
              
              {selectedEvent.dueDate && (
                <div className="mt-2">
                  <strong>Due Date:</strong> {moment(selectedEvent.dueDate).format('MMM DD, YYYY')}
                </div>
              )}
              
              {selectedEvent.project && (
                <div className="mt-2">
                  <strong>Project:</strong> {selectedEvent.project.name}
                </div>
              )}
              
              {selectedEvent.location && (
                <div className="mt-2">
                  <strong>Location:</strong> {selectedEvent.location}
                </div>
              )}
              
              {selectedEvent.timeTracking && (
                <div className="mt-3">
                  <h6>Time Tracking</h6>
                  <div>Estimated: {selectedEvent.timeTracking.estimatedHours}h</div>
                  <div>Actual: {selectedEvent.timeTracking.actualHours}h</div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {currentEmployeeId === user?.id && selectedEvent && selectedEvent.status !== 'completed' && (
            <div className="d-flex gap-2">
              {selectedEvent.status === 'scheduled' && (
                <Button 
                  variant="primary" 
                  onClick={() => handleUpdateWorkStatus(selectedEvent._id, 'in-progress')}
                >
                  Start Work
                </Button>
              )}
              {selectedEvent.status === 'in-progress' && (
                <Button 
                  variant="success" 
                  onClick={() => handleUpdateWorkStatus(selectedEvent._id, 'completed')}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          )}
          <Button variant="secondary" onClick={() => setShowEventModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeeWorkCalendar;