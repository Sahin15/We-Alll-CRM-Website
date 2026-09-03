import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const routesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/routes');

for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'))) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('authorizeRoles')) continue;

  const uses = (content.match(/authorizeRoles\(/g) || []).length;
  if (uses > 0) continue;

  content = content.replace(
    /import \{ authorizeRoles \} from ['"]\.\.\/middleware\/authMiddleware\.js['"];\n?/g,
    ''
  );
  content = content.replace(/\nimport \{ protect \} from '\.\.\/middleware\/authMiddleware\.js';\n\n/g, '\nimport { protect } from "../middleware/authMiddleware.js";\n');
  fs.writeFileSync(filePath, content);
  console.log('removed unused import:', file);
}
