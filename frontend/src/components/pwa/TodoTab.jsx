import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTasks } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { todoApi } from '../../api/todoApi';
import { filterTodos } from '../../utils/pwaUtils';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

export default function TodoTab() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await todoApi.getMyTodos();
      setTodos(data.todos || []);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleToggle = async (id) => {
    const prev = todos.map((t) =>
      t._id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    );
    setTodos(prev);
    try {
      await todoApi.toggleTodoStatus(id);
    } catch {
      setTodos(todos);
      toast.error('Failed to update task status.');
    }
  };

  const handleDelete = async (id) => {
    const prev = todos;
    setTodos(todos.filter((t) => t._id !== id));
    try {
      await todoApi.deleteTodo(id);
    } catch {
      setTodos(prev);
      toast.error('Failed to delete task.');
    }
  };

  const handleCreate = async (values) => {
    try {
      const data = await todoApi.createTodo(values);
      setTodos((prev) => [data.todo || data, ...prev]);
      setShowForm(false);
    } catch {
      toast.error('Failed to create task.');
    }
  };

  const handleUpdate = async (values) => {
    try {
      const data = await todoApi.updateTodo(editingTodo._id, values);
      const updated = data.todo || data;
      setTodos((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      setEditingTodo(null);
    } catch {
      toast.error('Failed to update task.');
    }
  };

  const filteredTodos = filterTodos(todos, filter, new Date());

  const closeModal = () => {
    setShowForm(false);
    setEditingTodo(null);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '80px', minHeight: '100%' }}>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '16px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '7px 14px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: filter === key ? '#6366F1' : '#E5E7EB',
              background: filter === key ? '#6366F1' : '#fff',
              color: filter === key ? '#fff' : '#6B7280',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #E5E7EB',
              borderTopColor: '#6366F1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Loading tasks...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ color: '#EF4444', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={fetchTodos}
            style={{
              background: '#6366F1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Todo list */}
      {!loading && !error && (
        <>
          {filteredTodos.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 16px',
                color: '#9CA3AF',
              }}
            >
              <FaTasks size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontSize: '15px', fontWeight: '500' }}>No tasks here!</p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <TodoItem
                key={todo._id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={(t) => setEditingTodo(t)}
                onDelete={handleDelete}
              />
            ))
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: '#6366F1',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          zIndex: 100,
        }}
        aria-label="Add new task"
      >
        <FaPlus size={20} />
      </button>

      {/* Modal */}
      {(showForm || editingTodo) && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px' }}
          >
            <TodoForm
              initialValues={editingTodo || {}}
              onSubmit={editingTodo ? handleUpdate : handleCreate}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
