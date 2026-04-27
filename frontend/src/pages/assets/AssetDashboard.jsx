import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBox, FaCheckCircle, FaTimesCircle, FaTools, FaExclamationTriangle, FaCalendarAlt, FaPlus, FaEye } from 'react-icons/fa';
import assetApi from '../../api/assetApi';
import useScrollToTop from '../../hooks/useScrollToTop';
import './AssetDashboard.css';

const AssetDashboard = () => {
  const navigate = useNavigate();
  useScrollToTop();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await assetApi.getAssetDashboard();
      setDashboard(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-container"><div className="loading">Loading dashboard...</div></div>;
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="dashboard-container">
        <div className="alert alert-danger">No dashboard data available</div>
      </div>
    );
  }

  const { summary, byCategory, recentActivities, alerts } = dashboard;

  const summaryCards = [
    { label: 'Total Assets', value: summary.total, color: 'primary', icon: FaBox, path: '/assets' },
    { label: 'Assigned', value: summary.assigned, color: 'info', icon: FaCheckCircle, path: '/assets?status=assigned' },
    { label: 'Available', value: summary.available, color: 'success', icon: FaTimesCircle, path: '/assets?status=available' },
    { label: 'Under Repair', value: summary.underRepair, color: 'warning', icon: FaTools, path: '/assets?status=under_repair' },
    { label: 'Lost', value: summary.lost, color: 'danger', icon: FaExclamationTriangle, path: '/assets?status=lost' },
    { label: 'Warranty Expiring', value: summary.warrantyExpiringSoon, color: 'secondary', icon: FaCalendarAlt, path: '/assets/warranty' },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Asset Management Dashboard</h1>
        <p>Overview of all company assets</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        {summaryCards.map((card, index) => {
          const IconComponent = card.icon;
          const colorMap = {
            primary: { border: '#007bff', bg: '#e7f3ff', text: '#007bff' },
            info: { border: '#17a2b8', bg: '#e0f7fa', text: '#17a2b8' },
            success: { border: '#28a745', bg: '#e8f5e9', text: '#28a745' },
            warning: { border: '#ffc107', bg: '#fff8e1', text: '#ffc107' },
            danger: { border: '#dc3545', bg: '#ffebee', text: '#dc3545' },
            secondary: { border: '#6c757d', bg: '#f5f5f5', text: '#6c757d' },
          };
          const colors = colorMap[card.color];
          
          return (
            <div
              key={index}
              className="summary-card"
              onClick={() => navigate(card.path)}
              style={{ 
                cursor: 'pointer',
                borderLeftColor: colors.border,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div 
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}
              >
                <IconComponent />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', margin: 0 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 500, margin: '0.25rem 0 0 0', textTransform: 'uppercase' }}>
                  {card.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {(alerts.overdueReturns > 0 || alerts.warrantiesExpiringThisMonth > 0 || alerts.longRunningRepairs > 0) && (
        <div className="alerts-section">
          <h2>Quick Alerts</h2>
          <div className="alerts-grid">
            {alerts.overdueReturns > 0 && (
              <div className="alert-item alert-warning">
                <span className="alert-icon">⚠️</span>
                <div>
                  <div className="alert-title">{alerts.overdueReturns} Overdue Returns</div>
                  <div className="alert-desc">Assets assigned for more than 90 days</div>
                </div>
              </div>
            )}
            {alerts.warrantiesExpiringThisMonth > 0 && (
              <div className="alert-item alert-info">
                <span className="alert-icon">📅</span>
                <div>
                  <div className="alert-title">{alerts.warrantiesExpiringThisMonth} Warranties Expiring</div>
                  <div className="alert-desc">Warranty expiring this month</div>
                </div>
              </div>
            )}
            {alerts.longRunningRepairs > 0 && (
              <div className="alert-item alert-danger">
                <span className="alert-icon">🔧</span>
                <div>
                  <div className="alert-title">{alerts.longRunningRepairs} Long-Running Repairs</div>
                  <div className="alert-desc">Repairs pending for more than 14 days</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <button 
            className="quick-action-btn btn-primary"
            onClick={() => navigate('/assets/add')}
          >
            <FaPlus /> Add Asset
          </button>
          <button 
            className="quick-action-btn btn-info"
            onClick={() => navigate('/assets')}
          >
            <FaEye /> View All Assets
          </button>
          <button 
            className="quick-action-btn btn-warning"
            onClick={() => navigate('/assets/warranty')}
          >
            <FaCalendarAlt /> View Warranty Alerts
          </button>
          <button 
            className="quick-action-btn btn-secondary"
            onClick={() => navigate('/assets/repairs')}
          >
            <FaTools /> View Repair Log
          </button>
        </div>
      </div>

      {/* Category Summary */}
      <div className="category-section">
        <h2>Asset Distribution by Category</h2>
        <div className="category-table-wrapper">
          {byCategory.length === 0 ? (
            <div className="no-data">No category data available</div>
          ) : (
            <table className="category-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((cat, index) => {
                  const percentage = ((cat.count / summary.total) * 100).toFixed(1);
                  return (
                    <tr key={index}>
                      <td className="category-name">{cat._id}</td>
                      <td className="category-count">{cat.count}</td>
                      <td>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                          <span className="progress-text">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="activities-section">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {recentActivities.length === 0 ? (
            <div className="no-data">No recent activities</div>
          ) : (
            recentActivities.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.asset ? '📦' : '🔧'}
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {activity.asset?.category} {activity.asset?.assetId}
                  </div>
                  <div className="activity-desc">
                    {activity.asset?.name} {activity.employee ? `assigned to ${activity.employee.name}` : 'repair record'}
                  </div>
                </div>
                <div className="activity-time">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDashboard;
