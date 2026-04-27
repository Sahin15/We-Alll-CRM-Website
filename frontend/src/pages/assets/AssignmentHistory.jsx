import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './AssignmentHistory.css';

const AssignmentHistory = () => {
  useScrollToTop();
  const [searchParams] = useSearchParams();
  const preFilterAssetId = searchParams.get('assetId');

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filters
  const [assetFilter, setAssetFilter] = useState(preFilterAssetId || '');
  const [employee, setEmployee] = useState('');
  const [status, setStatus] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const statuses = ['active', 'returned', 'lost'];

  // Fetch assets for dropdown
  const fetchAssets = async () => {
    try {
      const response = await assetApi.getAllAssets({ limit: 1000 });
      setAssets(response.data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setAssets([]);
    }
  };

  // Fetch employees for dropdown
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/users/employees', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        let employeeList = [];
        if (Array.isArray(data)) {
          employeeList = data;
        } else if (Array.isArray(data.data)) {
          employeeList = data.data;
        }
        setEmployees(employeeList);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit,
        ...(assetFilter && { asset: assetFilter }),
        ...(employee && { employee }),
        ...(status && { status }),
      };

      const response = await assetApi.getHistory(params);
      setHistory(response.data || []);
      setTotal(response.pagination?.total || 0);
      setPages(response.pagination?.pages || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch history');
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [page, limit, assetFilter, employee, status]);

  const handleReset = () => {
    setAssetFilter('');
    setEmployee('');
    setStatus('');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Asset ID', 'Asset Name', 'Employee', 'Assigned By', 'Return Date', 'Condition on Return', 'Status'];
    const rows = history.map((record) => [
      new Date(record.assignedDate).toLocaleDateString(),
      record.asset?.assetId || '-',
      record.asset?.name || '-',
      record.employee?.name || '-',
      record.assignedBy?.name || '-',
      record.returnDate ? new Date(record.returnDate).toLocaleDateString() : '-',
      record.conditionOnReturn || '-',
      record.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="assignment-history-container">
      <div className="history-header">
        <h1>Assignment History</h1>
        <p>Complete audit trail of all asset assignments</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label htmlFor="assetFilter">Asset</label>
          <select
            id="assetFilter"
            value={assetFilter}
            onChange={(e) => {
              setAssetFilter(e.target.value);
              setPage(1);
            }}
            className="form-control"
          >
            <option value="">All Assets</option>
            {assets.map((asset) => (
              <option key={asset._id} value={asset._id}>
                {asset.assetId} - {asset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="employeeFilter">Employee</label>
          <select
            id="employeeFilter"
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

        <div className="filter-group">
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
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
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset Filters
          </button>

          <button className="btn btn-info" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="history-table-wrapper">
        {loading ? (
          <div className="loading">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="no-data">No assignment history found</div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Asset ID</th>
                <th>Asset Name</th>
                <th>Employee</th>
                <th>Assigned By</th>
                <th>Return Date</th>
                <th>Condition on Return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record._id}>
                  <td>{new Date(record.assignedDate).toLocaleDateString()}</td>
                  <td className="asset-id">{record.asset?.assetId || '-'}</td>
                  <td>{record.asset?.name || '-'}</td>
                  <td>{record.employee?.name || '-'}</td>
                  <td>{record.assignedBy?.name || '-'}</td>
                  <td>{record.returnDate ? new Date(record.returnDate).toLocaleDateString() : '-'}</td>
                  <td>{record.conditionOnReturn || '-'}</td>
                  <td>
                    <span className={`status-badge status-${record.status}`}>{record.status}</span>
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

export default AssignmentHistory;
