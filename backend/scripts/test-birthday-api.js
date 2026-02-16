import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function testBirthdayAPI() {
  try {
    console.log('🔍 Testing Birthday API...\n');

    // Login as admin to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/users/login`, {
      email: 'amit@wealll.com',
      password: 'Admin@123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Fetch all users
    console.log('2. Fetching all users...');
    const usersResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = usersResponse.data;
    console.log(`✅ Fetched ${users.length} users\n`);

    // Check for dateOfBirth field
    console.log('3. Checking dateOfBirth field...');
    const usersWithDOB = users.filter(u => u.dateOfBirth);
    const usersWithoutDOB = users.filter(u => !u.dateOfBirth);

    console.log(`📊 Users with dateOfBirth: ${usersWithDOB.length}`);
    console.log(`📊 Users without dateOfBirth: ${usersWithoutDOB.length}\n`);

    if (usersWithDOB.length > 0) {
      console.log('✅ SUCCESS! dateOfBirth field is being returned!\n');
      console.log('Sample users with birthdays:');
      usersWithDOB.slice(0, 5).forEach(user => {
        const dob = new Date(user.dateOfBirth);
        console.log(`  - ${user.name}: ${dob.toDateString()}`);
      });

      // Check for Sahin Mondal specifically
      console.log('\n4. Looking for Sahin Mondal...');
      const sahin = users.find(u => u.name === 'Sahin Mondal' || u.name.includes('Sahin'));
      console.log('Found:', sahin ? sahin.name : 'NOT FOUND');
      
      if (sahin) {
        console.log('\n🎂 Sahin Mondal found:');
        console.log(`   Name: ${sahin.name}`);
        console.log(`   Email: ${sahin.email}`);
        console.log(`   DOB: ${sahin.dateOfBirth ? new Date(sahin.dateOfBirth).toDateString() : 'NOT FOUND'}`);
        
        if (sahin.dateOfBirth) {
          const dob = new Date(sahin.dateOfBirth);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          nextBirthday.setHours(0, 0, 0, 0);
          
          if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
          }
          
          const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
          console.log(`   Today: ${today.toDateString()}`);
          console.log(`   Next birthday: ${nextBirthday.toDateString()}`);
          console.log(`   Days until birthday: ${daysUntil}`);
          console.log(`   Within 7 days? ${daysUntil <= 7 ? '✅ YES' : '❌ NO'}`);
        }
      }
    } else {
      console.log('❌ FAILED! dateOfBirth field is NOT being returned!');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBirthdayAPI();
