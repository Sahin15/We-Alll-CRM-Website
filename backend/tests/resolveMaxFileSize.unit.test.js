import { jest } from '@jest/globals';
import { resolveMaxFileSizeBytes } from '../src/config/awsConfig.js';

describe('resolveMaxFileSizeBytes', () => {
  const originalEnv = process.env.MAX_FILE_SIZE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MAX_FILE_SIZE;
    } else {
      process.env.MAX_FILE_SIZE = originalEnv;
    }
  });

  test('defaults to 25MB when env is unset', () => {
    delete process.env.MAX_FILE_SIZE;
    expect(resolveMaxFileSizeBytes()).toBe(25 * 1024 * 1024);
  });

  test('treats small values as megabytes', () => {
    process.env.MAX_FILE_SIZE = '25';
    expect(resolveMaxFileSizeBytes()).toBe(25 * 1024 * 1024);
  });

  test('accepts explicit byte values', () => {
    process.env.MAX_FILE_SIZE = '26214400';
    expect(resolveMaxFileSizeBytes()).toBe(26214400);
  });
});
