import mongoose from 'mongoose';
import Holiday from '../models/holidayModel.js';
import User from '../models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleHolidays = [
  {
    name: "New Year's Day",
    date: new Date('2026-01-01'),
    type: 'public',
    description: 'Celebration of the new year',
    isOptional: false
  },
  {
    name: "Republic Day",
    date: new Date('2026-01-26'),
    type: 'national',
    description: 'Indian Republic Day',
    isOptional: false
  },
  {
    name: "Holi",
    date: new Date('2026-03-05'),
    type: 'religious',
    description: 'Festival of Colors',
    isOptional: true
  },
  {
    name: "Good Friday",
    date: new Date('2026-04-03'),
    type: 'religious',
    description: 'Christian holiday',
    isOptional: true
  },
  {
    name: "Independence Day",
    date: new Date('2026-08-15'),
    type: 'national',
    description: 'Indian Independence Day',
    isOptional: false
  },
  {
    name: "Gandhi Jayanti",
    date: new Date('2026-10-02'),
    type: 'national',
    description: 'Birthday of Mahatma Gandhi',
    isOptional: false
  },
  {
    name: "Diwali",
    date: new Date('2026-11-08'),
    type: 'religious',
    description: 'Festival of Lights',
    isOptional: false
  },
  {
    name: "Christmas Day",
    date: new Date('2026-12-25'),
    type: 'religious',
    description: 'Christian holiday celebrating the birth of Jesus Christ',
    isOptional: false
  },
  {
    name: "Company Foundation Day",
    date: new Date('2026-06-15'),
    type: 'company',
    description: 'Anniversary of company establishment',
    isOptional: false
  }
];

const createSampleHolidays = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Find an admin user to assign as creator
    const adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin', 'hr'] } });
    
    if (!adminUser) {
      
      process.exit(1);
    }

    // Clear existing holidays
    await Holiday.deleteMany({});
    

    // Create sample holidays
    const holidaysWithCreator = sampleHolidays.map(holiday => ({
      ...holiday,
      createdBy: adminUser._id
    }));

    const createdHolidays = await Holiday.insertMany(holidaysWithCreator);
    
    
    createdHolidays.forEach(holiday => {
      }) - ${holiday.type}`);
    });

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

createSampleHolidays();