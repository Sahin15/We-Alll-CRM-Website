import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * WebSocket Hook for Real-Time Updates
 * Provides real-time data synchronization with automatic reconnection
 * 
 * Features:
 * - Automatic connection management
 * - Reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Event-based message handling
 * - Connection status monitoring
 * - Heartbeat/ping-pong for connection health
 */
export const useWebSocket = ({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  heartbeatInterval = 30000,
  enabled = true
}) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs for managing connection
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !url) return;

    try {
      setConnectionStatus('connecting');
      
      // Create WebSocket connection
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        console.log('WebSocket connected:', url);
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          ws.send(JSON.stringify(message));
        }

        // Start heartbeat
        startHeartbeat();

        // Call onConnect callback
        if (onConnect) {
          onConnect(event);
        }

        // Show connection success toast
        toast.success('Real-time updates connected', {
          position: 'bottom-right',
          autoClose: 2000
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          // Handle heartbeat response
          if (data.type === 'pong') {
            return;
          }

          // Call message handler
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        stopHeartbeat();

        // Call onDisconnect callback
        if (onDisconnect) {
          onDisconnect(event);
        }

        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          toast.error('Failed to maintain real-time connection', {
            position: 'bottom-right',
            autoClose: 5000
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');

        // Call onError callback
        if (onError) {
          onError(error);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [url, enabled, onConnect, onDisconnect, onError, onMessage, maxReconnectAttempts]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    stopHeartbeat();
    clearReconnectTimeout();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Send message
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message);
      console.warn('WebSocket not connected, message queued:', message);
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    clearReconnectTimeout();
    
    const attempts = reconnectAttemptsRef.current;
    const delay = Math.min(reconnectInterval * Math.pow(2, attempts), 30000); // Max 30 seconds
    
    console.log(`Scheduling WebSocket reconnection attempt ${attempts + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      setReconnectAttempts(reconnectAttemptsRef.current);
      connect();
    }, delay);
  }, [reconnectInterval, connect]);

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    
    heartbeatTimeoutRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, url, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      clearReconnectTimeout();
    };
  }, [disconnect, clearReconnectTimeout]);

  // Subscribe to specific event types
  const subscribe = useCallback((eventType, handler) => {
    const wrappedHandler = (data) => {
      if (data.type === eventType) {
        handler(data);
      }
    };

    // In a real implementation, you'd manage subscriptions
    // For now, we'll use the onMessage callback
    return () => {
      // Unsubscribe logic
    };
  }, []);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    lastMessage,
    reconnectAttempts,
    
    // Connection methods
    connect,
    disconnect,
    sendMessage,
    subscribe,
    
    // Utility methods
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
    
    // Queue status
    queuedMessages: messageQueueRef.current.length
  };
};

export default useWebSocket;