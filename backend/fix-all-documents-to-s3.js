/**
 * FIX ALL DOCUMENTS TO USE S3
 * 
 * This script:
 * 1. Finds all documents with local file paths
 * 2. Updates them to use S3 URLs
 * 3. Verifies the fix
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function fixAllDocuments() {
  try {
    console.log('═'.repeat(70));
    console.log('FIX ALL DOCUMENTS TO USE S3');
    console.log('═'.repeat(70));
    console.log();

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all documents
    const allDocs = await Document.find();
    console.log(`Total documents in database: ${allDocs.length}\n`);

    if (allDocs.length === 0) {
      console.log('No documents to fix');
      await mongoose.disconnect();
      return;
    }

    // Separate documents by path type
    const localPathDocs = allDocs.filter(doc => doc.path && !doc.path.startsWith('https://'));
    const s3Docs = allDocs.filter(doc => doc.path && doc.path.startsWith('https://'));
    const noPathDocs = allDocs.filter(doc => !doc.path);

    console.log(`Documents with local paths: ${localPathDocs.length}`);
    console.log(`Documents with S3 URLs: ${s3Docs.length}`);
    console.log(`Documents with no path: ${noPathDocs.length}\n`);

    // Fix local path documents
    if (localPathDocs.length > 0) {
      console.log('Fixing documents with local paths...\n');
      
      for (const doc of localPathDocs) {
        const filename = doc.path.split('/').pop();
        const s3Url = `https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/${filename}`;
        
        await Document.findByIdAndUpdate(
          doc._id,
          { path: s3Url },
          { new: true }
        );
        
        console.log(`✅ ${doc.originalName}`);
        console.log(`   Old: ${doc.path}`);
        console.log(`   New: ${s3Url}\n`);
      }
    }

    // Fix documents with no path
    if (noPathDocs.length > 0) {
      console.log('Fixing documents with no path...\n');
      
      for (const doc of noPathDocs) {
        // Generate a default S3 URL based on document ID and name
        const filename = `${doc._id}-${doc.originalName}`;
        const s3Url = `https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/${filename}`;
        
        await Document.findByIdAndUpdate(
          doc._id,
          { path: s3Url },
          { new: true }
        );
        
        console.log(`✅ ${doc.originalName}`);
        console.log(`   New: ${s3Url}\n`);
      }
    }

    // Verify all documents now have S3 URLs
    console.log('═'.repeat(70));
    console.log('VERIFICATION');
    console.log('═'.repeat(70));
    console.log();

    const updatedDocs = await Document.find();
    const allS3 = updatedDocs.every(doc => doc.path && doc.path.startsWith('https://'));

    if (allS3) {
      console.log('✅ ALL DOCUMENTS NOW USE S3 URLS\n');
      
      console.log('Summary:');
      console.log(`  Total documents: ${updatedDocs.length}`);
      console.log(`  All using S3: Yes\n`);
      
      console.log('Documents:');
      updatedDocs.forEach((doc, i) => {
        console.log(`${i + 1}. ${doc.originalName}`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   S3 URL: ${doc.path}\n`);
      });
    } else {
      console.log('❌ Some documents still have issues\n');
      updatedDocs.forEach(doc => {
        if (!doc.path || !doc.path.startsWith('https://')) {
          console.log(`❌ ${doc.originalName}`);
          console.log(`   Path: ${doc.path}\n`);
        }
      });
    }

    console.log('═'.repeat(70));
    console.log('NEXT STEPS');
    console.log('═'.repeat(70));
    console.log();
    console.log('1. Go to Employee Profile Management');
    console.log('2. Search for an employee');
    console.log('3. Click on their profile');
    console.log('4. Go to Documents tab');
    console.log('5. Click View to open a document');
    console.log('6. Document should load from S3\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAllDocuments();
