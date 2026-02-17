import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 CHECKING LOGO FILE LOCATION');
console.log('='.repeat(80));

// Check current working directory
console.log('📁 Current Working Directory:', process.cwd());
console.log('');

// Check the path the code uses
const logoPath = path.join(process.cwd(), "backend", "uploads", "We Alll.png");
console.log('🎯 Logo Path (as per code):', logoPath);
console.log('   Exists:', fs.existsSync(logoPath) ? '✅ YES' : '❌ NO');
console.log('');

// Check alternative paths
const altPaths = [
  path.join(process.cwd(), "uploads", "We Alll.png"),
  path.join(__dirname, "..", "uploads", "We Alll.png"),
  "./backend/uploads/We Alll.png",
  "./uploads/We Alll.png",
  "backend/uploads/We Alll.png",
  "uploads/We Alll.png"
];

console.log('🔎 Checking Alternative Paths:');
altPaths.forEach(p => {
  const exists = fs.existsSync(p);
  console.log(`   ${exists ? '✅' : '❌'} ${p}`);
});
console.log('');

// List all PNG files in uploads directory
const uploadsDir = path.join(process.cwd(), "backend", "uploads");
if (fs.existsSync(uploadsDir)) {
  console.log('📂 Files in backend/uploads/:');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png'));
  files.forEach(f => {
    const stats = fs.statSync(path.join(uploadsDir, f));
    console.log(`   ✅ ${f} (${(stats.size / 1024).toFixed(2)} KB)`);
  });
} else {
  console.log('❌ backend/uploads/ directory does not exist!');
}
console.log('');

console.log('='.repeat(80));
console.log('💡 RECOMMENDATION:');
console.log('   If logo file exists but code can\'t find it, the issue is:');
console.log('   - Working directory is different when PM2 runs the app');
console.log('   - Solution: Use absolute path or __dirname-based path');
