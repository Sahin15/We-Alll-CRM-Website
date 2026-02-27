import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models and services
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import slotManagementService from '../src/services/slotManagementService.js';

const TARGET_SLOT_COUNT = 20;

const updateAllProjectsTo20Slots = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all projects
    const allProjects = await Project.find({})
      .select('name slotConfiguration progressTracking createdBy projectHead')
      .lean();

    console.log(`📊 Total projects in database: ${allProjects.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const project of allProjects) {
      try {
        console.log(`\n📋 Processing: ${project.name}`);

        // Get current slot count
        const currentSlotCount = await Slot.countDocuments({ project: project._id });
        console.log(`   Current slots: ${currentSlotCount}`);

        if (currentSlotCount >= TARGET_SLOT_COUNT) {
          console.log(`   ✅ Already has ${currentSlotCount} slots (>= ${TARGET_SLOT_COUNT}), skipping`);
          skippedCount++;
          continue;
        }

        // Calculate how many slots to add
        const slotsToAdd = TARGET_SLOT_COUNT - currentSlotCount;
        console.log(`   🔧 Adding ${slotsToAdd} slots...`);

        // Update project configuration
        await Project.findByIdAndUpdate(project._id, {
          'slotConfiguration.enableSlotSystem': true,
          'slotConfiguration.totalSlots': TARGET_SLOT_COUNT,
          'slotConfiguration.autoCreateSlots': true,
          'progressTracking.calculationMethod': 'slot-based',
          'progressTracking.totalSlots': TARGET_SLOT_COUNT
        });

        // Create additional slots
        const fallbackUserId = project.createdBy || project.projectHead;
        
        const result = await slotManagementService.createSlotsForProject(project._id, {
          count: slotsToAdd,
          startingSlotNumber: currentSlotCount + 1,
          slotType: 'work',
          createdBy: fallbackUserId
        });

        console.log(`   ✅ Added ${result.created.length} slots`);
        console.log(`   📊 Total slots now: ${currentSlotCount + result.created.length}`);
        
        updatedCount++;

      } catch (error) {
        console.error(`   ❌ Error processing ${project.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Projects updated: ${updatedCount}`);
    console.log(`⏭️  Projects skipped (already have >= ${TARGET_SLOT_COUNT} slots): ${skippedCount}`);
    console.log(`❌ Projects with errors: ${errorCount}`);
    console.log(`📦 Total projects processed: ${allProjects.length}`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
updateAllProjectsTo20Slots();
