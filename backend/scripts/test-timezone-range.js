import { getTodayRangeIST } from '../src/utils/timezone.js';

console.log('🧪 TESTING TIMEZONE RANGE CALCULATION');
console.log('='.repeat(80));

const now = new Date();
console.log('\n📅 Current Time:');
console.log('   Server Time (UTC):', now.toISOString());
console.log('   Server Time (Local):', now.toString());
console.log('   IST Time:', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

const { start, end } = getTodayRangeIST();

console.log('\n📊 Today\'s Range (IST):');
console.log('   Start (UTC):', start.toISOString());
console.log('   Start (IST):', start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
console.log('   End (UTC):', end.toISOString());
console.log('   End (IST):', end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

console.log('\n🔍 Verification:');
console.log('   Is current time within range?', now >= start && now < end);
console.log('   Hours difference (start to now):', ((now - start) / (1000 * 60 * 60)).toFixed(2), 'hours');

// Test with a sample attendance record time
const sampleClockIn = new Date('2026-02-17T04:43:49.832Z'); // Suman's clock-in
console.log('\n📝 Sample Record (Suman Das):');
console.log('   Clock-in (UTC):', sampleClockIn.toISOString());
console.log('   Clock-in (IST):', sampleClockIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
console.log('   Is within today\'s range?', sampleClockIn >= start && sampleClockIn < end);

console.log('\n' + '='.repeat(80));
