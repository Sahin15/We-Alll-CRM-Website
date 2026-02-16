import { getTodayRangeIST, getCurrentISTTime, getTodayMidnightIST } from '../src/utils/timezone.js';

console.log('🧪 Testing New Timezone Logic\n');
console.log('='.repeat(80));

const now = new Date();
console.log('\n📅 Current Server Time:');
console.log('   UTC:', now.toISOString());
console.log('   IST:', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

const currentIST = getCurrentISTTime();
console.log('\n🕐 getCurrentISTTime():');
console.log('   UTC:', currentIST.toISOString());
console.log('   IST:', currentIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

const midnight = getTodayMidnightIST();
console.log('\n🌙 getTodayMidnightIST():');
console.log('   UTC:', midnight.toISOString());
console.log('   IST:', midnight.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
console.log('   Should be: Today at 00:00:00 IST');

const { start, end } = getTodayRangeIST();
console.log('\n📆 getTodayRangeIST():');
console.log('   Start (UTC):', start.toISOString());
console.log('   Start (IST):', start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
console.log('   End (UTC):', end.toISOString());
console.log('   End (IST):', end.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

console.log('\n✅ Verification:');
console.log('   Start should be today at 00:00:00 IST');
console.log('   End should be tomorrow at 00:00:00 IST');
console.log('   Current time should be between start and end:', currentIST >= start && currentIST < end);

console.log('\n' + '='.repeat(80));
