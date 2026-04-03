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
    

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find Roshan Lal Agarwal
    const lead = await Lead.findOne({ 
      fullName: /Roshan.*Lal.*Agarwal/i 
    });

    if (!lead) {
      
      process.exit(1);
    }

    
    

    if (!lead.meetings || lead.meetings.length === 0) {
      
      process.exit(1);
    }

    // Show all meetings
    
    lead.meetings.forEach((meeting, index) => {
      
      .toLocaleString()}`);
      
      
    });

    // Delete all meetings (assuming all 3 are test meetings)
    const meetingsCount = lead.meetings.length;
    lead.meetings = [];
    
    // Also remove meeting-related history entries
    lead.history = lead.history.filter(h => 
      !h.actionType.includes('Meeting')
    );

    await lead.save();

     for ${lead.fullName}`);
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

deleteRoshalTestMeetings();
