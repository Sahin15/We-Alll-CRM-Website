import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './AssignAsset.css';

const AssignAsset = () => {
  useScrollToTop();
  const navigate = useNavigate();
  const { id: preSelectedAssetId } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [formData, setFormData] = useState({
    assetId: preSelectedAssetId || '',
    employeeId: '',
    assignedDate: new Date().toISOString().split('T')[0],
    conditionAtAssignment: 'good',
    remarks: '',
  });

  const conditions = ['new', 'good', 'fair', 'poor'];

  // Fetch available assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setAssetsLoading(true);
        const response = await assetApi.getAllAssets({ status: 'available', limit: 1000 });
        setAssets(response.data || []);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Failed to fetch available assets');
        setAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setEmployeesLoading(true);
        // Assuming you have an endpoint to fetch employees
        const response = await fetch('/api/users/employees', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Handle different response structures
          let employeeList = [];
          if (Array.isArray(data)) {
            employeeList = data;
          } else if (Array.isArray(data.data)) {
            employeeList = data.data;
          } else if (data.data && typeof data.data === 'object') {
            // If data.data is an object, try to extract array from it
            employeeList = Object.values(data.data).filter(item => Array.isArray(item))[0] || [];
          }
          setEmployees(employeeList);
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to fetch employees');
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.assetId) {
      setError('Please select an asset');
      return false;
    }
    if (!formData.employeeId) {
      setError('Please select an employee');
      return false;
    }
    if (!formData.assignedDate) {
      setError('Please select an assigned date');
      return false;
    }
    if (!formData.conditionAtAssignment) {
      setError('Please select a condition');
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

      await assetApi.assignAsset(formData.assetId, {
        employeeId: formData.employeeId,
        assignedDate: formData.assignedDate,
        conditionAtAssignment: formData.conditionAtAssignment,
        remarks: formData.remarks,
      });

      setSuccess('Asset assigned successfully!');

      // Redirect to asset details after 2 seconds
      setTimeout(() => {
        navigate(`/assets/${formData.assetId}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign asset');
      console.error('Error assigning asset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/assets');
  };

  const selectedAsset = assets?.find((a) => a._id === formData.assetId);
  const selectedEmployee = employees?.find((e) => e._id === formData.employeeId);

  return (
    <div className="assign-asset-container">
      <div className="assign-asset-header">
        <h1>Assign Asset</h1>
        <p>Assign an available asset to an employee</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="assign-asset-form">
        {/* Section 1: Asset Selection */}
        <div className="form-section">
          <h2>Asset Selection</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="assetId">Select Asset *</label>
              {assetsLoading ? (
                <div className="loading-text">Loading assets...</div>
              ) : (
                <select
                  id="assetId"
                  name="assetId"
                  value={formData.assetId}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="">Choose an asset</option>
                  {Array.isArray(assets) && assets.map((asset) => {
                    // Ensure asset is an object with required properties
                    if (!asset || typeof asset !== 'object' || !asset._id) return null;
                    const assetId = typeof asset.assetId === 'string' ? asset.assetId : String(asset.assetId || 'Unknown');
                    const assetName = typeof asset.name === 'string' ? asset.name : String(asset.name || 'Unknown');
                    const assetCat = typeof asset.category === 'string' ? asset.category : String(asset.category || 'Unknown');
                    return (
                      <option key={asset._id} value={asset._id}>
                        {assetId} - {assetName} ({assetCat})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {selectedAsset && (
              <div className="asset-preview">
                <div className="preview-item">
                  <label>Asset ID</label>
                  <span>{typeof selectedAsset.assetId === 'string' ? selectedAsset.assetId : String(selectedAsset.assetId || '-')}</span>
                </div>
                <div className="preview-item">
                  <label>Name</label>
                  <span>{typeof selectedAsset.name === 'string' ? selectedAsset.name : String(selectedAsset.name || '-')}</span>
                </div>
                <div className="preview-item">
                  <label>Category</label>
                  <span>{typeof selectedAsset.category === 'string' ? selectedAsset.category : String(selectedAsset.category || '-')}</span>
                </div>
                <div className="preview-item">
                  <label>Brand</label>
                  <span>{typeof selectedAsset.brand === 'string' ? selectedAsset.brand : String(selectedAsset.brand || '-')}</span>
                </div>
                <div className="preview-item">
                  <label>Model</label>
                  <span>{typeof selectedAsset.model === 'string' ? selectedAsset.model : String(selectedAsset.model || '-')}</span>
                </div>
                <div className="preview-item">
                  <label>Current Condition</label>
                  <span>{typeof selectedAsset.condition === 'string' ? selectedAsset.condition : String(selectedAsset.condition || '-')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Employee Selection */}
        <div className="form-section">
          <h2>Employee Selection</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="employeeId">Select Employee *</label>
              {employeesLoading ? (
                <div className="loading-text">Loading employees...</div>
              ) : (
                <select
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  <option value="">Choose an employee</option>
                  {Array.isArray(employees) && employees.map((emp) => {
                    // Ensure emp is an object with required properties
                    if (!emp || typeof emp !== 'object' || !emp._id) return null;
                    const empName = typeof emp.name === 'string' ? emp.name : String(emp.name || 'Unknown');
                    const empEmail = typeof emp.email === 'string' ? emp.email : '';
                    const displayText = empEmail ? `${empName} (${empEmail})` : empName;
                    return (
                      <option key={emp._id} value={emp._id}>
                        {displayText}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {selectedEmployee && (
              <div className="employee-preview">
                <div className="preview-item">
                  <label>Name</label>
                  <span>{typeof selectedEmployee.name === 'string' ? selectedEmployee.name : String(selectedEmployee.name || '-')}</span>
                </div>
                <div className="preview-item">
                  <label>Email</label>
                  <span>{typeof selectedEmployee.email === 'string' ? selectedEmployee.email : String(selectedEmployee.email || '-')}</span>
                </div>
                {typeof selectedEmployee.department === 'string' && selectedEmployee.department && (
                  <div className="preview-item">
                    <label>Department</label>
                    <span>{selectedEmployee.department}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Assignment Details */}
        <div className="form-section">
          <h2>Assignment Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="assignedDate">Assigned Date *</label>
              <input
                type="date"
                id="assignedDate"
                name="assignedDate"
                value={formData.assignedDate}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="conditionAtAssignment">Condition at Assignment *</label>
              <select
                id="conditionAtAssignment"
                name="conditionAtAssignment"
                value={formData.conditionAtAssignment}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                {conditions.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="remarks">Remarks</label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                placeholder="Any additional notes about this assignment"
                className="form-control"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !formData.assetId || !formData.employeeId}>
            {loading ? 'Assigning...' : 'Assign Asset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignAsset;
