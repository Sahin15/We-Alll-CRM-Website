import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Clean up orphaned notifications
 * Removes notifications that reference deleted announcements
 */
const cleanupOrphanedNotifications = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Import models dynamically
    const Announcement = (await import('../src/models/announcementModel.js')).default;
    const Notification = (await import('../src/models/notificationModel.js')).default;

    console.log("🔍 Searching for orphaned notifications...\n");

    // Get all notifications that reference announcements
    const announcementNotifications = await Notification.find({
      'data.announcementId': { $exists: true }
    });

    console.log(`📊 Found ${announcementNotifications.length} notifications referencing announcements`);

    if (announcementNotifications.length === 0) {
      console.log("✅ No announcement notifications found to check");
      process.exit(0);
    }

    // Get all existing announcement IDs
    const existingAnnouncements = await Announcement.find({}).select('_id');
    const existingAnnouncementIds = new Set(
      existingAnnouncements.map(a => a._id.toString())
    );

    console.log(`📢 Found ${existingAnnouncementIds.size} existing announcements`);

    // Find orphaned notifications
    const orphanedNotifications = [];
    
    for (const notification of announcementNotifications) {
      const announcementId = notification.data?.announcementId;
      if (announcementId && !existingAnnouncementIds.has(announcementId.toString())) {
        orphanedNotifications.push(notification);
      }
    }

    console.log(`🗑️  Found ${orphanedNotifications.length} orphaned notifications\n`);

    if (orphanedNotifications.length === 0) {
      console.log("✅ No orphaned notifications found - everything is clean!");
      process.exit(0);
    }

    // Show details of orphaned notifications
    console.log("📋 ORPHANED NOTIFICATIONS TO BE DELETED:");
    console.log("=".repeat(60));
    
    orphanedNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. "${notification.title}"`);
      console.log(`   ID: ${notification._id}`);
      console.log(`   References deleted announcement: ${notification.data.announcementId}`);
      console.log(`   Created: ${notification.createdAt}`);
      console.log(`   Recipient: ${notification.recipient || notification.user}`);
      console.log('');
    });

    // Delete orphaned notifications
    const orphanedIds = orphanedNotifications.map(n => n._id);
    const deleteResult = await Notification.deleteMany({
      _id: { $in: orphanedIds }
    });

    console.log("=".repeat(60));
    console.log("📊 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`🗑️  Orphaned notifications deleted: ${deleteResult.deletedCount}`);
    console.log(`✅ Remaining valid notifications: ${announcementNotifications.length - deleteResult.deletedCount}`);
    console.log(`📢 Total announcements: ${existingAnnouncementIds.size}`);
    console.log("=".repeat(60));

    if (deleteResult.deletedCount > 0) {
      console.log("\n🎉 Cleanup completed successfully!");
      console.log("💡 Benefits:");
      console.log("   ✅ Removed notifications for deleted announcements");
      console.log("   ✅ Cleaned up employee notification lists");
      console.log("   ✅ Improved News & Alerts page performance");
      console.log("\n🔄 Employees should refresh their News & Alerts page to see the changes");
    }

    // Additional cleanup: Remove notifications with invalid structure
    console.log("\n🔧 Additional cleanup checks...");
    
    const invalidNotifications = await Notification.deleteMany({
      $or: [
        { title: { $exists: false } },
        { title: null },
        { title: "" },
        { message: { $exists: false } },
        { message: null },
        { message: "" }
      ]
    });

    if (invalidNotifications.deletedCount > 0) {
      console.log(`🗑️  Removed ${invalidNotifications.deletedCount} invalid notifications`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning up orphaned notifications:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
cleanupOrphanedNotifications();