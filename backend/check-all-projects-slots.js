import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const projects = db.collection('projects');
    const slots = db.collection('slots');
    const workItems = db.collection('workitems');

    // Get all projects
    const allProjects = await projects.find({}).toArray();
    console.log(`\n📊 Total Projects: ${allProjects.length}\n`);

    let projectsWithSlots = 0;
    let projectsWithoutSlots = 0;
    let projectsWithWorkItems = 0;

    for (const project of allProjects) {
      // Check if project has slots for April 2026
      const projectSlots = await slots.countDocuments({
        project: project._id,
        'period.periodIdentifier': '2026-04'
      });

      // Check if project has work items
      const projectWorkItems = await workItems.countDocuments({
        project: project._id
      });

      if (projectSlots > 0) {
        projectsWithSlots++;
      } else {
        projectsWithoutSlots++;
      }

      if (projectWorkItems > 0) {
        projectsWithWorkItems++;
      }

      // Show details for projects without slots but with work items
      if (projectSlots === 0 && projectWorkItems > 0) {
        console.log(`⚠️  Project: ${project.name} (ID: ${project._id})`);
        console.log(`   - Slots for April 2026: ${projectSlots}`);
        console.log(`   - Work Items: ${projectWorkItems}`);
        console.log('');
      }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Projects with slots for April 2026: ${projectsWithSlots}`);
    console.log(`❌ Projects without slots for April 2026: ${projectsWithoutSlots}`);
    console.log(`📋 Projects with work items: ${projectsWithWorkItems}`);

    // Check specifically for "Make Pro" project
    console.log('\n\n🔍 Checking "Make Pro" project:');
    const makePro = await projects.findOne({
      name: { $regex: 'Make Pro', $options: 'i' }
    });

    if (makePro) {
      const makeProSlots = await slots.countDocuments({
        project: makePro._id,
        'period.periodIdentifier': '2026-04'
      });

      const makeProWorkItems = await workItems.countDocuments({
        project: makePro._id
      });

      console.log(`Project: ${makePro.name} (ID: ${makePro._id})`);
      console.log(`Slots for April 2026: ${makeProSlots}`);
      console.log(`Work Items: ${makeProWorkItems}`);

      if (makeProWorkItems > 0) {
        const items = await workItems.find({
          project: makePro._id
        }).toArray();

        console.log('\nWork Items in Make Pro:');
        items.forEach(item => {
          console.log(`- ${item.title} (Slot: ${item.slotNumber || 'undefined'}, Date: ${item.date || 'undefined'})`);
        });
      }
    } else {
      console.log('❌ Make Pro project not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}).catch(err => console.error('Connection error:', err.message));
