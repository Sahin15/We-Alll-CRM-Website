import { useState, useEffect, useCallback } from 'react';
import { FaReceipt, FaPlus, FaTimes, FaUpload, FaFileImage } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { expenseApi } from '../../api/expenseApi';
import api from '../../api/axios';

const STATUS_COLORS = {
  pending:    { bg: '#FEF3C7', color: '#92400E' },
  approved:   { bg: '#D1FAE5', color: '#065F46' },
  rejected:   { bg: '#FEE2E2', color: '#991B1B' },
  reimbursed: { bg: '#E0E7FF', color: '#3730A3' },
};

const CATEGORIES = ['Travel','Food','Accommodation','Office Supplies','Communication','Training','Entertainment','Medical','Fuel','Other'];

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Travel', date: '', description: '', purposeType: 'business' });

  const isReceiptRequired = parseFloat(form.amount) >= 500;

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await expenseApi.getMyExpenses();
      setExpenses(data.expenses || data || []);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleReceiptChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) { toast.error('Please upload JPG, PNG, GIF or PDF'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be less than 10MB'); return; }

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }

    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append('receipt', file);
      const res = await api.post('/upload/expense-receipt', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReceiptUrl(res.data.imageUrl);
      toast.success('Receipt uploaded!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to upload receipt');
      setReceiptFile(null); setReceiptPreview(null);
    } finally { setUploadingReceipt(false); }
  };

  const handleRemoveReceipt = () => { setReceiptFile(null); setReceiptPreview(null); setReceiptUrl(null); };

  const resetForm = () => {
    setShowForm(false);
    setForm({ title: '', amount: '', category: 'Travel', date: '', description: '', purposeType: 'business' });
    handleRemoveReceipt();
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.amount || !form.date) { toast.error('Please fill title, amount and date'); return; }
    if (isReceiptRequired && !receiptUrl) { toast.error('Receipt is required for expenses of ₹500 or more'); return; }
    setSaving(true);
    try {
      await expenseApi.createExpense({ ...form, amount: parseFloat(form.amount), receiptUrl: receiptUrl || null, receiptFileName: receiptFile?.name || null });
      toast.success('Expense submitted!');
      resetForm();
      await fetchExpenses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit expense');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
          <FaPlus size={14} /> New Expense
        </button>
      )}

      {showForm && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>New Expense</h6>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><FaTimes /></button>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Expense title" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle} />
              {isReceiptRequired && <p style={{ fontSize: '0.7rem', color: '#F59E0B', margin: '3px 0 0' }}>⚠ Receipt required for ₹500+</p>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, background: '#fff' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Purpose</label>
            <select value={form.purposeType} onChange={e => setForm({ ...form, purposeType: e.target.value })} style={{ ...inputStyle, background: '#fff' }}>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="project">Project</option>
              <option value="client">Client</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Receipt upload */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Receipt {isReceiptRequired ? <span style={{ color: '#EF4444' }}>*</span> : <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</span>}
            </label>
            {!receiptFile ? (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', border: `2px dashed ${isReceiptRequired ? '#F59E0B' : '#E5E7EB'}`, borderRadius: '8px', cursor: 'pointer', color: '#6B7280', fontSize: '0.85rem', background: isReceiptRequired ? '#FFFBEB' : '#fff' }}>
                <FaUpload size={14} />
                <span>Upload receipt (JPG, PNG, PDF, max 10MB)</span>
                <input type="file" accept=".jpg,.jpeg,.png,.gif,.pdf" onChange={handleReceiptChange} style={{ display: 'none' }} />
              </label>
            ) : (
              <div>
                {receiptPreview && <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: uploadingReceipt ? '#FEF3C7' : '#F0FDF4', borderRadius: '8px', border: `1px solid ${uploadingReceipt ? '#F59E0B' : '#10B981'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: uploadingReceipt ? '#92400E' : '#065F46' }}>
                    <FaFileImage size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{uploadingReceipt ? 'Uploading...' : receiptFile.name}</span>
                  </div>
                  {!uploadingReceipt && <button onClick={handleRemoveReceipt} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><FaTimes size={12} /></button>}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSubmit} disabled={saving || uploadingReceipt} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: (saving || uploadingReceipt) ? 0.7 : 1 }}>
              {saving ? 'Submitting...' : uploadingReceipt ? 'Uploading...' : 'Submit Expense'}
            </button>
            <button onClick={resetForm} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '10px' }}>My Expenses</h6>
      {expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          <FaReceipt size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>No expenses yet</p>
        </div>
      ) : (
        expenses.map(exp => {
          const sc = STATUS_COLORS[exp.status] || STATUS_COLORS.pending;
          return (
            <div key={exp._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${sc.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{exp.category} · {fmt(exp.date || exp.expenseDate)}</div>
                  {exp.description && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</div>}
                  {exp.receiptUrl && <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '2px' }}>📎 Receipt attached</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>₹{Number(exp.amount).toLocaleString('en-IN')}</div>
                  <span style={{ ...sc, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', textTransform: 'capitalize' }}>{exp.status}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
