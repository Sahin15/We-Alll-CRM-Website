import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import User from '../src/models/userModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const checkBirthdays = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('name email dateOfBirth role').lean();
    
    console.log(`📊 Total users: ${users.length}\n`);
    
    // Check users with dateOfBirth
    const usersWithDOB = users.filter(u => u.dateOfBirth);
    console.log(`✅ Users with dateOfBirth: ${usersWithDOB.length}`);
    console.log(`❌ Users without dateOfBirth: ${users.length - usersWithDOB.length}\n`);
    
    if (usersWithDOB.length === 0) {
      console.log('⚠️  NO USERS HAVE DATE OF BIRTH SET!');
      console.log('This is why birthdays are not showing.\n');
      
      console.log('Sample users without DOB:');
      users.slice(0, 5).forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
      
      await mongoose.disconnect();
      return;
    }
    
    // Show users with birthdays
    console.log('📅 Users with Date of Birth:');
    console.log('─'.repeat(80));
    
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    usersWithDOB.forEach(user => {
      const dob = new Date(user.dateOfBirth);
      const dobMonth = dob.getMonth();
      const dobDate = dob.getDate();
      
      // Calculate this year's birthday
      const thisYearBirthday = new Date(today.getFullYear(), dobMonth, dobDate);
      let birthdayToCheck = thisYearBirthday;
      
      if (thisYearBirthday < today) {
        birthdayToCheck = new Date(today.getFullYear() + 1, dobMonth, dobDate);
      }
      
      // Calculate days until
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const birthdayMidnight = new Date(birthdayToCheck.getFullYear(), birthdayToCheck.getMonth(), birthdayToCheck.getDate());
      const daysUntil = Math.ceil((birthdayMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      
      const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
      const marker = isUpcoming ? '🎂' : '  ';
      
      console.log(`${marker} ${user.name.padEnd(25)} | DOB: ${dob.toDateString().padEnd(20)} | Birthday: ${birthdayToCheck.toDateString().padEnd(20)} | Days: ${daysUntil.toString().padStart(3)}`);
    });
    
    console.log('─'.repeat(80));
    
    // Show upcoming birthdays (next 7 days)
    const upcomingBirthdays = usersWithDOB.filter(user => {
      const dob = new Date(user.dateOfBirth);
      const dobMonth = dob.getMonth();
      const dobDate = dob.getDate();
      
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const thisYearBirthday = new Date(today.getFullYear(), dobMonth, dobDate);
      
      let birthdayToCheck = thisYearBirthday;
      if (thisYearBirthday < todayMidnight) {
        birthdayToCheck = new Date(today.getFullYear() + 1, dobMonth, dobDate);
      }
      
      const sevenDaysLater = new Date(todayMidnight.getTime() + 7 * 24 * 60 * 60 * 1000);
      const birthdayMidnight = new Date(birthdayToCheck.getFullYear(), birthdayToCheck.getMonth(), birthdayToCheck.getDate());
      
      return birthdayMidnight >= todayMidnight && birthdayMidnight <= sevenDaysLater;
    });
    
    console.log(`\n🎂 Upcoming Birthdays (Next 7 Days): ${upcomingBirthdays.length}`);
    
    if (upcomingBirthdays.length > 0) {
      console.log('─'.repeat(80));
      upcomingBirthdays.forEach(user => {
        const dob = new Date(user.dateOfBirth);
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const thisYearBirthday = new Date(today.getFullYear(), dobMonth, dobDate);
        
        let birthdayToCheck = thisYearBirthday;
        if (thisYearBirthday < todayMidnight) {
          birthdayToCheck = new Date(today.getFullYear() + 1, dobMonth, dobDate);
        }
        
        const birthdayMidnight = new Date(birthdayToCheck.getFullYear(), birthdayToCheck.getMonth(), birthdayToCheck.getDate());
        const daysUntil = Math.ceil((birthdayMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        
        console.log(`  🎉 ${user.name} - ${birthdayToCheck.toDateString()} (${daysUntil} days)`);
      });
      console.log('─'.repeat(80));
    } else {
      console.log('  No birthdays in the next 7 days.');
    }
    
    // Check for February birthdays specifically
    console.log('\n📅 February Birthdays:');
    const februaryBirthdays = usersWithDOB.filter(user => {
      const dob = new Date(user.dateOfBirth);
      return dob.getMonth() === 1; // February is month 1 (0-indexed)
    });
    
    if (februaryBirthdays.length > 0) {
      console.log('─'.repeat(80));
      februaryBirthdays.forEach(user => {
        const dob = new Date(user.dateOfBirth);
        console.log(`  ${user.name} - February ${dob.getDate()}`);
      });
      console.log('─'.repeat(80));
    } else {
      console.log('  No February birthdays found.');
    }
    
    console.log('\n✅ Check complete!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkBirthdays();
