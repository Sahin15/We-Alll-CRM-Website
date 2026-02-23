import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Import User model
import User from '../src/models/userModel.js';

const assignManagerRole = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Rahul Shaw
    const user = await User.findOne({ name: /Rahul Shaw/i });

    if (!user) {
      console.log('❌ User "Rahul Shaw" not found');
      console.log('\nSearching for similar names...');
      
      const similarUsers = await User.find({ 
        name: { $regex: 'rahul', $options: 'i' } 
      }).select('name email role');
      
      if (similarUsers.length > 0) {
        console.log('\nFound users with "Rahul" in name:');
        similarUsers.forEach(u => {
          console.log(`  - ${u.name} (${u.email}) - Current role: ${u.role}`);
        });
      } else {
        console.log('No users found with "Rahul" in name');
      }
      
      process.exit(0);
    }

    console.log('📋 User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log('');

    // Update role to manager
    user.role = 'manager';
    await user.save();

    console.log('✅ Successfully updated role to "manager"');
    console.log('');
    console.log('📊 Updated user details:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New Role: ${user.role}`);
    console.log('');
    console.log('🔐 User now has access to:');
    console.log('   ✓ View all leads');
    console.log('   ✓ Create leads');
    console.log('   ✓ Update leads');
    console.log('   ✓ Add notes to leads');
    console.log('   ✓ Schedule follow-ups');
    console.log('   ✓ View clients');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

assignManagerRole();
