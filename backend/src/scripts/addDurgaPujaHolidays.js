import mongoose from 'mongoose';
import Holiday from '../models/holidayModel.js';
import User from '../models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const durgaPujaHolidays = [
  {
    name: "Durga Puja - Day 1 (Shashthi)",
    date: new Date('2026-10-16'),
    type: 'religious',
    description: 'First day of Durga Puja festival'
  },
  {
    name: "Durga Puja - Day 2 (Saptami)",
    date: new Date('2026-10-17'),
    type: 'religious',
    description: 'Second day of Durga Puja festival'
  },
  {
    name: "Durga Puja - Day 3 (Ashtami)",
    date: new Date('2026-10-18'),
    type: 'religious',
    description: 'Third day of Durga Puja festival - Ashtami'
  },
  {
    name: "Durga Puja - Day 4 (Navami)",
    date: new Date('2026-10-19'),
    type: 'religious',
    description: 'Fourth day of Durga Puja festival - Navami'
  },
  {
    name: "Durga Puja - Day 5 (Dashami)",
    date: new Date('2026-10-20'),
    type: 'religious',
    description: 'Fifth day of Durga Puja festival - Dashami'
  },
  {
    name: "Durga Puja - Day 6 (Ekadashi)",
    date: new Date('2026-10-21'),
    type: 'religious',
    description: 'Sixth day of Durga Puja festival'
  },
  {
    name: "Durga Puja - Day 7 (Dwadashi)",
    date: new Date('2026-10-22'),
    type: 'religious',
    description: 'Seventh day of Durga Puja festival'
  }
];

const addDurgaPujaHolidays = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find an admin user to assign as creator
    const adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin', 'hr'] } });
    
    if (!adminUser) {
      console.log('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Check if Durga Puja holidays already exist
    const existingHolidays = await Holiday.find({
      name: { $regex: /Durga Puja/i },
      date: {
        $gte: new Date('2026-10-16'),
        $lte: new Date('2026-10-22')
      }
    });

    if (existingHolidays.length > 0) {
      console.log('Durga Puja holidays already exist. Removing existing ones first...');
      await Holiday.deleteMany({
        name: { $regex: /Durga Puja/i },
        date: {
          $gte: new Date('2026-10-16'),
          $lte: new Date('2026-10-22')
        }
      });
      console.log('Existing Durga Puja holidays removed.');
    }

    // Create Durga Puja holidays
    const holidaysWithCreator = durgaPujaHolidays.map(holiday => ({
      ...holiday,
      isOptional: false,
      createdBy: adminUser._id
    }));

    const createdHolidays = await Holiday.insertMany(holidaysWithCreator);
    console.log(`\n✅ Created ${createdHolidays.length} Durga Puja holidays:`);
    
    createdHolidays.forEach(holiday => {
      const dayName = holiday.date.toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`- ${holiday.name} (${holiday.date.toDateString()} - ${dayName})`);
    });

    console.log('\n🎉 Durga Puja holidays added successfully!');
    console.log('📅 Holiday period: October 16-22, 2026 (7 consecutive days)');
    process.exit(0);
  } catch (error) {
    console.error('Error adding Durga Puja holidays:', error);
    process.exit(1);
  }
};

addDurgaPujaHolidays();