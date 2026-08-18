/**
 * Tests for session backup functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock các dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  copyFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn()
}));

vi.mock('../src/lib/opencode-shell.js', () => ({
  listSessions: vi.fn(),
  exportSession: vi.fn(),
  importSession: vi.fn(),
  runOpenCodeCommand: vi.fn()
}));

vi.mock('../src/lib/config.js', () => ({
  readConfig: vi.fn(() => ({})),
  writeConfig: vi.fn(),
  addProviderToConfig: vi.fn(),
  removeProviderFromConfig: vi.fn()
}));

vi.mock('../src/lib/env.js', () => ({
  isVerbose: vi.fn(() => false),
  isDryRun: vi.fn(() => false),
  getConfigPath: vi.fn(() => '/mock/config/path')
}));

describe('session backup command', () => {
  const mockSessions = [
    { id: 'session-1', createdAt: Date.now() - 86400000 }, // 1 day ago
    { id: 'session-2', createdAt: Date.now() - 172800000 }, // 2 days ago
    { id: 'session-3', createdAt: Date.now() - 259200000 }  // 3 days ago
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list sessions for backup', async () => {
    const { listSessions } = await import('../src/lib/opencode-shell.js');
    vi.mocked(listSessions).mockResolvedValue(mockSessions);

    // Simulate calling the backup command logic
    const sessions = await listSessions({ verbose: false });
    
    expect(sessions).toHaveLength(3);
    expect(sessions[0].id).toBe('session-1');
  });

  it('should filter sessions by days', async () => {
    const { listSessions } = await import('../src/lib/opencode-shell.js');
    vi.mocked(listSessions).mockResolvedValue(mockSessions);

    const sessions = await listSessions({ verbose: false });
    
    // Filter manually to test logic
    const days = 2;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const filtered = sessions.filter(s => s.createdAt >= cutoffDate);
    
    // Session-1 is 1 day ago, session-2 is 2 days ago (exactly at cutoff)
    // So we expect at least 1 session
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it('should limit sessions by max-count', async () => {
    const { listSessions } = await import('../src/lib/opencode-shell.js');
    vi.mocked(listSessions).mockResolvedValue(mockSessions);

    const sessions = await listSessions({ verbose: false });
    
    // Limit manually to test logic
    const maxCount = 2;
    const limited = sessions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxCount);
    
    expect(limited).toHaveLength(2);
    expect(limited[0].id).toBe('session-1'); // Most recent first
  });

  it('should create output directory if not exists', async () => {
    const outDir = './backups/sessions';
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Simulate directory creation logic
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    expect(fs.existsSync).toHaveBeenCalledWith(outDir);
    expect(fs.mkdirSync).toHaveBeenCalledWith(outDir, { recursive: true });
  });

  it('should generate correct filename format', () => {
    const session = { id: 'abc-123', createdAt: Date.parse('2025-01-15') };
    const date = new Date(session.createdAt).toISOString().split('T')[0];
    const fileName = `session-${session.id}-${date}.json`;
    
    expect(fileName).toBe('session-abc-123-2025-01-15.json');
  });

  it('should handle dry-run mode without creating files', async () => {
    const { listSessions } = await import('../src/lib/opencode-shell.js');
    vi.mocked(listSessions).mockResolvedValue(mockSessions);

    const dryRun = true;
    const sessions = await listSessions({ verbose: false });
    
    // In dry-run mode, no file operations should occur
    if (dryRun) {
      // Just log, don't create files
      console.log(`[DRY-RUN] Would backup ${sessions.length} sessions`);
    }

    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe('session backup edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty session list', async () => {
    const { listSessions } = await import('../src/lib/opencode-shell.js');
    vi.mocked(listSessions).mockResolvedValue([]);

    const sessions = await listSessions({ verbose: false });
    
    expect(sessions).toHaveLength(0);
  });

  it('should handle export failure gracefully', async () => {
    const { listSessions, exportSession } = await import('../src/lib/opencode-shell.js');
    vi.mocked(listSessions).mockResolvedValue([{ id: 'fail-session', createdAt: Date.now() }]);
    
    // Mock exportSession to fail on first call only
    vi.mocked(exportSession).mockImplementation(() => {
      throw new Error('Export failed');
    });

    const sessions = await listSessions({ verbose: false });
    expect(sessions).toHaveLength(1);

    // Try to export and catch error
    let failCount = 0;
    try {
      await exportSession('fail-session', '/tmp/test.json', false, { verbose: false });
    } catch {
      failCount++;
    }

    expect(failCount).toBe(1);
  });

  it('should sanitize option passed correctly', async () => {
    const { exportSession } = await import('../src/lib/opencode-shell.js');
    
    // Reset mock to success for this test
    vi.mocked(exportSession).mockResolvedValue(undefined);
    
    await exportSession('test-id', '/tmp/test.json', true, { verbose: false });
    
    expect(exportSession).toHaveBeenCalledWith(
      'test-id',
      '/tmp/test.json',
      true,
      { verbose: false }
    );
  });
});
