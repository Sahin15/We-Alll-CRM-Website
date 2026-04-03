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
    

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find the lead
    const lead = await Lead.findOne({ 
      fullName: /Vinit.*Saraf/i 
    });

    if (!lead) {
      
      process.exit(1);
    }

    
    
    
    
    
    
    
    
    
    

    // Delete the lead
    await Lead.findByIdAndDelete(lead._id);

    
    
    
    

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

deleteLeadVinitSaraf();
