import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Define User schema first
const User = mongoose.model('User', new mongoose.Schema({ 
  name: String, 
  email: String 
}));

// Import the actual Attendance model
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔍 COMPREHENSIVE HISTORICAL DATA VERIFICATION');
    console.log('='.repeat(80));
    console.log('Checking if timezone changes affected existing attendance records...\n');
    
    // Get date range for last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`📅 Checking records from: ${thirtyDaysAgo.toLocaleDateString('en-IN')} to ${today.toLocaleDateString('en-IN')}\n`);
    
    // Fetch all attendance records from last 30 days
    const records = await Attendance.find({
      date: { $gte: thirtyDaysAgo }
    }).populate('employee', 'name email').sort({ date: -1, clockIn: 1 });
    
    console.log(`📊 Found ${records.length} attendance records in last 30 days\n`);
    
    if (records.length === 0) {
      console.log('⚠️  No records found to verify');
      return;
    }
    
    // Verification checks
    let totalRecords = 0;
    let correctStatuses = 0;
    let incorrectStatuses = 0;
    let issuesFound = [];
    
    // Group by date for better reporting
    const recordsByDate = {};
    
    for (const record of records) {
      totalRecords++;
      
      const dateKey = new Date(record.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      if (!recordsByDate[dateKey]) {
        recordsByDate[dateKey] = {
          date: dateKey,
          total: 0,
          correct: 0,
          incorrect: 0,
          issues: []
        };
      }
      recordsByDate[dateKey].total++;
      
      // Calculate what status SHOULD be based on clock-in time
      const calculatedStatus = record.calculateStatus();
      const currentStatus = record.status;
      
      if (calculatedStatus === currentStatus) {
        correctStatuses++;
        recordsByDate[dateKey].correct++;
      } else {
        incorrectStatuses++;
        recordsByDate[dateKey].incorrect++;
        
        const clockInIST = new Date(record.clockIn).toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const issue = {
          employee: record.employee?.name || 'Unknown',
          email: record.employee?.email || 'N/A',
          date: dateKey,
          clockIn: clockInIST,
          currentStatus: currentStatus,
          shouldBe: calculatedStatus,
          recordId: record._id
        };
        
        issuesFound.push(issue);
        recordsByDate[dateKey].issues.push(issue);
      }
    }
    
    // Print summary by date
    console.log('📋 DAILY SUMMARY:');
    console.log('-'.repeat(80));
    
    const dates = Object.keys(recordsByDate).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateB - dateA;
    });
    
    for (const dateKey of dates) {
      const day = recordsByDate[dateKey];
      const status = day.incorrect === 0 ? '✅' : '❌';
      console.log(`${status} ${day.date}: ${day.total} records (${day.correct} correct, ${day.incorrect} incorrect)`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 OVERALL SUMMARY:');
    console.log(`   Total Records: ${totalRecords}`);
    console.log(`   ✅ Correct: ${correctStatuses} (${((correctStatuses/totalRecords)*100).toFixed(1)}%)`);
    console.log(`   ❌ Incorrect: ${incorrectStatuses} (${((incorrectStatuses/totalRecords)*100).toFixed(1)}%)`);
    
    if (incorrectStatuses === 0) {
      console.log('\n✅ VERIFICATION PASSED!');
      console.log('   All historical attendance records have correct status.');
      console.log('   Timezone changes did NOT affect existing data.');
    } else {
      console.log(`\n⚠️  FOUND ${incorrectStatuses} RECORDS WITH INCORRECT STATUS:`);
      console.log('-'.repeat(80));
      
      for (const issue of issuesFound) {
        console.log(`\n❌ Issue Found:`);
        console.log(`   Employee: ${issue.employee} (${issue.email})`);
        console.log(`   Date: ${issue.date}`);
        console.log(`   Clock-in: ${issue.clockIn} IST`);
        console.log(`   Current Status: ${issue.currentStatus}`);
        console.log(`   Should Be: ${issue.shouldBe}`);
        console.log(`   Record ID: ${issue.recordId}`);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('\n🔧 TO FIX THESE ISSUES:');
      console.log('   Run: node backend/scripts/fix-all-attendance-statuses.js');
    }
    
    // Check for timezone-related anomalies
    console.log('\n' + '='.repeat(80));
    console.log('\n🕐 TIMEZONE ANOMALY CHECK:');
    console.log('-'.repeat(80));
    
    let anomalies = 0;
    
    for (const record of records) {
      // Check if clock-in date matches record date
      const clockInDate = clockInUTC.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const recordDate = dateUTC.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      
      if (clockInDate !== recordDate) {
        anomalies++;
        console.log(`⚠️  Date Mismatch:`);
        console.log(`   Employee: ${record.employee?.name || 'Unknown'}`);
        console.log(`   Record Date: ${recordDate}`);
        console.log(`   Clock-in Date: ${clockInDate}`);
        console.log(`   This might indicate a timezone issue\n`);
      }
    }
    
    if (anomalies === 0) {
      console.log('✅ No timezone anomalies found');
      console.log('   All clock-in times match their record dates');
    } else {
      console.log(`\n⚠️  Found ${anomalies} potential timezone anomalies`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ VERIFICATION COMPLETE');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
