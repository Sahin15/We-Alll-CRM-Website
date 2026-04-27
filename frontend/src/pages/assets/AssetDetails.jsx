import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import assetApi from '../../api/assetApi';
import AssetStatusBadge from '../../components/assets/AssetStatusBadge';
import ReturnAssetModal from '../../components/assets/ReturnAssetModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import useScrollToTop from '../../hooks/useScrollToTop';
import './AssetDetails.css';

const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  useScrollToTop();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('history');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [retiringAsset, setRetiringAsset] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [repairLog, setRepairLog] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  useEffect(() => {
    if (asset) {
      if (activeTab === 'history') {
        fetchAssignmentHistory();
      } else if (activeTab === 'repairs') {
        fetchRepairLog();
      }
    }
  }, [activeTab, asset]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await assetApi.getAssetById(id);
      setAsset(response.data || response);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch asset details');
      console.error('Error fetching asset:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await assetApi.getAssetHistory(id);
      setAssignmentHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching assignment history:', err);
      setAssignmentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchRepairLog = async () => {
    try {
      setHistoryLoading(true);
      const response = await assetApi.getRepairs({ assetId: id });
      setRepairLog(response.data || []);
    } catch (err) {
      console.error('Error fetching repair log:', err);
      setRepairLog([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReturnSuccess = () => {
    setShowReturnModal(false);
    fetchAssetDetails();
    fetchAssignmentHistory();
  };

  const handleMarkLost = async () => {
    if (window.confirm('Are you sure you want to mark this asset as lost?')) {
      try {
        await assetApi.markLost(id, {});
        setAsset((prev) => ({ ...prev, status: 'lost' }));
        alert('Asset marked as lost');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to mark asset as lost');
      }
    }
  };

  const handleSendToRepair = () => {
    navigate(`/assets/${id}/repair`);
  };

  const handleRetire = () => {
    setShowRetireModal(true);
  };

  const handleConfirmRetire = async () => {
    try {
      setRetiringAsset(true);
      const response = await assetApi.updateAsset(id, { status: 'retired' });
      // Use the response data which has the updated asset
      setAsset(response.data || { ...asset, status: 'retired' });
      setShowRetireModal(false);
      // Redirect to asset list immediately after successful update
      navigate('/assets');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to retire asset');
      setRetiringAsset(false);
    }
  };

  const handleEdit = () => {
    navigate(`/assets/${id}/edit`);
  };

  if (loading) {
    return <div className="asset-details-container"><div className="loading">Loading asset details...</div></div>;
  }

  if (error) {
    return (
      <div className="asset-details-container">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/assets')}>
          Back to List
        </button>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="asset-details-container">
        <div className="alert alert-danger">Asset not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/assets')}>
          Back to List
        </button>
      </div>
    );
  }

  const warrantyDaysRemaining = asset.warrantyEndDate
    ? Math.ceil((new Date(asset.warrantyEndDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="asset-details-container">
      <div className="asset-details-header">
        <div className="header-left">
          <h1>{asset.name}</h1>
          <p className="asset-id">{asset.assetId}</p>
        </div>
        <div className="header-right">
          <AssetStatusBadge status={asset.status} />
        </div>
      </div>

      <div className="asset-details-content">
        {/* Left Column: Asset Info */}
        <div className="details-column">
          <div className="details-section">
            <h2>Asset Information</h2>
            <div className="details-grid">
              <div className="detail-item">
                <label>Category</label>
                <span>{asset.category}</span>
              </div>
              <div className="detail-item">
                <label>Brand</label>
                <span>{asset.brand || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Model</label>
                <span>{asset.model || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Serial Number</label>
                <span>{asset.serialNumber || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Condition</label>
                <span>{asset.condition}</span>
              </div>
              <div className="detail-item full-width">
                <label>Description</label>
                <span>{asset.description || '-'}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h2>Purchase & Warranty Information</h2>
            <div className="details-grid">
              <div className="detail-item">
                <label>Purchase Date</label>
                <span>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '-'}</span>
              </div>
              <div className="detail-item">
                <label>Purchase Cost</label>
                <span>₹{asset.purchaseCost ? asset.purchaseCost.toLocaleString() : '-'}</span>
              </div>
              <div className="detail-item">
                <label>Vendor</label>
                <span>{asset.vendorName || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Invoice Number</label>
                <span>{asset.invoiceNumber || '-'}</span>
              </div>
              {asset.invoiceUrl && (
                <div className="detail-item">
                  <label>Invoice</label>
                  <a href={asset.invoiceUrl} target="_blank" rel="noopener noreferrer" className="link">
                    View Document
                  </a>
                </div>
              )}
              <div className="detail-item">
                <label>Warranty Start</label>
                <span>{asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toLocaleDateString() : '-'}</span>
              </div>
              <div className="detail-item">
                <label>Warranty End</label>
                <span className={warrantyDaysRemaining !== null && warrantyDaysRemaining < 30 ? 'warning' : ''}>
                  {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '-'}
                  {warrantyDaysRemaining !== null && (
                    <span className="days-remaining">({warrantyDaysRemaining} days remaining)</span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <label>Warranty Provider</label>
                <span>{asset.warrantyProvider || '-'}</span>
              </div>
              {asset.warrantyDocumentUrl && (
                <div className="detail-item">
                  <label>Warranty Document</label>
                  <a href={asset.warrantyDocumentUrl} target="_blank" rel="noopener noreferrer" className="link">
                    View Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Current Assignment & Actions */}
        <div className="details-column">
          {asset.status === 'assigned' && asset.currentAssignment && (
            <div className="details-section">
              <h2>Current Assignment</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Assigned To</label>
                  <span>{asset.currentAssignment.employee?.name || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Department</label>
                  <span>{asset.currentAssignment.employee?.department || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Assigned Date</label>
                  <span>{new Date(asset.currentAssignment.assignedDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Condition at Assignment</label>
                  <span>{asset.currentAssignment.condition}</span>
                </div>
                <div className="detail-item">
                  <label>Days Assigned</label>
                  <span>
                    {Math.floor((new Date() - new Date(asset.currentAssignment.assignedDate)) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="details-section">
            <h2>Actions</h2>
            <div className="action-buttons">
              {asset.status === 'assigned' && (
                <button className="btn btn-primary" onClick={() => setShowReturnModal(true)}>
                  Return Asset
                </button>
              )}
              {['assigned', 'available'].includes(asset.status) && (
                <button className="btn btn-warning" onClick={handleSendToRepair}>
                  Send to Repair
                </button>
              )}
              {asset.status === 'assigned' && (
                <button className="btn btn-danger" onClick={handleMarkLost}>
                  Mark as Lost
                </button>
              )}
              <button className="btn btn-info" onClick={handleEdit}>
                Edit Asset
              </button>
              {asset.status === 'available' && (
                <button className="btn btn-secondary" onClick={handleRetire}>
                  Retire Asset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="details-tabs">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Assignment History
          </button>
          <button
            className={`tab-button ${activeTab === 'repairs' ? 'active' : ''}`}
            onClick={() => setActiveTab('repairs')}
          >
            Repair Log
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'history' && (
            <div className="tab-pane">
              {historyLoading ? (
                <div className="loading">Loading history...</div>
              ) : assignmentHistory.length === 0 ? (
                <div className="no-data">No assignment history</div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Assigned Date</th>
                      <th>Employee</th>
                      <th>Assigned By</th>
                      <th>Condition</th>
                      <th>Return Date</th>
                      <th>Condition on Return</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentHistory.map((record) => (
                      <tr key={record._id}>
                        <td>{new Date(record.assignedDate).toLocaleDateString()}</td>
                        <td>{record.employee?.name || '-'}</td>
                        <td>{record.assignedBy?.name || '-'}</td>
                        <td>{record.conditionAtAssignment}</td>
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
          )}

          {activeTab === 'repairs' && (
            <div className="tab-pane">
              {historyLoading ? (
                <div className="loading">Loading repair log...</div>
              ) : repairLog.length === 0 ? (
                <div className="no-data">No repair records</div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Repair Date</th>
                      <th>Problem</th>
                      <th>Vendor</th>
                      <th>Cost</th>
                      <th>Expected Return</th>
                      <th>Actual Return</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairLog.map((record) => (
                      <tr key={record._id}>
                        <td>{new Date(record.repairDate).toLocaleDateString()}</td>
                        <td>{record.problemDescription}</td>
                        <td>{record.repairVendor || '-'}</td>
                        <td>₹{record.repairCost ? record.repairCost.toLocaleString() : '-'}</td>
                        <td>{record.expectedReturnDate ? new Date(record.expectedReturnDate).toLocaleDateString() : '-'}</td>
                        <td>{record.actualReturnDate ? new Date(record.actualReturnDate).toLocaleDateString() : '-'}</td>
                        <td>
                          <span className={`status-badge status-${record.status}`}>{record.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Return Asset Modal */}
      {showReturnModal && <ReturnAssetModal assetId={id} onClose={() => setShowReturnModal(false)} onSuccess={handleReturnSuccess} />}

      {/* Retire Asset Confirmation Modal */}
      <ConfirmModal
        show={showRetireModal}
        onHide={() => setShowRetireModal(false)}
        onConfirm={handleConfirmRetire}
        title="Retire Asset"
        message="Are you sure you want to retire this asset?"
        subMessage="This action will mark the asset as retired and it will no longer be available for assignment."
        confirmText="Retire"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="warning"
        loading={retiringAsset}
      />
    </div>
  );
};

export default AssetDetails;
