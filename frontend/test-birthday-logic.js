// Test Birthday Logic
// Today: February 9, 2026
// Your Birthday: February 14, 2026 (5 days away)

const today = new Date('2026-02-09');
const yourBirthday = new Date('2026-02-14'); // Your DOB year doesn't matter, just month/day

console.log('Today:', today.toDateString());
console.log('Your Birthday (this year):', yourBirthday.toDateString());

// Calculate days until
const diffTime = yourBirthday - today;
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
console.log('Days until birthday:', diffDays);

// Check if within 7 days
const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
console.log('Seven days later:', sevenDaysLater.toDateString());
console.log('Is within 7 days?', yourBirthday >= today && yourBirthday <= sevenDaysLater);

// The issue might be:
// 1. Date comparison with time component
// 2. Timezone issues
// 3. DOB stored with wrong year

console.log('\n--- Checking potential issues ---');
console.log('Today time:', today.getTime());
console.log('Birthday time:', yourBirthday.getTime());
console.log('Seven days later time:', sevenDaysLater.getTime());
console.log('Birthday >= today?', yourBirthday >= today);
console.log('Birthday <= sevenDaysLater?', yourBirthday <= sevenDaysLater);
