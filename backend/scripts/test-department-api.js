/**
 * Test Department API Response
 * Simulates what the frontend will receive
 * Run: node backend/scripts/test-department-api.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testDepartmentAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('TESTING DEPARTMENT API RESPONSE (getDepartmentAnalytics)');
    console.log('='.repeat(80));
    console.log();

    // Find Sales department
    const salesDept = await Department.findOne({ name: /^sales$/i });
    
    if (!salesDept) {
      console.log('❌ Sales department not found!');
      return;
    }

    const id = salesDept._id;

    // Simulate getDepartmentAnalytics function
    console.log('📡 Simulating API call: GET /api/departments/:id/analytics');
    console.log(`   Department ID: ${id}`);
    console.log();

    const department = await Department.findById(id)
      .populate("head", "name email");

    // Query employees directly from User model (NEW METHOD)
    const employees = await User.find({ department: id })
      .select("name email position role status")
      .lean();

    // Calculate analytics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(
      (e) => e.status === "active"
    ).length;
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Role distribution
    const roleDistribution = employees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    }, {});

    // Position distribution
    const positionDistribution = employees.reduce((acc, emp) => {
      const position = emp.position || "Not Assigned";
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      department: {
        id: department._id,
        name: department.name,
        description: department.description,
        status: department.status,
        head: department.head,
      },
      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        hasHead: !!department.head,
      },
      roleDistribution,
      positionDistribution,
      employees: employees,
    };

    // Display the response
    console.log('📦 API RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(analytics, null, 2));
    console.log();

    // Verify key data
    console.log('✅ VERIFICATION:');
    console.log('='.repeat(80));
    console.log(`Department Name: ${analytics.department.name}`);
    console.log(`Total Employees: ${analytics.stats.totalEmployees}`);
    console.log(`Active Employees: ${analytics.stats.activeEmployees}`);
    console.log();

    if (analytics.stats.totalEmployees > 0) {
      console.log('👥 Employee List:');
      analytics.employees.forEach((emp, index) => {
        console.log(`   ${index + 1}. ${emp.name} (${emp.email}) - ${emp.role}`);
      });
      console.log();
      console.log('✅ SUCCESS: Employees are being returned correctly!');
    } else {
      console.log('⚠️  WARNING: No employees found for this department');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('Frontend will receive this exact data structure');
    console.log('DepartmentDetails.jsx will display employees from analytics.employees array');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

testDepartmentAPI();
