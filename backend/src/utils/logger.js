/**
 * Environment-aware logger utility
 * Only logs in development, silent in production for performance
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args) => {
    if (isDevelopment) {
      console.log('ℹ️', ...args);
    }
  },
  
  success: (...args) => {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('⚠️', ...args);
    }
  },
  
  error: (...args) => {
    // Always log errors
    console.error('❌', ...args);
  },
  
  debug: (...args) => {
    if (isDevelopment && process.env.DEBUG) {
      console.log('🐛', ...args);
    }
  }
};

export default logger;
