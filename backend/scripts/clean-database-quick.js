import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Quick Clean Database Script
 * Deletes all projects, slots, tasks, and work items without confirmation
 */
async function cleanDatabase() {
  try {
    console.log('🗑️  Starting quick database cleanup...\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    const db = mongoose.connection.db;

    // Get collections
    const projectsCollection = db.collection('projects');
    const slotsCollection = db.collection('slots');
    const tasksCollection = db.collection('tasks');
    const workItemsCollection = db.collection('workitems');
    const notificationsCollection = db.collection('notifications');
    const departmentsCollection = db.collection('departments');

    // Count before deletion
    const counts = {
      projects: await projectsCollection.countDocuments(),
      slots: await slotsCollection.countDocuments(),
      tasks: await tasksCollection.countDocuments(),
      workItems: await workItemsCollection.countDocuments(),
      notifications: await notificationsCollection.countDocuments()
    };

    console.log('📊 Deleting:');
    console.log(`   Projects: ${counts.projects}`);
    console.log(`   Slots: ${counts.slots}`);
    console.log(`   Tasks: ${counts.tasks}`);
    console.log(`   Work Items: ${counts.workItems}`);
    console.log(`   Notifications: ${counts.notifications}\n`);

    // Delete all
    const results = await Promise.all([
      projectsCollection.deleteMany({}),
      slotsCollection.deleteMany({}),
      tasksCollection.deleteMany({}),
      workItemsCollection.deleteMany({}),
      notificationsCollection.deleteMany({}),
      departmentsCollection.updateMany({}, { $set: { projects: [] } })
    ]);

    console.log('✅ Cleanup completed!');
    console.log(`   Projects: ${results[0].deletedCount} deleted`);
    console.log(`   Slots: ${results[1].deletedCount} deleted`);
    console.log(`   Tasks: ${results[2].deletedCount} deleted`);
    console.log(`   Work Items: ${results[3].deletedCount} deleted`);
    console.log(`   Notifications: ${results[4].deletedCount} deleted`);
    console.log(`   Department references: cleaned\n`);

    console.log('🎉 Database is now clean!');
    console.log('📝 You can now create new projects with the fixed system.\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Run cleanup
cleanDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
