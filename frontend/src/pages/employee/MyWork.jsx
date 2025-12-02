import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, Alert, Table, Tabs, Tab } from 'react-bootstrap';
import { FaSearch, FaEye, FaFilter, FaClock, FaCalendar, FaExclamationTriangle, FaTasks, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import WorkItemDetails from '../../components/work/WorkItemDetails';
import slotApi from '../../api/slotApi';
import taskApi from '../../api/taskApi';

const MyWork = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadAllWork();
  }, [user]);

  const loadAllWork = async () => {
    try {
      setLoading(true);
      const [slotsResponse, tasksResponse] = await Promise.all([
        slotApi.getMySlots(),
        taskApi.getMyTasks()
      ]);
      setSlots(slotsResponse.data || []);
      setTasks(tasksResponse.data || []);
    } catch (error) {
      console.error('Error loading work:', error);
      toast.error('Failed to load your work items');
      setSlots([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Combine slots and tasks into unified work items
  const allWorkItems = useMemo(() => {
    const slotItems = slots.map(slot => ({
      ...slot,
      type: 'slot',
      title: slot.brief,
      status: slot.designStatus,
      dueDate: slot.postingDate,
      priority: slot.contentBucket
    }));

    const taskItems = tasks.map(task => ({
      ...task,
      type: 'task'
    }));

    return [...slotItems, ...taskItems];
  }, [slots, tasks]);

  // Filter work items
  const filteredItems = useMemo(() => {
    let filtered = [...allWorkItems];

    // Tab filter
    if (activeTab === 'content') {
      filtered = filtered.filter(item => item.type === 'slot');
    } else if (activeTab === 'tasks') {
      filtered = filtered.filter(item => item.type === 'task');
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        if (item.type === 'slot') {
          return item.designStatus === filterStatus;
        } else {
          return item.status === filterStatus;
        }
      });
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Sort by due date
    filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate || a.postingDate);
      const dateB = new Date(b.dueDate || b.postingDate);
      return dateA - dateB;
    });

    return filtered;
  }, [allWorkItems, searchTerm, filterStatus, filterType, activeTab]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contentTasks = allWorkItems.filter(item => item.type === 'slot');
    const generalTasks = allWorkItems.filter(item => item.type === 'task');

    const overdue = allWorkItems.filter(item => {
      const dueDate = new Date(item.dueDate || item.postingDate);
      const isComplete = item.type === 'slot' 
        ? item.designStatus === 'Approved' 
        : item.status === 'done';
      return dueDate < today && !isComplete;
    });

    const dueToday = allWorkItems.filter(item => {
      const dueDate = new Date(item.dueDate || item.postingDate);
      const isComplete = item.type === 'slot' 
        ? item.designStatus === 'Approved' 
        : item.status === 'done';
      return dueDate.toDateString() === today.toDateString() && !isComplete;
    });

    const inProgress = allWorkItems.filter(item => {
      if (item.type === 'slot') {
        return item.designStatus === 'In Design';
      } else {
        return item.status === 'in-progress';
      }
    });

    const completed = allWorkItems.filter(item => {
      if (item.type === 'slot') {
        return item.designStatus === 'Approved';
      } else {
        return item.status === 'done';
      }
    });

    return {
      total: allWorkItems.length,
      contentTasks: contentTasks.length,
      generalTasks: generalTasks.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      inProgress: inProgress.length,
      completed: completed.length
    };
  }, [allWorkItems]);

  const isOverdue = (item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.dueDate || item.postingDate);
    const isComplete = item.type === 'slot' 
      ? item.designStatus === 'Approved' 
      : item.status === 'done';
    return dueDate < today && !isComplete;
  };

  const isDueToday = (item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.dueDate || item.postingDate);
    const isComplete = item.type === 'slot' 
      ? item.designStatus === 'Approved' 
      : item.status === 'done';
    return dueDate.toDateString() === today.toDateString() && !isComplete;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (item) => {
    if (item.type === 'slot') {
      const statusColors = {
        'Planned': 'secondary',
        'In Design': 'primary',
        'Ready for Review': 'info',
        'Approved': 'success',
        'Revision Needed': 'warning'
      };
      return <Badge bg={statusColors[item.designStatus] || 'secondary'}>{item.designStatus}</Badge>;
    } else {
      const statusColors = {
        'todo': 'secondary',
        'in-progress': 'primary',
        'review': 'info',
        'done': 'success'
      };
      const statusLabels = {
        'todo': 'To Do',
        'in-progress': 'In Progress',
        'review': 'Review',
        'done': 'Done'
      };
      return <Badge bg={statusColors[item.status] || 'secondary'}>{statusLabels[item.status]}</Badge>;
    }
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setSelectedType(item.type);
    setShowModal(true);
  };

  const handleUpdateStatus = async (itemId, newStatus, type) => {
    try {
      if (type === 'slot') {
        // Use the specific status update endpoint
        await slotApi.updateSlotStatus(itemId, newStatus);
      } else {
        await taskApi.updateTaskStatus(itemId, newStatus);
      }
      toast.success('Status updated successfully!');
      loadAllWork();
      
      // Update the selected item
      if (selectedItem && selectedItem._id === itemId) {
        const updatedItem = { ...selectedItem };
        if (type === 'slot') {
          updatedItem.designStatus = newStatus;
        } else {
          updatedItem.status = newStatus;
        }
        setSelectedItem(updatedItem);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update status');
      throw error;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
  };

  const activeFiltersCount = [filterStatus, filterType].filter(f => f !== 'all').length;

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
          <p className="text-muted">View and manage all your assigned work items</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="mb-0">{stats.total}</h3>
              <small className="text-muted">Total Work Items</small>
              <div className="mt-2">
                <Badge bg="success" className="me-1">{stats.contentTasks} Content</Badge>
                <Badge bg="primary">{stats.generalTasks} Tasks</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-warning">
            <Card.Body>
              <h3 className="mb-0 text-warning">{stats.dueToday}</h3>
              <small className="text-muted">
                <FaClock className="me-1" />
                Due Today
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-primary">
            <Card.Body>
              <h3 className="mb-0 text-primary">{stats.inProgress}</h3>
              <small className="text-muted">
                <FaTasks className="me-1" />
                In Progress
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-danger">
            <Card.Body>
              <h3 className="mb-0 text-danger">{stats.overdue}</h3>
              <small className="text-muted">
                <FaExclamationTriangle className="me-1" />
                Overdue
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {stats.overdue > 0 && (
        <Alert variant="danger" className="mb-3">
          <FaExclamationTriangle className="me-2" />
          <strong>Attention!</strong> You have {stats.overdue} overdue item{stats.overdue > 1 ? 's' : ''}. Please prioritize these.
        </Alert>
      )}

      {stats.dueToday > 0 && (
        <Alert variant="warning" className="mb-3">
          <FaClock className="me-2" />
          <strong>Reminder:</strong> You have {stats.dueToday} item{stats.dueToday > 1 ? 's' : ''} due today!
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={12}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by title, description, or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col md={6}>
              <Form.Select value={filterType} onChange={(e) => setFilterType(e.target.value)} size="sm">
                <option value="all">All Types</option>
                <option value="slot">Content Tasks Only</option>
                <option value="task">General Tasks Only</option>
              </Form.Select>
            </Col>

            <Col md={6}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="sm">
                <option value="all">All Statuses</option>
                <optgroup label="Content Statuses">
                  <option value="Planned">To Do (Content)</option>
                  <option value="In Design">In Progress (Content)</option>
                  <option value="Ready for Review">Ready for Review (Content)</option>
                  <option value="Approved">Completed (Content)</option>
                </optgroup>
                <optgroup label="Task Statuses">
                  <option value="todo">To Do (Task)</option>
                  <option value="in-progress">In Progress (Task)</option>
                  <option value="review">Review (Task)</option>
                  <option value="done">Done (Task)</option>
                </optgroup>
              </Form.Select>
            </Col>

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

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="all" title={`All Work (${allWorkItems.length})`}>
          <div className="mb-2 text-muted">
            Showing {filteredItems.length} of {allWorkItems.length} items
          </div>
        </Tab>
        <Tab eventKey="content" title={`Content Tasks (${stats.contentTasks})`}>
          <div className="mb-2 text-muted">
            Showing {filteredItems.length} content tasks
          </div>
        </Tab>
        <Tab eventKey="tasks" title={`General Tasks (${stats.generalTasks})`}>
          <div className="mb-2 text-muted">
            Showing {filteredItems.length} general tasks
          </div>
        </Tab>
      </Tabs>

      {/* Work Items Table */}
      <Card>
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Project</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    {allWorkItems.length === 0
                      ? 'No work items assigned to you yet.'
                      : 'No items match your search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={`${item.type}-${item._id}`}
                    className={isOverdue(item) ? 'table-danger' : isDueToday(item) ? 'table-warning' : ''}
                  >
                    <td>
                      <Badge bg={item.type === 'slot' ? 'success' : 'primary'}>
                        {item.type === 'slot' ? 'Content' : 'Task'}
                      </Badge>
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.type === 'slot' && item.postType && (
                        <div className="text-muted small">{item.postType}</div>
                      )}
                    </td>
                    <td>
                      <div>{item.project?.name || 'N/A'}</div>
                      {item.type === 'slot' && item.client && (
                        <small className="text-muted">{item.client.name}</small>
                      )}
                    </td>
                    <td>
                      <div className={isDueToday(item) ? 'fw-bold text-warning' : ''}>
                        {formatDate(item.dueDate || item.postingDate)}
                      </div>
                      {isDueToday(item) && (
                        <Badge bg="warning" className="mt-1">Due Today!</Badge>
                      )}
                      {isOverdue(item) && (
                        <Badge bg="danger" className="mt-1">Overdue</Badge>
                      )}
                    </td>
                    <td>{getStatusBadge(item)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewItem(item)}
                        title="View & Update"
                      >
                        <FaEye />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Work Item Details Modal */}
      {selectedItem && (
        <WorkItemDetails
          show={showModal}
          onHide={() => {
            setShowModal(false);
            setSelectedItem(null);
            setSelectedType(null);
          }}
          item={selectedItem}
          type={selectedType}
          onUpdate={handleUpdateStatus}
          currentUser={user}
        />
      )}
    </Container>
  );
};

export default MyWork;
