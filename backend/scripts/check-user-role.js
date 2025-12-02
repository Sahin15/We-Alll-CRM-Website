import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

dotenv.config({ path: './backend/.env' });

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const user = await User.findOne({ email: 'sahinmondal.wealll@gmail.com' });
    
    console.log('User:', {
      name: user.name,
      email: user.email,
      role: user.role,
      isHeadOfDepartment: user.isHeadOfDepartment,
      headOfDepartment: user.headOfDepartment
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUser();
