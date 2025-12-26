/**
 * Script to save the We ALLL logo
 * 
 * Instructions:
 * 1. Save the We ALLL logo image as 'we-alll-logo.png' in the backend/uploads/ directory
 * 2. The logo should be the colorful "We ALLL" logo with "GROW TOGETHER" tagline
 * 3. Recommended size: 200x200 pixels or larger (will be resized to 80x80 in PDF)
 * 4. Format: PNG with transparent background preferred
 * 
 * The attendance PDF generator will automatically detect and use this logo.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if logo exists
const logoPath = path.join(__dirname, 'uploads', 'we-alll-logo.png');
const logoPathSvg = path.join(__dirname, 'uploads', 'we-alll-logo.svg');
const logoPathJpg = path.join(__dirname, 'uploads', 'we-alll-logo.jpg');

console.log('🔍 Checking for We ALLL logo files...\n');

const logoFiles = [
  { path: logoPath, name: 'we-alll-logo.png', preferred: true },
  { path: logoPathSvg, name: 'we-alll-logo.svg', preferred: true },
  { path: logoPathJpg, name: 'we-alll-logo.jpg', preferred: true }
];

let foundPreferred = false;

logoFiles.forEach(logo => {
  if (fs.existsSync(logo.path)) {
    console.log(`✅ ${logo.name} found at:`, logo.path);
    
    // Get file stats
    const stats = fs.statSync(logo.path);
    console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📅 Last modified: ${stats.mtime.toLocaleString()}`);
    console.log('');
    
    if (logo.preferred) foundPreferred = true;
  } else {
    console.log(`❌ ${logo.name} not found`);
  }
});

if (!foundPreferred) {
  console.log('\n📝 To add the We ALLL logo:');
  console.log('1. Save your colorful We ALLL logo image as "we-alll-logo.png"');
  console.log('2. Place it in the backend/uploads/ directory');
  console.log('3. Or open backend/create-we-alll-logo.html in your browser for a template');
  console.log('4. Run this script again to verify');
}

// List existing logo files
console.log('');
console.log('📁 Existing logo files in uploads:');
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  const logoFiles = files.filter(file => 
    file.toLowerCase().includes('logo') || 
    file.toLowerCase().includes('we') ||
    file.toLowerCase().includes('alll')
  );
  
  if (logoFiles.length > 0) {
    logoFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
  } else {
    console.log('  No logo files found');
  }
} else {
  console.log('  uploads directory not found');
}