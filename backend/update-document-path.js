import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function updatePath() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected\n');

    const docId = '69e5cd254e7082fb299b7624';
    const newPath = 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/document-1776667941928-495801689.jpg';

    console.log(`Updating document ${docId}...`);
    console.log(`New path: ${newPath}\n`);

    const result = await Document.findByIdAndUpdate(
      docId,
      { path: newPath },
      { new: true }
    );

    if (result) {
      console.log('✅ Updated successfully');
      console.log(`Path: ${result.path}\n`);
    } else {
      console.log('❌ Document not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePath();
