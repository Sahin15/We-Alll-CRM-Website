import { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup, Pagination } from 'react-bootstrap';
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
  isWorkItemForMyWork,
  isPostingAssigneeForMyWork,
  isWorkItemDueToday,
  isWorkItemOverdue,
} from '../../utils/workItemUtils';
import { isCreativeWorkflowItem } from '../../utils/workItemStatusUtils';
import creativeWorkflowApi from '../../api/creativeWorkflowApi';
import './MyWorkPage.css';

const PAGE_SIZE = 12;

/** @typedef {'all'|'dueToday'|'inProgress'|'overdue'|'completed'|'cancelled'} MyWorkStatFilter */

/**
 * @param {object} item
 * @param {string|undefined} userId
 * @returns {boolean}
 */
const isCreativeInProgressForUser = (item, userId) => {
  if (!isCreativeWorkflowItem(item)) return false;
  const status = item.status;
  if (['Closed', 'Cancelled', 'Done', 'To Do', 'Assigned', 'Backlog'].includes(status)) {
    return false;
  }
  return getEffectiveStatusForUser(item, userId) !== 'Done';
};

/**
 * @param {object} item
 * @param {string|undefined} userId
 * @returns {boolean}
 */
const isCompletedWorkItemForUser = (item, userId) => {
  const itemStatus = getEffectiveStatusForUser(item, userId);
  const creativeDone =
    isCreativeWorkflowItem(item) &&
    ['Closed', 'Delivered', 'Posted'].includes(item.status);
  return itemStatus === 'Done' || creativeDone;
};

/**
 * @param {object} item
 * @param {MyWorkStatFilter|null} filter
 * @param {string|undefined} userId
 * @returns {boolean}
 */
const matchesMyWorkStatFilter = (item, filter, userId) => {
  if (!filter || filter === 'all') return true;
  if (item.isDeleted) return false;

  switch (filter) {
    case 'dueToday':
      return isWorkItemDueToday(item, userId);
    case 'inProgress': {
      const itemStatus = getEffectiveStatusForUser(item, userId);
      return itemStatus === 'In Progress' || isCreativeInProgressForUser(item, userId);
    }
    case 'overdue':
      return isPendingWorkItem(item, userId) && isWorkItemOverdue(item, userId);
    case 'completed':
      return isCompletedWorkItemForUser(item, userId);
    case 'cancelled':
      return getEffectiveStatusForUser(item, userId) === 'Cancelled';
    default:
      return true;
  }
};

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
  const [activeCreativeWork, setActiveCreativeWork] = useState(null);
  /** @type {[MyWorkStatFilter|null, function]} */
  const [statFilter, setStatFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadWorkItems();
    creativeWorkflowApi
      .getMyActiveCreativeWork()
      .then((res) => setActiveCreativeWork(res?.data || null))
      .catch(() => setActiveCreativeWork(null));
  }, [user]);

  const loadWorkItems = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await workItemApi.getMyWork();
      setWorkItems(response.data || response.workItems || []);
    } catch (error) {
      console.error('Error loading work items:', error);
      if (!silent) {
        toast.error('Failed to load your work items');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleWorkItemSync = (updatedItem) => {
    if (!updatedItem?._id) return;
    setSelectedItem((current) =>
      current?._id === updatedItem._id ? { ...current, ...updatedItem } : current
    );
    setWorkItems((items) =>
      items.map((item) =>
        item._id === updatedItem._id ? { ...item, ...updatedItem } : item
      )
    );
  };

  // Only items assigned to me — work I gave others belongs on Assigned Work
  const myAssignedItems = useMemo(
    () => workItems.filter((item) => isWorkItemForMyWork(item, user?._id)),
    [workItems, user?._id]
  );

  const statistics = useMemo(() => {
    const userId = user?._id;
    let total = 0;
    let dueToday = 0;
    let inProgress = 0;
    let overdue = 0;
    let completed = 0;
    let cancelled = 0;

    myAssignedItems.forEach((item) => {
      if (item.isDeleted) return;
      total += 1;
      if (isWorkItemDueToday(item, userId)) dueToday += 1;
      if (isCompletedWorkItemForUser(item, userId)) completed += 1;
      if (getEffectiveStatusForUser(item, userId) === 'Cancelled') cancelled += 1;
      const itemStatus = getEffectiveStatusForUser(item, userId);
      if (itemStatus === 'In Progress' || isCreativeInProgressForUser(item, userId)) {
        inProgress += 1;
      }
      if (isPendingWorkItem(item, userId) && isWorkItemOverdue(item, userId)) {
        overdue += 1;
      }
    });

    return { total, dueToday, inProgress, overdue, completed, cancelled };
  }, [myAssignedItems, user?._id]);

  const handleStatFilterClick = useCallback((filter) => {
    setStatFilter((current) => (current === filter ? null : filter));
    setShowTodayOnly(false);
    setSelectedDate(null);
    setCurrentPage(1);
  }, []);

  // Filter and sort work items
  const filteredItems = useMemo(() => {
    let filtered = [...myAssignedItems];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const userId = user?._id;

    const priorityRank = { Critical: 0, High: 1, Urgent: 1, Medium: 2, Low: 3 };
    const statusRank = {
      'In Progress': 0,
      'To Do': 1,
      Review: 2,
      Done: 3,
      Cancelled: 4,
    };

    // Determine which date to filter by
    let filterDate = today;
    if (selectedDate) {
      filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
    } else if (showTodayOnly) {
      filterDate = today;
    }

    if (statFilter) {
      filtered = filtered.filter((item) =>
        matchesMyWorkStatFilter(item, statFilter, userId)
      );
    } else if (showTodayOnly || selectedDate) {
      // Today: due today + overdue pending (still need attention).
      // Custom date: exact due-date match only.
      filtered = filtered.filter((item) => {
        if (item.isDeleted) return false;

        // Posting handoff queue: visible as soon as assignee is selected (not gated on creative due date).
        if (isCreativeWorkflowItem(item) && item.status === 'On Hold') {
          return showTodayOnly && !selectedDate;
        }

        if (isPostingAssigneeForMyWork(item, userId)) {
          if (item.status === 'Awaiting Posting') return true;
          if (item.postingDate) {
            const postingDue = new Date(item.postingDate);
            postingDue.setHours(0, 0, 0, 0);
            if (postingDue.getTime() === filterDate.getTime()) return true;
            if (showTodayOnly && !selectedDate && postingDue.getTime() <= today.getTime()) {
              return true;
            }
          }
          return showTodayOnly && !selectedDate;
        }

        if (!item.dueDate) return false;
        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate.getTime() === filterDate.getTime()) return true;
        if (showTodayOnly && !selectedDate) {
          return isPendingWorkItem(item, userId) && dueDate.getTime() < today.getTime();
        }
        return false;
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

    // Pending first, then overdue, then status/priority/due date; completed last
    filtered.sort((a, b) => {
      const aPending = isPendingWorkItem(a, userId);
      const bPending = isPendingWorkItem(b, userId);
      if (aPending !== bPending) return aPending ? -1 : 1;

      const dueStart = (item) => {
        if (!item.dueDate) return null;
        const d = new Date(item.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      };

      const aDue = dueStart(a);
      const bDue = dueStart(b);
      const aOverdue = aPending && aDue != null && aDue < today.getTime();
      const bOverdue = bPending && bDue != null && bDue < today.getTime();
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      const aStatus = getEffectiveStatusForUser(a, userId);
      const bStatus = getEffectiveStatusForUser(b, userId);
      const statusDiff =
        (statusRank[aStatus] ?? 50) - (statusRank[bStatus] ?? 50);
      if (statusDiff !== 0) return statusDiff;

      const priorityDiff =
        (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (priorityDiff !== 0) return priorityDiff;

      const dateA = aDue ?? Number.MAX_SAFE_INTEGER;
      const dateB = bDue ?? Number.MAX_SAFE_INTEGER;
      return dateA - dateB;
    });

    return filtered;
  }, [myAssignedItems, searchTerm, showTodayOnly, selectedDate, statFilter, user?._id]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showTodayOnly, selectedDate, statFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredItems.length);

  const statFilterLabel = {
    all: 'All items',
    dueToday: 'Due today',
    inProgress: 'In progress',
    overdue: 'Overdue',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleUpdateStatus = async (itemId, newStatus, completedAt = null, cancellationReason = null) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus, completedAt, cancellationReason);
      await loadWorkItems({ silent: showModal });

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
      {activeCreativeWork && (
        <Row className="mb-3">
          <Col>
            <Card className="border-warning bg-warning bg-opacity-10">
              <Card.Body className="py-2 small">
                Currently working on <strong>{activeCreativeWork.title}</strong>.
                Hold it before starting another creative task.
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold text-dark mb-1" style={{ color: '#1f2937' }}>
            My Work
          </h2>
          <p className="text-muted mb-0">
            View and manage all your assigned work items
            {activeCreativeWork ? ' · one active creative task at a time' : ''}
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

      {/* Statistics Cards — click to filter list */}
      <Row className="mb-3 g-2 stats-row">
        {[
          { key: 'all', icon: '📋', value: statistics.total, label: 'Total Items' },
          { key: 'dueToday', icon: '⏰', value: statistics.dueToday, label: 'Due Today' },
          { key: 'inProgress', icon: '⚙️', value: statistics.inProgress, label: 'In Progress' },
          { key: 'overdue', icon: '⚠️', value: statistics.overdue, label: 'Overdue' },
          { key: 'completed', icon: '✅', value: statistics.completed, label: 'Completed' },
        ].map((stat) => (
          <Col className="stat-col" key={stat.key}>
            <Card
              role="button"
              tabIndex={0}
              className={`stat-card ${statFilter === stat.key ? 'stat-card-active' : ''}`}
              style={{ background: 'white', border: '1px solid #e9ecef', cursor: 'pointer' }}
              onClick={() => handleStatFilterClick(stat.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStatFilterClick(stat.key);
                }
              }}
            >
              <Card.Body className="p-3 text-center">
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{stat.icon}</div>
                <h3 className="stat-value mb-1">{stat.value}</h3>
                <p className="stat-label mb-0">{stat.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {statistics.cancelled > 0 && (
          <Col className="stat-col">
            <Card
              role="button"
              tabIndex={0}
              className={`stat-card ${statFilter === 'cancelled' ? 'stat-card-active' : ''}`}
              style={{ background: '#fff5f5', border: '2px solid #dc3545', cursor: 'pointer' }}
              onClick={() => handleStatFilterClick('cancelled')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStatFilterClick('cancelled');
                }
              }}
            >
              <Card.Body className="p-3 text-center">
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚫</div>
                <h3 className="stat-value mb-1" style={{ color: '#dc3545' }}>{statistics.cancelled}</h3>
                <p className="stat-label mb-0" style={{ color: '#dc3545', fontWeight: '600' }}>
                  Cancelled
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Alert Banners */}
      <Row className="mb-3 g-2">
        {statistics.overdue > 0 && (
          <Col xs={12}>
            <div className="alert-banner alert-danger">
              <div className="alert-icon">⚠️</div>
              <div className="alert-content">
                <strong>Attention!</strong> You have {statistics.overdue} overdue item{statistics.overdue > 1 ? 's' : ''}. Please prioritize these.
              </div>
            </div>
          </Col>
        )}
        {statistics.dueToday > 0 && (
          <Col xs={12}>
            <div className="alert-banner alert-warning">
              <div className="alert-icon">⏰</div>
              <div className="alert-content">
                <strong>Reminder:</strong> You have {statistics.dueToday} item{statistics.dueToday > 1 ? 's' : ''} due today!
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
                    setStatFilter(null);
                    setCurrentPage(1);
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
                  variant={showTodayOnly && !selectedDate && !statFilter ? 'primary' : 'outline-secondary'}
                  onClick={() => {
                    setShowTodayOnly(true);
                    setSelectedDate(null);
                    setStatFilter(null);
                    setCurrentPage(1);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant={!showTodayOnly && !selectedDate && !statFilter ? 'primary' : 'outline-secondary'}
                  onClick={() => {
                    setShowTodayOnly(false);
                    setSelectedDate(null);
                    setStatFilter(null);
                    setCurrentPage(1);
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
      <Card style={{ overflow: 'visible', maxWidth: '100%' }}>
        <Card.Body className="p-0" style={{ overflow: 'visible', maxWidth: '100%' }}>
          <div className="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <small className="text-muted">
              {filteredItems.length === 0
                ? `Showing 0 of ${myAssignedItems.length} items`
                : `Showing ${pageStart}–${pageEnd} of ${filteredItems.length} items`}
              {statFilter ? ` · Filter: ${statFilterLabel[statFilter]}` : ''}
              {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}
            </small>
            {statFilter && (
              <Button
                variant="link"
                size="sm"
                className="p-0 text-decoration-none"
                onClick={() => {
                  setStatFilter(null);
                  setCurrentPage(1);
                }}
              >
                Clear filter
              </Button>
            )}
          </div>
          {bulkMode ? (
            <WorkItemListWithBulk
              workItems={paginatedItems}
              onViewItem={handleViewItem}
              onBulkAction={handleBulkAction}
              currentUser={user}
              emptyMessage={
                myAssignedItems.length === 0
                  ? 'No work items assigned to you yet.'
                  : 'No items match your search criteria.'
              }
            />
          ) : (
            <WorkItemList
              workItems={paginatedItems}
              onViewItem={handleViewItem}
              onStatusChange={handleUpdateStatus}
              currentUser={user}
              emptyMessage={
                myAssignedItems.length === 0
                  ? 'No work items assigned to you yet.'
                  : 'No items match your search or filter.'
              }
            />
          )}
          {filteredItems.length > PAGE_SIZE && (
            <div className="d-flex justify-content-center py-3 border-top">
              <Pagination size="sm" className="mb-0">
                <Pagination.Prev
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                />
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    return Math.abs(page - currentPage) <= 1;
                  })
                  .flatMap((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const items = [];
                    if (prev && page - prev > 1) {
                      items.push(
                        <Pagination.Ellipsis key={`ellipsis-${page}`} disabled />
                      );
                    }
                    items.push(
                      <Pagination.Item
                        key={page}
                        active={page === currentPage}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Pagination.Item>
                    );
                    return items;
                  })}
                <Pagination.Next
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                />
              </Pagination>
            </div>
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
            loadWorkItems({ silent: true });
          }}
          workItem={selectedItem}
          onUpdate={handleUpdateStatus}
          onRefresh={() => loadWorkItems({ silent: true })}
          onWorkItemSync={handleWorkItemSync}
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
