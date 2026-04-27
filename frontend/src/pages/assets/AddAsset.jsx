import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab } from 'react-bootstrap';
import { FaBox, FaShoppingCart, FaShieldAlt, FaStickyNote } from 'react-icons/fa';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import '../../styles/profile-tabs.css';
import './AddAsset.css';

const AddAsset = () => {
  const navigate = useNavigate();
  useScrollToTop();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('asset-info');

  const [formData, setFormData] = useState({
    // Asset Information
    name: '',
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
    if (!formData.name.trim()) {
      setError('Asset name is required');
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

      const response = await assetApi.createAsset(formData);

      // response is { success: true, data: asset, message: ... }
      const assetData = response.data;
      setSuccess(`Asset created successfully! Asset ID: ${assetData.assetId}`);

      // Redirect to asset details after 2 seconds
      setTimeout(() => {
        navigate(`/assets/${assetData._id}`);
      }, 2000);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to create asset');
      console.error('Error creating asset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/assets');
  };

  return (
    <div className="add-asset-container">
      <div className="add-asset-header">
        <h1>Add New Asset</h1>
        <p>Register a new physical asset in the system</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="add-asset-form">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          {/* Tab 1: Asset Information */}
          <Tab eventKey="asset-info" title={<><FaBox className="me-2" />Asset Information</>}>
            <div className="form-section">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Asset Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dell Laptop"
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
          </Tab>

          {/* Tab 2: Purchase Information */}
          <Tab eventKey="purchase-info" title={<><FaShoppingCart className="me-2" />Purchase Information</>}>
            <div className="form-section">
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
          </Tab>

          {/* Tab 3: Warranty Information */}
          <Tab eventKey="warranty-info" title={<><FaShieldAlt className="me-2" />Warranty Information</>}>
            <div className="form-section">
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
          </Tab>

          {/* Tab 4: Additional Notes */}
          <Tab eventKey="notes" title={<><FaStickyNote className="me-2" />Additional Notes</>}>
            <div className="form-section">
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
          </Tab>
        </Tabs>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Asset...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAsset;
