const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

/**
 * Migration Script: Convert Slots and Tasks to WorkItems
 * This script migrates existing slots and tasks to the unified WorkItem model
 */
async function migrateToWorkItems() {
  try {
    console.log('Starting migration to WorkItems...\n');

    // Get collections
    const slotsCollection = db.collection('slots');
    const tasksCollection = db.collection('tasks');
    const workItemsCollection = db.collection('workitems');

    // Check if WorkItems collection already has data
    const existingCount = await workItemsCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  WorkItems collection already has ${existingCount} documents.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        readline.question('Do you want to continue? This will add more items. (yes/no): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('Migration cancelled.');
        process.exit(0);
      }
    }

    // Migrate Slots to WorkItems (type: 'content')
    console.log('Migrating slots to content work items...');
    const slots = await slotsCollection.find({}).toArray();
    let slotsConverted = 0;

    for (const slot of slots) {
      const workItem = {
        type: 'content',
        title: slot.title || slot.brief || slot.workType || 'Untitled Content',
        description: slot.description || slot.caption || '',
        project: slot.project,
        assignedTo: slot.assignedTo,
        createdBy: slot.createdBy || slot.assignedBy,
        status: mapSlotStatus(slot.designStatus || slot.status),
        priority: mapPriority(slot.contentBucket || slot.priority),
        dueDate: slot.postingDate || slot.dueDate || new Date(),
        
        // Content-specific fields
        platform: slot.platform || 'Not Specified',
        postType: slot.postType || 'Post',
        contentBucket: slot.contentBucket || '',
        
        // Additional fields
        tags: slot.tags || [],
        createdAt: slot.createdAt || new Date(),
        updatedAt: slot.updatedAt || new Date(),
        
        // Preserve original data
        metadata: {
          migratedFrom: 'slot',
          originalId: slot._id,
          originalData: {
            workType: slot.workType,
            caption: slot.caption,
            hashtags: slot.hashtags
          }
        }
      };

      // Set completedAt if status is Done
      if (workItem.status === 'Done' && slot.approvedAt) {
        workItem.completedAt = slot.approvedAt;
      }

      await workItemsCollection.insertOne(workItem);
      slotsConverted++;
    }

    console.log(`✅ Migrated ${slotsConverted} slots to content work items\n`);

    // Migrate Tasks to WorkItems (type: 'task')
    console.log('Migrating tasks to task work items...');
    const tasks = await tasksCollection.find({}).toArray();
    let tasksConverted = 0;

    for (const task of tasks) {
      const workItem = {
        type: 'task',
        title: task.title || 'Untitled Task',
        description: task.description || '',
        project: task.project,
        assignedTo: task.assignedTo,
        createdBy: task.createdBy,
        status: mapTaskStatus(task.status),
        priority: task.priority || 'medium',
        dueDate: task.dueDate || new Date(),
        
        // Additional fields
        tags: task.tags || [],
        createdAt: task.createdAt || new Date(),
        updatedAt: task.updatedAt || new Date(),
        
        // Preserve original data
        metadata: {
          migratedFrom: 'task',
          originalId: task._id
        }
      };

      // Set completedAt if status is Done
      if (workItem.status === 'Done' && task.completedAt) {
        workItem.completedAt = task.completedAt;
      }

      await workItemsCollection.insertOne(workItem);
      tasksConverted++;
    }

    console.log(`✅ Migrated ${tasksConverted} tasks to task work items\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Slots Migrated: ${slotsConverted}`);
    console.log(`Total Tasks Migrated: ${tasksConverted}`);
    console.log(`Total Work Items Created: ${slotsConverted + tasksConverted}`);
    console.log('='.repeat(50));
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data integrity in WorkItems collection');
    console.log('2. Test the new UI with migrated data');
    console.log('3. Once verified, you can archive old slots and tasks collections');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Helper function to map slot status to unified status
function mapSlotStatus(slotStatus) {
  const statusMap = {
    'Planned': 'To Do',
    'In Design': 'In Progress',
    'Ready for Review': 'Review',
    'Revision Needed': 'Review',
    'Approved': 'Done'
  };
  return statusMap[slotStatus] || 'To Do';
}

// Helper function to map task status to unified status
function mapTaskStatus(taskStatus) {
  const statusMap = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'review': 'Review',
    'done': 'Done'
  };
  return statusMap[taskStatus] || 'To Do';
}

// Helper function to map priority
function mapPriority(priority) {
  if (!priority) return 'medium';
  
  const lowerPriority = priority.toLowerCase();
  const priorityMap = {
    'low': 'low',
    'medium': 'medium',
    'normal': 'medium',
    'high': 'high',
    'urgent': 'urgent',
    'critical': 'urgent'
  };
  
  return priorityMap[lowerPriority] || 'medium';
}

// Run migration
migrateToWorkItems()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
