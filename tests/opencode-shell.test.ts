import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { runOpenCodeCommand } from '../src/lib/opencode-shell.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
const { spawn } = await import('node:child_process');

type MockProc = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
  killed: boolean;
};

function createMockProc(): MockProc {
  const proc = new EventEmitter() as MockProc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn(() => true);
  proc.killed = false;
  return proc;
}

describe('opencode-shell.ts', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.resetAllMocks());

  it('should execute command and return stdout', async () => {
    const proc = createMockProc();
    vi.mocked(spawn).mockReturnValue(proc as any);
    setTimeout(() => { proc.stdout.emit('data', Buffer.from('test output')); proc.emit('close', 0); }, 10);
    const result = await runOpenCodeCommand(['test', 'command']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test output');
  });

  it('should handle stderr output', async () => {
    const proc = createMockProc();
    vi.mocked(spawn).mockReturnValue(proc as any);
    setTimeout(() => { proc.stderr.emit('data', Buffer.from('error message')); proc.emit('close', 1); }, 10);
    const result = await runOpenCodeCommand(['failing', 'command']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('error message');
  });

  it('should handle ENOENT error', async () => {
    const proc = createMockProc();
    vi.mocked(spawn).mockReturnValue(proc as any);
    setTimeout(() => proc.emit('error', Object.assign(new Error('opencode not found'), { code: 'ENOENT' })), 10);
    await expect(runOpenCodeCommand(['test'])).rejects.toThrow(/Không tìm thấy lệnh/);
  });

  it('should keep verbose output on stderr', async () => {
    const proc = createMockProc();
    vi.mocked(spawn).mockReturnValue(proc as any);
    setTimeout(() => { proc.stdout.emit('data', Buffer.from('output')); proc.emit('close', 0); }, 10);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await runOpenCodeCommand(['test'], { verbose: true });
    expect(stderrSpy).toHaveBeenCalled();
    stderrSpy.mockRestore();
  });

  it('should handle dry-run mode', async () => {
    const result = await runOpenCodeCommand(['test'], { dryRun: true });
    expect(result).toEqual({ stdout: '', stderr: '', exitCode: 0 });
  });

  it('should terminate on timeout', async () => {
    const proc = createMockProc();
    vi.mocked(spawn).mockReturnValue(proc as any);
    await expect(runOpenCodeCommand(['hang'], { timeout: 10 })).rejects.toThrow(/timed out/);
    expect(proc.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
