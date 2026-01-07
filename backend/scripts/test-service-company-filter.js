#!/usr/bin/env node

/**
 * Test Service Company Filter
 * Verifies that projects are properly populated with client serviceCompany data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import Client from '../src/models/clientModel.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const testServiceCompanyFilter = async () => {
  try {
    console.log('\n🔍 Testing Service Company Filter...\n');

    // Get all projects with client data
    const projects = await Project.find({})
      .populate('client', 'name email serviceCompany')
      .select('name client')
      .lean();

    console.log(`📊 Total projects found: ${projects.length}`);

    // Count projects by service company
    const weAlllProjects = projects.filter(p => p.client?.serviceCompany === 'We Alll');
    const kolkataDigitalProjects = projects.filter(p => p.client?.serviceCompany === 'Kolkata Digital');
    const noServiceCompanyProjects = projects.filter(p => !p.client?.serviceCompany);
    const noClientProjects = projects.filter(p => !p.client);

    console.log('\n📈 Service Company Distribution:');
    console.log(`  • We Alll: ${weAlllProjects.length} projects`);
    console.log(`  • Kolkata Digital: ${kolkataDigitalProjects.length} projects`);
    console.log(`  • No Service Company: ${noServiceCompanyProjects.length} projects`);
    console.log(`  • No Client: ${noClientProjects.length} projects`);

    // Show sample projects for each category
    if (weAlllProjects.length > 0) {
      console.log('\n🔵 Sample We Alll Projects:');
      weAlllProjects.slice(0, 3).forEach(p => {
        console.log(`  • ${p.name} (Client: ${p.client?.name})`);
      });
    }

    if (kolkataDigitalProjects.length > 0) {
      console.log('\n🔴 Sample Kolkata Digital Projects:');
      kolkataDigitalProjects.slice(0, 3).forEach(p => {
        console.log(`  • ${p.name} (Client: ${p.client?.name})`);
      });
    }

    if (noServiceCompanyProjects.length > 0) {
      console.log('\n⚠️  Projects with clients but no service company:');
      noServiceCompanyProjects.slice(0, 5).forEach(p => {
        console.log(`  • ${p.name} (Client: ${p.client?.name})`);
      });
    }

    // Test the filtering logic used in frontend
    console.log('\n🧪 Testing Frontend Filter Logic:');
    
    const allProjectsFilter = projects;
    const weAlllFilter = projects.filter(p => p.client?.serviceCompany === 'We Alll');
    const kolkataDigitalFilter = projects.filter(p => p.client?.serviceCompany === 'Kolkata Digital');

    console.log(`  • All Projects filter: ${allProjectsFilter.length} projects`);
    console.log(`  • We Alll filter: ${weAlllFilter.length} projects`);
    console.log(`  • Kolkata Digital filter: ${kolkataDigitalFilter.length} projects`);

    // Verify client data structure
    if (projects.length > 0) {
      const sampleProject = projects.find(p => p.client);
      if (sampleProject) {
        console.log('\n🔍 Sample Project Client Data:');
        console.log(`  • Project: ${sampleProject.name}`);
        console.log(`  • Client Name: ${sampleProject.client.name}`);
        console.log(`  • Client Email: ${sampleProject.client.email}`);
        console.log(`  • Service Company: ${sampleProject.client.serviceCompany || 'NOT SET'}`);
      }
    }

    console.log('\n✅ Service Company Filter Test Complete!');

  } catch (error) {
    console.error('❌ Error testing service company filter:', error);
  }
};

const main = async () => {
  await connectDB();
  await testServiceCompanyFilter();
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
};

main().catch(console.error);