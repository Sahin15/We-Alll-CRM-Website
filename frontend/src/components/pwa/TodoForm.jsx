import { useState } from 'react';

const inputStyle = {
  width: '100%',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '4px',
};

export default function TodoForm({ initialValues = {}, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initialValues.title || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [dueDate, setDueDate] = useState(
    initialValues.dueDate ? initialValues.dueDate.slice(0, 10) : ''
  );
  const [priority, setPriority] = useState(initialValues.priority || 'medium');
  const [titleError, setTitleError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    onSubmit({ title: title.trim(), description, dueDate: dueDate || null, priority });
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>
            Title <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError('');
            }}
            placeholder="Task title"
            style={{
              ...inputStyle,
              borderColor: titleError ? '#EF4444' : '#E5E7EB',
            }}
          />
          {titleError && (
            <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{titleError}</p>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Due Date */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Priority */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            style={{
              flex: 1,
              background: '#6366F1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              background: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              padding: '11px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
