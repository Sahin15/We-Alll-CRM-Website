import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Document model
import Document from './src/models/documentModel.js';

const DOCUMENTS_DIR = path.join(__dirname, 'uploads', 'documents');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function cleanupDocuments() {
  try {
    console.log('\n========================================');
    console.log('DOCUMENT CLEANUP UTILITY');
    console.log('========================================\n');

    // Check if documents directory exists
    if (!fs.existsSync(DOCUMENTS_DIR)) {
      console.log(`✗ Documents directory does not exist: ${DOCUMENTS_DIR}`);
      return;
    }

    // Get all files in the documents directory
    const filesInDirectory = fs.readdirSync(DOCUMENTS_DIR);
    const dbDocuments = await Document.find({}).select('filename');
    const dbFilenamesSet = new Set(dbDocuments.map(doc => doc.filename));

    // Find orphaned files
    const orphanedFiles = filesInDirectory.filter(file => !dbFilenamesSet.has(file));

    console.log(`Total files in directory: ${filesInDirectory.length}`);
    console.log(`Total documents in database: ${dbDocuments.length}`);
    console.log(`Orphaned files: ${orphanedFiles.length}\n`);

    if (orphanedFiles.length === 0) {
      console.log('✓ No orphaned files found. Everything is clean!');
      rl.close();
      return;
    }

    console.log('ORPHANED FILES:');
    orphanedFiles.forEach((file, index) => {
      const filePath = path.join(DOCUMENTS_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    console.log('\nOPTIONS:');
    console.log('1. Delete all orphaned files');
    console.log('2. Delete specific orphaned files');
    console.log('3. Remove orphaned database entries');
    console.log('4. Exit without changes');

    const choice = await question('\nSelect an option (1-4): ');

    switch (choice) {
      case '1':
        await deleteAllOrphaned(orphanedFiles);
        break;
      case '2':
        await deleteSpecificOrphaned(orphanedFiles);
        break;
      case '3':
        await removeOrphanedDatabaseEntries();
        break;
      case '4':
        console.log('\nNo changes made.');
        break;
      default:
        console.log('\nInvalid option.');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

async function deleteAllOrphaned(orphanedFiles) {
  const confirm = await question(`\nAre you sure you want to delete ${orphanedFiles.length} orphaned file(s)? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Deletion cancelled.');
    return;
  }

  let deletedCount = 0;
  orphanedFiles.forEach(file => {
    const filePath = path.join(DOCUMENTS_DIR, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`✓ Deleted: ${file}`);
      deletedCount++;
    } catch (error) {
      console.error(`✗ Failed to delete ${file}: ${error.message}`);
    }
  });

  console.log(`\n✓ Successfully deleted ${deletedCount} file(s)`);
}

async function deleteSpecificOrphaned(orphanedFiles) {
  console.log('\nEnter file numbers to delete (comma-separated, e.g., 1,3,5):');
  const input = await question('File numbers: ');
  
  const indices = input.split(',').map(i => parseInt(i.trim()) - 1).filter(i => i >= 0 && i < orphanedFiles.length);
  
  if (indices.length === 0) {
    console.log('No valid file numbers provided.');
    return;
  }

  const filesToDelete = indices.map(i => orphanedFiles[i]);
  const confirm = await question(`\nDelete ${filesToDelete.length} file(s)? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Deletion cancelled.');
    return;
  }

  let deletedCount = 0;
  filesToDelete.forEach(file => {
    const filePath = path.join(DOCUMENTS_DIR, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`✓ Deleted: ${file}`);
      deletedCount++;
    } catch (error) {
      console.error(`✗ Failed to delete ${file}: ${error.message}`);
    }
  });

  console.log(`\n✓ Successfully deleted ${deletedCount} file(s)`);
}

async function removeOrphanedDatabaseEntries() {
  const filesInDirectory = fs.readdirSync(DOCUMENTS_DIR);
  const filesInDirSet = new Set(filesInDirectory);

  const orphanedEntries = await Document.find({}).select('filename originalName');
  const entriesToRemove = orphanedEntries.filter(doc => !filesInDirSet.has(doc.filename));

  if (entriesToRemove.length === 0) {
    console.log('\n✓ No orphaned database entries found.');
    return;
  }

  console.log(`\nFound ${entriesToRemove.length} orphaned database entries:`);
  entriesToRemove.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.originalName} (${entry.filename})`);
  });

  const confirm = await question(`\nDelete these ${entriesToRemove.length} database entries? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Deletion cancelled.');
    return;
  }

  try {
    const filenames = entriesToRemove.map(entry => entry.filename);
    const result = await Document.deleteMany({ filename: { $in: filenames } });
    console.log(`\n✓ Successfully deleted ${result.deletedCount} database entries`);
  } catch (error) {
    console.error(`✗ Failed to delete database entries: ${error.message}`);
  }
}

// Run the cleanup
connectDB().then(() => {
  cleanupDocuments();
});
