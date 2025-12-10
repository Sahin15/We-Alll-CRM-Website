const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

/**
 * Clean Database Script
 * This script deletes all projects, slots, tasks, and work items
 * WARNING: This is irreversible!
 */
async function cleanDatabase() {
  try {
    console.log('🗑️  Starting database cleanup...\n');
    console.log('⚠️  WARNING: This will delete ALL projects and related data!');
    console.log('⚠️  This action is IRREVERSIBLE!\n');

    // Prompt for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('Type "DELETE ALL" to confirm: ', resolve);
    });
    readline.close();

    if (answer !== 'DELETE ALL') {
      console.log('❌ Cleanup cancelled. No data was deleted.');
      process.exit(0);
    }

    console.log('\n🗑️  Proceeding with cleanup...\n');

    // Get collections
    const projectsCollection = db.collection('projects');
    const slotsCollection = db.collection('slots');
    const tasksCollection = db.collection('tasks');
    const workItemsCollection = db.collection('workitems');
    const notificationsCollection = db.collection('notifications');

    // Count documents before deletion
    const projectsCount = await projectsCollection.countDocuments();
    const slotsCount = await slotsCollection.countDocuments();
    const tasksCount = await tasksCollection.countDocuments();
    const workItemsCount = await workItemsCollection.countDocuments();
    const notificationsCount = await notificationsCollection.countDocuments();

    console.log('📊 Current data:');
    console.log(`   Projects: ${projectsCount}`);
    console.log(`   Slots: ${slotsCount}`);
    console.log(`   Tasks: ${tasksCount}`);
    console.log(`   Work Items: ${workItemsCount}`);
    console.log(`   Notifications: ${notificationsCount}\n`);

    // Delete all projects
    console.log('🗑️  Deleting projects...');
    const projectsResult = await projectsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${projectsResult.deletedCount} projects`);

    // Delete all slots
    console.log('🗑️  Deleting slots...');
    const slotsResult = await slotsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${slotsResult.deletedCount} slots`);

    // Delete all tasks
    console.log('🗑️  Deleting tasks...');
    const tasksResult = await tasksCollection.deleteMany({});
    console.log(`   ✅ Deleted ${tasksResult.deletedCount} tasks`);

    // Delete all work items
    console.log('🗑️  Deleting work items...');
    const workItemsResult = await workItemsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${workItemsResult.deletedCount} work items`);

    // Delete related notifications
    console.log('🗑️  Deleting related notifications...');
    const notificationsResult = await notificationsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${notificationsResult.deletedCount} notifications`);

    // Also clean up department project references
    console.log('🗑️  Cleaning department references...');
    const departmentsCollection = db.collection('departments');
    await departmentsCollection.updateMany(
      {},
      { $set: { projects: [] } }
    );
    console.log(`   ✅ Cleaned department project references`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(50));
    console.log(`Projects deleted: ${projectsResult.deletedCount}`);
    console.log(`Slots deleted: ${slotsResult.deletedCount}`);
    console.log(`Tasks deleted: ${tasksResult.deletedCount}`);
    console.log(`Work Items deleted: ${workItemsResult.deletedCount}`);
    console.log(`Notifications deleted: ${notificationsResult.deletedCount}`);
    console.log('='.repeat(50));
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Refresh your browser');
    console.log('2. Create new projects using the fixed Create Project modal');
    console.log('3. Create new work items');
    console.log('4. Everything will work with the new system!\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Run cleanup
cleanDatabase()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
