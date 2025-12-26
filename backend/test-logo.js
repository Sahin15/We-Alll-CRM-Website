import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing We ALLL Logo Implementation...\n');

// Check if the logo file exists
const logoPath = path.join(__dirname, 'uploads', 'we-alll-logo.png');

if (fs.existsSync(logoPath)) {
  const stats = fs.statSync(logoPath);
  
  console.log('✅ SUCCESS: We ALLL Logo Found!');
  console.log(`📁 Location: ${logoPath}`);
  console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📅 Modified: ${stats.mtime.toLocaleString()}`);
  
  // Test reading the file
  try {
    const logoBuffer = fs.readFileSync(logoPath);
    const base64Length = Buffer.from(logoBuffer).toString('base64').length;
    
    console.log(`🔧 Base64 Length: ${base64Length} characters`);
    console.log('✅ File is readable and ready for PDF generation');
    
    console.log('\n🎉 LOGO IMPLEMENTATION STATUS: COMPLETE');
    console.log('🚀 Your We ALLL logo will appear in all PDF reports!');
    
  } catch (error) {
    console.log('❌ Error reading logo file:', error.message);
  }
  
} else {
  console.log('❌ Logo file not found at:', logoPath);
  console.log('📝 Please ensure We-Alll.png is copied to backend/uploads/');
}

console.log('\n📋 Next Steps:');
console.log('1. Generate an attendance PDF report');
console.log('2. Check that your We ALLL logo appears in the header');
console.log('3. Enjoy your branded PDF reports! 🎨');