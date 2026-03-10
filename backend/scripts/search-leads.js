import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Lead from "../src/models/leadModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const searchLeads = async () => {
  try {
    console.log("🔍 Searching for leads with 'Vinit' or 'Saraf'...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Search for leads
    const leads = await Lead.find({
      $or: [
        { fullName: /vinit/i },
        { fullName: /saraf/i },
        { email: /vinit/i },
        { email: /saraf/i },
      ]
    }).select('fullName email phone companyName status');

    if (leads.length === 0) {
      console.log("❌ No leads found matching 'Vinit' or 'Saraf'");
      console.log("\nSearching for all leads...\n");
      
      const allLeads = await Lead.find().select('fullName email phone').limit(10);
      console.log(`Found ${allLeads.length} leads (showing first 10):`);
      allLeads.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.fullName} - ${lead.email || 'No email'} - ${lead.phone}`);
      });
    } else {
      console.log(`✅ Found ${leads.length} matching lead(s):\n`);
      leads.forEach((lead, index) => {
        console.log(`${index + 1}. Name: ${lead.fullName}`);
        console.log(`   Email: ${lead.email || 'N/A'}`);
        console.log(`   Phone: ${lead.phone}`);
        console.log(`   Company: ${lead.companyName || 'N/A'}`);
        console.log(`   Status: ${lead.status}`);
        console.log(`   ID: ${lead._id}\n`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

searchLeads();
