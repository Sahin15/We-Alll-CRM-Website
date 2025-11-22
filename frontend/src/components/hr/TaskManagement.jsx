import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
  Spinner,
  Alert
} from "react-bootstrap";
import {
  FaTasks,
  FaPlus,
  FaEye,
  FaSearch,
  FaUser,
  FaCalendarAlt,
  FaEdit
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'view'
  const [selectedTask, setSelectedTask] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: "",
    tags: ""
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    todo: 0,
    inProgress: 0,
    done: 0,
    total: 0
  });

  // Show all state
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks/all");
      const allTasks = response.data;
      
      setTasks(allTasks);
      
      // Calculate statistics
      setStats({
        todo: allTasks.filter(t => t.status === "todo").length,
        inProgress: allTasks.filter(t => t.status === "in-progress").length,
        done: allTasks.filter(t => t.status === "done").length,
        total: allTasks.length
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (error.response?.status === 403) {
        toast.error("You don't have permission to view all tasks");
      } else {
        toast.error("Failed to fetch tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users");
      setEmployees(response.data.filter(u => u.role === "employee" || u.role === "manager"));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter) {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Assignee filter
    if (assigneeFilter) {
      filtered = filtered.filter(task => task.assignedTo?._id === assigneeFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  const handleCreateTask = () => {
    setModalMode("create");
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      priority: "medium",
      dueDate: "",
      estimatedHours: "",
      tags: ""
    });
    setShowModal(true);
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setModalMode("view");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.assignedTo) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setProcessing(true);
      
      const taskData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : []
      };

      await api.post("/tasks", taskData);
      toast.success("Task created successfully");
      
      setShowModal(false);
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error.response?.data?.message || "Failed to create task");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      "todo": "secondary",
      "in-progress": "primary",
      "done": "success",
      "blocked": "danger"
    };
    const labels = {
      "todo": "To Do",
      "in-progress": "In Progress",
      "done": "Done",
      "blocked": "Blocked"
    };
    return <Badge bg={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: "info",
      medium: "warning",
      high: "danger"
    };
    return <Badge bg={variants[priority] || "secondary"}>{priority}</Badge>;
  };

  const formatDate = (date) => {
    if (!date) return "No due date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "done") return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading tasks...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaTasks className="me-2 text-primary" />
              Task Management
            </h5>
            <Button variant="primary" size="sm" onClick={handleCreateTask}>
              <FaPlus className="me-2" />
              Create Task
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Statistics */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 bg-secondary bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-secondary">{stats.todo}</h3>
                  <small className="text-muted">To Do</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-primary bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-primary">{stats.inProgress}</h3>
                  <small className="text-muted">In Progress</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-success bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{stats.done}</h3>
                  <small className="text-muted">Completed</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-info bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-info">{stats.total}</h3>
                  <small className="text-muted">Total Tasks</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {/* Tasks Table */}
          {filteredTasks.length > 0 ? (
            <div className="table-responsive" style={{ maxHeight: showAll ? 'none' : '350px', overflowY: 'auto' }}>
              <Table hover>
                <thead className="bg-light">
                  <tr>
                    <th>Task</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task._id} className={isOverdue(task.dueDate, task.status) ? "table-danger" : ""}>
                      <td>
                        <div>
                          <div className="fw-bold">{task.title}</div>
                          <small className="text-muted">
                            {task.description?.substring(0, 50)}
                            {task.description?.length > 50 ? "..." : ""}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-muted me-2" />
                          <div>
                            <div>{task.assignedTo?.name || "Unassigned"}</div>
                            <small className="text-muted">{task.assignedTo?.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{getPriorityBadge(task.priority)}</td>
                      <td>
                        <small className={isOverdue(task.dueDate, task.status) ? "text-danger fw-bold" : ""}>
                          {formatDate(task.dueDate)}
                          {isOverdue(task.dueDate, task.status) && (
                            <div className="text-danger">Overdue!</div>
                          )}
                        </small>
                      </td>
                      <td>{getStatusBadge(task.status)}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewTask(task)}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}

          {/* Show All / Show Less Button */}
          {filteredTasks.length > 5 && (
            <div className="text-center mt-3 pt-3 border-top">
              <Button 
                variant="link" 
                className="text-decoration-none"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <span className="fw-semibold">Show Less</span>
                    <Badge bg="secondary" className="ms-2">{filteredTasks.length - 5} hidden</Badge>
                  </>
                ) : (
                  <>
                    <span className="fw-semibold">Show All Tasks</span>
                    <Badge bg="primary" className="ms-2">{filteredTasks.length - 5} more</Badge>
                  </>
                )}
              </Button>
            </div>
          )}

          {filteredTasks.length === 0 && (
            <Alert variant="info" className="text-center">
              <FaTasks className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No tasks found</p>
              <small>Create a new task or adjust your filters</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Create/View Task Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === "create" ? "Create New Task" : "Task Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMode === "create" ? (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Task Title *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter task description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Assign To *</Form.Label>
                    <Form.Select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Due Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estimated Hours</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="e.g., 8"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Tags (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., frontend, urgent, bug-fix"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </Form.Group>
            </Form>
          ) : (
            selectedTask && (
              <>
                <Row className="mb-3">
                  <Col md={12}>
                    <h5>{selectedTask.title}</h5>
                    <p className="text-muted">{selectedTask.description}</p>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Assigned To:</strong>
                    <p>{selectedTask.assignedTo?.name}</p>
                  </Col>
                  <Col md={6}>
                    <strong>Assigned By:</strong>
                    <p>{selectedTask.assignedBy?.name}</p>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={4}>
                    <strong>Priority:</strong>
                    <p>{getPriorityBadge(selectedTask.priority)}</p>
                  </Col>
                  <Col md={4}>
                    <strong>Status:</strong>
                    <p>{getStatusBadge(selectedTask.status)}</p>
                  </Col>
                  <Col md={4}>
                    <strong>Due Date:</strong>
                    <p className={isOverdue(selectedTask.dueDate, selectedTask.status) ? "text-danger" : ""}>
                      {formatDate(selectedTask.dueDate)}
                    </p>
                  </Col>
                </Row>

                {selectedTask.tags && selectedTask.tags.length > 0 && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong>Tags:</strong>
                      <div className="mt-2">
                        {selectedTask.tags.map((tag, index) => (
                          <Badge key={index} bg="secondary" className="me-2">{tag}</Badge>
                        ))}
                      </div>
                    </Col>
                  </Row>
                )}

                <Row>
                  <Col md={6}>
                    <strong>Created:</strong>
                    <p><small>{formatDate(selectedTask.createdAt)}</small></p>
                  </Col>
                  {selectedTask.completedAt && (
                    <Col md={6}>
                      <strong>Completed:</strong>
                      <p><small>{formatDate(selectedTask.completedAt)}</small></p>
                    </Col>
                  )}
                </Row>
              </>
            )
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Close
          </Button>
          {modalMode === "create" && (
            <Button variant="primary" onClick={handleSubmit} disabled={processing}>
              {processing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                <>
                  <FaPlus className="me-2" />
                  Create Task
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TaskManagement;
