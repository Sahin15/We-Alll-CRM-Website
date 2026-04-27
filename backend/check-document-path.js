import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function checkPath() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const doc = await Document.findById('69e5cd254e7082fb299b7624');
    
    if (!doc) {
      console.log('Document not found');
      await mongoose.disconnect();
      return;
    }

    console.log('Document found:');
    console.log(`  Name: ${doc.originalName}`);
    console.log(`  Path: ${doc.path}`);
    console.log(`  Category: ${doc.category}`);
    console.log(`  Status: ${doc.verificationStatus}`);
    console.log(`  Size: ${doc.size}`);
    console.log(`  MIME: ${doc.mimetype}`);
    
    // Check if it's an S3 URL
    if (doc.path && doc.path.startsWith('https://')) {
      console.log('\n✅ This is an S3 URL - should work');
      console.log(`  URL: ${doc.path}`);
    } else {
      console.log('\n❌ This is a local file path');
      console.log(`  Path: ${doc.path}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkPath();
