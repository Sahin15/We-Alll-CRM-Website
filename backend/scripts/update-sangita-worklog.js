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
    

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Sangita
    const sangita = await User.findOne({ 
      name: /Sangita/i 
    });

    if (!sangita) {
      
      process.exit(1);
    }

    \n`);

    // Find work log for March 7, 2026
    const targetDate = new Date('2026-03-07');
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const workLog = await WorkLog.findOne({
      employee: sangita._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!workLog) {
      
      process.exit(1);
    }

    
    }`);
    
    

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

    
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

updateSangitaWorkLog();
