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
    

    await mongoose.connect(process.env.MONGO_URI);
    

    const leads = await Lead.find({
      $or: [
        { fullName: /roshal/i },
        { fullName: /agarwal/i },
      ]
    }).select('fullName email phone meetings');

    if (leads.length === 0) {
      
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

searchRoshalLead();
