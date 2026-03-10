import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Lead from "../src/models/leadModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const deleteLeadVinitSaraf = async () => {
  try {
    console.log("🔧 Deleting lead: Vinit Saraf...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find the lead
    const lead = await Lead.findOne({ 
      fullName: /Vinit.*Saraf/i 
    });

    if (!lead) {
      console.log("❌ Lead 'Vinit Saraf' not found");
      process.exit(1);
    }

    console.log(`✅ Found lead:`);
    console.log(`   Name: ${lead.fullName}`);
    console.log(`   Email: ${lead.email || 'N/A'}`);
    console.log(`   Phone: ${lead.phone}`);
    console.log(`   Company: ${lead.companyName || 'N/A'}`);
    console.log(`   Status: ${lead.status}`);
    console.log(`   ID: ${lead._id}`);
    console.log(`   Meetings: ${lead.meetings?.length || 0}`);
    console.log(`   Follow-ups: ${lead.followUps?.length || 0}`);
    console.log(`   History entries: ${lead.history?.length || 0}\n`);

    // Delete the lead
    await Lead.findByIdAndDelete(lead._id);

    console.log("✅ Successfully deleted lead: Vinit Saraf");
    console.log("\n📋 Summary:");
    console.log(`   - Lead deleted: ${lead.fullName}`);
    console.log(`   - All associated meetings, follow-ups, and history removed`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

deleteLeadVinitSaraf();
