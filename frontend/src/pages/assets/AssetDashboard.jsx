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
      <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {summaryCards.map((card, index) => {
          const IconComponent = card.icon;
          const colorMap = {
            primary: { border: '#4F46E5', bg: '#EEF2FF', text: '#4F46E5' },
            info:    { border: '#0EA5E9', bg: '#E0F2FE', text: '#0EA5E9' },
            success: { border: '#10B981', bg: '#ECFDF5', text: '#10B981' },
            warning: { border: '#F59E0B', bg: '#FFFBEB', text: '#F59E0B' },
            danger:  { border: '#EF4444', bg: '#FEF2F2', text: '#EF4444' },
            secondary:{ border: '#6B7280', bg: '#F3F4F6', text: '#6B7280' },
          };
          const colors = colorMap[card.color];

          return (
            <div
              key={index}
              onClick={() => navigate(card.path)}
              style={{
                background: '#fff',
                borderRadius: '14px',
                borderLeft: `5px solid ${colors.border}`,
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'; }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '12px',
                backgroundColor: colors.bg, color: colors.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', flexShrink: 0,
              }}>
                <IconComponent />
              </div>
              <div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Asset Distribution by Category</h2>
          <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>{byCategory.length} categories</span>
        </div>

        {byCategory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No category data available</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {byCategory
              .sort((a, b) => b.count - a.count)
              .map((cat, index) => {
                const percentage = summary.total > 0 ? ((cat.count / summary.total) * 100).toFixed(1) : 0;
                const palette = [
                  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B',
                  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
                ];
                const color = palette[index % palette.length];

                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Category name */}
                    <div style={{ width: '130px', flexShrink: 0, fontSize: '0.85rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat._id || 'Uncategorized'}
                    </div>

                    {/* Progress bar */}
                    <div style={{ flex: 1, height: '10px', background: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${percentage}%`,
                        background: color, borderRadius: '999px',
                        transition: 'width 0.6s ease',
                        minWidth: percentage > 0 ? '6px' : '0',
                      }} />
                    </div>

                    {/* Count + % */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', minWidth: '20px', textAlign: 'right' }}>{cat.count}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF', minWidth: '40px' }}>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
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
