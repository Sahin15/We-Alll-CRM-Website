/**
 * TEST ATTENDANCE STATUS CALCULATION LOGIC
 * 
 * This script tests the attendance status calculation without touching the database.
 * Run this to verify the logic is correct before deploying.
 */

const calculateStatus = (clockInTime) => {
  const clockInHour = clockInTime.getHours();
  const clockInMinute = clockInTime.getMinutes();
  
  if (clockInHour >= 12) {
    return "half-day";
  } else if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30)) {
    return "late";
  } else {
    return "present";
  }
};

const testCases = [
  // Present cases
  { time: "09:00", expected: "present", description: "Early morning" },
  { time: "10:00", expected: "present", description: "On time" },
  { time: "10:29", expected: "present", description: "Just before cutoff" },
  { time: "10:30", expected: "present", description: "Exactly at cutoff" },
  
  // Late cases
  { time: "10:31", expected: "late", description: "One minute late" },
  { time: "10:45", expected: "late", description: "15 minutes late" },
  { time: "11:00", expected: "late", description: "30 minutes late" },
  { time: "11:30", expected: "late", description: "1 hour late" },
  { time: "11:59", expected: "late", description: "Just before half-day" },
  
  // Half-day cases
  { time: "12:00", expected: "half-day", description: "Exactly noon" },
  { time: "12:30", expected: "half-day", description: "Afternoon" },
  { time: "14:00", expected: "half-day", description: "Mid afternoon" },
  { time: "16:00", expected: "half-day", description: "Late afternoon" },
];

console.log('\n' + '='.repeat(80));
console.log('🧪 ATTENDANCE STATUS CALCULATION TEST');
console.log('='.repeat(80));
console.log('\nBusiness Rules:');
console.log('  ✅ ≤ 10:30 AM  → Present');
console.log('  ⚠️  > 10:30 AM  → Late (until 12:00 PM)');
console.log('  🕐 ≥ 12:00 PM  → Half-day');
console.log('='.repeat(80) + '\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const [hours, minutes] = test.time.split(':').map(Number);
  const testDate = new Date();
  testDate.setHours(hours, minutes, 0, 0);
  
  const result = calculateStatus(testDate);
  const isPass = result === test.expected;
  
  if (isPass) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${test.time} → ${result} (${test.description})`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${test.time} → ${result} (Expected: ${test.expected}) - ${test.description}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 TEST RESULTS');
console.log('='.repeat(80));
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
console.log('='.repeat(80) + '\n');

if (failed === 0) {
  console.log('🎉 All tests passed! The logic is correct.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the logic.\n');
  process.exit(1);
}
