import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './SendToRepair.css';

const SendToRepair = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const { id: assetId } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [asset, setAsset] = useState(null);
  const [assetLoading, setAssetLoading] = useState(true);

  const [formData, setFormData] = useState({
    problemDescription: '',
    repairVendor: '',
    repairCost: '',
    repairDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
  });

  // Fetch asset details
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setAssetLoading(true);
        const response = await assetApi.getAssetById(assetId);
        setAsset(response.data || response);
      } catch (err) {
        console.error('Error fetching asset:', err);
        setError('Failed to fetch asset details');
        setAsset(null);
      } finally {
        setAssetLoading(false);
      }
    };

    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.problemDescription.trim()) {
      setError('Please describe the problem');
      return false;
    }
    if (!formData.repairDate) {
      setError('Please select a repair date');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await assetApi.sendToRepair(assetId, {
        problemDescription: formData.problemDescription,
        repairVendor: formData.repairVendor || undefined,
        repairCost: formData.repairCost ? parseFloat(formData.repairCost) : undefined,
        repairDate: formData.repairDate,
        expectedReturnDate: formData.expectedReturnDate || undefined,
      });

      setSuccess('Asset sent to repair successfully!');

      // Redirect to asset details after 2 seconds
      setTimeout(() => {
        navigate(`/assets/${assetId}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send asset to repair');
      console.error('Error sending asset to repair:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/assets/${assetId}`);
  };

  if (assetLoading) {
    return (
      <div className="send-to-repair-container">
        <div className="loading">Loading asset details...</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="send-to-repair-container">
        <div className="alert alert-danger">Asset not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/assets')}>
          Back to Assets
        </button>
      </div>
    );
  }

  return (
    <div className="send-to-repair-container">
      <div className="send-to-repair-header">
        <h1>Send Asset to Repair</h1>
        <p>Report the issue and schedule repair for this asset</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="send-to-repair-form">
        {/* Asset Information */}
        <div className="form-section">
          <h2>Asset Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Asset ID</label>
              <input type="text" value={asset.assetId || '-'} disabled className="form-control" />
            </div>
            <div className="form-group">
              <label>Asset Name</label>
              <input type="text" value={asset.name || '-'} disabled className="form-control" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" value={asset.category || '-'} disabled className="form-control" />
            </div>
            <div className="form-group">
              <label>Current Status</label>
              <input type="text" value={asset.status || '-'} disabled className="form-control" />
            </div>
          </div>
        </div>

        {/* Repair Details */}
        <div className="form-section">
          <h2>Repair Details</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="problemDescription">Problem Description *</label>
              <textarea
                id="problemDescription"
                name="problemDescription"
                value={formData.problemDescription}
                onChange={handleInputChange}
                placeholder="Describe the issue or problem with the asset"
                className="form-control"
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="repairVendor">Repair Vendor</label>
              <input
                type="text"
                id="repairVendor"
                name="repairVendor"
                value={formData.repairVendor}
                onChange={handleInputChange}
                placeholder="Name of repair vendor or service center"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="repairCost">Estimated Repair Cost</label>
              <input
                type="number"
                id="repairCost"
                name="repairCost"
                value={formData.repairCost}
                onChange={handleInputChange}
                placeholder="0.00"
                className="form-control"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="repairDate">Repair Date *</label>
              <input
                type="date"
                id="repairDate"
                name="repairDate"
                value={formData.repairDate}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expectedReturnDate">Expected Return Date</label>
              <input
                type="date"
                id="expectedReturnDate"
                name="expectedReturnDate"
                value={formData.expectedReturnDate}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !formData.problemDescription.trim()}>
            {loading ? 'Sending to Repair...' : 'Send to Repair'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendToRepair;
