import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTodayRangeIST } from '../src/utils/timezone.js';
import { buildDateRangeQuery } from '../src/utils/queryOptimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
Promise.all([
  import('../src/models/attendanceModel.js'),
  import('../src/models/userModel.js')
]).then(async ([{ default: Attendance }, { default: User }]) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔍 TESTING DATE QUERY FIX');
    console.log('='.repeat(80));
    
    // Get today's date in IST as YYYY-MM-DD
    const now = new Date();
    const todayIST = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    console.log('📅 Today\'s Date (IST):', todayIST);
    console.log('');
    
    // Test 1: Using getTodayRangeIST (correct method)
    console.log('TEST 1: Using getTodayRangeIST()');
    console.log('-'.repeat(80));
    const { start, end } = getTodayRangeIST();
    console.log('Start:', start.toISOString(), '(', start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    console.log('End:', end.toISOString(), '(', end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    
    const correctRecords = await Attendance.find({
      date: { $gte: start, $lt: end }
    }).populate('employee', 'name').lean();
    
    console.log(`Found ${correctRecords.length} records`);
    if (correctRecords.length > 0) {
      console.log('Sample records:');
      correctRecords.slice(0, 3).forEach(r => {
        console.log(`  - ${r.employee?.name}: ${r.status} at ${r.clockIn ? new Date(r.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}`);
      });
    }
    console.log('');
    
    // Test 2: Using buildDateRangeQuery with today's date string (NEW fixed method)
    console.log('TEST 2: Using buildDateRangeQuery() with date string (FIXED)');
    console.log('-'.repeat(80));
    const dateRangeQuery = buildDateRangeQuery(todayIST, todayIST, 'date');
    console.log('Query:', JSON.stringify(dateRangeQuery, null, 2));
    console.log('Start:', dateRangeQuery.date.$gte.toISOString(), '(', dateRangeQuery.date.$gte.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    console.log('End:', dateRangeQuery.date.$lte.toISOString(), '(', dateRangeQuery.date.$lte.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    
    const fixedRecords = await Attendance.find(dateRangeQuery).populate('employee', 'name').lean();
    
    console.log(`Found ${fixedRecords.length} records`);
    if (fixedRecords.length > 0) {
      console.log('Sample records:');
      fixedRecords.slice(0, 3).forEach(r => {
        console.log(`  - ${r.employee?.name}: ${r.status} at ${r.clockIn ? new Date(r.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}`);
      });
    }
    console.log('');
    
    // Test 3: OLD broken method (for comparison)
    console.log('TEST 3: OLD method - new Date(dateString) (BROKEN)');
    console.log('-'.repeat(80));
    const oldStartOfDay = new Date(new Date(todayIST).setHours(0, 0, 0, 0));
    const oldEndOfDay = new Date(new Date(todayIST).setHours(23, 59, 59, 999));
    console.log('Start:', oldStartOfDay.toISOString(), '(', oldStartOfDay.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    console.log('End:', oldEndOfDay.toISOString(), '(', oldEndOfDay.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ')');
    
    const oldRecords = await Attendance.find({
      date: { $gte: oldStartOfDay, $lte: oldEndOfDay }
    }).populate('employee', 'name').lean();
    
    console.log(`Found ${oldRecords.length} records`);
    if (oldRecords.length > 0) {
      console.log('Sample records:');
      oldRecords.slice(0, 3).forEach(r => {
        console.log(`  - ${r.employee?.name}: ${r.status} at ${r.clockIn ? new Date(r.clockIn).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}`);
      });
    }
    console.log('');
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`  getTodayRangeIST(): ${correctRecords.length} records ✅`);
    console.log(`  buildDateRangeQuery() (FIXED): ${fixedRecords.length} records ${fixedRecords.length === correctRecords.length ? '✅' : '❌'}`);
    console.log(`  OLD method: ${oldRecords.length} records ${oldRecords.length === correctRecords.length ? '✅' : '❌'}`);
    console.log('');
    
    if (fixedRecords.length === correctRecords.length) {
      console.log('✅ FIX SUCCESSFUL! buildDateRangeQuery now returns correct results.');
    } else {
      console.log('❌ FIX FAILED! buildDateRangeQuery still has issues.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
