import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Search for specific text in announcements and notifications
 * Helps locate the "Work Management Dashboard for Slots" text
 */
const searchAnnouncements = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Import models dynamically
    const Announcement = (await import('../src/models/announcementModel.js')).default;
    const Notification = (await import('../src/models/notificationModel.js')).default;

    console.log("🔍 Searching for announcements and notifications...\n");

    // Search terms related to your query
    const searchTerms = [
      "Work Management",
      "Dashboard",
      "Slots",
      "Requesting",
      "Dashbaord", // misspelled version
      "Managment", // misspelled version
    ];

    console.log("📢 ANNOUNCEMENTS:");
    console.log("=".repeat(50));
    
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });
    console.log(`Total announcements: ${announcements.length}\n`);

    let foundCount = 0;
    
    for (const announcement of announcements) {
      const title = announcement.title || '';
      const content = announcement.content || '';
      const fullText = `${title} ${content}`.toLowerCase();
      
      // Check if any search term is found
      const matchedTerms = searchTerms.filter(term => 
        fullText.includes(term.toLowerCase())
      );
      
      if (matchedTerms.length > 0) {
        foundCount++;
        console.log(`📢 Announcement #${foundCount}:`);
        console.log(`   ID: ${announcement._id}`);
        console.log(`   Title: "${announcement.title}"`);
        console.log(`   Type: ${announcement.type || 'N/A'}`);
        console.log(`   Created: ${announcement.createdAt}`);
        console.log(`   Matched terms: ${matchedTerms.join(', ')}`);
        
        if (announcement.content) {
          const preview = announcement.content.substring(0, 200);
          console.log(`   Content preview: "${preview}${announcement.content.length > 200 ? '...' : ''}"`);
        }
        console.log('');
      }
    }

    console.log("🔔 NOTIFICATIONS:");
    console.log("=".repeat(50));
    
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    console.log(`Total notifications: ${notifications.length}\n`);

    let notificationFoundCount = 0;
    
    for (const notification of notifications) {
      const title = notification.title || '';
      const message = notification.message || '';
      const fullText = `${title} ${message}`.toLowerCase();
      
      // Check if any search term is found
      const matchedTerms = searchTerms.filter(term => 
        fullText.includes(term.toLowerCase())
      );
      
      if (matchedTerms.length > 0) {
        notificationFoundCount++;
        console.log(`🔔 Notification #${notificationFoundCount}:`);
        console.log(`   ID: ${notification._id}`);
        console.log(`   Title: "${notification.title}"`);
        console.log(`   Type: ${notification.type || 'N/A'}`);
        console.log(`   Created: ${notification.createdAt}`);
        console.log(`   Matched terms: ${matchedTerms.join(', ')}`);
        
        if (notification.message) {
          const preview = notification.message.substring(0, 200);
          console.log(`   Message preview: "${preview}${notification.message.length > 200 ? '...' : ''}"`);
        }
        console.log('');
      }
    }

    console.log("📊 SEARCH SUMMARY:");
    console.log("=".repeat(50));
    console.log(`📢 Announcements found: ${foundCount}`);
    console.log(`🔔 Notifications found: ${notificationFoundCount}`);
    console.log(`🔍 Search terms used: ${searchTerms.join(', ')}`);

    if (foundCount === 0 && notificationFoundCount === 0) {
      console.log("\n💡 No items found with the search terms.");
      console.log("The text might be:");
      console.log("   • In a different collection");
      console.log("   • Already been corrected");
      console.log("   • Stored with different wording");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error searching announcements:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Run the script
searchAnnouncements();