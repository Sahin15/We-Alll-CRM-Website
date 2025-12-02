import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const fixHoDRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all users who are HoDs but have role='employee'
    const hods = await User.find({
      isHeadOfDepartment: true,
      role: 'employee'
    });
    
    console.log(`Found ${hods.length} HoDs with role='employee'\n`);
    
    for (const hod of hods) {
      console.log(`Updating ${hod.name} (${hod.email})`);
      hod.role = 'hod';
      await hod.save();
    }
    
    console.log(`\n✅ Updated ${hods.length} users to role='hod'`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixHoDRoles();
