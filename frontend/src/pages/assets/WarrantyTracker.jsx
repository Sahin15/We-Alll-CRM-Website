import React, { useState, useEffect } from 'react';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './WarrantyTracker.css';

const WarrantyTracker = () => {
  useScrollToTop();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [category, setCategory] = useState('');
  const [showExpired, setShowExpired] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

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

  // Fetch warranty assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        ...(category && { category }),
      };

      const response = await assetApi.getWarrantyAssets(params);
      let data = response.data || [];

      // Filter by expiry status
      if (!showExpired) {
        data = data.filter((asset) => {
          if (!asset.warrantyEndDate) return false;
          return new Date(asset.warrantyEndDate) > new Date();
        });
      }

      setAssets(data);
      setTotal(response.pagination?.total || 0);
      setPages(response.pagination?.pages || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch warranty assets');
      console.error('Error fetching warranty assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page, limit, category, showExpired]);

  const getWarrantyStatus = (warrantyEndDate) => {
    if (!warrantyEndDate) return { status: 'no-warranty', label: 'No Warranty', daysRemaining: null };

    const today = new Date();
    const endDate = new Date(warrantyEndDate);
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { status: 'expired', label: 'Expired', daysRemaining };
    } else if (daysRemaining < 7) {
      return { status: 'critical', label: 'Expiring Soon', daysRemaining };
    } else if (daysRemaining < 30) {
      return { status: 'warning', label: 'Expiring', daysRemaining };
    } else if (daysRemaining < 90) {
      return { status: 'caution', label: 'Caution', daysRemaining };
    } else {
      return { status: 'good', label: 'Good', daysRemaining };
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
    }
  };

  const handleReset = () => {
    setCategory('');
    setShowExpired(false);
    setPage(1);
  };

  // Count warranty statuses
  const expiringCount = assets.filter((a) => {
    const status = getWarrantyStatus(a.warrantyEndDate);
    return status.daysRemaining !== null && status.daysRemaining < 30 && status.daysRemaining >= 0;
  }).length;

  const expiredCount = assets.filter((a) => {
    const status = getWarrantyStatus(a.warrantyEndDate);
    return status.daysRemaining !== null && status.daysRemaining < 0;
  }).length;

  return (
    <div className="warranty-tracker-container">
      <div className="warranty-header">
        <h1>Warranty Tracker</h1>
        <p>Monitor warranty expiry dates across all assets</p>
      </div>

      {/* Alert Banner */}
      {expiringCount > 0 && (
        <div className="alert alert-warning">
          ⚠️ {expiringCount} asset{expiringCount !== 1 ? 's' : ''} warranty expiring within 30 days
        </div>
      )}

      {expiredCount > 0 && (
        <div className="alert alert-danger">
          ❌ {expiredCount} asset{expiredCount !== 1 ? 's' : ''} warranty already expired
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters */}
      <div className="warranty-filters">
        <div className="filter-group">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="form-control"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => {
                setShowExpired(e.target.checked);
                setPage(1);
              }}
            />
            Show Expired Only
          </label>
        </div>

        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="warranty-table-wrapper">
        {loading ? (
          <div className="loading">Loading warranty data...</div>
        ) : assets.length === 0 ? (
          <div className="no-data">No warranty records found</div>
        ) : (
          <table className="warranty-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Warranty End Date</th>
                <th>Days Remaining</th>
                <th>Vendor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const warrantyStatus = getWarrantyStatus(asset.warrantyEndDate);
                return (
                  <tr key={asset._id} className={`status-${warrantyStatus.status}`}>
                    <td className="asset-id">{asset.assetId}</td>
                    <td>{asset.name}</td>
                    <td>{asset.category}</td>
                    <td>
                      {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="days-remaining">
                      {warrantyStatus.daysRemaining !== null ? (
                        <>
                          <span className={`days-badge ${warrantyStatus.status}`}>
                            {Math.abs(warrantyStatus.daysRemaining)} days
                          </span>
                          {warrantyStatus.daysRemaining < 0 && ' (expired)'}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{asset.warrantyProvider || '-'}</td>
                    <td>
                      <span className={`warranty-badge status-${warrantyStatus.status}`}>
                        {warrantyStatus.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
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

export default WarrantyTracker;
