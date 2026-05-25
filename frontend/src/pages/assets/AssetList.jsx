import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import assetApi from '../../api/assetApi';
import AssetStatusBadge from '../../components/assets/AssetStatusBadge';
import useScrollToTop from '../../hooks/useScrollToTop';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import MobileFilterSheet from '../../components/shared/MobileFilterSheet';
import './AssetList.css';

// Action Menu Component
const ActionMenu = ({ asset, onView, onEdit, onAssign, onRepair, onHistory, onDelete, isAdmin }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action, e) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  return (
    <div className="action-menu" onClick={(e) => e.stopPropagation()}>
      <button className="action-menu-btn" onClick={handleMenuClick}>
        ⋮ Actions
      </button>
      {showMenu && (
        <div className="action-dropdown show" onClick={(e) => e.stopPropagation()}>
          <button className="action-dropdown-item info" onClick={(e) => handleAction(() => onView(asset._id), e)}>
            👁️ View Details
          </button>
          <button className="action-dropdown-item warning" onClick={(e) => handleAction(() => onEdit(asset._id), e)}>
            ✏️ Edit
          </button>
          {asset.status === 'available' && (
            <button className="action-dropdown-item success" onClick={(e) => handleAction(() => onAssign(asset._id), e)}>
              ✓ Assign
            </button>
          )}
          {['assigned', 'available'].includes(asset.status) && (
            <button className="action-dropdown-item danger" onClick={(e) => handleAction(() => onRepair(asset._id), e)}>
              🔧 Send to Repair
            </button>
          )}
          <button className="action-dropdown-item" onClick={(e) => handleAction(() => onHistory(asset._id), e)}>
            📋 History
          </button>
          {isAdmin && (
            <button className="action-dropdown-item danger" onClick={(e) => handleAction(() => onDelete(asset._id), e)}>
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const AssetList = () => {
  const navigate = useNavigate();
  useScrollToTop();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [employee, setEmployee] = useState('');
  const [employees, setEmployees] = useState([]);

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

  const statuses = ['available', 'assigned', 'under_repair', 'lost', 'retired'];

  // Fetch assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        ...(search && { search }),
        ...(category && { category }),
        ...(status && { status }),
        ...(employee && { employee }),
      };

      const response = await assetApi.getAllAssets(params);
      setAssets(response.data || []);
      setTotal(response.pagination?.total || 0);
      setPages(response.pagination?.pages || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch assets');
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees with assigned assets
  const fetchEmployees = async () => {
    try {
      const response = await assetApi.getAllAssets({ limit: 1000 });
      const uniqueEmployees = {};

      (response.data || []).forEach((asset) => {
        if (asset.currentAssignment?.employee) {
          const emp = asset.currentAssignment.employee;
          if (!uniqueEmployees[emp._id]) {
            uniqueEmployees[emp._id] = emp;
          }
        }
      });

      setEmployees(Object.values(uniqueEmployees));
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page, limit, search, category, status, employee]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleReset = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setEmployee('');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
    }
  };

  const handleView = (id) => {
    navigate(`/assets/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/assets/${id}/edit`);
  };

  const handleAssign = (id) => {
    navigate(`/assets/${id}/assign`);
  };

  const handleRepair = (id) => {
    navigate(`/assets/${id}/repair`);
  };

  const handleHistory = (id) => {
    navigate(`/assets/history?assetId=${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await assetApi.deleteAsset(id);
        fetchAssets();
      } catch (err) {
        console.error('Error deleting asset:', err);
        setError('Failed to delete asset');
      }
    }
  };

  return (
    <div className="asset-list-container">
      <PageHeader
        title="Asset List"
        actions={
          <button className="btn btn-primary w-100 w-md-auto" onClick={() => navigate('/assets/add')}>
            + Add Asset
          </button>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <MobileFilterSheet
        title="Filters"
        activeFilterCount={[search, category, status, employee].filter(Boolean).length}
        onClear={handleReset}
        showApply={false}
      >
        <input
          type="text"
          placeholder="Search by Asset ID or Name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="form-control"
        />
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
        <select
          value={employee}
          onChange={(e) => {
            setEmployee(e.target.value);
            setPage(1);
          }}
          className="form-control"
        >
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.name}
            </option>
          ))}
        </select>
      </MobileFilterSheet>

      <div className="asset-filters d-none d-lg-flex">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by Asset ID or Name"
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

        <div className="filter-group">
          <select
            value={employee}
            onChange={(e) => {
              setEmployee(e.target.value);
              setPage(1);
            }}
            className="form-control"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="asset-table-wrapper">
        {loading ? (
          <div className="loading">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="no-data">No assets found</div>
        ) : (
          <table className="asset-table table-responsive">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Category</th>
                <th>Status</th>
                <th className="hide-mobile">Assigned To</th>
                <th className="hide-mobile">Warranty End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset._id} onClick={() => handleView(asset._id)}>
                  <td className="asset-id">{asset.assetId}</td>
                  <td className="asset-category">{asset.category}</td>
                  <td className="asset-status">
                    <AssetStatusBadge status={asset.status} />
                  </td>
                  <td className="asset-assigned hide-mobile">{asset.currentAssignment?.employee?.name || '-'}</td>
                  <td className="asset-date hide-mobile">
                    {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu asset={asset} onView={handleView} onEdit={handleEdit} onAssign={handleAssign} onRepair={handleRepair} onHistory={handleHistory} onDelete={handleDelete} isAdmin={isAdmin} />
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

export default AssetList;
