import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Lead from "../src/models/leadModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const deleteRoshalTestMeetings = async () => {
  try {
    console.log("🔧 Deleting test meetings for Roshan Lal Agarwal...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Roshan Lal Agarwal
    const lead = await Lead.findOne({ 
      fullName: /Roshan.*Lal.*Agarwal/i 
    });

    if (!lead) {
      console.log("❌ Lead 'Roshan Lal Agarwal' not found");
      process.exit(1);
    }

    console.log(`✅ Found lead: ${lead.fullName}`);
    console.log(`   Total meetings: ${lead.meetings?.length || 0}\n`);

    if (!lead.meetings || lead.meetings.length === 0) {
      console.log("❌ No meetings found for this lead");
      process.exit(1);
    }

    // Show all meetings
    console.log("Current meetings:");
    lead.meetings.forEach((meeting, index) => {
      console.log(`\n${index + 1}. ${meeting.title}`);
      console.log(`   Date: ${new Date(meeting.scheduledDate).toLocaleString()}`);
      console.log(`   Type: ${meeting.meetingType}`);
      console.log(`   Status: ${meeting.status}`);
    });

    // Delete all meetings (assuming all 3 are test meetings)
    const meetingsCount = lead.meetings.length;
    lead.meetings = [];
    
    // Also remove meeting-related history entries
    lead.history = lead.history.filter(h => 
      !h.actionType.includes('Meeting')
    );

    await lead.save();

    console.log(`\n✅ Successfully deleted ${meetingsCount} meeting(s) for ${lead.fullName}`);
    console.log(`   Remaining meetings: ${lead.meetings.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

deleteRoshalTestMeetings();
