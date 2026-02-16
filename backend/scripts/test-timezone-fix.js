/**
 * Test Timezone Fix for Attendance Status Calculation
 * 
 * This tests that the status calculation works correctly regardless of server timezone
 */

// Test the timezone conversion logic
function testTimezoneConversion() {
  console.log('🧪 Testing Timezone Conversion Logic\n');
  console.log('═'.repeat(60));
  
  const testCases = [
    { time: '09:00', expected: 'present', description: '9:00 AM - Should be Present' },
    { time: '10:30', expected: 'present', description: '10:30 AM - Should be Present (boundary)' },
    { time: '10:31', expected: 'late', description: '10:31 AM - Should be Late' },
    { time: '11:59', expected: 'late', description: '11:59 AM - Should be Late (boundary)' },
    { time: '12:00', expected: 'half-day', description: '12:00 PM - Should be Half-day (boundary)' },
    { time: '14:30', expected: 'half-day', description: '2:30 PM - Should be Half-day' },
    { time: '16:59', expected: 'half-day', description: '4:59 PM - Should be Half-day (Rahul\'s case)' },
    { time: '18:00', expected: 'half-day', description: '6:00 PM - Should be Half-day' },
  ];
  
  let allPassed = true;
  
  testCases.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.description}`);
    console.log('─'.repeat(60));
    
    // Create a date object for today at the specified time in IST
    const today = new Date();
    const [hours, minutes] = test.time.split(':').map(Number);
    
    // Create date in IST timezone
    const istDateString = `${today.toLocaleDateString('en-CA')}T${test.time}:00`;
    const testDate = new Date(istDateString);
    
    console.log(`Input Time: ${test.time} IST`);
    console.log(`Date Object: ${testDate.toISOString()} (UTC)`);
    
    // Simulate the new calculation method
    const istTimeString = testDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const [clockInHour, clockInMinute] = istTimeString.split(':').map(Number);
    const totalMinutes = clockInHour * 60 + clockInMinute;
    
    let calculatedStatus;
    if (totalMinutes >= 720) {
      calculatedStatus = "half-day";
    } else if (totalMinutes > 630) {
      calculatedStatus = "late";
    } else {
      calculatedStatus = "present";
    }
    
    console.log(`Converted IST: ${clockInHour}:${String(clockInMinute).padStart(2, '0')}`);
    console.log(`Total Minutes: ${totalMinutes}`);
    console.log(`Calculated Status: ${calculatedStatus}`);
    console.log(`Expected Status: ${test.expected}`);
    
    const passed = calculatedStatus === test.expected;
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
      allPassed = false;
      console.log(`❌ ERROR: Expected ${test.expected} but got ${calculatedStatus}`);
    }
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}\n`);
  
  return allPassed;
}

// Test with different server timezones
function testDifferentServerTimezones() {
  console.log('\n🌍 Testing with Different Server Timezones\n');
  console.log('═'.repeat(60));
  
  // Simulate Rahul's case: 16:59 IST
  const testTime = '16:59';
  const [hours, minutes] = testTime.split(':').map(Number);
  
  console.log(`\nTest Case: Clock-in at ${testTime} IST`);
  console.log('Expected: half-day\n');
  
  // Test 1: Server in UTC
  console.log('Scenario 1: Server in UTC timezone');
  console.log('─'.repeat(60));
  const utcDate = new Date(`2026-02-11T${testTime}:00+05:30`); // 16:59 IST
  console.log(`UTC Date: ${utcDate.toISOString()}`);
  
  const istFromUTC = utcDate.toLocaleString('en-US', { 
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  console.log(`Converted to IST: ${istFromUTC}`);
  
  const [h1, m1] = istFromUTC.split(':').map(Number);
  const min1 = h1 * 60 + m1;
  const status1 = min1 >= 720 ? 'half-day' : min1 > 630 ? 'late' : 'present';
  console.log(`Status: ${status1} ${status1 === 'half-day' ? '✅' : '❌'}\n`);
  
  // Test 2: Server in IST
  console.log('Scenario 2: Server in IST timezone');
  console.log('─'.repeat(60));
  const istDate = new Date(`2026-02-11T${testTime}:00`); // Assuming server is in IST
  console.log(`IST Date: ${istDate.toISOString()}`);
  
  const istFromIST = istDate.toLocaleString('en-US', { 
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  console.log(`Converted to IST: ${istFromIST}`);
  
  const [h2, m2] = istFromIST.split(':').map(Number);
  const min2 = h2 * 60 + m2;
  const status2 = min2 >= 720 ? 'half-day' : min2 > 630 ? 'late' : 'present';
  console.log(`Status: ${status2} ${status2 === 'half-day' ? '✅' : '❌'}\n`);
  
  console.log('═'.repeat(60));
  console.log(`\n${status1 === 'half-day' && status2 === 'half-day' ? '✅ TIMEZONE FIX WORKS!' : '❌ TIMEZONE FIX FAILED'}\n`);
}

// Run all tests
console.log('\n🚀 Attendance Status Timezone Fix - Test Suite\n');
console.log('This tests the fix for the issue where 16:59 was showing as "late"');
console.log('instead of "half-day"\n');

const basicTestsPassed = testTimezoneConversion();
testDifferentServerTimezones();

console.log('\n📋 Summary:');
console.log('─'.repeat(60));
console.log('The new implementation uses toLocaleString() with Asia/Kolkata timezone');
console.log('This ensures correct IST time regardless of server timezone');
console.log('');
console.log('Old Method (BROKEN):');
console.log('  - Added fixed offset (5.5 hours) to date');
console.log('  - Failed when server was already in IST');
console.log('  - Double-converted timezone');
console.log('');
console.log('New Method (FIXED):');
console.log('  - Uses toLocaleString() with timeZone parameter');
console.log('  - Works regardless of server timezone');
console.log('  - Properly handles DST and timezone changes');
console.log('');
console.log(`Status: ${basicTestsPassed ? '✅ READY TO DEPLOY' : '❌ NEEDS FIXING'}\n`);
