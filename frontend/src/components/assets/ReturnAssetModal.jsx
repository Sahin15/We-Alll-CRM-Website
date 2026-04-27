import React, { useState } from 'react';
import assetApi from '../../api/assetApi';
import './ReturnAssetModal.css';

const ReturnAssetModal = ({ assetId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    conditionOnReturn: 'good',
    returnRemarks: '',
  });

  const conditions = ['good', 'minor_damage', 'needs_repair', 'lost'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      await assetApi.returnAsset(assetId, formData);

      alert('Asset returned successfully');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return asset');
      console.error('Error returning asset:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Return Asset</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="return-form">
          <div className="form-group">
            <label htmlFor="returnDate">Return Date *</label>
            <input
              type="date"
              id="returnDate"
              name="returnDate"
              value={formData.returnDate}
              onChange={handleInputChange}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="conditionOnReturn">Condition on Return *</label>
            <select
              id="conditionOnReturn"
              name="conditionOnReturn"
              value={formData.conditionOnReturn}
              onChange={handleInputChange}
              className="form-control"
              required
            >
              {conditions.map((cond) => (
                <option key={cond} value={cond}>
                  {cond === 'good'
                    ? 'Good'
                    : cond === 'minor_damage'
                    ? 'Minor Damage'
                    : cond === 'needs_repair'
                    ? 'Needs Repair'
                    : 'Lost'}
                </option>
              ))}
            </select>
            <small className="condition-help">
              {formData.conditionOnReturn === 'good' && 'Asset will be marked as Available'}
              {formData.conditionOnReturn === 'minor_damage' && 'Asset will be marked as Available'}
              {formData.conditionOnReturn === 'needs_repair' && 'Asset will be marked as Under Repair'}
              {formData.conditionOnReturn === 'lost' && 'Asset will be marked as Lost'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="returnRemarks">Remarks</label>
            <textarea
              id="returnRemarks"
              name="returnRemarks"
              value={formData.returnRemarks}
              onChange={handleInputChange}
              placeholder="Any additional notes about the return"
              className="form-control"
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Return Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnAssetModal;
