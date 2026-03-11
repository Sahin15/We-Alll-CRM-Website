import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Button,
  ListGroup,
  Badge,
  Dropdown,
  Modal,
  Row,
  Col,
  OverlayTrigger,
  Tooltip,
  Spinner,
} from "react-bootstrap";
import {
  FaPlus,
  FaCheck,
  FaTrash,
  FaEdit,
  FaCalendar,
  FaFlag,
  FaEllipsisV,
  FaCheckCircle,
  FaCircle,
  FaTasks,
} from "react-icons/fa";
import toast from "../../utils/toast";
import { todoApi } from "../../api/todoApi";
import { formatDate } from "../../utils/helpers";

const TodoWidget = ({ isCollapsed = false }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });

  useEffect(() => {
    fetchTodos();
    fetchStats();
  }, [filter]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filter !== "all" ? { status: filter } : {};
      const response = await todoApi.getMyTodos(params);
      setTodos(response.todos || []);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
      setError("Failed to load todos");
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await todoApi.getTodoStats();
      setStats(response.stats || { total: 0, completed: 0, pending: 0, overdue: 0 });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats({ total: 0, completed: 0, pending: 0, overdue: 0 });
    }
  };

  const handleOpenModal = (todo = null) => {
    if (todo) {
      setEditingTodo(todo);
      setFormData({
        title: todo.title,
        description: todo.description || "",
        priority: todo.priority,
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
      });
    } else {
      setEditingTodo(null);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTodo) {
        await todoApi.updateTodo(editingTodo._id, formData);
        toast.success("Todo updated!");
      } else {
        await todoApi.createTodo(formData);
        toast.success("Todo created!");
      }
      setShowModal(false);
      fetchTodos();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save todo");
    }
  };

  const handleToggle = async (id) => {
    try {
      await todoApi.toggleTodoStatus(id);
      fetchTodos();
      fetchStats();
    } catch (error) {
      toast.error("Failed to update todo");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this todo?")) return;
    try {
      await todoApi.deleteTodo(id);
      toast.success("Todo deleted!");
      fetchTodos();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete todo");
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "secondary";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "all") return true;
    if (filter === "pending") return todo.status === "pending";
    if (filter === "completed") return todo.status === "completed";
    return true;
  });

  if (isCollapsed) {
    return (
      <Card className="todo-widget-collapsed shadow-sm">
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <FaTasks className="text-primary me-2" size={20} />
              <strong>My Tasks</strong>
            </div>
            <Badge bg="primary" pill>
              {stats.pending}
            </Badge>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="todo-widget shadow-sm">
        <Card.Header className="bg-gradient-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <FaTasks className="me-2" size={18} />
              <strong>My To-Do List</strong>
            </div>
            <Button
              size="sm"
              variant="light"
              onClick={() => handleOpenModal()}
              className="btn-add-todo"
            >
              <FaPlus size={12} /> Add
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {/* Stats */}
          <div className="todo-stats p-3 border-bottom">
            <Row className="g-2">
              <Col xs={3}>
                <div className="stat-item text-center">
                  <div className="stat-value text-primary">{stats.total}</div>
                  <div className="stat-label">Total</div>
                </div>
              </Col>
              <Col xs={3}>
                <div className="stat-item text-center">
                  <div className="stat-value text-warning">{stats.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </Col>
              <Col xs={3}>
                <div className="stat-item text-center">
                  <div className="stat-value text-success">{stats.completed}</div>
                  <div className="stat-label">Done</div>
                </div>
              </Col>
              <Col xs={3}>
                <div className="stat-item text-center">
                  <div className="stat-value text-danger">{stats.overdue}</div>
                  <div className="stat-label">Overdue</div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Filter */}
          <div className="todo-filter p-2 border-bottom bg-light">
            <div className="btn-group btn-group-sm w-100" role="group">
              <button
                type="button"
                className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`btn ${filter === "pending" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter("pending")}
              >
                Pending
              </button>
              <button
                type="button"
                className={`btn ${filter === "completed" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter("completed")}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Todo List */}
          <div className="todo-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
            {error && (
              <div className="alert alert-warning m-3 mb-0">
                <small>{error}</small>
              </div>
            )}
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" variant="primary" />
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FaTasks size={32} className="mb-2 opacity-50" />
                <p className="mb-0">No todos yet</p>
                <small>Click "Add" to create one</small>
              </div>
            ) : (
              <ListGroup variant="flush">
                {filteredTodos.map((todo) => (
                  <ListGroup.Item
                    key={todo._id}
                    className={`todo-item ${todo.status === "completed" ? "completed" : ""}`}
                  >
                    <div className="d-flex align-items-start">
                      <div className="todo-checkbox me-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-decoration-none"
                          onClick={() => handleToggle(todo._id)}
                        >
                          {todo.status === "completed" ? (
                            <FaCheckCircle className="text-success" size={20} />
                          ) : (
                            <FaCircle className="text-muted" size={20} />
                          )}
                        </Button>
                      </div>

                      <div className="flex-grow-1">
                        <div className="todo-title">{todo.title}</div>
                        {todo.description && (
                          <div className="todo-description text-muted small">
                            {todo.description}
                          </div>
                        )}
                        <div className="todo-meta mt-1">
                          <Badge bg={getPriorityColor(todo.priority)} className="me-1">
                            <FaFlag size={10} /> {todo.priority}
                          </Badge>
                          {todo.dueDate && (
                            <Badge
                              bg={isOverdue(todo.dueDate) ? "danger" : "secondary"}
                              className="me-1"
                            >
                              <FaCalendar size={10} /> {formatDate(todo.dueDate)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Dropdown align="end">
                        <Dropdown.Toggle
                          variant="link"
                          size="sm"
                          className="text-muted p-0"
                          style={{ boxShadow: "none" }}
                        >
                          <FaEllipsisV />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleOpenModal(todo)}>
                            <FaEdit className="me-2" /> Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleDelete(todo._id)}
                            className="text-danger"
                          >
                            <FaTrash className="me-2" /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingTodo ? "Edit" : "Add"} Todo</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                Title <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={200}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Add more details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={500}
              />
            </Form.Group>

            <Row>
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
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingTodo ? "Update" : "Add"} Todo
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .todo-widget {
          border: none;
          border-radius: 12px;
          overflow: hidden;
        }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .btn-add-todo {
          font-size: 0.85rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .todo-stats .stat-item {
          padding: 0.5rem;
        }

        .todo-stats .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1;
        }

        .todo-stats .stat-label {
          font-size: 0.7rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.25rem;
        }

        .todo-item {
          padding: 0.75rem 1rem;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
        }

        .todo-item:hover {
          background-color: #f8f9fa;
          border-left-color: #667eea;
        }

        .todo-item.completed {
          opacity: 0.6;
        }

        .todo-item.completed .todo-title {
          text-decoration: line-through;
          color: #6c757d;
        }

        .todo-title {
          font-weight: 600;
          font-size: 0.95rem;
          color: #2d3748;
          margin-bottom: 0.25rem;
        }

        .todo-description {
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .todo-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .todo-meta .badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
        }

        .todo-checkbox button {
          transition: transform 0.2s ease;
        }

        .todo-checkbox button:hover {
          transform: scale(1.1);
        }

        .todo-list::-webkit-scrollbar {
          width: 6px;
        }

        .todo-list::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .todo-list::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }

        .todo-list::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .todo-widget-collapsed {
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .todo-widget-collapsed:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </>
  );
};

export default TodoWidget;
