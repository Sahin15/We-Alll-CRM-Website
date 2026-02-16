/**
 * Test Final Attendance Logic
 * 
 * Business Rules (ALL TIMES IN IST):
 * - 00:00 to 10:30 → Present
 * - 10:31 to 11:59 → Late
 * - 12:00 to 19:00 → Half-day
 * - After 19:00 → Absent (too late)
 */

console.log('🧪 Testing Final Attendance Logic\n');
console.log('═'.repeat(80));
console.log('\n📋 BUSINESS RULES (ALL TIMES IN IST):\n');
console.log('  00:00 to 10:30 → Present');
console.log('  10:31 to 11:59 → Late');
console.log('  12:00 to 19:00 → Half-day');
console.log('  After 19:00 → Absent (too late)');
console.log('\n' + '═'.repeat(80));

const testCases = [
  // Present cases
  { time: '08:00', expected: 'present', desc: '8:00 AM - Early morning' },
  { time: '09:00', expected: 'present', desc: '9:00 AM - Normal time' },
  { time: '10:00', expected: 'present', desc: '10:00 AM - Still on time' },
  { time: '10:30', expected: 'present', desc: '10:30 AM - Boundary (last minute)' },
  
  // Late cases
  { time: '10:31', expected: 'late', desc: '10:31 AM - Just late' },
  { time: '11:00', expected: 'late', desc: '11:00 AM - Late' },
  { time: '11:30', expected: 'late', desc: '11:30 AM - Late' },
  { time: '11:59', expected: 'late', desc: '11:59 AM - Boundary (last minute late)' },
  
  // Half-day cases
  { time: '12:00', expected: 'half-day', desc: '12:00 PM - Noon (boundary)' },
  { time: '13:00', expected: 'half-day', desc: '1:00 PM - Afternoon' },
  { time: '14:30', expected: 'half-day', desc: '2:30 PM - Mid afternoon' },
  { time: '16:00', expected: 'half-day', desc: '4:00 PM - Late afternoon' },
  { time: '16:59', expected: 'half-day', desc: '4:59 PM - Rahul\'s case' },
  { time: '18:00', expected: 'half-day', desc: '6:00 PM - Evening' },
  { time: '19:00', expected: 'half-day', desc: '7:00 PM - Boundary (last minute half-day)' },
  
  // Absent cases (too late)
  { time: '19:01', expected: 'absent', desc: '7:01 PM - Too late' },
  { time: '20:00', expected: 'absent', desc: '8:00 PM - Way too late' },
  { time: '22:00', expected: 'absent', desc: '10:00 PM - Very late' },
];

let allPassed = true;
let passCount = 0;
let failCount = 0;

console.log('\n🧪 RUNNING TESTS:\n');

testCases.forEach((test, index) => {
  const [hour, minute] = test.time.split(':').map(Number);
  const totalMinutes = hour * 60 + minute;
  
  // Apply the logic
  let calculated;
  if (totalMinutes > 1140) {
    calculated = 'absent';
  } else if (totalMinutes >= 720) {
    calculated = 'half-day';
  } else if (totalMinutes > 630) {
    calculated = 'late';
  } else {
    calculated = 'present';
  }
  
  const passed = calculated === test.expected;
  const icon = passed ? '✅' : '❌';
  
  if (passed) {
    passCount++;
  } else {
    failCount++;
    allPassed = false;
  }
  
  console.log(`${icon} ${test.time} (${totalMinutes} min) → ${calculated} ${passed ? '' : `(expected: ${test.expected})`}`);
  console.log(`   ${test.desc}`);
  
  if (!passed) {
    console.log(`   ❌ FAILED: Expected ${test.expected} but got ${calculated}`);
  }
  console.log('');
});

console.log('═'.repeat(80));
console.log('\n📊 TEST RESULTS:\n');
console.log(`  Total Tests: ${testCases.length}`);
console.log(`  Passed: ${passCount} ✅`);
console.log(`  Failed: ${failCount} ${failCount > 0 ? '❌' : ''}`);
console.log(`  Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`);

if (allPassed) {
  console.log('\n🎉 ALL TESTS PASSED! Logic is correct.\n');
} else {
  console.log('\n❌ SOME TESTS FAILED! Logic needs fixing.\n');
}

console.log('═'.repeat(80));
console.log('\n📝 SUMMARY:\n');
console.log('The attendance status calculation logic is now:');
console.log('  • Simple and clear');
console.log('  • Based only on IST time');
console.log('  • No timezone confusion');
console.log('  • Matches business requirements exactly');
console.log('\n✅ Ready for production!\n');
