#!/usr/bin/env node

/**
 * Quick Email Update Script
 * For immediate email updates with minimal setup
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';

dotenv.config();

const quickEmailUpdate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 🔧 CONFIGURE YOUR EMAIL UPDATES HERE:
    const emailUpdates = [
      // Format: { oldEmail: 'current@email.com', newEmail: 'new@email.com' }
      
      // Example updates - UNCOMMENT AND MODIFY AS NEEDED:
      // { oldEmail: 'admin@company.com', newEmail: 'admin@wealll.cloud' },
      // { oldEmail: 'hr@company.com', newEmail: 'hr@wealll.cloud' },
      // { oldEmail: 'manager@company.com', newEmail: 'manager@wealll.cloud' },
      
      // Add your actual email updates here:
      
    ];

    if (emailUpdates.length === 0) {
      console.log('⚠️  No email updates configured.');
      console.log('📝 Please edit this script and add your email updates to the emailUpdates array.');
      process.exit(0);
    }

    console.log(`🔄 Processing ${emailUpdates.length} email updates...\n`);

    for (const { oldEmail, newEmail } of emailUpdates) {
      try {
        const result = await User.updateOne(
          { email: oldEmail },
          { $set: { email: newEmail } }
        );

        if (result.matchedCount > 0) {
          console.log(`✅ ${oldEmail} → ${newEmail}`);
        } else {
          console.log(`❌ User not found: ${oldEmail}`);
        }
      } catch (error) {
        console.log(`❌ Error updating ${oldEmail}: ${error.message}`);
      }
    }

    console.log('\n✅ Email update process completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

quickEmailUpdate();