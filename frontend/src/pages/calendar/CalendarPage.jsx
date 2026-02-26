import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, ListGroup } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import workItemApi from '../../api/workItemApi';
import WorkItemDetailsModal from '../../components/workitems/WorkItemDetailsModal';
import CalendarFilters from '../../components/calendar/CalendarFilters';
import AssignWorkModal from '../../components/work/AssignWorkModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

/**
 * CalendarPage Component
 * Unified calendar view of all user's work items
 * Requirements: 6.1, 6.2, 6.3, 6.4, 8.4
 */
const CalendarPage = () => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [filters, setFilters] = useState({
    project: 'all',
    type: 'all',
    status: 'all'
  });
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);

  useEffect(() => {
    loadWorkItems();
  }, [user]);

  const loadWorkItems = async () => {
    try {
      setLoading(true);
      const response = await workItemApi.getMyWork();
      setWorkItems(response.data || response.workItems || []);
    } catch (error) {
      console.error('Error loading work items:', error);
      toast.error('Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  // Filter work items
  const filteredItems = useMemo(() => {
    let filtered = [...workItems];

    if (filters.project && filters.project !== 'all') {
      filtered = filtered.filter((item) => item.project?._id === filters.project);
    }
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter((item) => item.type === filters.type);
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    return filtered;
  }, [workItems, filters]);

  // Convert work items to calendar events
  const events = useMemo(() => {
    return filteredItems
      .filter((item) => item.dueDate)
      .map((item) => ({
        id: item._id,
        title: item.title,
        start: new Date(item.dueDate),
        end: new Date(item.dueDate),
        resource: item
      }));
  }, [filteredItems]);

  const handleSelectEvent = (event) => {
    setSelectedItem(event.resource);
    setShowDetailsModal(true);
  };

  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    const itemsOnDate = filteredItems.filter((item) => {
      const itemDate = new Date(item.dueDate);
      return itemDate.toDateString() === start.toDateString();
    });
    
    if (itemsOnDate.length > 0) {
      setShowDayModal(true);
    }
  };

  const handleEventDrop = async ({ event, start }) => {
    try {
      const workItem = event.resource;
      const newDueDate = moment(start).format('YYYY-MM-DD');
      
      await workItemApi.updateWorkItem(workItem._id, { dueDate: newDueDate });
      toast.success('Due date updated successfully!');
      loadWorkItems();
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const handleUpdateStatus = async (itemId, newStatus, itemType) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      toast.success('Status updated successfully!');
      loadWorkItems();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

  const handleAddComment = async (workItemId, commentText) => {
    try {
      const result = await workItemApi.addComment(workItemId, commentText);
      // Refresh the work items to get updated data
      loadWorkItems();
      return result.data || result;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const eventStyleGetter = (event) => {
    const item = event.resource;
    let backgroundColor = '#6c757d';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Overdue items
    if (dueDate < today && item.status !== 'Done') {
      backgroundColor = '#dc3545';
    }
    // Due today
    else if (dueDate.toDateString() === today.toDateString() && item.status !== 'Done') {
      backgroundColor = '#ffc107';
    }
    // Color by status
    else {
      switch (item.status) {
        case 'To Do':
          backgroundColor = '#6c757d';
          break;
        case 'In Progress':
          backgroundColor = '#0d6efd';
          break;
        case 'Review':
          backgroundColor = '#ffc107';
          break;
        case 'Done':
          backgroundColor = '#198754';
          break;
        default:
          backgroundColor = '#6c757d';
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85rem',
        padding: '2px 5px'
      }
    };
  };

  const CustomEvent = ({ event }) => {
    const item = event.resource;
    return (
      <div>
        <div className="d-flex align-items-center">
          <Badge
            bg={item.type === 'content' ? 'success' : 'primary'}
            className="me-1"
            style={{ fontSize: '0.6rem' }}
          >
            {item.type === 'content' ? 'C' : 'T'}
          </Badge>
          <span style={{ fontSize: '0.75rem' }}>{event.title}</span>
        </div>
      </div>
    );
  };

  const itemsOnSelectedDate = selectedDate
    ? filteredItems.filter((item) => {
        const itemDate = new Date(item.dueDate);
        return itemDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  if (loading) {
    return (
      <Container fluid className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading calendar...</p>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>My Calendar</h2>
          <p className="text-muted">View all your work items on a calendar</p>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            onClick={() => setShowAssignWorkModal(true)}
          >
            <FaClock className="me-2" />
            Assign Work
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-3">
        <Card.Body>
          <CalendarFilters
            filters={filters}
            onFilterChange={setFilters}
            workItems={workItems}
          />
        </Card.Body>
      </Card>

      {/* Legend */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex gap-3 flex-wrap">
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#dc3545',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                />
                <small>Overdue</small>
              </div>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#ffc107',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                />
                <small>Due Today</small>
              </div>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#6c757d',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                />
                <small>To Do</small>
              </div>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#0d6efd',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                />
                <small>In Progress</small>
              </div>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#198754',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                />
                <small>Done</small>
              </div>
            </div>
            <div>
              <small className="text-muted">
                Click on an item to view details • Drag to reschedule
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Calendar */}
      <Card>
        <Card.Body style={{ height: '700px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent
            }}
            selectable
            resizable
            draggableAccessor={() => true}
            popup
            views={['month', 'week', 'day', 'agenda']}
            style={{ height: '100%' }}
          />
        </Card.Body>
      </Card>

      {/* Work Item Details Modal */}
      {selectedItem && (
        <WorkItemDetailsModal
          show={showDetailsModal}
          onHide={() => {
            setShowDetailsModal(false);
            setSelectedItem(null);
          }}
          workItem={selectedItem}
          onUpdate={handleUpdateStatus}
          onRefresh={loadWorkItems}
          onAddComment={handleAddComment}
          currentUser={user}
        />
      )}

      {/* Day View Modal */}
      <Modal
        show={showDayModal}
        onHide={() => setShowDayModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Work Items - {selectedDate && moment(selectedDate).format('MMMM D, YYYY')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {itemsOnSelectedDate.length === 0 ? (
            <p className="text-muted text-center py-4">No work items on this date</p>
          ) : (
            <ListGroup>
              {itemsOnSelectedDate.map((item) => (
                <ListGroup.Item
                  key={item._id}
                  action
                  onClick={() => {
                    setShowDayModal(false);
                    setSelectedItem(item);
                    setShowDetailsModal(true);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <Badge
                        bg={item.type === 'content' ? 'success' : 'primary'}
                        className="me-2"
                      >
                        {item.type === 'content' ? 'Content' : 'Task'}
                      </Badge>
                      <strong>{item.title}</strong>
                      {item.project && (
                        <div className="text-muted small mt-1">
                          {item.project.name}
                        </div>
                      )}
                    </div>
                    <Badge
                      bg={
                        item.status === 'Done' ? 'success' :
                        item.status === 'In Progress' ? 'primary' :
                        item.status === 'Review' ? 'warning' : 'secondary'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDayModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Work Modal */}
      <AssignWorkModal
        show={showAssignWorkModal}
        onHide={() => setShowAssignWorkModal(false)}
        onSuccess={loadWorkItems}
      />
    </Container>
  );
};

export default CalendarPage;
