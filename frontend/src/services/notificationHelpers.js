/**
 * Notification Helper Functions
 * Client-side helpers for triggering notifications
 */

import api from './api';

/**
 * Notify about a new employee joining
 * @param {Object} employee - Employee object
 * @param {Object} addedBy - User who added the employee
 */
export const notifyEmployeeJoined = async (employee, addedBy) => {
  try {
    // Get all HR, Admin, and SuperAdmin users
    const usersResponse = await api.get('/admin/users');
    const allUsers = usersResponse.data || [];
    const targetUsers = allUsers.filter(user => 
      ['hr', 'admin', 'superadmin'].includes(user.role)
    );

    const notificationPromises = targetUsers.map(user => 
      api.post('/notifications', {
        recipient: user._id,
        recipientType: 'user',
        type: 'employee_joined',
        title: '👋 New Team Member!',
        message: `${employee.name} has joined as ${employee.role} in ${employee.department?.name || 'the team'}`,
        data: {
          employeeId: employee._id,
          addedBy: addedBy._id,
          department: employee.department?.name
        },
        priority: 'medium'
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error sending employee joined notification:', error);
    throw error;
  }
};

/**
 * Notify about client won
 * @param {Object} client - Client object
 * @param {Object} wonBy - User who won the client
 * @param {Object} projectDetails - Project details
 */
export const notifyClientWon = async (client, wonBy, projectDetails = {}) => {
  try {
    // First get all HR, Admin, and SuperAdmin users
    const usersResponse = await api.get('/admin/users');
    const allUsers = usersResponse.data || [];
    const targetUsers = allUsers.filter(user => 
      ['hr', 'admin', 'superadmin'].includes(user.role)
    );

    // Send notification to each target user
    const notificationPromises = targetUsers.map(user => 
      api.post('/notifications', {
        recipient: user._id,
        recipientType: 'user',
        type: 'client_won',
        title: '🎉 New Client Won!',
        message: `${wonBy.name} successfully won ${client.name}${projectDetails.projectValue ? ` worth ₹${projectDetails.projectValue}` : ''}`,
        data: {
          clientId: client._id,
          wonBy: wonBy._id,
          projectValue: projectDetails.projectValue,
          projectName: projectDetails.projectName
        },
        priority: 'high'
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error sending client won notification:', error);
    throw error; // Re-throw to handle in UI
  }
};

/**
 * Notify about new project
 * @param {Object} project - Project object
 * @param {Object} createdBy - User who created the project
 */
export const notifyNewProject = async (project, createdBy) => {
  try {
    // Get all users who should be notified about new projects
    const usersResponse = await api.get('/admin/users');
    const allUsers = usersResponse.data || [];
    const targetUsers = allUsers.filter(user => 
      ['hr', 'admin', 'superadmin', 'employee'].includes(user.role)
    );

    const notificationPromises = targetUsers.map(user => 
      api.post('/notifications', {
        recipient: user._id,
        recipientType: 'user',
        type: 'new_project',
        title: '🚀 New Project Created!',
        message: `${createdBy.name} created new project "${project.name}" for ${project.client?.name || 'client'}`,
        data: {
          projectId: project._id,
          clientId: project.client?._id,
          createdBy: createdBy._id
        },
        priority: 'medium'
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error sending new project notification:', error);
    throw error;
  }
};

/**
 * Notify about employee promotion/role change
 * @param {Object} employee - Employee object
 * @param {string} oldRole - Previous role
 * @param {string} newRole - New role
 * @param {Object} updatedBy - User who made the change
 */
export const notifyEmployeePromotion = async (employee, oldRole, newRole, updatedBy) => {
  try {
    await api.post('/notifications', {
      recipient: employee._id,
      type: 'employee_promotion',
      title: '🎉 Congratulations!',
      message: `Your role has been updated from ${oldRole} to ${newRole}`,
      data: {
        employeeId: employee._id,
        oldRole,
        newRole,
        updatedBy: updatedBy._id
      },
      priority: 'high'
    });

    // Also notify HR/Admin
    const usersResponse = await api.get('/admin/users');
    const allUsers = usersResponse.data || [];
    const targetUsers = allUsers.filter(user => 
      ['hr', 'admin', 'superadmin'].includes(user.role)
    );

    const adminNotificationPromises = targetUsers.map(user => 
      api.post('/notifications', {
        recipient: user._id,
        recipientType: 'user',
        type: 'employee_promotion',
        title: '📈 Employee Promotion',
        message: `${employee.name} has been promoted from ${oldRole} to ${newRole}`,
        data: {
          employeeId: employee._id,
          oldRole,
          newRole,
          updatedBy: updatedBy._id
        },
        priority: 'medium'
      })
    );

    await Promise.all(adminNotificationPromises);
  } catch (error) {
    console.error('Error sending promotion notification:', error);
  }
};

/**
 * Notify about important system updates
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 */
export const notifySystemUpdate = async (title, message, data = {}) => {
  try {
    // Get all users for system updates
    const usersResponse = await api.get('/admin/users');
    const allUsers = usersResponse.data || [];

    const notificationPromises = allUsers.map(user => 
      api.post('/notifications', {
        recipient: user._id,
        recipientType: 'user',
        type: 'system',
        title,
        message,
        data,
        priority: 'medium'
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error sending system notification:', error);
  }
};

/**
 * Notify about payment received
 * @param {Object} payment - Payment object
 * @param {Object} client - Client object
 */
export const notifyPaymentReceived = async (payment, client) => {
  try {
    // Get accounts team users
    const usersResponse = await api.get('/admin/users');
    const allUsers = usersResponse.data || [];
    const accountsUsers = allUsers.filter(user => 
      ['accounts', 'admin', 'superadmin'].includes(user.role)
    );

    const notificationPromises = accountsUsers.map(user => 
      api.post('/notifications', {
        recipient: user._id,
        recipientType: 'user',
        type: 'payment_received',
        title: '💰 Payment Received',
        message: `Payment of ₹${payment.amount} received from ${client.name}`,
        data: {
          paymentId: payment._id,
          clientId: client._id,
          amount: payment.amount
        },
        priority: 'medium'
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error sending payment notification:', error);
    throw error;
  }
};

/**
 * Send custom notification to specific users
 * @param {Array} recipients - Array of user IDs
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @param {string} priority - Notification priority
 */
export const sendCustomNotification = async (recipients, type, title, message, data = {}, priority = 'medium') => {
  try {
    const promises = recipients.map(recipientId => 
      api.post('/notifications', {
        recipient: recipientId,
        type,
        title,
        message,
        data,
        priority
      })
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending custom notification:', error);
  }
};

export default {
  notifyEmployeeJoined,
  notifyClientWon,
  notifyNewProject,
  notifyEmployeePromotion,
  notifySystemUpdate,
  notifyPaymentReceived,
  sendCustomNotification
};