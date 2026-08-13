import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup } from 'react-bootstrap';
import { FaClock, FaCheckSquare } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';
import WorkItemList from '../../components/workitems/WorkItemList';
import WorkItemListWithBulk from '../../components/workitems/WorkItemListWithBulk';
import WorkItemDetailsModal from '../../components/workitems/WorkItemDetailsModal';
import WorkItemSearch from '../../components/workitems/WorkItemSearch';
import AssignWorkModal from '../../components/work/AssignWorkModal';
import {
  getEffectiveStatusForUser,
  isPendingWorkItem,
} from '../../utils/workItemUtils';

/**
 * MyWorkPage Component
 * Main page for viewing and managing all assigned work items
 */
const MyWorkPage = () => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Default to today's items so My Work opens focused on what is due now
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
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
      toast.error('Failed to load your work items');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let totalThisMonth = 0;
    let dueToday = 0;
    let inProgress = 0;
    let overdue = 0;
    let completedThisMonth = 0;
    let cancelledThisMonth = 0;
    let overdueItems = [];
    let dueTodayItems = [];
    let inProgressItems = [];

    workItems.forEach((item) => {
      // Skip soft-deleted items (safety net)
      if (item.isDeleted) return;

      const dueDate = item.dueDate ? new Date(item.dueDate) : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);
      const itemMonth = dueDate ? dueDate.getMonth() : -1;
      const itemYear = dueDate ? dueDate.getFullYear() : -1;

      // Count items this month
      if (itemMonth === currentMonth && itemYear === currentYear) {
        totalThisMonth++;
      }

      // Count completed this month
      const itemStatus = getEffectiveStatusForUser(item, user?._id);
      if (itemStatus === 'Done' && itemMonth === currentMonth && itemYear === currentYear) {
        completedThisMonth++;
      }

      // Count cancelled this month
      if (itemStatus === 'Cancelled' && itemMonth === currentMonth && itemYear === currentYear) {
        cancelledThisMonth++;
      }

      // Count due today — only non-Done, non-Cancelled items
      if (dueDate && dueDate.getTime() === today.getTime() && !['Done', 'Cancelled'].includes(itemStatus)) {
        dueToday++;
        dueTodayItems.push(item);
      }

      // Count in progress
      if (itemStatus === 'In Progress') {
        inProgress++;
        inProgressItems.push(item);
      }

      // Count overdue — use backend-computed flag with per-user status
      if (!['Done', 'Cancelled'].includes(itemStatus) && item.isOverdue === true) {
        overdue++;
        overdueItems.push(item);
      }
    });

    return {
      totalThisMonth,
      dueToday,
      inProgress,
      overdue,
      completedThisMonth,
      cancelledThisMonth,
      overdueItems: overdueItems.slice(0, 3),
      dueTodayItems: dueTodayItems.slice(0, 3),
      inProgressItems: inProgressItems.slice(0, 3),
    };
  }, [workItems, user?._id]);

  // Filter and sort work items
  const filteredItems = useMemo(() => {
    let filtered = [...workItems];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine which date to filter by
    let filterDate = today;
    if (selectedDate) {
      filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
    } else if (showTodayOnly) {
      filterDate = today;
    }

    // Show work for selected/today date if toggle is on or date is selected
    if (showTodayOnly || selectedDate) {
      filtered = filtered.filter((item) => {
        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        // Show items due exactly on the selected date
        return dueDate.getTime() === filterDate.getTime();
      });
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.project?.name?.toLowerCase().includes(term)
      );
    }

    // Sort by priority: overdue first, then by due date, then completed items last
    filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);
      
      const isAOverdue = dateA < today && !['Done', 'Cancelled'].includes(getEffectiveStatusForUser(a, user?._id));
      const isBOverdue = dateB < today && !['Done', 'Cancelled'].includes(getEffectiveStatusForUser(b, user?._id));
      const isADone = ['Done', 'Cancelled'].includes(getEffectiveStatusForUser(a, user?._id));
      const isBDone = ['Done', 'Cancelled'].includes(getEffectiveStatusForUser(b, user?._id));
      
      // Overdue items come first
      if (isAOverdue && !isBOverdue) return -1;
      if (!isAOverdue && isBOverdue) return 1;
      
      // Completed items come last
      if (isADone && !isBDone) return 1;
      if (!isADone && isBDone) return -1;
      
      // Then sort by due date (earliest first)
      return dateA - dateB;
    });

    return filtered;
  }, [workItems, searchTerm, showTodayOnly, selectedDate, user?._id]);

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleUpdateStatus = async (itemId, newStatus, completedAt = null, cancellationReason = null) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus, completedAt, cancellationReason);
      await loadWorkItems();

      if (selectedItem && selectedItem._id === itemId) {
        setSelectedItem((current) => {
          if (!current) return current;
          const next = { ...current, effectiveStatus: newStatus };
          if (current.assignedToMultiple?.length) {
            const assigneeStatuses = [...(current.assigneeStatuses || [])];
            const userId = user?._id?.toString();
            const existingIndex = assigneeStatuses.findIndex(
              (entry) => (entry.assigneeId?._id || entry.assigneeId)?.toString() === userId
            );
            if (existingIndex >= 0) {
              assigneeStatuses[existingIndex] = {
                ...assigneeStatuses[existingIndex],
                status: newStatus,
              };
            } else {
              assigneeStatuses.push({ assigneeId: user?._id, status: newStatus });
            }
            next.assigneeStatuses = assigneeStatuses;
          } else {
            next.status = newStatus;
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update status';
      toast.error(errorMessage);
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

  const handleBulkAction = async (action, data, selectedIds) => {
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
        </Col>
        <Col xs="auto" className="d-flex gap-2 align-items-center">
          <Button
            variant="primary"
            onClick={() => setShowAssignWorkModal(true)}
            size="sm"
          >
            <FaClock className="me-2" />
            Assign Work
          </Button>
          <Button
            variant={bulkMode ? 'warning' : 'outline-primary'}
            onClick={() => setBulkMode(!bulkMode)}
            size="sm"
          >
            <FaCheckSquare className="me-2" />
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
          </Button>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-3 g-2 stats-row">
        <Col className="stat-col">
          <Card className="stat-card" style={{ background: 'white', border: '1px solid #e9ecef' }}>
            <Card.Body className="p-3 text-center">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
              <h3 className="stat-value mb-1">{statistics.totalThisMonth}</h3>
              <p className="stat-label mb-0">Total Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="stat-col">
          <Card className="stat-card" style={{ background: 'white', border: '1px solid #e9ecef' }}>
            <Card.Body className="p-3 text-center">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏰</div>
              <h3 className="stat-value mb-1">{statistics.dueToday}</h3>
              <p className="stat-label mb-0">Due Today</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="stat-col">
          <Card className="stat-card" style={{ background: 'white', border: '1px solid #e9ecef' }}>
            <Card.Body className="p-3 text-center">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚙️</div>
              <h3 className="stat-value mb-1">{statistics.inProgress}</h3>
              <p className="stat-label mb-0">In Progress</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="stat-col">
          <Card className="stat-card" style={{ background: 'white', border: '1px solid #e9ecef' }}>
            <Card.Body className="p-3 text-center">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
              <h3 className="stat-value mb-1">{statistics.overdue}</h3>
              <p className="stat-label mb-0">Overdue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col className="stat-col">
          <Card className="stat-card" style={{ background: 'white', border: '1px solid #e9ecef' }}>
            <Card.Body className="p-3 text-center">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
              <h3 className="stat-value mb-1">{statistics.completedThisMonth}</h3>
              <p className="stat-label mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
        {statistics.cancelledThisMonth > 0 && (
          <Col className="stat-col">
            <Card className="stat-card" style={{ background: '#fff5f5', border: '2px solid #dc3545' }}>
              <Card.Body className="p-3 text-center">
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚫</div>
                <h3 className="stat-value mb-1" style={{ color: '#dc3545' }}>{statistics.cancelledThisMonth}</h3>
                <p className="stat-label mb-0" style={{ color: '#dc3545', fontWeight: '600' }}>Cancelled</p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Alert Banners */}
      <Row className="mb-3 g-2">
        {statistics.overdueItems.length > 0 && (
          <Col xs={12}>
            <div className="alert-banner alert-danger">
              <div className="alert-icon">⚠️</div>
              <div className="alert-content">
                <strong>Attention!</strong> You have {statistics.overdueItems.length} overdue item{statistics.overdueItems.length > 1 ? 's' : ''}. Please prioritize these.
              </div>
            </div>
          </Col>
        )}
        {statistics.dueTodayItems.length > 0 && (
          <Col xs={12}>
            <div className="alert-banner alert-warning">
              <div className="alert-icon">⏰</div>
              <div className="alert-content">
                <strong>Reminder:</strong> You have {statistics.dueTodayItems.length} item{statistics.dueTodayItems.length > 1 ? 's' : ''} due today!
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* Search and View Toggle */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body className="p-3">
          <Row className="align-items-center g-3">
            <Col md={6}>
              <WorkItemSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </Col>
            <Col md={3}>
              <div className="d-flex gap-2 align-items-center">
                <label className="text-muted mb-0" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  Select Date:
                </label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={selectedDate || ''}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowTodayOnly(false);
                  }}
                  style={{ maxWidth: '150px' }}
                />
                {selectedDate && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(null);
                      setShowTodayOnly(true);
                    }}
                    style={{ padding: '0.375rem 0.75rem' }}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </Col>
            <Col md={3} className="text-end">
              <ButtonGroup size="sm">
                <Button
                  variant={showTodayOnly && !selectedDate ? 'primary' : 'outline-secondary'}
                  onClick={() => {
                    setShowTodayOnly(true);
                    setSelectedDate(null);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant={!showTodayOnly && !selectedDate ? 'primary' : 'outline-secondary'}
                  onClick={() => {
                    setShowTodayOnly(false);
                    setSelectedDate(null);
                  }}
                >
                  All
                </Button>
              </ButtonGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Work Items List */}
      <Card style={{ overflow: 'visible' }}>
        <Card.Body className="p-0" style={{ overflow: 'visible' }}>
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
              currentUser={user}
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
              onStatusChange={handleUpdateStatus}
              currentUser={user}
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
          onAddComment={handleAddComment}
          currentUser={user}
        />
      )}

      {/* Assign Work Modal */}
      <AssignWorkModal
        show={showAssignWorkModal}
        onHide={() => setShowAssignWorkModal(false)}
        onSuccess={loadWorkItems}
      />
    </Container>
  );
};

export default MyWorkPage;
