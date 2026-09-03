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
import { useAuth } from "../../context/AuthContext";
import { checkPageAccess, PAGE_ACCESS } from "../../constants/pageAccess";
import { useNavigate } from "react-router-dom";

const TodoWidget = ({ isCollapsed = false }) => {
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();

  // Show the 📱 App button only to admin, superadmin, manager, and Sales dept
  const showAppButton =
    checkPageAccess(canAccess, PAGE_ACCESS.reportsAnalytics) ||
    user?.department?.name?.toLowerCase() === 'sales' ||
    user?.department?.toLowerCase?.() === 'sales';
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });

  // Fetch ALL todos once — filter client-side so tab switching is instant
  useEffect(() => {
    fetchTodos();
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      // Always fetch all todos — no status param — filter in UI
      const response = await todoApi.getMyTodos({});
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
      // Update local state immediately for instant UI feedback
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo._id === id
            ? {
                ...todo,
                status: todo.status === 'completed' ? 'pending' : 'completed',
                completedAt: todo.status === 'completed' ? null : new Date(),
              }
            : todo
        )
      );

      // Update stats immediately
      setStats(prevStats => {
        if (todos.find(t => t._id === id)?.status === 'pending') {
          return {
            ...prevStats,
            pending: Math.max(0, prevStats.pending - 1),
            completed: prevStats.completed + 1,
          };
        } else {
          return {
            ...prevStats,
            pending: prevStats.pending + 1,
            completed: Math.max(0, prevStats.completed - 1),
          };
        }
      });

      // Call API in background
      await todoApi.toggleTodoStatus(id);
      toast.success('Todo updated!');
    } catch (error) {
      // Revert on error
      fetchTodos();
      fetchStats();
      toast.error('Failed to update todo');
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

  const filteredTodos = todos
    .filter((todo) => {
      if (filter === "all") return true;
      if (filter === "pending") return todo.status === "pending";
      if (filter === "completed") return todo.status === "completed";
      return true;
    })
    .sort((a, b) => {
      // Sort by closest due date first; no due date goes to bottom
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
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
      {/* Fixed-height preview card */}
      <Card className="todo-widget shadow-sm" style={{ height: '320px', borderRadius: '16px', overflow: 'hidden', border: 'none' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', flexShrink: 0 }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <FaTasks size={15} color="#fff" />
              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>My To-Do List</strong>
              {stats.pending > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: '700' }}>
                  {stats.pending} pending
                </span>
              )}
            </div>
            <div className="d-flex gap-2">
              {showAppButton && (
                <button
                  onClick={() => navigate('/app')}
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  📱 App
                </button>
              )}
              <button
                onClick={() => handleOpenModal()}
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
          {[
            { label: 'Total', value: stats.total, color: '#6366F1' },
            { label: 'Pending', value: stats.pending, color: '#F59E0B' },
            { label: 'Done', value: stats.completed, color: '#10B981' },
            { label: 'Overdue', value: stats.overdue, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: '#9CA3AF', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Preview list — max 3 items */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: '4px 0' }}>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center h-100">
              <Spinner animation="border" size="sm" variant="primary" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
              <FaTasks size={28} className="mb-2 opacity-25" />
              <p className="mb-0 small">No pending todos</p>
            </div>
          ) : (
            filteredTodos.slice(0, 3).map(todo => (
              <div key={todo._id} style={{ padding: '9px 18px', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handleToggle(todo._id)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
                >
                  {todo.status === 'completed'
                    ? <FaCheckCircle color="#10B981" size={18} />
                    : <FaCircle color="#D1D5DB" size={18} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: todo.status === 'completed' ? '#9CA3AF' : '#111827', textDecoration: todo.status === 'completed' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {todo.title}
                  </div>
                  {todo.dueDate && (
                    <div style={{ fontSize: '0.7rem', color: isOverdue(todo.dueDate) ? '#EF4444' : '#9CA3AF', marginTop: '1px' }}>
                      📅 {formatDate(todo.dueDate)}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 7px', borderRadius: '10px', background: getPriorityColor(todo.priority) === 'danger' ? '#FEE2E2' : getPriorityColor(todo.priority) === 'warning' ? '#FEF3C7' : '#DBEAFE', color: getPriorityColor(todo.priority) === 'danger' ? '#DC2626' : getPriorityColor(todo.priority) === 'warning' ? '#D97706' : '#2563EB', flexShrink: 0 }}>
                  {todo.priority}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer — View All button */}
        <div
          style={{ padding: '10px 18px', borderTop: '1px solid #F3F4F6', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA', flexShrink: 0 }}
          onClick={() => setShowAllModal(true)}
        >
          <span style={{ fontSize: '0.78rem', color: '#6366F1', fontWeight: '600' }}>
            View All Todos ({stats.total}) →
          </span>
        </div>
      </Card>

      {/* Full Todo Modal */}
      <Modal show={showAllModal} onHide={() => setShowAllModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <Modal.Title className="fw-bold">My To-Do List</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0 24px 24px' }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', paddingTop: '8px' }}>
            {[
              { label: 'Total', value: stats.total, color: '#6366F1' },
              { label: 'Pending', value: stats.pending, color: '#F59E0B' },
              { label: 'Done', value: stats.completed, color: '#10B981' },
              { label: 'Overdue', value: stats.overdue, color: '#EF4444' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter + Add */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex gap-2">
              {['pending', 'all', 'completed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', background: filter === f ? '#6366F1' : '#F3F4F6', color: filter === f ? '#fff' : '#6B7280' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => handleOpenModal()} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', background: '#6366F1', color: '#fff' }}>
              + Add Todo
            </button>
          </div>

          {/* Full list */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-4"><Spinner animation="border" size="sm" variant="primary" /></div>
            ) : filteredTodos.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FaTasks size={36} className="mb-2 opacity-25" />
                <p>No todos found</p>
              </div>
            ) : (
              <ListGroup variant="flush">
                {filteredTodos.map(todo => (
                  <ListGroup.Item key={todo._id} className={`todo-item ${todo.status === 'completed' ? 'completed' : ''}`}>
                    <div className="d-flex align-items-start">
                      <div className="todo-checkbox me-2">
                        <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => handleToggle(todo._id)}>
                          {todo.status === 'completed' ? <FaCheckCircle className="text-success" size={20} /> : <FaCircle className="text-muted" size={20} />}
                        </Button>
                      </div>
                      <div className="flex-grow-1">
                        <div className="todo-title">{todo.title}</div>
                        {todo.description && <div className="todo-description text-muted small">{todo.description}</div>}
                        <div className="todo-meta mt-1">
                          <Badge bg={getPriorityColor(todo.priority)} className="me-1"><FaFlag size={10} /> {todo.priority}</Badge>
                          {todo.dueDate && <Badge bg={isOverdue(todo.dueDate) ? 'danger' : 'secondary'} className="me-1"><FaCalendar size={10} /> {formatDate(todo.dueDate)}</Badge>}
                        </div>
                      </div>
                      <Dropdown align="end">
                        <Dropdown.Toggle variant="link" size="sm" className="text-muted p-0" style={{ boxShadow: 'none' }}><FaEllipsisV /></Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleOpenModal(todo)}><FaEdit className="me-2" /> Edit</Dropdown.Item>
                          <Dropdown.Item onClick={() => handleDelete(todo._id)} className="text-danger"><FaTrash className="me-2" /> Delete</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
        </Modal.Body>
      </Modal>

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
