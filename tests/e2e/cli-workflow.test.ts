/**
 * OCX - OpenCode eXtension CLI
 * End-to-End Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const CLI_PATH = join(process.cwd(), 'dist/index.js');
const TEST_DIR = join(process.cwd(), 'tests/e2e/tmp-test-project');

function runCLI(args: string, options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const timeout = options.timeout ?? 15000;
  const argsList = args.trim() ? args.trim().split(/\s+/) : [];

  return new Promise((resolve) => {
    const proc = spawn('node', [CLI_PATH, ...argsList], {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!killed) resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: 1 });
    });
  });
}

describe('E2E: ocx basic commands', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should show help when running without arguments', async () => {
    const result = await runCLI('');

    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout + result.stderr).toContain('OpenCode eXtension CLI');
    expect(result.stdout + result.stderr).toContain('Commands:');
  });

  it('should display version with --version', async () => {
    const result = await runCLI('--version');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should list providers without crashing', async () => {
    const result = await runCLI('provider list');

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: ocx model commands', () => {
  it('should show model help', async () => {
    const result = await runCLI('model --help');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: ocx model');
  });

  it('should validate model format on set command', async () => {
    const result = await runCLI('model set invalid-format');

    expect(result.exitCode).toBe(1);
    expect(result.stderr || result.stdout).toContain('Invalid model format');
  });

  it('should accept valid model format with dry-run', async () => {
    const result = await runCLI('model set openai/gpt-4o --dry-run');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Đã set model mặc định');
  });
});

describe('E2E: ocx session commands', () => {
  it('should list sessions without crashing', async () => {
    const result = await runCLI('session list');

    expect([0, 1]).toContain(result.exitCode);
  });

  it('should export session with dry-run', async () => {
    const result = await runCLI('session export --output /tmp/ocx-test-export.json --dry-run');

    expect([0, 1]).toContain(result.exitCode);
  });

  it('should handle session import with non-existent file', async () => {
    const result = await runCLI('session import ./non-existent-file.json');

    expect(result.exitCode).toBe(1);
    expect(result.stderr || result.stdout).toContain('not found');
  });
});

describe('E2E: ocx auth commands', () => {
  it('should list auth providers without crashing', async () => {
    const result = await runCLI('auth list');

    expect([0, 1]).toContain(result.exitCode);
  });

  it('should handle logout with dry-run', async () => {
    const result = await runCLI('auth logout test-provider --dry-run');

    expect([0, 1]).toContain(result.exitCode);
  });

  it('should verify provider without crashing', async () => {
    const result = await runCLI('auth verify test-provider --model gpt-4o');

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: ocx skill commands', () => {
  it('should list skills', async () => {
    const result = await runCLI('skill list');

    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('OpenCode Skills:');
  });

  it('should handle enable for non-existent skill', async () => {
    const result = await runCLI('skill enable test-skill.md --dry-run');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('chưa tồn tại');
  });

  it('should handle disable without --force', async () => {
    const result = await runCLI('skill disable test-skill.md');

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--force');
  });
});

describe('E2E: ocx config commands', () => {
  it('should handle --dry-run flag for config init', async () => {
    const result = await runCLI('config init --dry-run');

    expect(result.exitCode).toBe(0);
  });

  it('should validate config', async () => {
    const result = await runCLI('config validate');

    expect([0, 1]).toContain(result.exitCode);
  });

  it('should show config', async () => {
    const result = await runCLI('config show');

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: ocx doctor command', () => {
  it('should run doctor check', async () => {
    const result = await runCLI('doctor');

    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('OCX Doctor');
  });

  it('should run doctor with --json', async () => {
    const result = await runCLI('doctor --json');

    expect(result.exitCode).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});

describe('E2E: global options', () => {
  it('should handle --verbose flag', async () => {
    const result = await runCLI('provider list --verbose');

    expect([0, 1]).toContain(result.exitCode);
  });

  it('should handle --json flag for error output', async () => {
    const result = await runCLI('model set invalid --json');

    if (result.stdout.trim()) {
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    }
  });
});

describe('E2E: project validation', () => {
  it('should handle non-existent project path', async () => {
    const result = await runCLI('config show --project', {
      cwd: '/non-existent-path-xyz'
    });

    expect(result.exitCode).toBe(1);
  });

  it('should work with current directory as project', async () => {
    const result = await runCLI('config show --project', {
      cwd: TEST_DIR
    });

    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: workflow scenarios', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('complete workflow: init -> add provider -> set model', async () => {
    const initResult = await runCLI('config init --dry-run');
    expect(initResult.exitCode).toBe(0);

    const addProviderResult = await runCLI(
      'provider add --type api --id test-provider --api-key test-key --non-interactive --dry-run'
    );
    expect(addProviderResult.exitCode).toBe(0);

    const setModelResult = await runCLI('model set test-provider/test-model --dry-run');
    expect(setModelResult.exitCode).toBe(0);
  });

  it('session workflow: list -> export (dry-run) -> import (error handling)', async () => {
    const listResult = await runCLI('session list');
    expect([0, 1]).toContain(listResult.exitCode);

    const exportResult = await runCLI('session export --output ./test.json --dry-run');
    expect([0, 1]).toContain(exportResult.exitCode);

    const importResult = await runCLI('session import ./does-not-exist.json');
    expect(importResult.exitCode).toBe(1);
  });
});
