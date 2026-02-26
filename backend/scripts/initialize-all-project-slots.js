import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const initializeAllProjectSlots = async () => {
  try {
    console.log('🔄 Initialize Slot System for All Projects\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const projects = await Project.find({}).select('name slotManagement slotConfiguration');
    console.log(`📊 Found ${projects.length} projects\n`);

    // Ask for default slot count
    const defaultSlotCount = await question('Enter default number of slots for each project (e.g., 5): ');
    const slotCount = parseInt(defaultSlotCount) || 5;

    console.log(`\n✅ Will create ${slotCount} slots for each project\n`);
    
    const confirm = await question(`⚠️  This will reset ALL project slots. Continue? (yes/no): `);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }

    console.log('\n🚀 Starting initialization...\n');

    let totalSlotsCreated = 0;
    let projectsUpdated = 0;

    for (const project of projects) {
      console.log(`📦 ${project.name}`);

      // Clear any old slot assignments from work items
      await WorkItem.updateMany(
        { project: project._id },
        { $unset: { slot: "" } }
      );

      // Create new slots with proper IDs
      const newSlots = [];
      for (let i = 1; i <= slotCount; i++) {
        const newSlot = {
          _id: new mongoose.Types.ObjectId(),
          slotNumber: i,
          name: `Slot ${i}`,
          description: `Work slot ${i}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        newSlots.push(newSlot);
      }

      // Update project with new slot configuration
      project.slotManagement = {
        enabled: true,
        slotCount: slotCount,
        slots: newSlots,
        lastUpdated: new Date()
      };

      project.slotConfiguration = {
        enabled: true,
        slotCount: slotCount,
        slots: newSlots,
        lastUpdated: new Date()
      };

      await project.save();

      console.log(`   ✅ Created ${newSlots.length} slots`);
      totalSlotsCreated += newSlots.length;
      projectsUpdated++;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 INITIALIZATION COMPLETE!');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Projects updated: ${projectsUpdated}`);
    console.log(`   Total slots created: ${totalSlotsCreated}`);
    console.log(`   Slots per project: ${slotCount}`);

    console.log(`\n✅ All projects now have ${slotCount} slots with proper MongoDB IDs`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Restart your backend server`);
    console.log(`   2. Refresh your frontend`);
    console.log(`   3. Assign work items to slots as needed`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

initializeAllProjectSlots();
