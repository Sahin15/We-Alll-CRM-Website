import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import jwt from 'jsonwebtoken';

dotenv.config({ path: './backend/.env' });

const testHoDAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a HoD user
    const hodUser = await User.findOne({ isHeadOfDepartment: true });
    
    if (!hodUser) {
      console.log('❌ No HoD user found');
      process.exit(1);
    }

    console.log(`👤 Testing with HoD: ${hodUser.name}`);
    console.log(`   Email: ${hodUser.email}`);
    console.log(`   Department ID: ${hodUser.headOfDepartment}\n`);

    // Generate a JWT token for this user
    const token = jwt.sign(
      { id: hodUser._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const API_URL = 'http://localhost:5000/api';
    const headers = { Authorization: `Bearer ${token}` };

    console.log('🧪 Testing HoD API endpoints...\n');

    // Test 1: Get Department Stats
    try {
      console.log('1️⃣ Testing GET /departments/:id/stats');
      const statsRes = await axios.get(
        `${API_URL}/departments/${hodUser.headOfDepartment}/stats`,
        { headers }
      );
      console.log('   ✅ Success:', statsRes.data.success);
      console.log('   📊 Stats:', JSON.stringify(statsRes.data.data, null, 2));
    } catch (error) {
      console.log('   ❌ Failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('');

    // Test 2: Get Department Projects
    try {
      console.log('2️⃣ Testing GET /departments/:id/projects');
      const projectsRes = await axios.get(
        `${API_URL}/departments/${hodUser.headOfDepartment}/projects`,
        { headers }
      );
      console.log('   ✅ Success:', projectsRes.data.success);
      console.log('   📁 Projects count:', projectsRes.data.data.totalProjects);
    } catch (error) {
      console.log('   ❌ Failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('');

    // Test 3: Get Department Members
    try {
      console.log('3️⃣ Testing GET /departments/:id/members');
      const membersRes = await axios.get(
        `${API_URL}/departments/${hodUser.headOfDepartment}/members`,
        { headers }
      );
      console.log('   ✅ Success:', membersRes.data.success);
      console.log('   👥 Members count:', membersRes.data.data.totalMembers);
    } catch (error) {
      console.log('   ❌ Failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n✅ Test complete');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testHoDAPI();
