import { useState, useEffect, useCallback } from 'react';
import { FaTasks, FaPlus, FaCheckCircle, FaCircle, FaEdit, FaTrash, FaFlag, FaCalendar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { todoApi } from '../../api/todoApi';

const PRIORITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
const FILTERS = [{ key: 'pending', label: 'Pending' }, { key: 'all', label: 'All' }, { key: 'completed', label: 'Done' }, { key: 'overdue', label: 'Overdue' }];

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const d = new Date(dueDate); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return d < t;
}

function fmt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

export default function TodoTab() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });
  const [titleError, setTitleError] = useState('');

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try { const data = await todoApi.getMyTodos(); setTodos(data.todos || []); }
    catch { setTodos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const openForm = (todo = null) => {
    if (todo) { setEditingTodo(todo); setForm({ title: todo.title, description: todo.description || '', priority: todo.priority, dueDate: todo.dueDate ? todo.dueDate.slice(0,10) : '' }); }
    else { setEditingTodo(null); setForm({ title: '', description: '', priority: 'medium', dueDate: '' }); }
    setTitleError(''); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setTitleError('Title is required'); return; }
    try {
      if (editingTodo) { await todoApi.updateTodo(editingTodo._id, form); toast.success('Task updated!'); }
      else { await todoApi.createTodo(form); toast.success('Task created!'); }
      setShowForm(false); await fetchTodos();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save task'); }
  };

  const handleToggle = async (id) => {
    const prev = todos;
    setTodos(t => t.map(x => x._id === id ? { ...x, status: x.status === 'completed' ? 'pending' : 'completed' } : x));
    try { await todoApi.toggleTodoStatus(id); }
    catch { setTodos(prev); toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    const prev = todos;
    setTodos(t => t.filter(x => x._id !== id));
    try { await todoApi.deleteTodo(id); toast.success('Task deleted'); }
    catch { setTodos(prev); toast.error('Failed to delete'); }
  };

  const filtered = todos.filter(t => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'pending') return t.status !== 'completed' && !isOverdue(t.dueDate);
    if (filter === 'overdue') return t.status !== 'completed' && isOverdue(t.dueDate);
    return true;
  });

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '6px 14px', borderRadius: '999px', border: '1px solid', borderColor: filter === f.key ? '#10B981' : '#E5E7EB', background: filter === f.key ? '#10B981' : '#fff', color: filter === f.key ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Todo list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          <FaTasks size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>No tasks here!</p>
        </div>
      ) : (
        filtered.map(todo => {
          const completed = todo.status === 'completed';
          const overdue = !completed && isOverdue(todo.dueDate);
          const pc = PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.medium;
          return (
            <div key={todo._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '10px', opacity: completed ? 0.65 : 1 }}>
              <button onClick={() => handleToggle(todo._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                {completed ? <FaCheckCircle size={22} color="#10B981" /> : <FaCircle size={22} color="#D1D5DB" />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', textDecoration: completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.title}</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '999px', background: `${pc}20`, color: pc, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <FaFlag size={8} /> {todo.priority}
                  </span>
                  {todo.dueDate && (
                    <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '999px', background: overdue ? '#FEE2E2' : '#F3F4F6', color: overdue ? '#EF4444' : '#6B7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <FaCalendar size={8} /> {fmt(todo.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => openForm(todo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}><FaEdit size={14} /></button>
                <button onClick={() => handleDelete(todo._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}><FaTrash size={14} /></button>
              </div>
            </div>
          );
        })
      )}

      {/* FAB */}
      <button onClick={() => openForm()} style={{ position: 'fixed', bottom: '80px', right: '20px', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.4)', zIndex: 100 }}>
        <FaPlus size={20} />
      </button>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '16px' }}>{editingTodo ? 'Edit Task' : 'New Task'}</h6>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Title *</label>
              <input type="text" value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); setTitleError(''); }} placeholder="Task title" style={{ ...inputStyle, borderColor: titleError ? '#EF4444' : '#E5E7EB' }} />
              {titleError && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0' }}>{titleError}</p>}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ ...inputStyle, background: '#fff' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSubmit} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                {editingTodo ? 'Update' : 'Add Task'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
