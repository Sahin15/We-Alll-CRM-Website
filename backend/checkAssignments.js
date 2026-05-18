import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AssetAssignment from './src/models/assetAssignmentModel.js';

dotenv.config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const count = await AssetAssignment.countDocuments({
      status: 'active',
      assignedDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });
    
    const docs = await AssetAssignment.find({
      status: 'active',
      assignedDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });

    console.log(`Overdue assignments found: ${count}`);
    console.log(JSON.stringify(docs, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkData();
