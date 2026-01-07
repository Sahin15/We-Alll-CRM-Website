import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Fix spelling mistakes in announcements and notifications
 * Specifically looking for "Dashbaord" and other common mistakes
 */
const fixSpellingMistakes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Import models dynamically
    const Announcement = (await import('../src/models/announcementModel.js')).default;
    const Notification = (await import('../src/models/notificationModel.js')).default;

    console.log("🔍 Searching for spelling mistakes...\n");

    // Define spelling corrections
    const corrections = [
      {
        wrong: "Dashbaord",
        correct: "Dashboard",
        description: "Dashboard spelling correction"
      },
      {
        wrong: "Managment",
        correct: "Management", 
        description: "Management spelling correction"
      },
      {
        wrong: "Requsting",
        correct: "Requesting",
        description: "Requesting spelling correction"
      },
      {
        wrong: "Requeting",
        correct: "Requesting",
        description: "Requesting spelling correction"
      },
      {
        wrong: "Workmanagement",
        correct: "Work Management",
        description: "Work Management spacing correction"
      }
    ];

    let totalFixed = 0;

    // Check and fix announcements
    console.log("📢 Checking Announcements...");
    const announcements = await Announcement.find({});
    console.log(`Found ${announcements.length} announcements to check`);

    for (const announcement of announcements) {
      let updated = false;
      let originalTitle = announcement.title;
      let originalContent = announcement.content;
      let newTitle = announcement.title;
      let newContent = announcement.content;

      // Apply corrections to title and content
      for (const correction of corrections) {
        const regex = new RegExp(correction.wrong, 'gi');
        
        if (newTitle && newTitle.match(regex)) {
          newTitle = newTitle.replace(regex, correction.correct);
          updated = true;
        }
        
        if (newContent && newContent.match(regex)) {
          newContent = newContent.replace(regex, correction.correct);
          updated = true;
        }
      }

      if (updated) {
        await Announcement.findByIdAndUpdate(announcement._id, {
          title: newTitle,
          content: newContent
        });
        
        console.log(`✅ Fixed announcement: "${originalTitle}"`);
        if (originalTitle !== newTitle) {
          console.log(`   Title: "${originalTitle}" → "${newTitle}"`);
        }
        if (originalContent !== newContent) {
          console.log(`   Content updated with spelling corrections`);
        }
        totalFixed++;
      }
    }

    // Check and fix notifications
    console.log("\n🔔 Checking Notifications...");
    const notifications = await Notification.find({});
    console.log(`Found ${notifications.length} notifications to check`);

    for (const notification of notifications) {
      let updated = false;
      let originalTitle = notification.title;
      let originalMessage = notification.message;
      let newTitle = notification.title;
      let newMessage = notification.message;

      // Apply corrections to title and message
      for (const correction of corrections) {
        const regex = new RegExp(correction.wrong, 'gi');
        
        if (newTitle && newTitle.match(regex)) {
          newTitle = newTitle.replace(regex, correction.correct);
          updated = true;
        }
        
        if (newMessage && newMessage.match(regex)) {
          newMessage = newMessage.replace(regex, correction.correct);
          updated = true;
        }
      }

      if (updated) {
        await Notification.findByIdAndUpdate(notification._id, {
          title: newTitle,
          message: newMessage
        });
        
        console.log(`✅ Fixed notification: "${originalTitle}"`);
        if (originalTitle !== newTitle) {
          console.log(`   Title: "${originalTitle}" → "${newTitle}"`);
        }
        if (originalMessage !== newMessage) {
          console.log(`   Message updated with spelling corrections`);
        }
        totalFixed++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SPELLING CORRECTION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Total items fixed: ${totalFixed}`);
    console.log(`📢 Announcements checked: ${announcements.length}`);
    console.log(`🔔 Notifications checked: ${notifications.length}`);
    console.log("=".repeat(60));

    if (totalFixed > 0) {
      console.log("\n🎉 Spelling mistakes have been corrected!");
      console.log("🔄 Refresh the News & Alerts page to see the changes.");
    } else {
      console.log("\n✅ No spelling mistakes found - everything looks good!");
    }

    // Show specific search for the mentioned text
    console.log("\n🔍 SPECIFIC SEARCH RESULTS:");
    const dashboardItems = await Announcement.find({
      $or: [
        { title: { $regex: /dashboard.*slot/i } },
        { content: { $regex: /dashboard.*slot/i } }
      ]
    });
    
    const notificationDashboardItems = await Notification.find({
      $or: [
        { title: { $regex: /dashboard.*slot/i } },
        { message: { $regex: /dashboard.*slot/i } }
      ]
    });

    if (dashboardItems.length > 0 || notificationDashboardItems.length > 0) {
      console.log("Found items containing 'Dashboard' and 'Slot':");
      dashboardItems.forEach(item => {
        console.log(`📢 Announcement: "${item.title}"`);
      });
      notificationDashboardItems.forEach(item => {
        console.log(`🔔 Notification: "${item.title}"`);
      });
    } else {
      console.log("No items found containing both 'Dashboard' and 'Slot'");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing spelling mistakes:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
fixSpellingMistakes();