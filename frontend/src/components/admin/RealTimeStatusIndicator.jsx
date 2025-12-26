import React, { useState } from 'react';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates.js';
import './RealTimeStatusIndicator.css';

/**
 * Real-Time Status Indicator Component
 * Shows connection status, overdue notifications, and conflicts
 * 
 * Features:
 * - Connection status indicator with color coding
 * - Overdue work notifications with count
 * - Conflict alerts with details
 * - Update queue status
 * - Connection health monitoring
 * - Manual refresh capability
 */
const RealTimeStatusIndicator = ({ 
  filters = {}, 
  onOverdueClick, 
  onConflictClick,
  onRefresh,
  className = '' 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    isConnected,
    connectionStatus,
    reconnectAttempts,
    lastUpdate,
    overdueCount,
    conflicts,
    updateQueue,
    hasUpdates,
    hasConflicts,
    isHealthy,
    dismissConflict,
    clearUpdateQueue,
    getConnectionHealth
  } = useRealTimeUpdates({
    filters,
    enabled: true
  });

  // Get status color based on connection health
  const getStatusColor = () => {
    if (!isConnected) return 'red';
    if (connectionStatus === 'connecting') return 'yellow';
    if (hasConflicts) return 'orange';
    if (overdueCount > 0) return 'orange';
    return 'green';
  };

  // Get status text
  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (reconnectAttempts > 0) return `Reconnecting (${reconnectAttempts})`;
    return 'Connected';
  };

  // Handle overdue notification click
  const handleOverdueClick = () => {
    if (onOverdueClick) {
      onOverdueClick();
    }
  };

  // Handle conflict click
  const handleConflictClick = (conflict) => {
    if (onConflictClick) {
      onConflictClick(conflict);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    clearUpdateQueue();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Format last update time
  const formatLastUpdate = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`real-time-status-indicator ${className}`}>
      {/* Main Status Indicator */}
      <div 
        className="status-main"
        onClick={() => setShowDetails(!showDetails)}
        title={`Real-time updates: ${getStatusText()}`}
      >
        <div className={`status-dot ${getStatusColor()}`}></div>
        <span className="status-text">{getStatusText()}</span>
        
        {/* Notification Badges */}
        {overdueCount > 0 && (
          <div 
            className="notification-badge overdue"
            onClick={(e) => {
              e.stopPropagation();
              handleOverdueClick();
            }}
            title={`${overdueCount} overdue items`}
          >
            {overdueCount}
          </div>
        )}
        
        {hasConflicts && (
          <div 
            className="notification-badge conflict"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
            title={`${conflicts.length} conflicts detected`}
          >
            ⚠
          </div>
        )}
        
        {hasUpdates && (
          <div 
            className="notification-badge updates"
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            title={`${updateQueue.length} pending updates`}
          >
            {updateQueue.length}
          </div>
        )}
      </div>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="status-details">
          <div className="status-header">
            <h4>Real-Time Status</h4>
            <button 
              className="close-btn"
              onClick={() => setShowDetails(false)}
              aria-label="Close status details"
            >
              ×
            </button>
          </div>
          
          <div className="status-info">
            <div className="info-row">
              <span className="label">Connection:</span>
              <span className={`value ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            
            <div className="info-row">
              <span className="label">Last Update:</span>
              <span className="value">
                {formatLastUpdate(lastUpdate)}
              </span>
            </div>
            
            {reconnectAttempts > 0 && (
              <div className="info-row">
                <span className="label">Reconnect Attempts:</span>
                <span className="value warning">
                  {reconnectAttempts}
                </span>
              </div>
            )}
          </div>

          {/* Overdue Notifications */}
          {overdueCount > 0 && (
            <div className="notification-section">
              <div className="section-header">
                <span className="section-title">Overdue Items</span>
                <button 
                  className="action-btn"
                  onClick={handleOverdueClick}
                >
                  View All ({overdueCount})
                </button>
              </div>
            </div>
          )}

          {/* Conflicts */}
          {hasConflicts && (
            <div className="notification-section">
              <div className="section-header">
                <span className="section-title">Conflicts</span>
              </div>
              <div className="conflicts-list">
                {conflicts.map(conflict => (
                  <div key={conflict.id} className="conflict-item">
                    <div className="conflict-info">
                      <span className="conflict-type">
                        {conflict.conflict.conflictType}
                      </span>
                      <span className="conflict-time">
                        {formatLastUpdate(conflict.timestamp)}
                      </span>
                    </div>
                    <div className="conflict-actions">
                      <button 
                        className="action-btn small"
                        onClick={() => handleConflictClick(conflict)}
                      >
                        Resolve
                      </button>
                      <button 
                        className="action-btn small secondary"
                        onClick={() => dismissConflict(conflict.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Update Queue */}
          {hasUpdates && (
            <div className="notification-section">
              <div className="section-header">
                <span className="section-title">Pending Updates</span>
                <button 
                  className="action-btn"
                  onClick={handleRefresh}
                >
                  Apply ({updateQueue.length})
                </button>
              </div>
              <div className="updates-preview">
                {updateQueue.slice(0, 3).map((update, index) => (
                  <div key={index} className="update-item">
                    <span className={`update-type ${update.type}`}>
                      {update.type}
                    </span>
                    <span className="update-title">
                      {update.entry.title}
                    </span>
                  </div>
                ))}
                {updateQueue.length > 3 && (
                  <div className="update-item more">
                    +{updateQueue.length - 3} more updates
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="status-actions">
            <button 
              className="action-btn primary"
              onClick={handleRefresh}
              disabled={!hasUpdates}
            >
              Refresh Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeStatusIndicator;