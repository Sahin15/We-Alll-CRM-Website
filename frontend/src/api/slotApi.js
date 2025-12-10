/**
 * @deprecated This API is deprecated and wraps workItemApi
 * Use workItemApi.js directly for new code
 * This wrapper exists for backward compatibility during migration
 * 
 * Migration Guide:
 * - getSlotsByProject() → workItemApi.getMyWork({ project: projectId, type: 'content' })
 * - createSlot() → workItemApi.createWorkItem({ type: 'content', ... })
 * - updateSlot() → workItemApi.updateWorkItem()
 * - deleteSlot() → workItemApi.deleteWorkItem()
 */

import api from '../services/api';
import workItemApi from './workItemApi';

// Deprecation warning removed - this file is kept for backward compatibility only
// console.warn('⚠️ DEPRECATED: slotApi is deprecated. Use workItemApi instead.');

/**
 * Get slots (content work items) for a project
 * @deprecated Use workItemApi.getMyWork() instead
 */
export const getSlotsByProject = async (projectId) => {
  try {
    // Use the project-specific endpoint
    const response = await api.get(`/work-items/project/${projectId}`, {
      params: { type: 'content' }
    });
    
    // Transform work items to slot format for backward compatibility
    const slots = response.data.data?.map(workItem => ({
      _id: workItem._id,
      title: workItem.title,
      description: workItem.description,
      project: workItem.project,
      assignedTo: workItem.assignedTo,
      createdBy: workItem.createdBy,
      status: workItem.status,
      priority: workItem.priority,
      dueDate: workItem.dueDate,
      postingDate: workItem.dueDate, // Legacy field
      workType: workItem.metadata?.workType || workItem.postType || 'Content',
      platform: workItem.platform,
      postType: workItem.postType,
      contentBucket: workItem.contentBucket,
      createdAt: workItem.createdAt,
      updatedAt: workItem.updatedAt,
      // Map work item status to legacy slot status
      designStatus: mapWorkItemStatusToSlotStatus(workItem.status),
    })) || [];
    
    return { data: slots };
  } catch (error) {
    console.error('Error fetching slots:', error);
    throw error;
  }
};

/**
 * Get a single slot by ID
 * @deprecated Use workItemApi.getWorkItemById() instead
 */
export const getSlotById = async (slotId) => {
  try {
    const response = await api.get(`/work-items/${slotId}`);
    
    // Transform work item to slot format
    const workItem = response.data.data;
    const slot = {
      _id: workItem._id,
      title: workItem.title,
      description: workItem.description,
      project: workItem.project,
      client: workItem.project?.client, // Assuming populated
      assignedTo: workItem.assignedTo,
      createdBy: workItem.createdBy,
      status: workItem.status,
      priority: workItem.priority,
      dueDate: workItem.dueDate,
      postingDate: workItem.dueDate,
      workType: workItem.metadata?.workType || workItem.postType || 'Content',
      platform: workItem.platform,
      postType: workItem.postType,
      contentBucket: workItem.contentBucket,
      createdAt: workItem.createdAt,
      updatedAt: workItem.updatedAt,
      designStatus: mapWorkItemStatusToSlotStatus(workItem.status),
    };
    
    return { data: slot };
  } catch (error) {
    console.error('Error fetching slot:', error);
    throw error;
  }
};

/**
 * Create a new slot (content work item)
 * @deprecated Use workItemApi.createWorkItem() instead
 */
export const createSlot = async (slotData) => {
  try {
    // Transform slot data to work item format
    const workItemData = {
      type: 'content',
      title: slotData.title,
      description: slotData.description || slotData.brief || '',
      project: slotData.project,
      assignedTo: slotData.assignedTo,
      priority: slotData.priority || 'Medium',
      dueDate: slotData.postingDate || slotData.dueDate,
      platform: slotData.platform || slotData.platforms?.[0],
      postType: slotData.postType,
      contentBucket: slotData.contentBucket,
      metadata: {
        workType: slotData.workType,
        caption: slotData.caption,
        hashtags: slotData.hashtags,
        occasion: slotData.occasion,
        brief: slotData.brief,
      }
    };
    
    const response = await api.post('/work-items', workItemData);
    return response.data;
  } catch (error) {
    console.error('Error creating slot:', error);
    throw error;
  }
};

/**
 * Update a slot
 * @deprecated Use workItemApi.updateWorkItem() instead
 */
export const updateSlot = async (slotId, updates) => {
  try {
    // Transform slot updates to work item format
    const workItemUpdates = {
      title: updates.title,
      description: updates.description || updates.brief,
      assignedTo: updates.assignedTo,
      priority: updates.priority,
      dueDate: updates.postingDate || updates.dueDate,
      status: updates.status || mapSlotStatusToWorkItemStatus(updates.designStatus),
      platform: updates.platform,
      postType: updates.postType,
      contentBucket: updates.contentBucket,
    };
    
    // Add metadata if present
    if (updates.workType || updates.caption || updates.hashtags) {
      workItemUpdates.metadata = {
        workType: updates.workType,
        caption: updates.caption,
        hashtags: updates.hashtags,
        occasion: updates.occasion,
        brief: updates.brief,
      };
    }
    
    const response = await api.put(`/work-items/${slotId}`, workItemUpdates);
    return response.data;
  } catch (error) {
    console.error('Error updating slot:', error);
    throw error;
  }
};

/**
 * Delete a slot
 * @deprecated Use workItemApi.deleteWorkItem() instead
 */
export const deleteSlot = async (slotId) => {
  try {
    const response = await api.delete(`/work-items/${slotId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting slot:', error);
    throw error;
  }
};

/**
 * Upload creative for a slot
 * @deprecated This functionality needs to be implemented in work items
 */
export const uploadCreative = async (slotId, file) => {
  console.warn('uploadCreative is not yet implemented in work items');
  throw new Error('Upload creative functionality needs to be migrated to work items');
};

// Helper functions for status mapping
function mapWorkItemStatusToSlotStatus(workItemStatus) {
  const statusMap = {
    'To Do': 'Planned',
    'In Progress': 'In Design',
    'Review': 'Ready for Review',
    'Done': 'Approved'
  };
  return statusMap[workItemStatus] || 'Planned';
}

function mapSlotStatusToWorkItemStatus(slotStatus) {
  const statusMap = {
    'Planned': 'To Do',
    'In Design': 'In Progress',
    'Ready for Review': 'Review',
    'Revision Needed': 'Review',
    'Needs Revision': 'Review',
    'Approved': 'Done'
  };
  return statusMap[slotStatus] || 'To Do';
}

export default {
  getSlotsByProject,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
  uploadCreative,
};
