#!/usr/bin/env node
/**
 * Print Authorization V2 Phase 9 rollout status from backend/.env.
 * Usage: npm run authz:rollout-status
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAuthzRolloutStatus } from '../src/authz/rolloutStatus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const status = getAuthzRolloutStatus();

console.log('Authorization V2 — Rollout Status');
console.log('================================');
console.log(`Env file:     ${envPath}`);
console.log(`Enforce:      ${status.enforce ? 'ON' : 'off'}`);
console.log(`Shadow mode:  ${status.shadowMode ? 'ON' : 'off'}`);
console.log(`Modules:      ${status.enabledModuleCount}/${status.totalModules} enabled`);
console.log('');

for (const wave of status.waves) {
  const marker = wave.complete ? '[done]' : wave.enabledCount > 0 ? '[partial]' : '[ ]';
  console.log(`${marker} Wave ${wave.id}: ${wave.name} (${wave.enabledCount}/${wave.modules.length})`);
  for (const moduleName of wave.modules) {
    const mod = status.modules.find((m) => m.name === moduleName);
    console.log(`       ${mod?.enabled ? '✓' : '·'} ${moduleName}`);
  }
}

if (status.nextWave) {
  console.log('');
  console.log(`Next wave: ${status.nextWave.id} — ${status.nextWave.name}`);
  console.log(`  Backend:  ${status.nextWave.modules.map((m) => `AUTHZ_V2_${m.toUpperCase()}=true`).join(', ')}`);
  console.log(
    `  Frontend: ${status.nextWave.modules.map((m) => `VITE_AUTHZ_V2_${m.toUpperCase()}=true`).join(', ')}`
  );
}
