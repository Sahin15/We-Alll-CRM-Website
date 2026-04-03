/**
 * Backfill Attendance Records for Approved Leaves
 * 
 * This script creates attendance records with "on-leave" status for all
 * approved leave requests that don't have corresponding attendance records.
 * 
 * Run with: node backend/scripts/backfill-leave-attendance.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import LeaveRequest from '../src/models/leaveRequestModel.js';
import Attendance from '../src/models/attendanceModel.js';
import User from '../src/models/userModel.js';

async function backfillLeaveAttendance() {
  try {
    
    await mongoose.connect(process.env.MONGO_URI);
    

    // Get all approved leave requests
    const approvedLeaves = await LeaveRequest.find({
      status: 'approved'
    }).populate('employee', 'name email').sort({ startDate: 1 });

    

    let totalRecordsCreated = 0;
    let totalRecordsSkipped = 0;

    for (const leave of approvedLeaves) {
      
      
      .split('T')[0]} to ${leave.endDate.toISOString().split('T')[0]}`);
      

      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      let recordsCreatedForLeave = 0;
      let recordsSkippedForLeave = 0;

      // Loop through each day in the leave period
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Set time to start of day for consistent date comparison
        const dateOnly = new Date(currentDate);
        dateOnly.setHours(0, 0, 0, 0);
        
        // Check if attendance record already exists for this date
        const existingRecord = await Attendance.findOne({
          employee: leave.employee._id,
          date: {
            $gte: dateOnly,
            $lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000)
          }
        });
        
        if (!existingRecord) {
          // Create new attendance record with "on-leave" status
          // Set clockIn to 9:00 AM for the date (just for record keeping)
          const clockInTime = new Date(dateOnly);
          clockInTime.setHours(9, 0, 0, 0);
          
          await Attendance.create({
            employee: leave.employee._id,
            date: dateOnly,
            clockIn: clockInTime,
            status: 'on-leave',
            workHours: 0,
            overtime: 0,
            notes: `On ${leave.leaveType} leave (Approved - Backfilled)`,
            approvedBy: leave.approvedBy,
            isManuallyModified: true, // Mark as manually set so it won't be recalculated
            originalStatus: 'on-leave'
          });
          
          recordsCreatedForLeave++;
          .split('T')[0]}`);
        } else {
          recordsSkippedForLeave++;
          .split('T')[0]} (Status: ${existingRecord.status})`);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      totalRecordsCreated += recordsCreatedForLeave;
      totalRecordsSkipped += recordsSkippedForLeave;

      
    }

    );
    
    );
    
    
    : ${totalRecordsSkipped}`);
    );

    // Verify the results
    
    const onLeaveCount = await Attendance.countDocuments({ status: 'on-leave' });
    

  } catch (error) {
    
    
  } finally {
    await mongoose.connection.close();
    
  }
}

// Run the script
backfillLeaveAttendance();
