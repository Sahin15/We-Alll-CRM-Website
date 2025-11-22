import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Tab, Tabs, Modal } from 'react-bootstrap';
import { FaTasks, FaClock, FaCalendar, FaFilter, FaPlus, FaCheck } from 'react-icons/fa';
import toast from '../../utils/toast';
import api from '../../services/api';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [view, setView] = useState('list'); // 'list' or 'kanban'
  const [showAddTask, setShowAddTask] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [completedTasksByDate, setCompletedTasksByDate] = useState({});
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: 0
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [filterStatus, filterPriority, tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/my-tasks');
      setTasks(response.data);
      setFilteredTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success('Task status updated');
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const taskData = {
        ...newTask,
        status: 'todo',
        assignedTo: 'self' // Indicates self-assigned task
      };
      console.log('Creating task with data:', taskData);
      
      await api.post('/tasks', taskData);
      
      toast.success('Task created successfully');
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        estimatedHours: 0
      });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create task';
      toast.error(errorMessage);
    }
  };

  const toggleTaskComplete = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await updateTaskStatus(taskId, newStatus);
  };

  const fetchCompletedTasksByDate = async () => {
    try {
      const response = await api.get(`/tasks/completed-by-date?month=${dateFilter.month}&year=${dateFilter.year}`);
      setCompletedTasksByDate(response.data.tasksByDate || {});
    } catch (error) {
      console.error('Error fetching completed tasks by date:', error);
      toast.error('Failed to load completed tasks');
    }
  };

  const exportToExcel = () => {
    // Simple CSV export
    const csvData = [];
    csvData.push(['Date', 'Task Title', 'Priority', 'Completed At', 'Project']);
    
    Object.keys(completedTasksByDate).sort().reverse().forEach(date => {
      completedTasksByDate[date].forEach(task => {
        csvData.push([
          date,
          task.title,
          task.priority,
          new Date(task.completedAt).toLocaleTimeString(),
          task.project?.name || 'No Project'
        ]);
      });
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_${dateFilter.month}_${dateFilter.year}.csv`;
    a.click();
    toast.success('Tasks exported successfully');
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'info',
      medium: 'warning',
      high: 'danger',
      urgent: 'danger'
    };
    return variants[priority] || 'secondary';
  };

  const getStatusBadge = (status) => {
    const variants = {
      'todo': 'secondary',
      'in-progress': 'primary',
      'review': 'warning',
      'done': 'success'
    };
    return variants[status] || 'secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'review': 'Review',
      'done': 'Done'
    };
    return labels[status] || status;
  };

  const isOverdue = (dueDate, status) => {
    return dueDate && new Date(dueDate) < new Date() && status !== 'done';
  };

  const TaskCard = ({ task }) => (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-start flex-grow-1">
            <Form.Check
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => toggleTaskComplete(task._id, task.status)}
              className="me-2 mt-1"
            />
            <h5 className={`mb-0 ${task.status === 'done' ? 'text-decoration-line-through text-muted' : ''}`}>
              {task.title}
            </h5>
          </div>
          <Badge bg={getStatusBadge(task.status)}>
            {getStatusLabel(task.status)}
          </Badge>
        </div>

        {task.description && (
          <p className="text-muted small mb-2">{task.description}</p>
        )}

        <div className="d-flex flex-wrap gap-2 mb-2">
          <Badge bg={getPriorityBadge(task.priority)}>
            {task.priority}
          </Badge>

          {task.project && (
            <Badge bg="light" text="dark">
              <FaTasks className="me-1" />
              {task.project.name}
            </Badge>
          )}

          {task.dueDate && (
            <Badge bg={isOverdue(task.dueDate, task.status) ? 'danger' : 'light'} text={isOverdue(task.dueDate, task.status) ? 'white' : 'dark'}>
              <FaCalendar className="me-1" />
              {new Date(task.dueDate).toLocaleDateString()}
            </Badge>
          )}

          {task.estimatedHours > 0 && (
            <Badge bg="light" text="dark">
              <FaClock className="me-1" />
              {task.estimatedHours}h est.
            </Badge>
          )}
        </div>

        <div className="d-flex gap-2">
          {task.status !== 'done' && (
            <>
              {task.status === 'todo' && (
                <Button size="sm" variant="primary" onClick={() => updateTaskStatus(task._id, 'in-progress')}>
                  Start Task
                </Button>
              )}
              {task.status === 'in-progress' && (
                <Button size="sm" variant="warning" onClick={() => updateTaskStatus(task._id, 'review')}>
                  Submit for Review
                </Button>
              )}
              {task.status === 'review' && (
                <Button size="sm" variant="success" onClick={() => updateTaskStatus(task._id, 'done')}>
                  Mark as Done
                </Button>
              )}
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  const KanbanColumn = ({ status, title, tasks }) => (
    <Col md={3}>
      <Card className="mb-3">
        <Card.Header className="bg-light">
          <h6 className="mb-0">{title} ({tasks.length})</h6>
        </Card.Header>
        <Card.Body style={{ minHeight: '400px', maxHeight: '600px', overflowY: 'auto' }}>
          {tasks.map(task => (
            <Card key={task._id} className="mb-2 shadow-sm">
              <Card.Body className="p-2">
                <h6 className="mb-1 small">{task.title}</h6>
                <div className="d-flex gap-1 mb-1">
                  <Badge bg={getPriorityBadge(task.priority)} className="small">
                    {task.priority}
                  </Badge>
                  {task.dueDate && (
                    <Badge bg={isOverdue(task.dueDate, task.status) ? 'danger' : 'light'} text={isOverdue(task.dueDate, task.status) ? 'white' : 'dark'} className="small">
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Badge>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))}
        </Card.Body>
      </Card>
    </Col>
  );

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <div className="spinner-border text-primary" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>My Tasks</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => setShowAddTask(true)}>
            <FaPlus className="me-2" />
            Add New Task
          </Button>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Form.Select>
        </Col>
        <Col md={6} className="text-end">
          <Button
            variant={view === 'list' ? 'primary' : 'outline-primary'}
            className="me-2"
            onClick={() => setView('list')}
          >
            List View
          </Button>
          <Button
            variant={view === 'kanban' ? 'primary' : 'outline-primary'}
            className="me-2"
            onClick={() => setView('kanban')}
          >
            Kanban Board
          </Button>
          <Button
            variant="outline-success"
            onClick={() => {
              setShowDateFilter(true);
              fetchCompletedTasksByDate();
            }}
          >
            <FaCalendar className="me-2" />
            View by Date
          </Button>
        </Col>
      </Row>

      {/* Task Views */}
      {view === 'list' ? (
        <Row>
          <Col>
            {filteredTasks.length === 0 ? (
              <Card className="text-center p-5">
                <Card.Body>
                  <FaTasks size={48} className="text-muted mb-3" />
                  <h5>No tasks found</h5>
                  <p className="text-muted">You don't have any tasks matching the selected filters.</p>
                </Card.Body>
              </Card>
            ) : (
              filteredTasks.map(task => <TaskCard key={task._id} task={task} />)
            )}
          </Col>
        </Row>
      ) : (
        <Row>
          <KanbanColumn
            status="todo"
            title="To Do"
            tasks={filteredTasks.filter(t => t.status === 'todo')}
          />
          <KanbanColumn
            status="in-progress"
            title="In Progress"
            tasks={filteredTasks.filter(t => t.status === 'in-progress')}
          />
          <KanbanColumn
            status="review"
            title="Review"
            tasks={filteredTasks.filter(t => t.status === 'review')}
          />
          <KanbanColumn
            status="done"
            title="Done"
            tasks={filteredTasks.filter(t => t.status === 'done')}
          />
        </Row>
      )}

      {/* Add Task Modal */}
      <Modal show={showAddTask} onHide={() => setShowAddTask(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddTask}>
            <Form.Group className="mb-3">
              <Form.Label>Task Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter task description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Estimated Hours</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={newTask.estimatedHours}
                onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 0 })}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <FaPlus className="me-2" />
                Add Task
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Tasks by Date Modal */}
      <Modal show={showDateFilter} onHide={() => setShowDateFilter(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Completed Tasks by Date</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Month</Form.Label>
                <Form.Select
                  value={dateFilter.month}
                  onChange={(e) => setDateFilter({ ...dateFilter, month: parseInt(e.target.value) })}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Year</Form.Label>
                <Form.Select
                  value={dateFilter.year}
                  onChange={(e) => setDateFilter({ ...dateFilter, year: parseInt(e.target.value) })}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button variant="primary" onClick={fetchCompletedTasksByDate} className="me-2">
                Load Tasks
              </Button>
              <Button variant="success" onClick={exportToExcel} disabled={Object.keys(completedTasksByDate).length === 0}>
                Export Excel
              </Button>
            </Col>
          </Row>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.keys(completedTasksByDate).length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaCalendar size={48} className="mb-3 opacity-25" />
                <p>No completed tasks for this period</p>
                <small>Select a month and click "Load Tasks"</small>
              </div>
            ) : (
              Object.keys(completedTasksByDate).sort().reverse().map(date => (
                <Card key={date} className="mb-3">
                  <Card.Header className="bg-light">
                    <strong>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    <Badge bg="success" className="ms-2">{completedTasksByDate[date].length} tasks</Badge>
                  </Card.Header>
                  <Card.Body>
                    {completedTasksByDate[date].map(task => (
                      <div key={task._id} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                        <div>
                          <h6 className="mb-1">{task.title}</h6>
                          <small className="text-muted">
                            Completed at: {new Date(task.completedAt).toLocaleTimeString()}
                            {task.project && ` • Project: ${task.project.name}`}
                          </small>
                        </div>
                        <Badge bg={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MyTasks;
