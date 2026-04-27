import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function fixPaths() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find all documents with local file paths
    const docs = await Document.find({ 
      path: { $regex: '^/root' } 
    });

    console.log(`Found ${docs.length} documents with local file paths\n`);

    if (docs.length === 0) {
      console.log('No documents to fix');
      await mongoose.disconnect();
      return;
    }

    // Update each document to use S3 URL
    for (const doc of docs) {
      const oldPath = doc.path;
      
      // Create S3 URL based on filename
      const filename = oldPath.split('/').pop();
      const s3Url = `https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/${filename}`;
      
      doc.path = s3Url;
      await doc.save();
      
      console.log(`✅ Updated: ${doc.originalName}`);
      console.log(`   Old: ${oldPath}`);
      console.log(`   New: ${s3Url}\n`);
    }

    console.log('═'.repeat(60));
    console.log(`✅ FIXED ${docs.length} DOCUMENTS`);
    console.log('═'.repeat(60));
    console.log('\nNow:');
    console.log('1. Go to Employee Profile Management');
    console.log('2. Search for Gopal Chandra Paul');
    console.log('3. Click on his profile');
    console.log('4. Go to Documents tab');
    console.log('5. Click View to open the document\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixPaths();
