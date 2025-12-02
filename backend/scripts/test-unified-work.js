import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Task from '../src/models/taskModel.js';
import Slot from '../src/models/slotModel.js';
import User from '../src/models/userModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testUnifiedWork = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test employee
    const employee = await User.findOne({ role: 'employee' });
    if (!employee) {
      console.log('❌ No employee found');
      return;
    }

    console.log('\n📊 Testing Unified Work System');
    console.log('================================');
    console.log(`Employee: ${employee.name} (${employee.email})`);

    // Get employee's slots (content tasks)
    const slots = await Slot.find({ assignedTo: employee._id })
      .populate('project', 'name')
      .populate('client', 'name')
      .sort({ postingDate: 1 });

    console.log(`\n🎨 Content Tasks (Slots): ${slots.length}`);
    if (slots.length > 0) {
      slots.slice(0, 3).forEach((slot, index) => {
        console.log(`  ${index + 1}. ${slot.brief}`);
        console.log(`     Status: ${slot.designStatus}`);
        console.log(`     Due: ${slot.postingDate.toLocaleDateString()}`);
        console.log(`     Project: ${slot.project?.name || 'N/A'}`);
      });
    }

    // Get employee's tasks (general tasks)
    const tasks = await Task.find({ assignedTo: employee._id })
      .populate('project', 'name')
      .populate('assignedBy', 'name')
      .sort({ dueDate: 1 });

    console.log(`\n📋 General Tasks: ${tasks.length}`);
    if (tasks.length > 0) {
      tasks.slice(0, 3).forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title}`);
        console.log(`     Status: ${task.status}`);
        console.log(`     Due: ${task.dueDate ? task.dueDate.toLocaleDateString() : 'Not set'}`);
        console.log(`     Project: ${task.project?.name || 'N/A'}`);
      });
    } else {
      console.log('  No general tasks found');
      console.log('  💡 You can create tasks via the API or admin panel');
    }

    // Combined statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueSlots = slots.filter(s => 
      new Date(s.postingDate) < today && s.designStatus !== 'Approved'
    );
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < today && t.status !== 'done'
    );

    const dueTodaySlots = slots.filter(s => {
      const date = new Date(s.postingDate);
      return date.toDateString() === today.toDateString() && s.designStatus !== 'Approved';
    });
    const dueTodayTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const date = new Date(t.dueDate);
      return date.toDateString() === today.toDateString() && t.status !== 'done';
    });

    console.log('\n📈 Statistics');
    console.log('================================');
    console.log(`Total Work Items: ${slots.length + tasks.length}`);
    console.log(`  - Content Tasks: ${slots.length}`);
    console.log(`  - General Tasks: ${tasks.length}`);
    console.log(`\nOverdue: ${overdueSlots.length + overdueTasks.length}`);
    console.log(`  - Content: ${overdueSlots.length}`);
    console.log(`  - Tasks: ${overdueTasks.length}`);
    console.log(`\nDue Today: ${dueTodaySlots.length + dueTodayTasks.length}`);
    console.log(`  - Content: ${dueTodaySlots.length}`);
    console.log(`  - Tasks: ${dueTodayTasks.length}`);

    console.log('\n✅ Unified work system is working!');
    console.log('\n💡 Next steps:');
    console.log('1. Login as this employee');
    console.log('2. Go to "My Work" page');
    console.log('3. You should see all work items combined');
    console.log('4. Try updating status on both types');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

testUnifiedWork();
