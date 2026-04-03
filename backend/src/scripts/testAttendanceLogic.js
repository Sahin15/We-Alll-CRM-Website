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

);

);


');

 + '\n');

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
    `);
  } else {
    failed++;
     - ${test.description}`);
  }
});

);

);



 * 100).toFixed(1)}%`);
 + '\n');

if (failed === 0) {
  
  process.exit(0);
} else {
  
  process.exit(1);
}
