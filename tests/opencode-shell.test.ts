/**
 * Tests cho opencode-shell.ts với mocked spawn
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { runOpenCodeCommand } from '../src/lib/opencode-shell.js';

// Mock child_process
vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

const { spawn } = await import('node:child_process');

describe('opencode-shell.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('runOpenCodeCommand', () => {
    it('should execute command and return stdout', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      // Simulate successful execution
      setTimeout(() => {
        mockProc.stdout?.emit('data', Buffer.from('test output'));
        mockProc.emit('close', 0);
      }, 10);

      const result = await runOpenCodeCommand(['test', 'command']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('test output');
    });

    it('should handle stderr output', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      setTimeout(() => {
        mockProc.stderr?.emit('data', Buffer.from('error message'));
        mockProc.emit('close', 1);
      }, 10);

      const result = await runOpenCodeCommand(['failing', 'command']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error message');
    });

    it('should handle ENOENT error (opencode not found)', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      setTimeout(() => {
        mockProc.emit('error', new Error('ENOENT: opencode not found'));
      }, 10);

      await expect(runOpenCodeCommand(['test'])).rejects.toThrow(/Không tìm thấy lệnh/);
    });

    it('should respect verbose option', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      setTimeout(() => {
        mockProc.stdout?.emit('data', Buffer.from('output'));
        mockProc.emit('close', 0);
      }, 10);

      const consoleSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      
      await runOpenCodeCommand(['test'], { verbose: true });
      
      // In verbose mode, output should be written to stdout
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle dry-run mode', async () => {
      const result = await runOpenCodeCommand(['test'], { dryRun: true });
      
      expect(result).toEqual({ stdout: '', stderr: '', exitCode: 0 });
    });
  });
});
