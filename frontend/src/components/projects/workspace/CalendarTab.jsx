import { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import workItemApi from '../../../api/workItemApi';
import WorkItemDetailsModal from '../../workitems/WorkItemDetailsModal';
import { useAuth } from '../../../context/AuthContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

/**
 * CalendarTab Component
 * Calendar view of work items with drag-and-drop rescheduling
 * Requirements: 4.3, 6.4
 */
const CalendarTab = ({ project, onRefresh }) => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    loadWorkItems();
  }, [project._id]);

  const loadWorkItems = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjectWorkItems(project._id);
      setWorkItems(response.data || response.workItems || []);
    } catch (error) {
      console.error('Error loading work items:', error);
      toast.error('Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  // Convert work items to calendar events
  const events = useMemo(() => {
    return workItems
      .filter((item) => item.dueDate)
      .map((item) => ({
        id: item._id,
        title: item.title,
        start: new Date(item.dueDate),
        end: new Date(item.dueDate),
        resource: item
      }));
  }, [workItems]);

  const handleSelectEvent = (event) => {
    setSelectedItem(event.resource);
    setShowModal(true);
  };

  const handleSelectSlot = ({ start }) => {
    // Could open create modal with pre-filled date
    console.log('Selected date:', start);
  };

  const handleEventDrop = async ({ event, start }) => {
    try {
      const workItem = event.resource;
      const newDueDate = moment(start).format('YYYY-MM-DD');
      
      await workItemApi.updateWorkItem(workItem._id, { dueDate: newDueDate });
      toast.success('Due date updated successfully!');
      loadWorkItems();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      toast.success('Status updated successfully!');
      loadWorkItems();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

  const eventStyleGetter = (event) => {
    const item = event.resource;
    let backgroundColor = '#6c757d';

    // Color by status
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Calendar Info Banner */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <div className="d-flex align-items-center">
            <div className="me-3" style={{ fontSize: '2rem' }}>📅</div>
            <div>
              <h6 className="mb-1" style={{ fontWeight: '600' }}>Project Calendar View</h6>
              <small style={{ opacity: 0.9 }}>
                All work items with due dates are displayed here. Drag events to reschedule, click to view details.
                {workItems.length > 0 && ` Showing ${workItems.filter(i => i.dueDate).length} scheduled items out of ${workItems.length} total.`}
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Legend */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex gap-3 flex-wrap">
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
                    backgroundColor: '#ffc107',
                    borderRadius: '4px',
                    marginRight: '8px'
                  }}
                />
                <small>Review</small>
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
        <Card.Body style={{ height: '600px' }}>
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
          show={showModal}
          onHide={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
          workItem={selectedItem}
          onUpdate={handleUpdateStatus}
          onRefresh={loadWorkItems}
          currentUser={user}
          onEdit={() => {
            // For now, just close the modal
            // Edit functionality can be added later if needed
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

export default CalendarTab;
