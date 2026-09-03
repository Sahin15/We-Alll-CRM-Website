#!/usr/bin/env node
/**
 * Authorization V2 configuration validation CLI.
 * Usage: npm run authz:validate
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  runAuthzConfigValidation,
  formatValidationReport,
} from '../src/authz/configValidator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

dotenv.config({ path: envPath });

const report = runAuthzConfigValidation({ backendRoot });
const output = formatValidationReport(report);

console.log(output);

if (report.summary.errorCount > 0) {
  process.exit(1);
}

process.exit(0);
