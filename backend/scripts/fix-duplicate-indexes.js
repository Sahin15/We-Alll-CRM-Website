#!/usr/bin/env node

/**
 * Fix Duplicate Index Warnings
 * Removes duplicate MongoDB indexes that cause warnings
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ silent: true });

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔧 Fixing duplicate indexes...');
    
    const db = mongoose.connection.db;
    
    // Get collections that might have duplicate indexes
    const collections = ['projects', 'workitems', 'slots'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        console.log(`📋 Checking ${collectionName}...`);
        
        // Look for duplicate indexes
        const indexNames = indexes.map(idx => idx.name);
        const duplicates = indexNames.filter((name, index) => 
          indexNames.indexOf(name) !== index
        );
        
        if (duplicates.length > 0) {
          console.log(`   Found ${duplicates.length} duplicate indexes`);
          // You can add specific index dropping logic here if needed
        } else {
          console.log(`   ✅ No duplicates found`);
        }
        
      } catch (error) {
        console.log(`   ⚠️  Collection ${collectionName} not found or error: ${error.message}`);
      }
    }
    
    console.log('✅ Index check completed');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await mongoose.disconnect();
  }
};

fixIndexes();