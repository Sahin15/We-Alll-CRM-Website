import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket.js';
import { toast } from 'react-toastify';

/**
 * Real-Time Updates Hook for Admin Work Management
 * Provides real-time synchronization for work calendar data
 * 
 * Features:
 * - Live work entry updates (create, update, delete)
 * - Real-time analytics updates
 * - Overdue notifications
 * - Conflict detection and resolution
 * - Automatic data refresh
 * - Connection status monitoring
 */
export const useRealTimeUpdates = ({
  filters = {},
  onWorkUpdate,
  onAnalyticsUpdate,
  onOverdueNotification,
  onConflict,
  enabled = true
}) => {
  // State for tracking updates
  const [lastUpdate, setLastUpdate] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [conflicts, setConflicts] = useState([]);
  const [updateQueue, setUpdateQueue] = useState([]);
  
  // Refs for managing subscriptions
  const subscriptionIdRef = useRef(null);
  const filtersRef = useRef(filters);
  
  // Update filters ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // WebSocket URL with authentication
  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem('token');
    
    // Use environment variable for WebSocket URL
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (wsUrl) {
      return `${wsUrl}/admin-work-updates?token=${encodeURIComponent(token)}`;
    }
    
    // Fallback for development
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'production' 
      ? window.location.host 
      : 'localhost:5000';
    
    return `${protocol}//${host}/ws/admin-work-updates?token=${encodeURIComponent(token)}`;
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    console.log('Real-time update received:', data);
    
    switch (data.type) {
      case 'workUpdate':
        handleWorkUpdate(data);
        break;
        
      case 'analyticsUpdate':
        handleAnalyticsUpdate(data);
        break;
        
      case 'overdueNotification':
        handleOverdueNotification(data);
        break;
        
      case 'conflict':
        handleConflict(data);
        break;
        
      case 'subscribed':
        console.log('Subscribed to real-time updates:', data.subscriptionId);
        subscriptionIdRef.current = data.subscriptionId;
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
    
    setLastUpdate(new Date());
  }, []);

  // Handle work entry updates
  const handleWorkUpdate = useCallback((data) => {
    const { updateType, workEntry } = data;
    
    // Add to update queue for batch processing
    setUpdateQueue(prev => [...prev, { type: updateType, entry: workEntry, timestamp: new Date() }]);
    
    // Call callback if provided
    if (onWorkUpdate) {
      onWorkUpdate(updateType, workEntry);
    }
    
    // Show toast notification for important updates
    if (updateType === 'create') {
      toast.info(`New work entry: ${workEntry.title}`, {
        position: 'bottom-right',
        autoClose: 3000
      });
    } else if (updateType === 'update' && workEntry.status === 'completed') {
      toast.success(`Work completed: ${workEntry.title}`, {
        position: 'bottom-right',
        autoClose: 3000
      });
    }
  }, [onWorkUpdate]);

  // Handle analytics updates
  const handleAnalyticsUpdate = useCallback((data) => {
    const { analytics } = data;
    
    if (onAnalyticsUpdate) {
      onAnalyticsUpdate(analytics);
    }
    
    console.log('Analytics updated:', analytics);
  }, [onAnalyticsUpdate]);

  // Handle overdue notifications
  const handleOverdueNotification = useCallback((data) => {
    const { overdueEntries, count } = data;
    
    setOverdueCount(count);
    
    if (onOverdueNotification) {
      onOverdueNotification(overdueEntries);
    }
    
    // Show notification for new overdue items
    if (count > 0) {
      toast.warning(`${count} work ${count === 1 ? 'entry' : 'entries'} overdue`, {
        position: 'top-right',
        autoClose: 5000,
        onClick: () => {
          // Could navigate to overdue filter
          console.log('Navigate to overdue items');
        }
      });
    }
  }, [onOverdueNotification]);

  // Handle conflict notifications
  const handleConflict = useCallback((data) => {
    const { workEntryId, conflict } = data;
    
    const newConflict = {
      id: `${workEntryId}_${Date.now()}`,
      workEntryId,
      conflict,
      timestamp: new Date()
    };
    
    setConflicts(prev => [...prev, newConflict]);
    
    if (onConflict) {
      onConflict(newConflict);
    }
    
    // Show conflict warning
    toast.error('Conflict detected: Another user is editing this item', {
      position: 'top-center',
      autoClose: 7000
    });
  }, [onConflict]);

  // Handle connection events
  const handleConnect = useCallback(() => {
    console.log('Real-time updates connected');
    
    // Subscribe to updates with current filters
    if (subscriptionIdRef.current) {
      sendMessage({
        type: 'unsubscribe',
        subscriptionId: subscriptionIdRef.current
      });
    }
    
    // Subscribe with current filters
    sendMessage({
      type: 'subscribe',
      filters: filtersRef.current,
      subscriptionId: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('Real-time updates disconnected');
    subscriptionIdRef.current = null;
  }, []);

  const handleError = useCallback((error) => {
    console.error('Real-time updates error:', error);
  }, []);

  // Initialize WebSocket connection
  const {
    isConnected,
    connectionStatus,
    sendMessage,
    reconnectAttempts
  } = useWebSocket({
    url: enabled ? getWebSocketUrl() : null,
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    enabled
  });

  // Subscribe to updates when filters change
  useEffect(() => {
    if (isConnected && enabled) {
      // Unsubscribe from previous subscription
      if (subscriptionIdRef.current) {
        sendMessage({
          type: 'unsubscribe',
          subscriptionId: subscriptionIdRef.current
        });
      }
      
      // Subscribe with new filters
      const newSubscriptionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sendMessage({
        type: 'subscribe',
        filters: filters,
        subscriptionId: newSubscriptionId
      });
    }
  }, [filters, isConnected, enabled, sendMessage]);

  // Report work update for conflict detection
  const reportWorkUpdate = useCallback((workEntryId, version, changes) => {
    if (isConnected) {
      sendMessage({
        type: 'workUpdate',
        workEntryId,
        version,
        changes
      });
    }
  }, [isConnected, sendMessage]);

  // Clear update queue
  const clearUpdateQueue = useCallback(() => {
    setUpdateQueue([]);
  }, []);

  // Dismiss conflict
  const dismissConflict = useCallback((conflictId) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  // Get connection health status
  const getConnectionHealth = useCallback(() => {
    return {
      isConnected,
      status: connectionStatus,
      reconnectAttempts,
      lastUpdate,
      overdueCount,
      conflictCount: conflicts.length,
      queuedUpdates: updateQueue.length
    };
  }, [isConnected, connectionStatus, reconnectAttempts, lastUpdate, overdueCount, conflicts.length, updateQueue.length]);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    reconnectAttempts,
    
    // Update data
    lastUpdate,
    overdueCount,
    conflicts,
    updateQueue,
    
    // Methods
    reportWorkUpdate,
    clearUpdateQueue,
    dismissConflict,
    getConnectionHealth,
    
    // Utility
    hasUpdates: updateQueue.length > 0,
    hasConflicts: conflicts.length > 0,
    isHealthy: isConnected && connectionStatus === 'connected'
  };
};

export default useRealTimeUpdates;