import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const checkManagerRole = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('❌ MongoDB URI not found in environment variables');
      return;
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find Rahul Shaw (manager)
    const manager = await User.findOne({ 
      $or: [
        { name: /rahul.*shaw/i },
        { email: /rahul/i },
        { role: 'manager' }
      ]
    }).populate('department');

    if (!manager) {
      console.log('❌ Manager user not found');
      console.log('\nSearching for all users with "rahul" in name or email:');
      const users = await User.find({
        $or: [
          { name: /rahul/i },
          { email: /rahul/i }
        ]
      }).select('name email role department');
      console.log(users);
      return;
    }

    console.log('\n📊 Manager User Details:');
    console.log('Name:', manager.name);
    console.log('Email:', manager.email);
    console.log('Role:', manager.role);
    console.log('Department:', manager.department?.name || 'No department assigned');
    console.log('Department ID:', manager.department?._id || 'N/A');
    console.log('User ID:', manager._id);

    // Check if role is exactly 'manager'
    if (manager.role !== 'manager') {
      console.log('\n⚠️  WARNING: Role is not "manager"');
      console.log('Current role:', manager.role);
      console.log('Expected role: manager');
      
      console.log('\n🔧 Updating role to "manager"...');
      manager.role = 'manager';
      await manager.save();
      console.log('✅ Role updated successfully');
    } else {
      console.log('\n✅ Role is correctly set to "manager"');
    }

    // List all users with manager role
    console.log('\n📋 All users with manager role:');
    const allManagers = await User.find({ role: 'manager' })
      .select('name email department')
      .populate('department', 'name');
    
    if (allManagers.length === 0) {
      console.log('No users with manager role found');
    } else {
      allManagers.forEach(m => {
        console.log(`- ${m.name} (${m.email}) - Dept: ${m.department?.name || 'None'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkManagerRole();
