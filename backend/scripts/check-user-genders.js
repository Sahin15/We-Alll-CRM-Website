/**
 * Check User Gender Fields
 * Displays gender distribution in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

dotenv.config();

const checkUserGenders = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all employees
    const employees = await User.find({
      role: { $in: ['employee', 'hr', 'hod', 'manager'] }
    }).select('name email gender role');

    console.log(`Total employees: ${employees.length}\n`);

    // Count genders
    const genderCount = {
      male: 0,
      female: 0,
      other: 0,
      'prefer-not-to-say': 0,
      null: 0,
      undefined: 0
    };

    employees.forEach(emp => {
      if (emp.gender === null) {
        genderCount.null++;
      } else if (emp.gender === undefined || emp.gender === '') {
        genderCount.undefined++;
      } else {
        const gender = emp.gender.toLowerCase();
        if (genderCount.hasOwnProperty(gender)) {
          genderCount[gender]++;
        } else {
          console.log(`Unknown gender value: "${emp.gender}" for ${emp.name}`);
        }
      }
    });

    console.log('Gender Distribution:');
    console.log('-------------------');
    console.log(`Male: ${genderCount.male}`);
    console.log(`Female: ${genderCount.female}`);
    console.log(`Other: ${genderCount.other}`);
    console.log(`Prefer not to say: ${genderCount['prefer-not-to-say']}`);
    console.log(`Null: ${genderCount.null}`);
    console.log(`Undefined/Empty: ${genderCount.undefined}`);

    const totalWithGender = genderCount.male + genderCount.female + genderCount.other + genderCount['prefer-not-to-say'];
    const totalWithoutGender = genderCount.null + genderCount.undefined;

    console.log('\nSummary:');
    console.log('--------');
    console.log(`Employees with gender set: ${totalWithGender}`);
    console.log(`Employees without gender: ${totalWithoutGender}`);

    if (totalWithoutGender > 0) {
      console.log('\n⚠️  Warning: Some employees do not have gender field set.');
      console.log('This will cause gender diversity to show 0%.');
      console.log('\nTo fix: Update employee profiles to include gender information.');
    }

    // Show sample employees without gender
    if (totalWithoutGender > 0) {
      console.log('\nSample employees without gender (first 5):');
      const withoutGender = employees.filter(e => !e.gender || e.gender === null);
      withoutGender.slice(0, 5).forEach(emp => {
        console.log(`- ${emp.name} (${emp.email}) - Role: ${emp.role}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUserGenders();
