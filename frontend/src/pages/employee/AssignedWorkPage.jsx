import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup, Spinner, Modal } from 'react-bootstrap';
import { FaUsers } from 'react-icons/fa';
import toast from '../../utils/toast';
import workItemApi from '../../api/workItemApi';
import { useAuth } from '../../context/AuthContext';
import WorkItemList from '../../components/workitems/WorkItemList';
import WorkItemSearch from '../../components/workitems/WorkItemSearch';
import WorkItemDetailsModal from '../../components/workitems/WorkItemDetailsModal';
import EditWorkItemModal from '../../components/workitems/EditWorkItemModal';

/**
 * AssignedWorkPage Component
 * Shows all work items assigned by the current user
 */
const AssignedWorkPage = () => {
  const { user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [workItemToEdit, setWorkItemToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({
    show: false,
    itemId: null,
    newStatus: null,
    itemTitle: null
  });

  useEffect(() => {
    loadWorkItems();
  }, [user]);

  const loadWorkItems = async () => {
    try {
      setLoading(true);
      const response = await workItemApi.getCreatedByMe();
      setWorkItems(response.data || response.workItems || []);
    } catch (error) {
      console.error('Error loading assigned work items:', error);
      toast.error('Failed to load assigned work items');
    } finally {
      setLoading(false);
    }
  };

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
          item.project?.name?.toLowerCase().includes(term) ||
          item.assignedTo?.name?.toLowerCase().includes(term)
      );
    }

    // Sort by priority: overdue first, then by due date, then completed items last
    filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);
      
      const isAOverdue = dateA < today && a.status !== 'Done';
      const isBOverdue = dateB < today && b.status !== 'Done';
      const isADone = a.status === 'Done';
      const isBDone = b.status === 'Done';
      
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
  }, [workItems, searchTerm, showTodayOnly, selectedDate]);

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleEdit = (workItem) => {
    setWorkItemToEdit(workItem);
    setShowEditModal(true);
    setShowModal(false);
  };

  const handleStatusChangeRequest = (itemId, newStatus, itemTitle) => {
    setConfirmationModal({
      show: true,
      itemId,
      newStatus,
      itemTitle
    });
  };

  const handleConfirmStatusChange = async () => {
    const { itemId, newStatus } = confirmationModal;
    setConfirmationModal({ show: false, itemId: null, newStatus: null, itemTitle: null });
    
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      loadWorkItems();
      if (selectedItem && selectedItem._id === itemId) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update status';
      toast.error(errorMessage);
    }
  };

  const handleCancelStatusChange = () => {
    setConfirmationModal({ show: false, itemId: null, newStatus: null, itemTitle: null });
  };

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading assigned work...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Assigned Work</h2>
          <p className="text-muted">
            View and track all work items you have assigned to your team
          </p>
        </Col>
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
          <WorkItemList
            workItems={filteredItems}
            onViewItem={handleViewItem}
            onStatusChange={handleStatusChangeRequest}
            currentUser={user}
            showAssigneeStatus={true}
            onEdit={handleEdit}
            emptyMessage={
              workItems.length === 0
                ? 'No work items assigned by you yet.'
                : 'No items match your search criteria.'
            }
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
          onUpdate={handleStatusChangeRequest}
          onRefresh={loadWorkItems}
          currentUser={user}
          onEdit={handleEdit}
        />
      )}

      {/* Edit Work Item Modal */}
      <EditWorkItemModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setWorkItemToEdit(null);
        }}
        workItem={workItemToEdit}
        onSuccess={async () => {
          await loadWorkItems();
          setShowEditModal(false);
          setWorkItemToEdit(null);
        }}
      />

      {/* Status Change Confirmation Modal */}
      <Modal show={confirmationModal.show} onHide={handleCancelStatusChange} centered style={{ zIndex: 9999 }}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Status Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to change the status of <strong>{confirmationModal.itemTitle}</strong> to <strong>{confirmationModal.newStatus}</strong>?
          </p>
          <p className="text-muted small mb-0">
            This action will update the work item status for your team member.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelStatusChange}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmStatusChange}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AssignedWorkPage;
