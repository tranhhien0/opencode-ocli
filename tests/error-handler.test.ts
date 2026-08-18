/**
 * Tests cho error-handler.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  classifyError, 
  createOCXError,
  printError,
  printSuccess,
  printWarning,
  printInfo,
  withErrorHandling 
} from '../src/lib/error-handler.js';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('error-handler.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined as never;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = new Error('Network error: fetch failed');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('network');
      expect(classified.suggestion).toContain('mạng');
    });

    it('should classify permission errors', () => {
      const error = new Error('EACCES: permission denied');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('permission');
      expect(classified.suggestion).toContain('phân quyền');
    });

    it('should classify not found errors', () => {
      const error = new Error('ENOENT: no such file or directory');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('not_found');
      expect(classified.suggestion).toContain('provider list');
    });

    it('should classify invalid config errors', () => {
      const error = new Error('Invalid JSON: syntax error');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('invalid_config');
      expect(classified.suggestion).toContain('validate');
    });

    it('should classify auth errors', () => {
      const error = new Error('Invalid API key provided');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('auth_failed');
      expect(classified.suggestion).toContain('auth');
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timed out: ETIMEDOUT');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('timeout');
      expect(classified.suggestion).toContain('hết thời gian chờ');
    });

    it('should classify unknown errors for unrecognized messages', () => {
      const error = new Error('Some random error message');
      const classified = classifyError(error);
      
      expect(classified.type).toBe('unknown');
      expect(classified.suggestion).toContain('--verbose');
    });

    it('should handle already classified errors', () => {
      const ocxError = createOCXError('Test error', 'network', 'Test suggestion');
      const classified = classifyError(ocxError);
      
      expect(classified.type).toBe('network');
      expect(classified.suggestion).toBe('Test suggestion');
    });
  });

  describe('createOCXError', () => {
    it('should create error with default type', () => {
      const error = createOCXError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.type).toBe('unknown');
    });

    it('should create error with custom type and suggestion', () => {
      const error = createOCXError(
        'Config error',
        'invalid_config',
        'Fix your config',
        { field: 'model' }
      );
      
      expect(error.type).toBe('invalid_config');
      expect(error.suggestion).toBe('Fix your config');
      expect(error.details).toEqual({ field: 'model' });
    });
  });

  describe('printError', () => {
    it('should print error with classification', () => {
      const error = new Error('Permission denied');
      printError(error);
      
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls.some(c => c.join(' ').includes('LỖI'))).toBe(true);
    });

    it('should show stack trace in verbose mode', () => {
      const error = new Error('Test error');
      error.stack = 'Stack trace here';
      printError(error, { showStack: true });
      
      expect(mockConsoleError.mock.calls.some(c => c.join(' ').includes('Stack trace'))).toBe(true);
    });
  });

  describe('printSuccess', () => {
    it('should print success message with green checkmark', () => {
      printSuccess('Operation completed');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Operation completed'));
    });
  });

  describe('printWarning', () => {
    it('should print warning message with yellow color', () => {
      printWarning('This is a warning');
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('⚠ This is a warning'));
    });
  });

  describe('printInfo', () => {
    it('should print info message with cyan color', () => {
      printInfo('Information message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('ℹ Information message'));
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withErrorHandling(fn);
      
      expect(result).toBe('success');
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should handle error with custom handler', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const errorHandler = vi.fn();
      
      // Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      process.exit = vi.fn() as never;
      
      try {
        await withErrorHandling(fn, errorHandler);
        expect(errorHandler).toHaveBeenCalled();
      } finally {
        process.exit = originalExit;
      }
    });
  });
});
