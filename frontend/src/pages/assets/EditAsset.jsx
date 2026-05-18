import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './AddAsset.css';

const EditAsset = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  useScrollToTop();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // Asset Information
    assetId: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    condition: 'good',
    description: '',

    // Purchase Information
    purchaseDate: '',
    purchaseCost: '',
    vendorName: '',
    invoiceNumber: '',
    invoiceUrl: '',

    // Warranty Information
    warrantyStartDate: '',
    warrantyEndDate: '',
    warrantyProvider: '',
    warrantyDocumentUrl: '',

    // Notes
    notes: '',
  });

  const categories = [
    'laptop',
    'desktop',
    'monitor',
    'keyboard',
    'mouse',
    'headset',
    'phone',
    'tablet',
    'printer',
    'scanner',
    'projector',
    'camera',
    'diary',
    'pen',
    'charger',
    'cable',
    'other',
  ];

  const conditions = ['new', 'good', 'fair', 'poor'];

  // Fetch asset details
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setFetching(true);
        setError('');
        const response = await assetApi.getAssetById(id);
        const asset = response.data || response;

        setFormData({
          assetId: asset.assetId || '',
          category: asset.category || '',
          brand: asset.brand || '',
          model: asset.model || '',
          serialNumber: asset.serialNumber || '',
          condition: asset.condition || 'good',
          description: asset.description || '',
          purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
          purchaseCost: asset.purchaseCost || '',
          vendorName: asset.vendorName || '',
          invoiceNumber: asset.invoiceNumber || '',
          invoiceUrl: asset.invoiceUrl || '',
          warrantyStartDate: asset.warrantyStartDate ? asset.warrantyStartDate.split('T')[0] : '',
          warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
          warrantyProvider: asset.warrantyProvider || '',
          warrantyDocumentUrl: asset.warrantyDocumentUrl || '',
          notes: asset.notes || '',
        });
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch asset details');
        console.error('Error fetching asset:', err);
      } finally {
        setFetching(false);
      }
    };

    if (id) {
      fetchAsset();
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // For now, just store the filename as a reference
    // File upload functionality can be added later with a proper endpoint
    setFormData((prev) => ({
      ...prev,
      [fieldName]: file.name,
    }));
  };

  const validateForm = () => {
    if (!formData.assetId.trim()) {
      setError('Asset ID is required');
      return false;
    }
    if (!formData.category) {
      setError('Category is required');
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

      await assetApi.updateAsset(id, formData);

      setSuccess('Asset updated successfully!');

      // Redirect to asset details after 2 seconds
      setTimeout(() => {
        navigate(`/assets/${id}`);
      }, 2000);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to update asset');
      console.error('Error updating asset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/assets/${id}`);
  };

  if (fetching) {
    return (
      <div className="add-asset-container">
        <div className="loading">Loading asset details...</div>
      </div>
    );
  }

  return (
    <div className="add-asset-container">
      <div className="add-asset-header">
        <h1>Edit Asset</h1>
        <p>Update asset information</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="add-asset-form">
        {/* Section 1: Asset Information */}
        <div className="form-section">
          <h2>Asset Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="assetId">Asset ID *</label>
              <input
                type="text"
                id="assetId"
                name="assetId"
                value={formData.assetId}
                onChange={handleInputChange}
                placeholder="e.g., AST-2024-001"
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="brand">Brand</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="e.g., Dell"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="e.g., Inspiron 15"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="serialNumber">Serial Number</label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                placeholder="Manufacturer serial number"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className="form-control"
              >
                {conditions.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional notes about the asset"
                className="form-control"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Purchase Information */}
        <div className="form-section">
          <h2>Purchase Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="purchaseDate">Purchase Date</label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="purchaseCost">Purchase Cost (₹)</label>
              <input
                type="number"
                id="purchaseCost"
                name="purchaseCost"
                value={formData.purchaseCost}
                onChange={handleInputChange}
                placeholder="0.00"
                className="form-control"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="vendorName">Vendor Name</label>
              <input
                type="text"
                id="vendorName"
                name="vendorName"
                value={formData.vendorName}
                onChange={handleInputChange}
                placeholder="e.g., Dell India"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="invoiceNumber">Invoice Number</label>
              <input
                type="text"
                id="invoiceNumber"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleInputChange}
                placeholder="e.g., INV-2024-001"
                className="form-control"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="invoiceUrl">Invoice Document</label>
              <input
                type="file"
                id="invoiceUrl"
                onChange={(e) => handleFileUpload(e, 'invoiceUrl')}
                accept=".pdf,.jpg,.png"
                className="form-control"
              />
              {formData.invoiceUrl && <p className="file-uploaded">✓ File uploaded</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Warranty Information */}
        <div className="form-section">
          <h2>Warranty Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="warrantyStartDate">Warranty Start Date</label>
              <input
                type="date"
                id="warrantyStartDate"
                name="warrantyStartDate"
                value={formData.warrantyStartDate}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="warrantyEndDate">Warranty End Date</label>
              <input
                type="date"
                id="warrantyEndDate"
                name="warrantyEndDate"
                value={formData.warrantyEndDate}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="warrantyProvider">Warranty Provider</label>
              <input
                type="text"
                id="warrantyProvider"
                name="warrantyProvider"
                value={formData.warrantyProvider}
                onChange={handleInputChange}
                placeholder="e.g., Dell"
                className="form-control"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="warrantyDocumentUrl">Warranty Document</label>
              <input
                type="file"
                id="warrantyDocumentUrl"
                onChange={(e) => handleFileUpload(e, 'warrantyDocumentUrl')}
                accept=".pdf,.jpg,.png"
                className="form-control"
              />
              {formData.warrantyDocumentUrl && <p className="file-uploaded">✓ File uploaded</p>}
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="form-section">
          <h2>Additional Notes</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information about this asset"
                className="form-control"
                rows="4"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating Asset...' : 'Update Asset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAsset;
