import mongoose from 'mongoose';
import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

const fixDuplicateTeamMembers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find all projects
    const projects = await Project.find({})
      .populate('assignedUsers', 'name email')
      .populate('teamMembers.user', 'name email');
    
    console.log(`Found ${projects.length} projects\n`);
    console.log('='.repeat(80));

    let projectsWithDuplicates = 0;
    let totalDuplicatesRemoved = 0;
    const report = [];

    for (const project of projects) {
      let assignedUsersDuplicates = 0;
      let teamMembersDuplicates = 0;
      
      // Check and fix assignedUsers
      if (project.assignedUsers && project.assignedUsers.length > 0) {
        const seenIds = new Set();
        const uniqueUsers = [];
        
        for (const user of project.assignedUsers) {
          const userId = user._id?.toString() || user.toString();
          if (!seenIds.has(userId)) {
            seenIds.add(userId);
            uniqueUsers.push(user);
          } else {
            assignedUsersDuplicates++;
          }
        }
        
        if (assignedUsersDuplicates > 0) {
          project.assignedUsers = uniqueUsers;
          await project.save();
          totalDuplicatesRemoved += assignedUsersDuplicates;
        }
      }

      // Check and fix teamMembers
      if (project.teamMembers && project.teamMembers.length > 0) {
        const seenTeamIds = new Set();
        const uniqueTeamMembers = [];
        
        for (const member of project.teamMembers) {
          const memberId = member.user?._id?.toString() || member.user?.toString();
          if (!seenTeamIds.has(memberId)) {
            seenTeamIds.add(memberId);
            uniqueTeamMembers.push(member);
          } else {
            teamMembersDuplicates++;
          }
        }
        
        if (teamMembersDuplicates > 0) {
          project.teamMembers = uniqueTeamMembers;
          await project.save();
          totalDuplicatesRemoved += teamMembersDuplicates;
        }
      }

      // Report if duplicates found
      if (assignedUsersDuplicates > 0 || teamMembersDuplicates > 0) {
        projectsWithDuplicates++;
        const reportEntry = {
          name: project.name,
          assignedUsersDuplicates,
          teamMembersDuplicates,
          totalDuplicates: assignedUsersDuplicates + teamMembersDuplicates
        };
        report.push(reportEntry);
        
        console.log(`\n✓ Project: "${project.name}"`);
        if (assignedUsersDuplicates > 0) {
          console.log(`  - Removed ${assignedUsersDuplicates} duplicate(s) from assignedUsers`);
        }
        if (teamMembersDuplicates > 0) {
          console.log(`  - Removed ${teamMembersDuplicates} duplicate(s) from teamMembers`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY REPORT:');
    console.log(`Total projects scanned: ${projects.length}`);
    console.log(`Projects with duplicates: ${projectsWithDuplicates}`);
    console.log(`Total duplicates removed: ${totalDuplicatesRemoved}`);
    
    if (projectsWithDuplicates > 0) {
      console.log('\n📋 DETAILED REPORT:');
      report.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.name}`);
        console.log(`   - assignedUsers duplicates: ${entry.assignedUsersDuplicates}`);
        console.log(`   - teamMembers duplicates: ${entry.teamMembersDuplicates}`);
        console.log(`   - Total: ${entry.totalDuplicates}`);
      });
    } else {
      console.log('\n✅ No duplicates found in any project!');
    }

    console.log('\n' + '='.repeat(80));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixDuplicateTeamMembers();
