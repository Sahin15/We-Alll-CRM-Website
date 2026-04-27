import React, { useState, useEffect } from 'react';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './RepairLog.css';

const RepairLog = () => {
  useScrollToTop();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Filters
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    asset: '',
    problemDescription: '',
    repairVendor: '',
    repairCost: '',
    repairDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
  });

  const [assets, setAssets] = useState([]);
  const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];

  // Fetch repairs
  const fetchRepairs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        ...(status && { status }),
        ...(search && { asset: search }),
      };

      const response = await assetApi.getRepairs(params);
      setRepairs(response.data || []);
      setTotal(response.pagination?.total || 0);
      setPages(response.pagination?.pages || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch repairs');
      console.error('Error fetching repairs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assets for form
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await assetApi.getAllAssets({ limit: 1000 });
        setAssets(response.data || []);
      } catch (err) {
        console.error('Error fetching assets:', err);
      }
    };

    fetchAssets();
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [page, limit, status, search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddRepair = async (e) => {
    e.preventDefault();

    if (!formData.asset || !formData.problemDescription || !formData.repairDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await assetApi.createRepair(formData);
      alert('Repair record created successfully');
      setFormData({
        asset: '',
        problemDescription: '',
        repairVendor: '',
        repairCost: '',
        repairDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
      });
      setShowAddForm(false);
      fetchRepairs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create repair record');
    }
  };

  const handleCompleteRepair = async (repairId) => {
    if (window.confirm('Mark this repair as completed?')) {
      try {
        await assetApi.completeRepair(repairId, {});
        alert('Repair marked as completed');
        fetchRepairs();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to complete repair');
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
    }
  };

  const handleReset = () => {
    setStatus('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="repair-log-container">
      <div className="repair-log-header">
        <h1>Repair Log</h1>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '✕ Cancel' : '+ Add Repair'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Add Repair Form */}
      {showAddForm && (
        <div className="add-repair-form">
          <h2>Add Repair Record</h2>
          <form onSubmit={handleAddRepair} className="form-grid">
            <div className="form-group">
              <label htmlFor="asset">Asset *</label>
              <select
                id="asset"
                name="asset"
                value={formData.asset}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset._id} value={asset._id}>
                    {asset.assetId} - {asset.name}
                  </option>
                ))}
              </select>
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
              <label htmlFor="problemDescription">Problem Description *</label>
              <textarea
                id="problemDescription"
                name="problemDescription"
                value={formData.problemDescription}
                onChange={handleInputChange}
                placeholder="Describe the problem"
                className="form-control"
                rows="2"
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
                placeholder="Vendor name"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="repairCost">Repair Cost (₹)</label>
              <input
                type="number"
                id="repairCost"
                name="repairCost"
                value={formData.repairCost}
                onChange={handleInputChange}
                placeholder="0.00"
                className="form-control"
                step="0.01"
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

            <button type="submit" className="btn btn-success">
              Create Repair Record
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="repair-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by Asset ID"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="form-control"
          />
        </div>

        <div className="filter-group">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="form-control"
          >
            <option value="">All Statuses</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st.charAt(0).toUpperCase() + st.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="repair-table-wrapper">
        {loading ? (
          <div className="loading">Loading repairs...</div>
        ) : repairs.length === 0 ? (
          <div className="no-data">No repair records found</div>
        ) : (
          <table className="repair-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Asset Name</th>
                <th>Problem</th>
                <th>Vendor</th>
                <th>Cost</th>
                <th>Sent Date</th>
                <th>Expected Return</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair._id}>
                  <td className="asset-id">{repair.asset?.assetId || '-'}</td>
                  <td>{repair.asset?.name || '-'}</td>
                  <td>{repair.problemDescription}</td>
                  <td>{repair.repairVendor || '-'}</td>
                  <td>₹{repair.repairCost ? repair.repairCost.toLocaleString() : '-'}</td>
                  <td>{new Date(repair.repairDate).toLocaleDateString()}</td>
                  <td>{repair.expectedReturnDate ? new Date(repair.expectedReturnDate).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`status-badge status-${repair.status}`}>{repair.status}</span>
                  </td>
                  <td className="actions">
                    {['pending', 'in_progress'].includes(repair.status) && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleCompleteRepair(repair._id)}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
          >
            First
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>

          <span className="page-info">
            Page {page} of {pages} (Total: {total})
          </span>

          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === pages}
          >
            Next
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(pages)}
            disabled={page === pages}
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
};

export default RepairLog;
