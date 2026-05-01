import { FaCheckCircle, FaCircle, FaEdit, FaTrash } from 'react-icons/fa';

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

function formatDate(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function isOverdue(isoString) {
  if (!isoString) return false;
  const due = new Date(isoString);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }) {
  const completed = todo.status === 'completed';
  const overdue = !completed && isOverdue(todo.dueDate);
  const formattedDate = formatDate(todo.dueDate);
  const priorityColor = PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.medium;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#fff',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        opacity: completed ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo._id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        aria-label={completed ? 'Mark as pending' : 'Mark as completed'}
      >
        {completed ? (
          <FaCheckCircle size={22} color="#10B981" />
        ) : (
          <FaCircle size={22} color="#D1D5DB" />
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '500',
            color: '#111827',
            textDecoration: completed ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {todo.title}
        </p>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
          {formattedDate && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '500',
                padding: '2px 7px',
                borderRadius: '999px',
                background: overdue ? '#FEE2E2' : '#F3F4F6',
                color: overdue ? '#EF4444' : '#6B7280',
              }}
            >
              {formattedDate}
            </span>
          )}
          {todo.priority && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 7px',
                borderRadius: '999px',
                background: `${priorityColor}20`,
                color: priorityColor,
                textTransform: 'capitalize',
              }}
            >
              {todo.priority}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => onEdit(todo)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Edit todo"
        >
          <FaEdit size={16} />
        </button>
        <button
          onClick={() => onDelete(todo._id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Delete todo"
        >
          <FaTrash size={16} />
        </button>
      </div>
    </div>
  );
}
