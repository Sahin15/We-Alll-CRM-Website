/**
 * RESTORE DOCUMENTS FROM PRODUCTION BACKUP
 * 
 * This script helps restore documents from a production database backup.
 * 
 * Usage:
 * 1. Export documents from production MongoDB:
 *    mongoexport --uri "mongodb+srv://user:pass@prod-cluster/crm-database" \
 *                 --collection documents \
 *                 --out documents-backup.json
 * 
 * 2. Run this script:
 *    node restore-from-production-backup.js documents-backup.json
 */

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function restoreDocuments(backupFile) {
  try {
    // Check if backup file exists
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      console.log('\nTo create a backup from production:');
      console.log('mongoexport --uri "mongodb+srv://user:pass@prod-cluster/crm-database" \\');
      console.log('             --collection documents \\');
      console.log('             --out documents-backup.json');
      process.exit(1);
    }

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read backup file
    const backupData = fs.readFileSync(backupFile, 'utf8');
    const documents = backupData.trim().split('\n').map(line => JSON.parse(line));

    console.log(`📦 Found ${documents.length} documents in backup\n`);

    // Check current count
    const currentCount = await Document.countDocuments();
    console.log(`Current documents in database: ${currentCount}`);

    if (currentCount > 0) {
      console.log('⚠️  Database already has documents. Skipping restore to avoid duplicates.');
      await mongoose.disconnect();
      return;
    }

    // Restore documents
    console.log(`\nRestoring ${documents.length} documents...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        // Remove _id if it exists to let MongoDB generate new ones
        // Or keep it to maintain references
        const result = await Document.create(doc);
        successCount++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`  ✅ Restored ${i + 1}/${documents.length}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error restoring document ${i + 1}: ${error.message}`);
      }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ Restore Complete!`);
    console.log(`  Successfully restored: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`${'═'.repeat(60)}\n`);

    // Verify
    const finalCount = await Document.countDocuments();
    console.log(`Final document count: ${finalCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];

if (!backupFile) {
  console.log('Usage: node restore-from-production-backup.js <backup-file.json>\n');
  console.log('Example:');
  console.log('  node restore-from-production-backup.js documents-backup.json\n');
  console.log('To create a backup from production MongoDB:');
  console.log('  mongoexport --uri "mongodb+srv://user:pass@prod-cluster/crm-database" \\');
  console.log('               --collection documents \\');
  console.log('               --out documents-backup.json\n');
  process.exit(1);
}

restoreDocuments(backupFile);
