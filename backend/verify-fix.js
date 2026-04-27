import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Force a fresh query
    const doc = await Document.findById('69e5cd254e7082fb299b7624').lean();
    
    console.log('Document path:');
    console.log(doc.path);
    
    if (doc.path.startsWith('https://')) {
      console.log('\n✅ Path is now S3 URL');
    } else {
      console.log('\n❌ Path is still local');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
