import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkItem from '../src/models/workItemModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config();

const testStatusUpdate = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a work item to test with
    const workItem = await WorkItem.findOne().populate('assignedTo', 'name email');
    
    if (!workItem) {
      console.log('❌ No work items found in database');
      return;
    }

    console.log('📋 Found work item:', {
      id: workItem._id,
      title: workItem.title,
      currentStatus: workItem.status,
      assignedTo: workItem.assignedTo ? {
        id: workItem.assignedTo._id,
        name: workItem.assignedTo.name,
        email: workItem.assignedTo.email
      } : null,
      project: workItem.project
    });

    // Test status validation
    const { validateStatusTransition } = await import('../src/utils/statusValidation.js');
    
    const testStatuses = ['In Progress', 'Review', 'Done'];
    
    for (const newStatus of testStatuses) {
      if (newStatus !== workItem.status) {
        const transition = validateStatusTransition(workItem.status, newStatus);
        console.log(`🔄 Transition ${workItem.status} → ${newStatus}:`, transition);
        
        if (transition.valid) {
          console.log(`✅ Valid transition to ${newStatus}`);
          break;
        }
      }
    }

    // Test project progress service
    try {
      const { syncProjectProgress } = await import('../src/services/projectProgressService.js');
      console.log('📊 Testing project progress sync...');
      await syncProjectProgress(workItem.project.toString());
      console.log('✅ Project progress sync successful');
    } catch (progressError) {
      console.error('❌ Project progress sync error:', progressError.message);
    }

    // Test notification service
    try {
      const notificationService = await import('../src/services/notificationService.js');
      console.log('📧 Testing notification service...');
      
      if (workItem.assignedTo) {
        await notificationService.default.sendStatusChangedNotification(
          workItem.assignedTo._id,
          workItem.title,
          workItem.status,
          'In Progress'
        );
        console.log('✅ Notification service test successful');
      } else {
        console.log('⚠️ No assignedTo user, skipping notification test');
      }
    } catch (notificationError) {
      console.error('❌ Notification service error:', notificationError.message);
    }

    console.log('🎉 All tests completed');

  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run the test
testStatusUpdate();