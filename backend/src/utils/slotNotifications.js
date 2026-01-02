import Notification from '../models/notificationModel.js';

/**
 * Send notification when a slot is assigned to an employee
 */
export const notifySlotAssigned = async (slot, assignedEmployee) => {
  try {
    await Notification.create({
      recipient: assignedEmployee._id,
      recipientType: 'employee',
      type: 'general',
      title: 'New Slot Assigned',
      message: `You have been assigned a new content slot for ${slot.project.name}. Design deadline: ${new Date(slot.designDeadline).toLocaleDateString()}`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        slotId: slot._id,
        projectId: slot.project._id,
        designDeadline: slot.designDeadline,
        postingDate: slot.postingDate
      },
      isRead: false
    });
    // console.log(`Notification sent to ${assignedEmployee.name} for slot assignment`);
  } catch (error) {
    console.error('Error sending slot assignment notification:', error);
  }
};

/**
 * Send notification when a slot is approaching deadline
 */
export const notifySlotDeadlineApproaching = async (slot, employee) => {
  try {
    const daysUntilDeadline = Math.ceil((new Date(slot.designDeadline) - new Date()) / (1000 * 60 * 60 * 24));
    
    await Notification.create({
      recipient: employee._id,
      recipientType: 'employee',
      type: 'general',
      title: 'Slot Deadline Approaching',
      message: `Design deadline for "${slot.brief.substring(0, 50)}..." is in ${daysUntilDeadline} day(s)`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        slotId: slot._id,
        projectId: slot.project,
        designDeadline: slot.designDeadline,
        daysRemaining: daysUntilDeadline
      },
      isRead: false
    });
    // console.log(`Deadline reminder sent to ${employee.name} for slot ${slot._id}`);
  } catch (error) {
    console.error('Error sending deadline reminder:', error);
  }
};

/**
 * Send notification when a slot is overdue
 */
export const notifySlotOverdue = async (slot, employee) => {
  try {
    await Notification.create({
      recipient: employee._id,
      recipientType: 'employee',
      type: 'general',
      title: 'Slot Overdue',
      message: `The slot "${slot.brief.substring(0, 50)}..." is overdue. Please update the status or upload creatives.`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        slotId: slot._id,
        projectId: slot.project,
        designDeadline: slot.designDeadline,
        postingDate: slot.postingDate
      },
      isRead: false
    });
    // console.log(`Overdue notification sent to ${employee.name} for slot ${slot._id}`);
  } catch (error) {
    console.error('Error sending overdue notification:', error);
  }
};

/**
 * Send notification to project head when slot status is updated
 */
export const notifyProjectHeadStatusUpdate = async (slot, projectHead, newStatus) => {
  try {
    await Notification.create({
      recipient: projectHead._id,
      recipientType: 'employee',
      type: 'general',
      title: 'Slot Status Updated',
      message: `${slot.assignedTo.name} updated slot status to "${newStatus}" for ${slot.project.name}`,
      link: `/projects/${slot.project._id}`,
      data: {
        slotId: slot._id,
        projectId: slot.project._id,
        newStatus: newStatus,
        updatedBy: slot.assignedTo._id
      },
      isRead: false
    });
    // console.log(`Status update notification sent to project head ${projectHead.name}`);
  } catch (error) {
    console.error('Error sending status update notification:', error);
  }
};

/**
 * Send notification to project head when creative is uploaded
 */
export const notifyProjectHeadCreativeUploaded = async (slot, projectHead, employee) => {
  try {
    await Notification.create({
      recipient: projectHead._id,
      recipientType: 'employee',
      type: 'general',
      title: 'New Creative Uploaded',
      message: `${employee.name} uploaded a creative for "${slot.brief.substring(0, 50)}..."`,
      link: `/projects/${slot.project._id}`,
      data: {
        slotId: slot._id,
        projectId: slot.project._id,
        uploadedBy: employee._id
      },
      isRead: false
    });
    // console.log(`Creative upload notification sent to project head ${projectHead.name}`);
  } catch (error) {
    console.error('Error sending creative upload notification:', error);
  }
};

/**
 * Send notification when a comment is added to a slot
 */
export const notifySlotComment = async (slot, commentAuthor, recipients) => {
  try {
    const notifications = recipients
      .filter(recipient => recipient._id.toString() !== commentAuthor._id.toString())
      .map(recipient => ({
        recipient: recipient._id,
        recipientType: 'employee',
        type: 'general',
        title: 'New Comment on Slot',
        message: `${commentAuthor.name} commented on "${slot.brief.substring(0, 50)}..."`,
        link: `/employee/my-work`, // Updated to existing route
        data: {
          slotId: slot._id,
          projectId: slot.project,
          commentBy: commentAuthor._id
        },
        isRead: false
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      // console.log(`Comment notifications sent to ${notifications.length} user(s)`);
    }
  } catch (error) {
    console.error('Error sending comment notifications:', error);
  }
};

export default {
  notifySlotAssigned,
  notifySlotDeadlineApproaching,
  notifySlotOverdue,
  notifyProjectHeadStatusUpdate,
  notifyProjectHeadCreativeUploaded,
  notifySlotComment
};
