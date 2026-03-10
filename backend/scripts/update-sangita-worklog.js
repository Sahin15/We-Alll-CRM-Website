import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import WorkLog from "../src/models/workLogModel.js";
import User from "../src/models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const updateSangitaWorkLog = async () => {
  try {
    console.log("🔧 Updating Sangita's work log for March 7, 2026...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Sangita
    const sangita = await User.findOne({ 
      name: /Sangita/i 
    });

    if (!sangita) {
      console.log("❌ User 'Sangita' not found");
      process.exit(1);
    }

    console.log(`✅ Found user: ${sangita.name} (${sangita.email})\n`);

    // Find work log for March 7, 2026
    const targetDate = new Date('2026-03-07');
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const workLog = await WorkLog.findOne({
      employee: sangita._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!workLog) {
      console.log("❌ Work log not found for March 7, 2026");
      process.exit(1);
    }

    console.log(`✅ Found work log:`);
    console.log(`   Date: ${workLog.date.toDateString()}`);
    console.log(`   Status: ${workLog.status}`);
    console.log(`   Current work log: ${workLog.workLog}\n`);

    // Update work log
    const oldWorkLog = workLog.workLog;
    const newWorkLog = "Karma post 3, womens day post Thank you post (Fragrascent)";

    workLog.workLog = newWorkLog;
    
    // Add to edit history
    workLog.editHistory.push({
      editedBy: sangita._id,
      editedAt: new Date(),
      changes: {
        oldWorkLog,
        newWorkLog
      },
      reason: "Admin updated work log via script"
    });

    await workLog.save();

    console.log("✅ Work log updated successfully!");
    console.log(`   New work log: ${newWorkLog}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

updateSangitaWorkLog();
