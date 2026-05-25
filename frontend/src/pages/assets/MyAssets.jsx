import React, { useState, useEffect } from 'react';
import assetApi from '../../api/assetApi';
import AssetStatusBadge from '../../components/assets/AssetStatusBadge';
import useScrollToTop from '../../hooks/useScrollToTop';
import PageHeader from '../../components/shared/PageHeader';
import './MyAssets.css';

const MyAssets = () => {
  useScrollToTop();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyAssets();
  }, []);

  const fetchMyAssets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await assetApi.getMyAssets();
      setAssets(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch your assets');
      console.error('Error fetching my assets:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-assets-container">
      <PageHeader title="My Assets" subtitle="Assets currently assigned to you" />

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading">Loading your assets...</div>
      ) : assets.length === 0 ? (
        <div className="no-assets">
          <div className="no-assets-icon">📦</div>
          <h2>No Assets Assigned</h2>
          <p>You don't have any assets assigned to you at the moment.</p>
        </div>
      ) : (
        <div className="assets-grid">
          {assets.map((asset) => (
            <div key={asset._id} className="asset-card">
              <div className="card-header">
                <div className="asset-id">{asset.assetId}</div>
                <AssetStatusBadge status={asset.status} />
              </div>

              <div className="card-body">
                <h3>{asset.name}</h3>

                <div className="asset-details">
                  <div className="detail-row">
                    <span className="label">Category:</span>
                    <span className="value">{asset.category}</span>
                  </div>

                  {asset.brand && (
                    <div className="detail-row">
                      <span className="label">Brand:</span>
                      <span className="value">{asset.brand}</span>
                    </div>
                  )}

                  {asset.model && (
                    <div className="detail-row">
                      <span className="label">Model:</span>
                      <span className="value">{asset.model}</span>
                    </div>
                  )}

                  {asset.serialNumber && (
                    <div className="detail-row">
                      <span className="label">Serial No:</span>
                      <span className="value">{asset.serialNumber}</span>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="label">Condition:</span>
                    <span className="value">{asset.condition}</span>
                  </div>

                  {asset.currentAssignment && (
                    <>
                      <div className="detail-row">
                        <span className="label">Assigned Date:</span>
                        <span className="value">
                          {new Date(asset.currentAssignment.assignedDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="label">Days Assigned:</span>
                        <span className="value">
                          {Math.floor(
                            (new Date() - new Date(asset.currentAssignment.assignedDate)) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {asset.description && (
                  <div className="asset-description">
                    <p>{asset.description}</p>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <div className="info-text">
                  {asset.warrantyEndDate && (
                    <span className="warranty-info">
                      Warranty until {new Date(asset.warrantyEndDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAssets;
