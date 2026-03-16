import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Form, ProgressBar, InputGroup } from 'react-bootstrap';
import { FaUser, FaCalendar, FaSearch, FaFilter, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';
import workCalendarApi from '../../../api/workCalendarApi';
import AssignWorkModal from '../../work/AssignWorkModal';
import { useAuth } from '../../../context/AuthContext';

/**
 * SlotsTab Component
 * Current month slot management interface (20 slots per month)
 */
const SlotsTab = ({ project, onRefresh }) => {
  console.log('🎬 SlotsTab component mounted for project:', project?._id);
  
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [expandedSlots, setExpandedSlots] = useState(new Set());

  useEffect(() => {
    loadCurrentMonthSlots();
  }, [project._id]);

  const loadCurrentMonthSlots = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading current month slots for project:', project._id);
      const response = await workCalendarApi.getCurrentMonthSlots(project._id);
      console.log('📦 Current month slots response:', response);
      
      if (response.data.success) {
        const slotsData = response.data.data.slots || [];
        const periodData = response.data.data.period || {};
        const statsData = response.data.data.statistics || {};
        
        console.log('✅ Loaded current month slots:', slotsData.length, 'slots');
        console.log('📊 Period:', periodData);
        console.log('📈 Statistics:', statsData);
        
        setSlots(slotsData);
        setCurrentPeriod(periodData);
        setStatistics(statsData);
      }
    } catch (error) {
      console.error('Error loading current month slots:', error);
      toast.error('Failed to load current month slots');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = (slot) => {
    setSelectedSlot(slot);
    setShowAssignModal(true);
  };

  const handleAssignWorkSuccess = async () => {
    // Refresh slots after work is assigned
    toast.success('✅ Work assigned to slot! The slot table will update now.');
    await loadCurrentMonthSlots();
    if (onRefresh) onRefresh();
    setShowAssignModal(false);
  };

  // Check if user can manage slots
  const canManageSlots = 
    user?.role === 'admin' || 
    user?.role === 'superadmin' || 
    user?.role === 'hr' ||
    user?.role === 'manager' ||
    user?.role === 'hod' ||
    user?._id === project.projectHead?._id;

  // Filter slots based on search and status
  const filteredSlots = slots.filter(slot => {
    const matchesSearch = !searchTerm || 
      slot.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.slotNumber?.toString().includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || slot.assignmentStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics from current data or use provided statistics
  const stats = statistics || {
    total: slots.length,
    available: slots.filter(s => s.assignmentStatus === 'available').length,
    assigned: slots.filter(s => s.assignmentStatus === 'assigned' || s.assignmentStatus === 'in-progress').length,
    completed: slots.filter(s => s.assignmentStatus === 'completed').length
  };

  const completionPercentage = stats.totalSlots > 0 ? Math.round((stats.completedSlots / stats.totalSlots) * 100) : 0;

  // Toggle slot expansion
  const toggleSlotExpansion = (slotId) => {
    const newExpanded = new Set(expandedSlots);
    if (newExpanded.has(slotId)) {
      newExpanded.delete(slotId);
    } else {
      newExpanded.add(slotId);
    }
    setExpandedSlots(newExpanded);
  };

  // Get slot color based on slot number (cycling through colors like in the image)
  const getSlotColor = (slotNumber) => {
    const colors = [
      '#8B5CF6', // Purple (Slot 1)
      '#EC4899', // Pink (Slot 2) 
      '#06B6D4', // Cyan (Slot 3)
      '#10B981', // Green (Slot 4)
      '#F59E0B', // Yellow (Slot 5)
      '#EF4444', // Red (Slot 6)
      '#6366F1', // Indigo (Slot 7)
    ];
    return colors[(slotNumber - 1) % colors.length];
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  const activeFiltersCount = [filterStatus].filter(f => f !== 'all').length + (searchTerm ? 1 : 0);

  const getStatusBadge = (status) => {
    const badges = {
      'available': { bg: 'secondary', text: 'Available' },
      'assigned': { bg: 'primary', text: 'Assigned' },
      'in-progress': { bg: 'warning', text: 'In Progress' },
      'completed': { bg: 'success', text: 'Completed' },
      'blocked': { bg: 'danger', text: 'Blocked' },
      'cancelled': { bg: 'dark', text: 'Cancelled' }
    };
    return badges[status] || badges['available'];
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      'Low': 'secondary',
      'Medium': 'info',
      'High': 'warning',
      'Urgent': 'danger'
    };
    return badges[priority] || 'secondary';
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
      {/* Current Month Slot System Info Banner */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center">
                <div className="me-3" style={{ fontSize: '2rem' }}>🎯</div>
                <div>
                  <h6 className="mb-1" style={{ fontWeight: '600' }}>
                    {currentPeriod?.monthName || 'Current Month'} Slots ({new Date().getFullYear()})
                  </h6>
                  <small style={{ opacity: 0.9 }}>
                    {canManageSlots 
                      ? 'Manage current month slots and assign work to team members.'
                      : 'View current month slots and their progress.'}
                  </small>
                </div>
              </div>
            </Col>
            <Col xs="auto">
              <div className="text-white text-end">
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                  {stats.totalSlots || stats.total || 20}
                </div>
                <small style={{ opacity: 0.9 }}>Total Slots</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">Total Slots</small>
                  <h3 className="mb-0">{stats.totalSlots || stats.total}</h3>
                </div>
                <div className="text-primary" style={{ fontSize: '2rem' }}>🎯</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">Available</small>
                  <h3 className="mb-0">{stats.availableSlots || stats.available}</h3>
                </div>
                <div className="text-secondary" style={{ fontSize: '2rem' }}>⚪</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">In Progress</small>
                  <h3 className="mb-0">{(stats.assignedSlots || 0) + (stats.inProgressSlots || 0) || stats.assigned}</h3>
                </div>
                <div className="text-warning" style={{ fontSize: '2rem' }}>🟡</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted">Completed</small>
                  <h3 className="mb-0">{stats.completedSlots || stats.completed}</h3>
                </div>
                <div className="text-success" style={{ fontSize: '2rem' }}>✅</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Progress Bar */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              {currentPeriod?.monthName || 'Current Month'} Progress
            </h6>
            <span className="fw-bold">{completionPercentage}%</span>
          </div>
          <ProgressBar 
            now={completionPercentage} 
            variant={completionPercentage === 100 ? 'success' : 'primary'}
            style={{ height: '20px' }}
          />
          <div className="d-flex justify-content-between mt-2">
            <small className="text-muted">
              {stats.completedSlots || stats.completed} of {stats.totalSlots || stats.total} slots completed
            </small>
            {statistics?.utilizationRate && (
              <small className="text-muted">
                Utilization: {statistics.utilizationRate}%
              </small>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Search and Filters */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            {/* Search */}
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by slot number, title, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            {/* Status Filter */}
            <Col md={4}>
              <Form.Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </Col>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Col md={12}>
                <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                  <FaFilter className="me-2" />
                  Clear Filters ({activeFiltersCount})
                </Button>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Header with slot count - exact match */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0 fw-semibold">Work Slots ({filteredSlots.length})</h5>
          <small className="text-muted">Assign team members to numbered work slots</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" className="d-flex align-items-center">
            <span className="me-2">☰</span>
            All Work
          </Button>
          <Button variant="primary" size="sm" className="d-flex align-items-center">
            <span className="me-2">📊</span>
            By Slots
          </Button>
        </div>
      </div>

      {/* Slots List - Exact Design Match */}
      <div className="slots-container">
        {filteredSlots.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5 text-muted">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p className="mb-0">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No slots match your search criteria' 
                  : `No slots found for ${currentPeriod?.monthName || 'current month'}`
                }
              </p>
              <small className="text-muted">
                {!searchTerm && filterStatus === 'all' && 'Slots are automatically created for each month. Please refresh the page.'}
              </small>
            </Card.Body>
          </Card>
        ) : (
          filteredSlots.map((slot) => {
            const isExpanded = expandedSlots.has(slot._id);
            const slotColor = getSlotColor(slot.slotNumber);
            
            // Get work items for this slot (for now, we'll simulate with assigned work item)
            const workItems = slot.assignedWorkItem ? [slot.assignedWorkItem] : [];
            const completedItems = workItems.filter(item => item.status === 'completed' || slot.assignmentStatus === 'completed');
            
            return (
              <div 
                key={slot._id} 
                className="slot-item mb-2"
                style={{ 
                  borderLeft: `4px solid ${slotColor}`,
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}
              >
                {/* Slot Header - Exact Match */}
                <div 
                  className="slot-header d-flex align-items-center justify-content-between p-3"
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    borderBottom: isExpanded ? '1px solid #e9ecef' : 'none'
                  }}
                  onClick={() => toggleSlotExpansion(slot._id)}
                >
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      {isExpanded ? (
                        <FaChevronDown className="text-muted" style={{ fontSize: '0.8rem' }} />
                      ) : (
                        <FaChevronRight className="text-muted" style={{ fontSize: '0.8rem' }} />
                      )}
                    </div>
                    <div>
                      <span className="fw-semibold text-dark">
                        Slot {slot.slotNumber} - {slot.title || 'Create Websites'}
                      </span>
                      <span className="text-muted ms-3" style={{ fontSize: '0.9rem' }}>
                        {workItems.length} items
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    /{completedItems.length} done
                  </div>
                </div>

                {/* Slot Content - Work Items Table */}
                {isExpanded && (
                  <div className="slot-content" style={{ backgroundColor: '#fafafa' }}>
                    {workItems.length === 0 ? (
                      <div className="p-4 text-center text-muted">
                        <p className="mb-3">No work items assigned to this slot</p>
                        {canManageSlots && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignModal(slot);
                            }}
                          >
                            <FaUser className="me-2" />
                            Assign Work
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm mb-0" style={{ fontSize: '0.9rem' }}>
                          <thead style={{ backgroundColor: '#f8f9fa' }}>
                            <tr>
                              <th style={{ border: 'none', padding: '12px', fontWeight: '600', color: '#6c757d' }}>TITLE</th>
                              <th style={{ border: 'none', padding: '12px', fontWeight: '600', color: '#6c757d' }}>ASSIGNED TO</th>
                              <th style={{ border: 'none', padding: '12px', fontWeight: '600', color: '#6c757d' }}>DUE DATE</th>
                              <th style={{ border: 'none', padding: '12px', fontWeight: '600', color: '#6c757d' }}>PRIORITY</th>
                              <th style={{ border: 'none', padding: '12px', fontWeight: '600', color: '#6c757d' }}>STATUS</th>
                              <th style={{ border: 'none', padding: '12px', fontWeight: '600', color: '#6c757d' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workItems.map((workItem, index) => (
                              <tr key={workItem._id || index} style={{ backgroundColor: '#fff' }}>
                                <td style={{ border: 'none', padding: '12px', verticalAlign: 'middle' }}>
                                  <div className="d-flex align-items-center">
                                    <div 
                                      className="me-2"
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: '#3b82f6'
                                      }}
                                    ></div>
                                    <span className="text-dark">{workItem.title}</span>
                                  </div>
                                </td>
                                <td style={{ border: 'none', padding: '12px', verticalAlign: 'middle' }}>
                                  <span className="text-dark">
                                    {workItem.assignedTo?.name || slot.assignedTo?.name || 'Unassigned'}
                                  </span>
                                </td>
                                <td style={{ border: 'none', padding: '12px', verticalAlign: 'middle' }}>
                                  <span className="text-dark">
                                    {workItem.dueDate ? new Date(workItem.dueDate).toLocaleDateString('en-US', { 
                                      month: 'numeric', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    }) : 'No due date'}
                                  </span>
                                </td>
                                <td style={{ border: 'none', padding: '12px', verticalAlign: 'middle' }}>
                                  <span 
                                    className="badge"
                                    style={{
                                      backgroundColor: 
                                        workItem.priority === 'urgent' || workItem.priority === 'Urgent' ? '#ef4444' :
                                        workItem.priority === 'high' || workItem.priority === 'High' ? '#f59e0b' :
                                        workItem.priority === 'medium' || workItem.priority === 'Medium' ? '#06b6d4' :
                                        '#6b7280',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      padding: '4px 8px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {workItem.priority || slot.priority || 'medium'}
                                  </span>
                                </td>
                                <td style={{ border: 'none', padding: '12px', verticalAlign: 'middle' }}>
                                  <span 
                                    className="badge"
                                    style={{
                                      backgroundColor: '#3b82f6',
                                      color: 'white',
                                      fontSize: '0.75rem',
                                      padding: '4px 8px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {workItem.status === 'completed' || slot.assignmentStatus === 'completed' ? 'Completed' : 'In Progress'}
                                  </span>
                                </td>
                                <td style={{ border: 'none', padding: '12px', verticalAlign: 'middle' }}>
                                  <div className="d-flex gap-1">
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '4px'
                                      }}
                                      title="View"
                                    >
                                      👁️
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-secondary"
                                      style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '4px'
                                      }}
                                      title="Edit"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Assign Work Modal - Use unified modal */}
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

      <style>{`
        .slots-container {
          max-width: 100%;
        }

        .slot-item {
          transition: all 0.2s ease;
        }

        .slot-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }

        .slot-header {
          transition: background-color 0.2s ease;
        }

        .slot-header:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .slot-content {
          background-color: rgba(0, 0, 0, 0.01);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .slot-header {
            padding: 1rem !important;
          }

          .slot-content {
            padding: 0 1rem 1rem 1rem !important;
          }

          .d-flex.gap-3 {
            flex-direction: column;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SlotsTab;