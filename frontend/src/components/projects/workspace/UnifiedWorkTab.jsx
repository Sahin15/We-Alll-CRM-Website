import { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Modal, Form, Row, Col, Collapse } from 'react-bootstrap';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import projectApi from '../../../api/projectApi';
import workItemApi from '../../../api/workItemApi';
import ViewToggle from './ViewToggle';
import SlotGroupHeader from './SlotGroupHeader';
import WorkItemDetailsModal from '../../workitems/WorkItemDetailsModal';

/**
 * UnifiedWorkTab - Table view for all work assignment
 * Handles both slot-based and regular work items
 */
const UnifiedWorkTab = ({ project, onRefresh }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workItems, setWorkItems] = useState([]);
  const [slots, setSlots] = useState([]);
  const [groupedWorkItems, setGroupedWorkItems] = useState({ slotted: {}, unassigned: [] });
  const [viewMode, setViewMode] = useState('slots'); // Default to 'slots' view for slot-based projects
  const [expandedSlots, setExpandedSlots] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium',
    type: 'task'
  });

  const isSlotBased = project.slotConfiguration?.enableSlotSystem;

  useEffect(() => {
    loadData();
  }, [project._id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const members = project.assignedUsers || [];
      if (project.projectHead && !members.find(m => (m._id || m) === project.projectHead._id)) {
        members.unshift(project.projectHead);
      }
      setTeamMembers(members);

      if (isSlotBased) {
        const slotsResponse = await projectApi.getProjectSlots(project._id);
        const loadedSlots = slotsResponse.data || [];
        setSlots(loadedSlots);

        // Initialize expanded state: expand slots with work, collapse empty slots
        const groupedResponse = await projectApi.getWorkItemsGroupedBySlots(project._id);
        const grouped = groupedResponse.data || { slotted: {}, unassigned: [] };
        setGroupedWorkItems(grouped);
        
        const initialExpanded = {};
        loadedSlots.forEach(slot => {
          const slotWorkItems = grouped.slotted?.[slot._id]?.workItems || [];
          initialExpanded[slot._id] = slotWorkItems.length > 0; // Expand only if has work items
        });
        setExpandedSlots(initialExpanded);
      } else {
        const response = await workItemApi.getWorkItemsByProject(project._id);
        setWorkItems(response.data || response || []);
      }
    } catch (error) {
      console.error('Error loading work data:', error);
      toast.error('Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item) => {
    // Only allow editing existing items, not creating new ones
    if (!item) {
      toast.info('Use the Team tab to assign new work to team members');
      return;
    }
    
    // Edit mode
    setSelectedItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      assignedTo: item.assignedTo?._id || '',
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
      priority: item.priority?.toLowerCase() || 'medium',
      type: item.type || 'task'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await workItemApi.updateWorkItem(selectedItem._id, formData);
      toast.success('Work item updated successfully!');

      setShowModal(false);
      await loadData();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating work item:', error);
      toast.error(error.response?.data?.message || 'Failed to update work item');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this work item?')) {
      return;
    }

    try {
      await workItemApi.deleteWorkItem(item._id);
      toast.success('Work item deleted successfully!');
      loadData();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting work item:', error);
      toast.error('Failed to delete work item');
    }
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

  const handleUpdateStatus = async (itemId, newStatus, itemType) => {
    try {
      await workItemApi.updateStatus(itemId, newStatus);
      toast.success('Status updated successfully!');
      loadData();
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
      loadData();
      return result.data || result;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const toggleSlotExpansion = (slotId) => {
    setExpandedSlots(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
    }));
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
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

  const canManageWork = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) ||
    user?._id === project.projectHead?._id ||
    project.assignedUsers?.some(u => (u._id || u) === user?._id);

  const canDeleteWork = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role);

  // Get slot color scheme for visual differentiation
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
      {/* Header */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">
                {isSlotBased ? `Work Slots (${slots.length})` : `Work Items (${workItems.length})`}
              </h5>
              <small className="text-muted">
                {isSlotBased 
                  ? 'Assign team members to numbered work slots'
                  : 'View and manage work items assigned to team members'}
              </small>
            </div>
            <ViewToggle 
              viewMode={viewMode}
              onViewChange={handleViewChange}
              slotsEnabled={isSlotBased}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Work Display */}
      {isSlotBased && viewMode === 'slots' ? (
        // By Slots View
        <div className="d-flex flex-column gap-3">
          {slots.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5 text-muted">
                No slots created yet
              </Card.Body>
            </Card>
          ) : (
            <>
              {/* Render slots in numerical order */}
              {slots
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
                      <Collapse in={expandedSlots[slot._id]}>
                        <Card.Body className="p-0">
                          {slotWorkItems.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                              No work items assigned to this slot
                            </div>
                          ) : (
                            <Table responsive hover className="mb-0">
                              <thead style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                                <tr>
                                  <th style={{ width: '30%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Title</th>
                                  <th style={{ width: '20%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Assigned To</th>
                                  <th style={{ width: '15%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Due Date</th>
                                  <th style={{ width: '12%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Priority</th>
                                  <th style={{ width: '12%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Status</th>
                                  <th style={{ width: '11%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Actions</th>
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
                                    <td style={{ padding: '12px 20px' }}>{item.assignedTo?.name || 'Unassigned'}</td>
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
                                      <div className="d-flex gap-2">
                                        <Button
                                          variant="outline-info"
                                          size="sm"
                                          onClick={() => handleViewDetails(item)}
                                          title="View details and activity"
                                        >
                                          <FaEye />
                                        </Button>
                                        {canManageWork && (
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleOpenModal(item)}
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
                      </Collapse>
                    </Card>
                  );
                })}

              {/* Unassigned Work Section */}
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
                          <th style={{ width: '30%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Title</th>
                          <th style={{ width: '20%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Assigned To</th>
                          <th style={{ width: '15%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Due Date</th>
                          <th style={{ width: '12%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Priority</th>
                          <th style={{ width: '12%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Status</th>
                          <th style={{ width: '11%', padding: '12px 20px', fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>Actions</th>
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
                            <td style={{ padding: '12px 20px' }}>{item.assignedTo?.name || 'Unassigned'}</td>
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
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleViewDetails(item)}
                                  title="View details and activity"
                                >
                                  <FaEye />
                                </Button>
                                {canManageWork && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleOpenModal(item)}
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
      ) : (
        // All Work View (Table View)
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: isSlotBased ? '20%' : '25%' }}>Title</th>
                  {isSlotBased && <th style={{ width: '10%' }}>Slot</th>}
                  <th style={{ width: '20%' }}>Assigned To</th>
                  <th style={{ width: '12%' }}>Due Date</th>
                  <th style={{ width: '10%' }}>Priority</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: isSlotBased ? '13%' : '18%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isSlotBased ? (
                  // Slots table for "All Work" view in slot-based projects
                  (() => {
                    // Flatten all work items from grouped data
                    const allItems = [];
                    Object.values(groupedWorkItems.slotted || {}).forEach(group => {
                      group.workItems.forEach(item => {
                        allItems.push({ ...item, slotInfo: group.slot });
                      });
                    });
                    (groupedWorkItems.unassigned || []).forEach(item => {
                      allItems.push({ ...item, slotInfo: null });
                    });

                    return allItems.length === 0 ? (
                      <tr>
                        <td colSpan={isSlotBased ? "8" : "7"} className="text-center py-4 text-muted">
                          No work items yet. Go to the Team tab to assign work to team members.
                        </td>
                      </tr>
                    ) : (
                      allItems.map((item, index) => (
                        <tr key={item._id}>
                          <td className="fw-bold">{index + 1}</td>
                          <td>
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
                          </td>
                          <td>
                            {item.slotInfo ? (
                              <Badge bg="info">
                                Slot {item.slotInfo.slotNumber}
                              </Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{item.assignedTo?.name || 'Unassigned'}</td>
                          <td>
                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            <Badge bg={getPriorityColor(item.priority)}>
                              {item.priority || 'Medium'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getStatusBadge(item.status)}>
                              {item.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                                title="View details and activity"
                              >
                                <FaEye />
                              </Button>
                              {canManageWork && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleOpenModal(item)}
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
                      ))
                    );
                  })()
                ) : (
                  // Regular work items table
                  workItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No work items yet. Go to the Team tab to assign work to team members.
                      </td>
                    </tr>
                  ) : (
                    workItems.map((item, index) => (
                      <tr key={item._id}>
                        <td className="fw-bold">{index + 1}</td>
                        <td>
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
                        </td>
                        <td>{item.assignedTo?.name || 'Unassigned'}</td>
                        <td>
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <Badge bg={getPriorityColor(item.priority)}>
                            {item.priority || 'Medium'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getStatusBadge(item.status)}>
                            {item.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleViewDetails(item)}
                              title="View details and activity"
                            >
                              <FaEye />
                            </Button>
                            {canManageWork && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleOpenModal(item)}
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
                    ))
                  )
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Assignment Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Work Item</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter work title"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter work description"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Assign To <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Select team member...</option>
                    {teamMembers.map(member => (
                      <option key={member._id || member} value={member._id || member}>
                        {member.name || 'Unknown'}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Due Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {!isSlotBased && (
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Type</Form.Label>
                    <Form.Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="task">Task</option>
                      <option value="content">Content</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

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
          onRefresh={loadData}
          onAddComment={handleAddComment}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default UnifiedWorkTab;
