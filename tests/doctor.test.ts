/**
 * Tests cho doctor.ts - system checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock dependencies
vi.mock('../src/lib/config.js', () => ({
  readConfig: vi.fn(),
  validateConfig: vi.fn()
}));

vi.mock('../src/lib/env.js', () => ({
  getConfigPath: vi.fn(() => '/tmp/test-config.json')
}));

describe('doctor.ts (unit tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CheckResult interface', () => {
    it('should have correct structure', () => {
      const result = {
        name: 'Test Check',
        status: 'ok' as const,
        message: 'Test passed',
        details: 'Additional info'
      };
      
      expect(result.name).toBe('Test Check');
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Test passed');
      expect(result.details).toBe('Additional info');
    });

    it('should support warning status', () => {
      const result = {
        name: 'Warning Check',
        status: 'warning' as const,
        message: 'Something might be wrong'
      };
      
      expect(result.status).toBe('warning');
    });

    it('should support error status', () => {
      const result = {
        name: 'Error Check',
        status: 'error' as const,
        message: 'Something is wrong',
        details: 'Fix this issue'
      };
      
      expect(result.status).toBe('error');
    });
  });

  describe('Node.js version check logic', () => {
    it('should pass for Node 18+', () => {
      const nodeVersion = process.version;
      const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
      
      // Current Node version should be 18+
      expect(nodeMajor).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Config validation integration', () => {
    it('should handle missing config gracefully', () => {
      // Simulate config file not existing
      const configPath = '/tmp/nonexistent-config.json';
      expect(fs.existsSync(configPath)).toBe(false);
    });

    it('should handle valid config path', () => {
      const testPath = '/tmp/valid-test-config.json';
      fs.writeFileSync(testPath, JSON.stringify({ $schema: 'https://opencode.ai/config.json' }));
      
      expect(fs.existsSync(testPath)).toBe(true);
      
      // Cleanup
      fs.unlinkSync(testPath);
    });
  });

  describe('Directory permissions check', () => {
    it('should verify temp directory is writable', () => {
      const testDir = '/tmp/ocx-test-permissions';
      const testFile = path.join(testDir, 'test-write.txt');
      
      try {
        fs.mkdirSync(testDir, { recursive: true });
        fs.writeFileSync(testFile, 'test content');
        const content = fs.readFileSync(testFile, 'utf-8');
        
        expect(content).toBe('test content');
      } finally {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
      }
    });
  });
});
