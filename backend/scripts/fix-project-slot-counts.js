import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const projects = db.collection('projects');
    const slots = db.collection('slots');

    console.log('\n🔍 Analyzing project slot configurations...\n');

    // Get all projects
    const allProjects = await projects.find({}).toArray();
    
    let fixedCount = 0;
    let issuesFound = 0;

    for (const project of allProjects) {
      const configuredSlots = project.slotConfiguration?.totalSlots || 0;
      const progressSlots = project.progressTracking?.totalSlots || 0;
      
      // Count actual slots for current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const periodIdentifier = `${year}-${String(month).padStart(2, '0')}`;
      
      const actualSlots = await slots.countDocuments({
        project: project._id,
        'period.periodIdentifier': periodIdentifier
      });

      // Check for mismatches
      const hasIssue = configuredSlots !== 20 || progressSlots !== 20 || actualSlots !== 20;

      if (hasIssue) {
        issuesFound++;
        console.log(`⚠️  Project: ${project.name}`);
        console.log(`   ID: ${project._id}`);
        console.log(`   Configured Slots: ${configuredSlots}`);
        console.log(`   Progress Slots: ${progressSlots}`);
        console.log(`   Actual Slots (${periodIdentifier}): ${actualSlots}`);

        // Fix the configuration
        if (configuredSlots !== 20 || progressSlots !== 20) {
          await projects.updateOne(
            { _id: project._id },
            {
              $set: {
                'slotConfiguration.totalSlots': 20,
                'progressTracking.totalSlots': 20
              }
            }
          );
          console.log(`   ✅ Fixed configuration to 20 slots`);
          fixedCount++;
        }

        // If actual slots don't match, we need to create more
        if (actualSlots < 20) {
          const slotsNeeded = 20 - actualSlots;
          const startNumber = actualSlots + 1;
          
          const slotsToCreate = [];
          for (let i = startNumber; i <= 20; i++) {
            const slotIdentifier = `${periodIdentifier}-Slot-${String(i).padStart(2, '0')}`;
            slotsToCreate.push({
              project: project._id,
              period: {
                year,
                month,
                periodIdentifier
              },
              slotNumber: i,
              slotIdentifier,
              slotType: 'work',
              title: `${project.name} - Slot ${i}`,
              description: `Work slot ${i} for ${project.name} (${periodIdentifier})`,
              workType: 'Other',
              priority: 'Medium',
              assignmentStatus: 'available',
              createdBy: project.createdBy || project.projectHead,
              slotConfiguration: {
                isRequired: true,
                canBeSkipped: false,
                requiresApproval: false,
                estimatedEffort: 8,
                weight: 1.0
              },
              slotMetadata: {
                category: 'other',
                tags: ['monthly-slot']
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }

          if (slotsToCreate.length > 0) {
            await slots.insertMany(slotsToCreate);
            console.log(`   ✅ Created ${slotsToCreate.length} missing slots`);
          }
        }

        console.log('');
      }
    }

    console.log('\n📊 Summary:');
    console.log(`Total projects analyzed: ${allProjects.length}`);
    console.log(`Projects with issues: ${issuesFound}`);
    console.log(`Projects fixed: ${fixedCount}`);
    console.log('\n✅ Slot count reconciliation complete!\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}).catch(err => console.error('Connection error:', err.message));
