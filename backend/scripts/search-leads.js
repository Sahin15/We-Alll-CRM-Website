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
    

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

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
      
      
      
      const allLeads = await Lead.find().select('fullName email phone').limit(10);
      :`);
      allLeads.forEach((lead, index) => {
        
      });
    } else {
      :\n`);
      leads.forEach((lead, index) => {
        
        
        
        
        
        
      });
    }

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

searchLeads();
