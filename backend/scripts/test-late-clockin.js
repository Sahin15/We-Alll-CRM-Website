// Test script to verify late clock-in logic
const testClockInLogic = () => {
  // Simulate different clock-in times
  const testCases = [
    { hour: 9, minute: 0, expected: "present" },
    { hour: 10, minute: 0, expected: "present" },
    { hour: 10, minute: 30, expected: "present" },
    { hour: 10, minute: 31, expected: "late" },
    { hour: 11, minute: 0, expected: "late" },
    { hour: 11, minute: 59, expected: "late" },
    { hour: 12, minute: 0, expected: "half-day" },
    { hour: 13, minute: 0, expected: "half-day" },
    { hour: 14, minute: 30, expected: "half-day" },
  ];

  console.log("Testing Clock-In Logic:\n");
  console.log("Time\t\tExpected\tActual\t\tResult");
  console.log("=".repeat(60));

  testCases.forEach(({ hour, minute, expected }) => {
    const clockInHour = hour;
    const clockInMinute = minute;
    
    let status = "present";
    
    // After 12:00 PM (noon) = Half day
    if (clockInHour >= 12) {
      status = "half-day";
    }
    // After 10:30 AM but before 12:00 PM = Late
    else if (clockInHour > 10 || (clockInHour === 10 && clockInMinute > 30)) {
      status = "late";
    }

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const result = status === expected ? "✓ PASS" : "✗ FAIL";
    console.log(`${timeStr}\t\t${expected}\t\t${status}\t\t${result}`);
  });
};

testClockInLogic();
