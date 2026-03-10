import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Lead from "../src/models/leadModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const searchRoshalLead = async () => {
  try {
    console.log("🔍 Searching for leads with 'Roshal'...\n");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const leads = await Lead.find({
      $or: [
        { fullName: /roshal/i },
        { fullName: /agarwal/i },
      ]
    }).select('fullName email phone meetings');

    if (leads.length === 0) {
      console.log("❌ No leads found matching 'Roshal' or 'Agarwal'");
    } else {
      console.log(`✅ Found ${leads.length} matching lead(s):\n`);
      leads.forEach((lead, index) => {
        console.log(`${index + 1}. Name: ${lead.fullName}`);
        console.log(`   Email: ${lead.email || 'N/A'}`);
        console.log(`   Phone: ${lead.phone}`);
        console.log(`   Meetings: ${lead.meetings?.length || 0}`);
        console.log(`   ID: ${lead._id}\n`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

searchRoshalLead();
