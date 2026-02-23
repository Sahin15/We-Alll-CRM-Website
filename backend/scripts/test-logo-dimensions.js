import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 CHECKING LOGO FILES');
console.log('='.repeat(80));

const logoFiles = [
  'We Alll.png',
  'We Alll Office Logo.png',
  'we-alll-logo.png',
  'Wealll_mini.png'
];

const uploadsDir = path.join(process.cwd(), 'backend', 'uploads');

console.log('📁 Uploads directory:', uploadsDir);
console.log('');

logoFiles.forEach(filename => {
  const logoPath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(logoPath)) {
    const stats = fs.statSync(logoPath);
    console.log(`✅ ${filename}`);
    console.log(`   Path: ${logoPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log('');
  } else {
    console.log(`❌ ${filename} - NOT FOUND`);
    console.log('');
  }
});

console.log('='.repeat(80));
console.log('\n📋 LOGO PRIORITY ORDER (as per code):');
console.log('1. We Alll.png (full logo)');
console.log('2. We Alll Office Logo.png (full logo)');
console.log('3. we-alll-logo.png (full logo)');
console.log('4. Wealll_mini.png (mini logo - fallback)');
console.log('');
console.log('✅ The code will use the first available logo from this list.');
console.log('   Logo will be constrained to 100x50 pixels with aspect ratio preserved.');
console.log('   Text starts at x=180, giving 30px gap after logo (50 + 100 + 30 = 180).');
