import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Alert, Button, ButtonGroup } from 'react-bootstrap';
import { FaExclamationTriangle, FaClock, FaPlus, FaCheckSquare } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';
import WorkItemList from '../../components/workitems/WorkItemList';
import WorkItemListWithBulk from '../../components/workitems/WorkItemListWithBulk';
import WorkItemDetailsModal from '../../components/workitems/WorkItemDetailsModal';
import WorkItemFilters from '../../components/workitems/WorkItemFilters';
import WorkItemSearch from '../../components/workitems/WorkItemSearch';
import StatisticsCards from '../../components/workitems/StatisticsCards';
import UnifiedWorkCreationModal from '../../components/work/UnifiedWorkCreationModal';

/**
 * MyWorkPage Component
 * Main page for viewing and managing all assigned work items
 * Requirements: 1.1, 1.3, 1.4, 8.2
 */
const MyWorkPage = () => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    dueDate: 'all'
  });
  const [activeFilter, setActiveFilter] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);

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
      toast.error('Failed to load your work items');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = workItems.filter((item) => item.type === 'task');
    const content = workItems.filter((item) => item.type === 'content');

    const overdue = workItems.filter((item) => {
      const dueDate = new Date(item.dueDate);
      return dueDate < today && item.status !== 'Done';
    });

    const dueToday = workItems.filter((item) => {
      const dueDate = new Date(item.dueDate);
      return (
        dueDate.toDateString() === today.toDateString() && item.status !== 'Done'
      );
    });

    const inProgress = workItems.filter(
      (item) => item.status === 'In Progress'
    );

    const completed = workItems.filter((item) => item.status === 'Done');

    return {
      total: workItems.length,
      tasks: tasks.length,
      content: content.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      inProgress: inProgress.length,
      completed: completed.length
    };
  }, [workItems]);

  // Filter work items
  const filteredItems = useMemo(() => {
    let filtered = [...workItems];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply card filter (from clicking statistics cards)
    if (activeFilter) {
      switch (activeFilter) {
        case 'dueToday':
          filtered = filtered.filter((item) => {
            const dueDate = new Date(item.dueDate);
            return (
              dueDate.toDateString() === today.toDateString() &&
              item.status !== 'Done'
            );
          });
          break;
        case 'inProgress':
          filtered = filtered.filter((item) => item.status === 'In Progress');
          break;
        case 'overdue':
          filtered = filtered.filter((item) => {
            const dueDate = new Date(item.dueDate);
            return dueDate < today && item.status !== 'Done';
          });
          break;
        case 'completed':
          filtered = filtered.filter((item) => item.status === 'Done');
          break;
        default:
          break;
      }
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.project?.name?.toLowerCase().includes(term) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    // Apply type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter((item) => item.type === filters.type);
    }

    // Apply priority filter
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter((item) => item.priority === filters.priority);
    }

    // Apply due date filter
    if (filters.dueDate && filters.dueDate !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      switch (filters.dueDate) {
        case 'overdue':
          filtered = filtered.filter((item) => {
            const dueDate = new Date(item.dueDate);
            return dueDate < now && item.status !== 'Done';
          });
          break;
        case 'today':
          filtered = filtered.filter((item) => {
            const dueDate = new Date(item.dueDate);
            return dueDate.toDateString() === now.toDateString();
          });
          break;
        case 'week':
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          filtered = filtered.filter((item) => {
            const dueDate = new Date(item.dueDate);
            return dueDate >= now && dueDate <= weekEnd;
          });
          break;
        case 'month':
          const monthEnd = new Date(now);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          filtered = filtered.filter((item) => {
            const dueDate = new Date(item.dueDate);
            return dueDate >= now && dueDate <= monthEnd;
          });
          break;
        default:
          break;
      }
    }

    // Sort by due date (earliest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return dateA - dateB;
    });

    return filtered;
  }, [workItems, searchTerm, filters, activeFilter]);

  const handleCardClick = (filterId) => {
    setActiveFilter(filterId);
    // Clear other filters when clicking a card
    if (filterId) {
      setFilters({
        status: 'all',
        type: 'all',
        priority: 'all',
        dueDate: 'all'
      });
    }
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      toast.success('Status updated successfully!');
      loadWorkItems();

      // Update selected item if it's the one being updated
      if (selectedItem && selectedItem._id === itemId) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
      throw error;
    }
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      type: 'all',
      priority: 'all',
      dueDate: 'all'
    });
    setActiveFilter(null);
    setSearchTerm('');
  };

  const handleBulkAction = async (action, selectedIds, data) => {
    try {
      const bulkData = {
        workItemIds: selectedIds,
        ...data
      };

      await workItemApi.bulkUpdate(bulkData);
      
      const actionMessages = {
        status: `Status updated for ${selectedIds.length} item(s)`,
        assignee: `Reassigned ${selectedIds.length} item(s)`,
        dueDate: `Due date changed for ${selectedIds.length} item(s)`,
        delete: `Deleted ${selectedIds.length} item(s)`
      };

      toast.success(actionMessages[action] || 'Bulk operation completed');
      loadWorkItems();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(error.response?.data?.message || 'Bulk operation failed');
    }
  };

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your work...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>My Work</h2>
          <p className="text-muted">
            View and manage all your assigned work items
          </p>
          <div className="alert alert-info py-2 mb-0">
            <small>
              <strong>💡 Unified Work System:</strong> Work items created here automatically sync to your calendar. 
              You can also create calendar entries that optionally create work items. 
              <a href="/calendar" className="ms-2 text-decoration-none">View Calendar →</a>
            </small>
          </div>
        </Col>
        <Col xs="auto" className="d-flex gap-2 align-items-center">
          <Button
            variant={bulkMode ? 'secondary' : 'outline-secondary'}
            onClick={() => setBulkMode(!bulkMode)}
            size="sm"
          >
            <FaCheckSquare className="me-2" />
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            size="sm"
            title="Create work items that automatically sync to your calendar"
          >
            <FaPlus className="me-2" />
            Create Work Item
          </Button>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <StatisticsCards
        stats={stats}
        activeFilter={activeFilter}
        onCardClick={handleCardClick}
      />

      {/* Active Filter Alert */}
      {activeFilter && (
        <Alert
          variant="info"
          className="mb-3 d-flex justify-content-between align-items-center"
        >
          <div>
            <strong>Filter Active:</strong> Showing{' '}
            {activeFilter === 'dueToday'
              ? 'items due today'
              : activeFilter === 'inProgress'
              ? 'items in progress'
              : activeFilter === 'overdue'
              ? 'overdue items'
              : activeFilter === 'completed'
              ? 'completed items'
              : 'all items'}
          </div>
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => setActiveFilter(null)}
          >
            Clear Filter
          </Button>
        </Alert>
      )}

      {/* Alerts */}
      {!activeFilter && stats.overdue > 0 && (
        <Alert variant="danger" className="mb-3">
          <FaExclamationTriangle className="me-2" />
          <strong>Attention!</strong> You have {stats.overdue} overdue item
          {stats.overdue > 1 ? 's' : ''}. Please prioritize these.
        </Alert>
      )}

      {!activeFilter && stats.dueToday > 0 && (
        <Alert variant="warning" className="mb-3">
          <FaClock className="me-2" />
          <strong>Reminder:</strong> You have {stats.dueToday} item
          {stats.dueToday > 1 ? 's' : ''} due today!
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={12}>
              <WorkItemSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </Col>
            <Col md={12}>
              <WorkItemFilters
                filters={filters}
                onFilterChange={setFilters}
                onClearFilters={handleClearFilters}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Work Items List */}
      <Card>
        <Card.Body className="p-0">
          <div className="p-3 border-bottom">
            <small className="text-muted">
              Showing {filteredItems.length} of {workItems.length} items
            </small>
          </div>
          {bulkMode ? (
            <WorkItemListWithBulk
              workItems={filteredItems}
              onViewItem={handleViewItem}
              onBulkAction={handleBulkAction}
              emptyMessage={
                workItems.length === 0
                  ? 'No work items assigned to you yet.'
                  : 'No items match your search criteria.'
              }
            />
          ) : (
            <WorkItemList
              workItems={filteredItems}
              onViewItem={handleViewItem}
              emptyMessage={
                workItems.length === 0
                  ? 'No work items assigned to you yet.'
                  : 'No items match your search criteria.'
              }
            />
          )}
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
        />
      )}

      {/* Unified Work Creation Modal */}
      <UnifiedWorkCreationModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={loadWorkItems}
        mode="my-work-focused"
      />
    </Container>
  );
};

export default MyWorkPage;
