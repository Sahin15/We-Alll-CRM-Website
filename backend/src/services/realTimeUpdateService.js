import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import WorkCalendar from '../models/workCalendarModel.js';
import User from '../models/userModel.js';
import analyticsEngine from './analyticsEngine.js';

/**
 * Real-Time Update Service
 * Provides WebSocket-based real-time updates for work calendar changes
 * 
 * Features:
 * - Live data synchronization across all admin interfaces
 * - Real-time notifications for overdue items
 * - Conflict detection and resolution
 * - Change tracking with timestamps and user attribution
 * - Automatic refresh and synchronization
 * - Connection management with authentication
 */
class RealTimeUpdateService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // Map of subscriptionId -> subscription details
    this.conflictTracker = new Map(); // Track concurrent edits
    this.overdueCheckInterval = null;
    this.overdueCheckInProgress = false;
    this.heartbeatInterval = null;
    
    // Configuration
    this.config = {
      port: process.env.WEBSOCKET_PORT || 8080,
      heartbeatInterval: 30000, // 30 seconds
      overdueCheckInterval: 60000, // 1 minute
      maxConnectionsPerUser: 5,
      conflictDetectionWindow: 5000 // 5 seconds
    };
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    try {
      // Prevent multiple initializations
      if (this.wss) {
        logger.warn('Real-time update service already initialized');
        return;
      }

      // Create WebSocket server
      this.wss = new WebSocketServer({ 
        server,
        path: '/ws/admin-work-updates',
        verifyClient: this.verifyClient.bind(this)
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', this.handleServerError.bind(this));

      // Start background processes
      this.startHeartbeat();
      this.startOverdueMonitoring();

      logger.info('Real-time update service initialized successfully', {
        path: '/ws/admin-work-updates'
      });

    } catch (error) {
      logger.error('Failed to initialize real-time update service:', error);
      // Don't throw error to prevent server crash
      // The server can continue without WebSocket support
    }
  }

  /**
   * Verify WebSocket client authentication
   */
  verifyClient(info, callback) {
    try {
      // Extract token from query string or headers
      const url = new URL(info.req.url, 'http://localhost');
      const token = url.searchParams.get('token') || info.req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return callback(false, 401, 'Unauthorized');
      }

      // Verify JWT token
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          logger.warn('WebSocket connection rejected: Invalid token', { error: err.message });
          return callback(false, 401, 'Unauthorized');
        }

        // Attach user info to request
        info.req.user = decoded;
        callback(true);
      });
    } catch (error) {
      logger.error('Error verifying WebSocket client:', error);
      callback(false, 500, 'Internal Server Error');
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const userId = req.user.id;
    const userRole = req.user.role;

    logger.info('New WebSocket connection', { userId, userRole });

    // Check connection limit per user
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }

    const userConnections = this.clients.get(userId);
    if (userConnections.size >= this.config.maxConnectionsPerUser) {
      logger.warn('Max connections reached for user', { userId });
      ws.close(1008, 'Maximum connections exceeded');
      return;
    }

    // Add connection to client map
    userConnections.add(ws);
    ws.userId = userId;
    ws.userRole = userRole;
    ws.isAlive = true;
    ws.subscriptions = new Set();

    // Set up event handlers
    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleDisconnection(ws));
    ws.on('error', (error) => this.handleClientError(ws, error));
    ws.on('pong', () => { ws.isAlive = true; });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      timestamp: new Date(),
      message: 'Real-time updates connected'
    });
  }

  /**
   * Handle incoming messages from clients
   */
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date() });
          break;

        case 'subscribe':
          this.handleSubscribe(ws, data);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, data);
          break;

        case 'workUpdate':
          this.handleWorkUpdate(ws, data);
          break;

        default:
          logger.warn('Unknown message type', { type: data.type });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  /**
   * Handle subscription requests
   */
  handleSubscribe(ws, data) {
    const { filters, subscriptionId } = data;

    // Store subscription
    const subscription = {
      id: subscriptionId || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: ws.userId,
      filters: filters || {},
      createdAt: new Date()
    };

    this.subscriptions.set(subscription.id, subscription);
    ws.subscriptions.add(subscription.id);

    logger.info('Client subscribed to updates', {
      userId: ws.userId,
      subscriptionId: subscription.id,
      filters
    });

    this.sendToClient(ws, {
      type: 'subscribed',
      subscriptionId: subscription.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle unsubscribe requests
   */
  handleUnsubscribe(ws, data) {
    const { subscriptionId } = data;

    if (ws.subscriptions.has(subscriptionId)) {
      ws.subscriptions.delete(subscriptionId);
      this.subscriptions.delete(subscriptionId);

      logger.info('Client unsubscribed', {
        userId: ws.userId,
        subscriptionId
      });

      this.sendToClient(ws, {
        type: 'unsubscribed',
        subscriptionId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle work update from client (for conflict detection)
   */
  handleWorkUpdate(ws, data) {
    const { workEntryId, version, changes } = data;

    // Check for conflicts
    const conflict = this.detectConflict(workEntryId, version, ws.userId);

    if (conflict) {
      this.sendToClient(ws, {
        type: 'conflict',
        workEntryId,
        conflict,
        timestamp: new Date()
      });
    } else {
      // Track this update
      this.trackUpdate(workEntryId, version, ws.userId, changes);
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(ws) {
    const userId = ws.userId;

    logger.info('WebSocket disconnected', { userId });

    // Remove from client map
    if (this.clients.has(userId)) {
      const userConnections = this.clients.get(userId);
      userConnections.delete(ws);

      if (userConnections.size === 0) {
        this.clients.delete(userId);
      }
    }

    // Clean up subscriptions
    ws.subscriptions.forEach(subId => {
      this.subscriptions.delete(subId);
    });
  }

  /**
   * Handle client errors
   */
  handleClientError(ws, error) {
    logger.error('WebSocket client error:', {
      userId: ws.userId,
      error: error.message
    });
  }

  /**
   * Handle server errors
   */
  handleServerError(error) {
    logger.error('WebSocket server error:', error);
  }

  /**
   * Broadcast work entry update to all subscribed clients
   */
  async broadcastWorkUpdate(workEntry, updateType = 'update') {
    try {
      // Populate work entry for broadcasting
      const populatedEntry = await WorkCalendar.findById(workEntry._id)
        .populate('project', 'name client')
        .populate('client', 'name')
        .populate('assignedTo', 'name email')
        .populate('department', 'name')
        .lean();

      if (!populatedEntry) {
        logger.warn('Work entry not found for broadcast', { workEntryId: workEntry._id });
        return;
      }

      const message = {
        type: 'workUpdate',
        updateType, // 'create', 'update', 'delete'
        workEntry: populatedEntry,
        timestamp: new Date()
      };

      // Find all subscriptions that match this work entry
      const matchingSubscriptions = this.findMatchingSubscriptions(populatedEntry);

      // Send to all matching clients
      matchingSubscriptions.forEach(subscription => {
        const userConnections = this.clients.get(subscription.userId);
        if (userConnections) {
          userConnections.forEach(ws => {
            if (ws.subscriptions.has(subscription.id)) {
              this.sendToClient(ws, message);
            }
          });
        }
      });

      logger.debug('Work update broadcasted', {
        workEntryId: workEntry._id,
        updateType,
        subscriberCount: matchingSubscriptions.length
      });
    } catch (error) {
      logger.error('Error broadcasting work update:', error);
    }
  }

  /**
   * Broadcast analytics update
   */
  async broadcastAnalyticsUpdate(filters = {}) {
    try {
      // Calculate fresh analytics
      const analytics = await analyticsEngine.calculateAnalytics(filters);

      const message = {
        type: 'analyticsUpdate',
        analytics,
        filters,
        timestamp: new Date()
      };

      // Send to all connected admin users
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (['admin', 'super_admin', 'hr'].includes(ws.userRole)) {
            this.sendToClient(ws, message);
          }
        });
      });

      logger.debug('Analytics update broadcasted');
    } catch (error) {
      logger.error('Error broadcasting analytics update:', error);
    }
  }

  /**
   * Broadcast overdue notification
   */
  broadcastOverdueNotification(overdueEntries) {
    if (!overdueEntries?.length) {
      return;
    }

    const message = {
      type: 'overdueNotification',
      overdueEntries,
      count: overdueEntries.length,
      timestamp: new Date()
    };

    // Send to all admin users
    this.clients.forEach((connections) => {
      connections.forEach((ws) => {
        if (['admin', 'super_admin', 'hr'].includes(ws.userRole)) {
          this.sendToClient(ws, message);
        }
      });
    });

    logger.debug('Overdue notification broadcasted', {
      count: overdueEntries.length
    });
  }

  /**
   * Find subscriptions that match a work entry
   */
  findMatchingSubscriptions(workEntry) {
    const matching = [];

    this.subscriptions.forEach(subscription => {
      if (this.matchesFilters(workEntry, subscription.filters)) {
        matching.push(subscription);
      }
    });

    return matching;
  }

  /**
   * Check if work entry matches subscription filters
   */
  matchesFilters(workEntry, filters) {
    // No filters means match all
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    // Check each filter
    if (filters.client && workEntry.client?._id?.toString() !== filters.client) {
      return false;
    }

    if (filters.project && workEntry.project?._id?.toString() !== filters.project) {
      return false;
    }

    if (filters.department && workEntry.department?._id?.toString() !== filters.department) {
      return false;
    }

    if (filters.assignedTo && workEntry.assignedTo?._id?.toString() !== filters.assignedTo) {
      return false;
    }

    if (filters.status && workEntry.status !== filters.status) {
      return false;
    }

    if (filters.priority && workEntry.priority !== filters.priority) {
      return false;
    }

    if (filters.workType && workEntry.workType !== filters.workType) {
      return false;
    }

    return true;
  }

  /**
   * Detect conflicts in concurrent edits
   */
  detectConflict(workEntryId, version, userId) {
    const key = `${workEntryId}_${version}`;
    const now = Date.now();

    if (this.conflictTracker.has(key)) {
      const existing = this.conflictTracker.get(key);
      
      // Check if within conflict detection window
      if (now - existing.timestamp < this.config.conflictDetectionWindow) {
        // Different user editing same version = conflict
        if (existing.userId !== userId) {
          return {
            conflictType: 'concurrent_edit',
            otherUserId: existing.userId,
            timestamp: existing.timestamp
          };
        }
      }
    }

    return null;
  }

  /**
   * Track update for conflict detection
   */
  trackUpdate(workEntryId, version, userId, changes) {
    const key = `${workEntryId}_${version}`;
    
    this.conflictTracker.set(key, {
      workEntryId,
      version,
      userId,
      changes,
      timestamp: Date.now()
    });

    // Clean up old entries after detection window
    setTimeout(() => {
      this.conflictTracker.delete(key);
    }, this.config.conflictDetectionWindow * 2);
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending message to client:', error);
      }
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (!ws.isAlive) {
            logger.info('Terminating dead connection', { userId });
            ws.terminate();
            return;
          }

          ws.isAlive = false;
          ws.ping();
        });
      });
    }, this.config.heartbeatInterval);

    logger.info('Heartbeat monitoring started');
  }

  /**
   * Start monitoring for overdue work entries
   */
  startOverdueMonitoring() {
    if (this.overdueCheckInterval) {
      clearInterval(this.overdueCheckInterval);
    }

    this.overdueCheckInProgress = false;

    this.overdueCheckInterval = setInterval(async () => {
      if (this.overdueCheckInProgress) {
        return;
      }

      this.overdueCheckInProgress = true;

      try {
        const now = new Date();

        // Only pick entries not already marked overdue.
        // isOverdue is a Mongoose virtual (not stored), so filtering on it never sticks.
        const overdueEntries = await WorkCalendar.find({
          dueDate: { $lt: now },
          status: { $nin: ['completed', 'cancelled', 'overdue'] },
        })
          .populate('project', 'name client')
          .populate('client', 'name')
          .populate('assignedTo', 'name email')
          .limit(100)
          .lean();

        if (overdueEntries.length > 0) {
          await WorkCalendar.updateMany(
            { _id: { $in: overdueEntries.map((entry) => entry._id) } },
            { $set: { status: 'overdue' } }
          );

          this.broadcastOverdueNotification(overdueEntries);

          logger.info('Marked overdue work calendar entries', {
            count: overdueEntries.length,
          });
        }
      } catch (error) {
        logger.error('Error in overdue monitoring:', error);
      } finally {
        this.overdueCheckInProgress = false;
      }
    }, this.config.overdueCheckInterval);

    logger.info('Overdue monitoring started');
  }

  /**
   * Stop all background processes
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.overdueCheckInterval) {
      clearInterval(this.overdueCheckInterval);
    }

    // Close all connections
    this.clients.forEach((connections) => {
      connections.forEach(ws => {
        ws.close(1000, 'Server shutting down');
      });
    });

    if (this.wss) {
      this.wss.close();
    }

    logger.info('Real-time update service shut down');
  }

  /**
   * Get connection statistics
   */
  getStats() {
    let totalConnections = 0;
    this.clients.forEach(connections => {
      totalConnections += connections.size;
    });

    return {
      totalUsers: this.clients.size,
      totalConnections,
      totalSubscriptions: this.subscriptions.size,
      trackedConflicts: this.conflictTracker.size
    };
  }

  /**
   * Broadcast slot update to all subscribed clients
   */
  async broadcastSlotUpdate(projectId, updateType, slotData) {
    try {
      const message = {
        type: 'slotUpdate',
        updateType, // 'slot-assigned', 'slot-released', 'slot-completed', 'slots-created'
        projectId,
        slotData,
        timestamp: new Date()
      };

      // Send to all admin users and users involved in the project
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(ws.userRole)) {
            this.sendToClient(ws, message);
          }
        });
      });

      logger.debug('Slot update broadcasted', {
        projectId,
        updateType,
        slotData
      });
    } catch (error) {
      logger.error('Error broadcasting slot update:', error);
    }
  }

  /**
   * Broadcast project progress update
   */
  async broadcastProjectProgressUpdate(projectId, progressData) {
    try {
      const message = {
        type: 'projectProgressUpdate',
        projectId,
        progressData,
        timestamp: new Date()
      };

      // Send to all admin users
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (['admin', 'superadmin', 'hr', 'manager', 'hod', 'hop'].includes(ws.userRole)) {
            this.sendToClient(ws, message);
          }
        });
      });

      logger.debug('Project progress update broadcasted', {
        projectId,
        progressData
      });
    } catch (error) {
      logger.error('Error broadcasting project progress update:', error);
    }
  }

  /**
   * Broadcast bulk slot operation update
   */
  async broadcastBulkSlotUpdate(operationData) {
    try {
      const message = {
        type: 'bulkSlotUpdate',
        operationData,
        timestamp: new Date()
      };

      // Send to all admin users
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (['admin', 'superadmin', 'hr', 'manager'].includes(ws.userRole)) {
            this.sendToClient(ws, message);
          }
        });
      });

      logger.debug('Bulk slot update broadcasted', {
        operation: operationData.operation,
        successful: operationData.successful,
        failed: operationData.failed
      });
    } catch (error) {
      logger.error('Error broadcasting bulk slot update:', error);
    }
  }

  /**
   * Broadcast slot conflict detection results
   */
  async broadcastSlotConflicts(projectId, conflicts) {
    try {
      const message = {
        type: 'slotConflicts',
        projectId,
        conflicts,
        timestamp: new Date()
      };

      // Send to admin users only
      this.clients.forEach((connections, userId) => {
        connections.forEach(ws => {
          if (['admin', 'superadmin'].includes(ws.userRole)) {
            this.sendToClient(ws, message);
          }
        });
      });

      logger.debug('Slot conflicts broadcasted', {
        projectId,
        conflictCount: conflicts.conflictCount
      });
    } catch (error) {
      logger.error('Error broadcasting slot conflicts:', error);
    }
  }
}

// Create singleton instance
const realTimeUpdateService = new RealTimeUpdateService();

export default realTimeUpdateService;