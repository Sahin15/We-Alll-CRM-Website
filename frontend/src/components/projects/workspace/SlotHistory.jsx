import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Form, Collapse, Table, Modal, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaEye, FaPlus, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import workCalendarApi from '../../../api/workCalendarApi';
import projectApi from '../../../api/projectApi';
import workItemApi from '../../../api/workItemApi';
import AssignWorkModal from '../../work/AssignWorkModal';
import SlotGroupHeader from './SlotGroupHeader';
import WorkItemDetailsModal from '../../workitems/WorkItemDetailsModal';
import EditWorkItemModal from '../../workitems/EditWorkItemModal';
import { useAuth } from '../../../context/AuthContext';

/**
 * SlotHistory Component
 * Historical slot data viewer with month/year selection dropdowns
 * Uses the same slot design as the Work tab
 */
const SlotHistory = ({ project, onRefresh, refreshKey }) => {
  const { user } = useAuth();
  const [selectedMonthSlots, setSelectedMonthSlots] = useState([]);
  const [groupedWorkItems, setGroupedWorkItems] = useState({ slotted: {}, unassigned: [] });
  const [expandedSlots, setExpandedSlots] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Dropdown selections
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths] = useState([
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]);

  useEffect(() => {
    loadAvailableYears();
    loadSelectedMonthSlots();
  }, [project._id, refreshKey]); // Also refresh when refreshKey changes

  useEffect(() => {
    loadSelectedMonthSlots();
  }, [selectedYear, selectedMonth]);

  const loadAvailableYears = async () => {
    try {
      // Get all months with slots for the project (including current and future months)
      const response = await workCalendarApi.getAllMonthsWithSlots(project._id);
      if (response.data.success) {
        let years = response.data.data.years || [];
        
        // Always include current year and next 5 years for future planning
        const currentYear = new Date().getFullYear();
        const futureYears = Array.from({ length: 6 }, (_, i) => currentYear + i);
        
        // Merge and deduplicate years, then sort in descending order
        years = [...new Set([...years, ...futureYears])].sort((a, b) => b - a);
        
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error loading available years:', error);
      // Fallback to current year and next 5 years
      const currentYear = new Date().getFullYear();
      const fallbackYears = Array.from({ length: 6 }, (_, i) => currentYear + i).sort((a, b) => b - a);
      setAvailableYears(fallbackYears);
    }
  };

  const loadSelectedMonthSlots = async () => {
    try {
      setLoading(true);
      const response = await workCalendarApi.getSlotsByMonth(project._id, selectedYear, selectedMonth);
      
      if (response.data.success) {
        const slotsData = response.data.data.slots || [];
        setSelectedMonthSlots(slotsData);
        
        // Load grouped work items for the slots
        const groupedResponse = await projectApi.getWorkItemsGroupedBySlots(project._id);
        const grouped = groupedResponse.data || { slotted: {}, unassigned: [] };
        
        // Filter unassigned work items by selected month based on due date
        const filteredUnassigned = grouped.unassigned.filter(item => {
          if (!item.dueDate) return false;
          
          const itemDate = new Date(item.dueDate);
          const itemYear = itemDate.getFullYear();
          const itemMonth = itemDate.getMonth() + 1;
          
          return itemYear === selectedYear && itemMonth === selectedMonth;
        });
        
        const filteredGrouped = {
          slotted: grouped.slotted,
          unassigned: filteredUnassigned
        };
        
        setGroupedWorkItems(filteredGrouped);
        
        // Initialize expanded state: expand slots with work, collapse empty slots
        const initialExpanded = {};
        slotsData.forEach(slot => {
          const slotWorkItems = filteredGrouped.slotted?.[slot._id]?.workItems || [];
          initialExpanded[slot._id] = slotWorkItems.length > 0; // Expand only if has work items
        });
        setExpandedSlots(initialExpanded);
      }
    } catch (error) {
      console.error('Error loading month slots:', error);
      toast.error('Failed to load month slots');
      setSelectedMonthSlots([]);
      setGroupedWorkItems({ slotted: {}, unassigned: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (item) => {
    // Only allow editing existing items
    if (!item) {
      toast.error('No item selected for editing');
      return;
    }
    
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleOpenAssignModal = (slot) => {
    setSelectedSlot(slot);
    setShowAssignModal(true);
  };

  const handleAssignWorkSuccess = async () => {
    toast.success('Work assigned to slot successfully!');
    await loadSelectedMonthSlots();
    if (onRefresh) onRefresh();
    setShowAssignModal(false);
  };

  const handleViewDetails = async (item) => {
    try {
      // Fetch full work item details including comments
      const response = await workItemApi.getWorkItemById(item._id);
      setSelectedWorkItem(response.data || response);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading work item details:', error);
      toast.error('Failed to load work item details');
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      toast.success('Status updated successfully!');
      loadSelectedMonthSlots();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
      throw error;
    }
  };

  const handleAddComment = async (workItemId, commentText) => {
    try {
      const result = await workItemApi.addComment(workItemId, commentText);
      loadSelectedMonthSlots();
      return result.data || result;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const handleActivateWorkItem = async (itemId) => {
    try {
      await workItemApi.activateWorkItem(itemId, 'active');
      toast.success('Work item activated successfully!');
      loadSelectedMonthSlots();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error activating work item:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to activate work item');
    }
  };

  // Check if user can manage slots
  const canManageSlots = 
    user?.role === 'admin' || 
    user?.role === 'superadmin' || 
    user?.role === 'hr' ||
    user?.role === 'manager' ||
    user?.role === 'hod' ||
    user?._id === project.projectHead?._id;

  const canDeleteWork = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role);

  // Get slot color scheme for visual differentiation (same as Work tab)
  const getSlotColor = (slotNumber) => {
    const colors = [
      { bg: 'rgba(102, 126, 234, 0.08)', border: '#667eea', dot: '#667eea' },
      { bg: 'rgba(240, 147, 251, 0.08)', border: '#f093fb', dot: '#f093fb' },
      { bg: 'rgba(79, 172, 254, 0.08)', border: '#4facfe', dot: '#4facfe' },
      { bg: 'rgba(67, 233, 123, 0.08)', border: '#43e97b', dot: '#43e97b' },
      { bg: 'rgba(250, 112, 154, 0.08)', border: '#fa709a', dot: '#fa709a' },
      { bg: 'rgba(48, 207, 208, 0.08)', border: '#30cfd0', dot: '#30cfd0' },
      { bg: 'rgba(168, 237, 234, 0.08)', border: '#a8edea', dot: '#a8edea' },
      { bg: 'rgba(255, 154, 158, 0.08)', border: '#ff9a9e', dot: '#ff9a9e' },
    ];
    return colors[(slotNumber - 1) % colors.length];
  };

  const getStatusBadge = (status) => {
    const variants = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
      'available': 'secondary',
      'assigned': 'primary',
      'in-progress': 'warning',
      'completed': 'success'
    };
    return variants[status] || 'secondary';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'secondary'
    };
    return colors[priority?.toLowerCase()] || 'secondary';
  };

  // Helper function to get assignee display (supports both single and multiple)
  const getAssigneeDisplay = (item) => {
    if (item.assignedToMultiple && item.assignedToMultiple.length > 0) {
      const names = item.assignedToMultiple.map(assignee => assignee.name || assignee).filter(Boolean);
      if (names.length === 0) return 'Unassigned';
      if (names.length === 1) return names[0];
      return `${names[0]} & ${names.length - 1} more`;
    } else if (item.assignedTo?.name) {
      return item.assignedTo.name;
    }
    return 'Unassigned';
  };

  const handleCreateMonthlySlots = async () => {
    // Double-check that slots don't already exist
    if (slotsExistForSelectedMonth()) {
      toast.info('Slots already exist for this month');
      setShowCreateModal(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Creating slots for:', { projectId: project._id, year: selectedYear, month: selectedMonth });
      await workCalendarApi.createMonthlySlots(project._id, selectedYear, selectedMonth);
      toast.success(`${availableMonths.find(m => m.value === selectedMonth)?.label} slots activated successfully!`);
      setShowCreateModal(false);
      loadAvailableYears();
      loadSelectedMonthSlots();
      // Also refresh parent component to update other tabs
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error creating monthly slots:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to activate monthly slots';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlotExpansion = (slotId) => {
    setExpandedSlots(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
    }));
  };

  // Helper function to check if slots exist for selected month
  const slotsExistForSelectedMonth = () => {
    return selectedMonthSlots.length > 0;
  };

  // Get appropriate button text based on slot existence
  const getActivationButtonText = () => {
    const monthName = availableMonths.find(m => m.value === selectedMonth)?.label;
    return slotsExistForSelectedMonth() 
      ? `${monthName} Slots Activated` 
      : `Activate ${monthName} Slots`;
  };

  const handleAddSingleSlot = async () => {
    try {
      setLoading(true);
      // Add one additional slot to the selected month
      await workCalendarApi.addSlotToMonth(project._id, selectedYear, selectedMonth);
      toast.success('Additional slot added successfully!');
      setShowAddSlotModal(false);
      loadSelectedMonthSlots();
      // Also refresh parent component to update other tabs
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error adding slot:', error);
      toast.error('Failed to add additional slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this work item?')) {
      return;
    }

    try {
      await workItemApi.deleteWorkItem(item._id);
      toast.success('Work item deleted successfully!');
      loadSelectedMonthSlots();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting work item:', error);
      toast.error('Failed to delete work item');
    }
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
      {/* Slot History Info Banner */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center">
                <div className="me-3" style={{ fontSize: '2rem' }}>📅</div>
                <div>
                  <h6 className="mb-1" style={{ fontWeight: '600' }}>Slot History</h6>
                  <small style={{ opacity: 0.9 }}>
                    View historical slot data by selecting month and year. Each month has 20 slots for organized project management.
                  </small>
                </div>
              </div>
            </Col>
            {canManageSlots && (
              <Col xs="auto">
                <Button
                  variant={slotsExistForSelectedMonth() ? "success" : "light"}
                  size="sm"
                  onClick={() => !slotsExistForSelectedMonth() && setShowCreateModal(true)}
                  className="d-flex align-items-center"
                  style={{ fontWeight: '500' }}
                  disabled={slotsExistForSelectedMonth()}
                >
                  {slotsExistForSelectedMonth() ? (
                    <>
                      <FaCheckCircle className="me-2" />
                      {getActivationButtonText()}
                    </>
                  ) : (
                    <>
                      <FaPlus className="me-2" />
                      {getActivationButtonText()}
                    </>
                  )}
                </Button>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Month/Year Selection */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold">Select Year</Form.Label>
                <Form.Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold">Select Month</Form.Label>
                <Form.Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {availableMonths.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-end h-100">
                <div className="ms-3">
                  <h5 className="mb-0">
                    {availableMonths.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </h5>
                  <small className="text-muted">
                    {selectedMonthSlots.length} slots found
                  </small>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Selected Month Slots - Using Exact Same Design as Work Tab */}
      {!loading && (
        <div className="d-flex flex-column gap-3">
          {selectedMonthSlots.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5 text-muted">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p className="mb-0">No slots found for this period</p>
                {canManageSlots && !slotsExistForSelectedMonth() && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <FaPlus className="me-2" />
                    {getActivationButtonText()}
                  </Button>
                )}
              </Card.Body>
            </Card>
          ) : (
            <>
              {/* Render slots in numerical order - Exact same design as UnifiedWorkTab */}
              {selectedMonthSlots
                .sort((a, b) => a.slotNumber - b.slotNumber)
                .map(slot => {
                  const slotWorkItems = groupedWorkItems.slotted?.[slot._id]?.workItems || [];
                  const slotColor = getSlotColor(slot.slotNumber);
                  
                  return (
                    <Card key={slot._id} className="border-0 shadow-sm">
                      <SlotGroupHeader
                        slot={slot}
                        workItems={slotWorkItems}
                        isExpanded={expandedSlots[slot._id]}
                        onToggle={() => toggleSlotExpansion(slot._id)}
                      />
                      <Collapse in={expandedSlots[slot._id]} timeout={300}>
                        <div>
                          <Card.Body className="p-0">
                          {slotWorkItems.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                              No work items assigned to this slot
                            </div>
                          ) : (
                            <Table responsive hover className="mb-0">
                              <thead style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                                <tr>
                                  <th style={{ width: '25%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Title</th>
                                  <th style={{ width: '18%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Assigned To</th>
                                  <th style={{ width: '12%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Due Date</th>
                                  <th style={{ width: '10%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Priority</th>
                                  <th style={{ width: '10%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Status</th>
                                  <th style={{ width: '10%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Visibility</th>
                                  <th style={{ width: '15%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {slotWorkItems.map((item, index) => (
                                  <tr 
                                    key={item._id}
                                    style={{
                                      background: index % 2 === 0 ? slotColor.bg : '#ffffff',
                                      borderLeft: `3px solid ${slotColor.border}`,
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = slotColor.bg;
                                      e.currentTarget.style.transform = 'translateX(2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = index % 2 === 0 ? slotColor.bg : '#ffffff';
                                      e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                  >
                                    <td style={{ padding: '12px 20px' }}>
                                      <div className="d-flex align-items-center gap-2">
                                        <span 
                                          style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: slotColor.dot,
                                            flexShrink: 0
                                          }}
                                        />
                                        <span 
                                          onClick={() => handleViewDetails(item)}
                                          style={{ 
                                            cursor: 'pointer',
                                            color: '#2d3748',
                                            fontWeight: '500',
                                            transition: 'opacity 0.2s ease'
                                          }}
                                          onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                                          onMouseLeave={(e) => e.target.style.opacity = '1'}
                                        >
                                          {item.title}
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>{getAssigneeDisplay(item)}</td>
                                    <td style={{ padding: '12px 20px' }}>
                                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                      <Badge bg={getPriorityColor(item.priority)}>
                                        {item.priority || 'Medium'}
                                      </Badge>
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                      <Badge bg={getStatusBadge(item.status)}>
                                        {item.status}
                                      </Badge>
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                      {item.visibility === 'draft' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <Badge bg="secondary" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>
                                            📝 Draft
                                          </Badge>
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleActivateWorkItem(item._id);
                                            }}
                                            style={{ 
                                              fontSize: '0.75rem', 
                                              padding: '4px 10px',
                                              border: 'none',
                                              background: '#28a745',
                                              color: 'white',
                                              borderRadius: '4px',
                                              cursor: 'pointer'
                                            }}
                                            title="Activate this draft work item"
                                          >
                                            Activate
                                          </Button>
                                        </div>
                                      )}
                                      {item.visibility === 'scheduled' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <Badge bg="warning" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', color: '#000' }}>
                                            ⏰ Scheduled
                                          </Badge>
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleActivateWorkItem(item._id);
                                            }}
                                            style={{ 
                                              fontSize: '0.75rem', 
                                              padding: '4px 10px',
                                              border: 'none',
                                              background: '#28a745',
                                              color: 'white',
                                              borderRadius: '4px',
                                              cursor: 'pointer'
                                            }}
                                            title="Activate this scheduled work item"
                                          >
                                            Activate
                                          </Button>
                                        </div>
                                      )}
                                      {(!item.visibility || item.visibility === 'active') && (
                                        <Badge bg="success" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>
                                          ✓ Activated
                                        </Badge>
                                      )}
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                      <div className="d-flex gap-2">
                                        <Button
                                          variant="outline-info"
                                          size="sm"
                                          onClick={() => handleViewDetails(item)}
                                          title="View details and activity"
                                        >
                                          <FaEye />
                                        </Button>
                                        {canManageSlots && (
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleOpenEditModal(item)}
                                          >
                                            <FaEdit />
                                          </Button>
                                        )}
                                        {canDeleteWork && (
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDelete(item)}
                                          >
                                            <FaTrash />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          )}
                        </Card.Body>
                        </div>
                      </Collapse>
                    </Card>
                  );
                })}

              {/* Add Another Slot Button - Show after slot 20 if user can manage slots */}
              {canManageSlots && selectedMonthSlots.length >= 20 && (
                <Card className="border-0 shadow-sm">
                  <Card.Body className="text-center py-3">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowAddSlotModal(true)}
                      className="d-flex align-items-center justify-content-center mx-auto"
                      style={{ 
                        borderStyle: 'dashed',
                        borderWidth: '1px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      <FaPlus className="me-2" />
                      Add Another Slot
                    </Button>
                    <small className="text-muted mt-2 d-block" style={{ fontSize: '0.8rem' }}>
                      Expand project capacity
                    </small>
                  </Card.Body>
                </Card>
              )}

              {/* Unassigned Work Section - Exact same design as UnifiedWorkTab */}
              {groupedWorkItems.unassigned && groupedWorkItems.unassigned.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <Card.Header 
                    style={{
                      background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                      color: 'white',
                      borderLeft: '4px solid #6c757d',
                      padding: '1rem 1.25rem'
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <strong style={{ fontSize: '1.1rem', fontWeight: '600' }}>Unassigned Work</strong>
                      <Badge 
                        bg="light" 
                        text="dark"
                        style={{ 
                          padding: '6px 12px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          background: 'rgba(255,255,255,0.3)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.4)'
                        }}
                      >
                        {groupedWorkItems.unassigned.length} {groupedWorkItems.unassigned.length === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table responsive hover className="mb-0">
                      <thead style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                        <tr>
                          <th style={{ width: '25%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Title</th>
                          <th style={{ width: '18%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Assigned To</th>
                          <th style={{ width: '12%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Due Date</th>
                          <th style={{ width: '10%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Priority</th>
                          <th style={{ width: '10%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Status</th>
                          <th style={{ width: '10%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Visibility</th>
                          <th style={{ width: '15%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedWorkItems.unassigned.map((item, index) => (
                          <tr 
                            key={item._id}
                            style={{
                              background: index % 2 === 0 ? 'rgba(108, 117, 125, 0.05)' : '#ffffff',
                              borderLeft: '3px solid #6c757d',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(108, 117, 125, 0.1)';
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = index % 2 === 0 ? 'rgba(108, 117, 125, 0.05)' : '#ffffff';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            <td style={{ padding: '12px 20px' }}>
                              <div className="d-flex align-items-center gap-2">
                                <span 
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#6c757d',
                                    flexShrink: 0
                                  }}
                                />
                                <span 
                                  onClick={() => handleViewDetails(item)}
                                  style={{ 
                                    cursor: 'pointer',
                                    color: '#2d3748',
                                    fontWeight: '500',
                                    transition: 'opacity 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                                >
                                  {item.title}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 20px' }}>{getAssigneeDisplay(item)}</td>
                            <td style={{ padding: '12px 20px' }}>
                              {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              <Badge bg={getPriorityColor(item.priority)}>
                                {item.priority || 'Medium'}
                              </Badge>
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              <Badge bg={getStatusBadge(item.status)}>
                                {item.status}
                              </Badge>
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              {item.visibility === 'draft' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Badge bg="secondary" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>
                                    📝 Draft
                                  </Badge>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActivateWorkItem(item._id);
                                    }}
                                    style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px',
                                      border: 'none',
                                      background: '#28a745',
                                      color: 'white',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Activate this draft work item"
                                  >
                                    Activate
                                  </Button>
                                </div>
                              )}
                              {item.visibility === 'scheduled' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Badge bg="warning" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', color: '#000' }}>
                                    ⏰ Scheduled
                                  </Badge>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActivateWorkItem(item._id);
                                    }}
                                    style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px',
                                      border: 'none',
                                      background: '#28a745',
                                      color: 'white',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                    title="Activate this scheduled work item"
                                  >
                                    Activate
                                  </Button>
                                </div>
                              )}
                              {(!item.visibility || item.visibility === 'active') && (
                                <Badge bg="success" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>
                                  ✓ Activated
                                </Badge>
                              )}
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewDetails(item)}
                                  title="View details and activity"
                                >
                                  <FaEye />
                                </Button>
                                {canManageSlots && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleOpenAssignModal(item)}
                                  >
                                    <FaEdit />
                                  </Button>
                                )}
                                {canDeleteWork && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDelete(item)}
                                  >
                                    <FaTrash />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Monthly Slots Modal - Only show when slots don't exist */}
      <Modal show={showCreateModal && !slotsExistForSelectedMonth()} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Activate Monthly Slots</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <small>This will create exactly 20 slots for {availableMonths.find(m => m.value === selectedMonth)?.label} {selectedYear}.</small>
          </Alert>
          <div className="text-center">
            <h5>Confirm Slot Activation</h5>
            <p className="text-muted">
              You are about to activate 20 work slots for <strong>{availableMonths.find(m => m.value === selectedMonth)?.label} {selectedYear}</strong>.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateMonthlySlots} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Activating...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                {getActivationButtonText()}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Single Slot Modal */}
      <Modal show={showAddSlotModal} onHide={() => setShowAddSlotModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Additional Slot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <small>This will add one additional slot to {availableMonths.find(m => m.value === selectedMonth)?.label} {selectedYear}.</small>
          </Alert>
          <div className="text-center">
            <h5>Confirm Slot Addition</h5>
            <p className="text-muted">
              You are about to add <strong>1 additional work slot</strong> to <strong>{availableMonths.find(m => m.value === selectedMonth)?.label} {selectedYear}</strong>.
            </p>
            <p className="text-muted">
              Current slots: <strong>{selectedMonthSlots.length}</strong> → New total: <strong>{selectedMonthSlots.length + 1}</strong>
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddSlotModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddSingleSlot} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Adding Slot...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Add Slot
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Work Modal */}
      <AssignWorkModal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        onSuccess={handleAssignWorkSuccess}
        defaultProject={project._id}
        slotInfo={selectedSlot ? {
          slotId: selectedSlot._id,
          slotNumber: selectedSlot.slotNumber,
          slotIdentifier: selectedSlot.slotIdentifier
        } : null}
      />

      {/* Work Item Details Modal */}
      {selectedWorkItem && (
        <WorkItemDetailsModal
          show={showDetailsModal}
          onHide={() => {
            setShowDetailsModal(false);
            setSelectedWorkItem(null);
          }}
          workItem={selectedWorkItem}
          onUpdate={handleUpdateStatus}
          onRefresh={loadSelectedMonthSlots}
          onAddComment={handleAddComment}
          currentUser={user}
        />
      )}

      {/* Edit Work Item Modal */}
      <EditWorkItemModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        workItem={selectedItem}
        project={project}
        onSuccess={async () => {
          await loadSelectedMonthSlots();
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};

export default SlotHistory;
