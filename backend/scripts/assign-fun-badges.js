import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

dotenv.config();

const assignFunBadges = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const funBadges = ["Team Member", "Contributor", "Team Player", "Rockstar", "Rising Star", "Go-Getter"];

    // Find all employees without a fun badge
    const employees = await User.find({ 
      role: 'employee',
      $or: [
        { funBadge: { $exists: false } },
        { funBadge: null }
      ]
    });

    console.log(`Found ${employees.length} employees without fun badges`);

    for (const employee of employees) {
      const randomBadge = funBadges[Math.floor(Math.random() * funBadges.length)];
      employee.funBadge = randomBadge;
      await employee.save();
      console.log(`✓ Assigned "${randomBadge}" to ${employee.name}`);
    }

    console.log('\n✅ Fun badges assigned successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error assigning fun badges:', error);
    process.exit(1);
  }
};

assignFunBadges();
