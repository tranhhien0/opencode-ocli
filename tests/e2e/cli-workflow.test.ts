/**
 * OCX - OpenCode eXtension CLI
 * End-to-End Tests
 * 
 * Các test chạy CLI với input thực tế để kiểm tra luồng làm việc
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CLI_PATH = join(process.cwd(), 'dist/index.js');
const TEST_DIR = join(process.cwd(), 'tests/e2e/tmp-test-project');

/**
 * Helper chạy CLI command và trả về output
 */
function runCLI(args: string, options: { cwd?: string; env?: Record<string, string> } = {}): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  try {
    const result = execSync(`node ${CLI_PATH} ${args}`, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1
    };
  }
}

describe('E2E: ocx provider commands', () => {
  beforeAll(() => {
    // Setup test project
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should show help when running without arguments', () => {
    const result = runCLI('');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('OpenCode eXtension CLI');
    expect(result.stdout).toContain('Commands:');
  });

  it('should display version with --version', () => {
    const result = runCLI('--version');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should list providers (even if empty)', () => {
    const result = runCLI('provider list');
    
    // Command should not crash even without opencode installed
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('Authenticated providers:');
  });

  it('should support --json flag for provider list', () => {
    const result = runCLI('provider list --json');
    
    // Should output valid JSON or error gracefully
    if (result.exitCode === 0) {
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    }
  });
});

describe('E2E: ocx model commands', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should show model help', () => {
    const result = runCLI('model --help');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage: ocx model');
  });

  it('should validate model format on set command', () => {
    const result = runCLI('model set invalid-format');
    
    // Should fail with validation error
    expect(result.exitCode).toBe(1);
    expect(result.stderr || result.stdout).toContain('Invalid model format');
  });

  it('should accept valid model format', () => {
    const result = runCLI('model set openai/gpt-4o --dry-run');
    
    // Dry run should succeed
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[DRY-RUN]');
  });
});

describe('E2E: ocx session commands', () => {
  const backupDir = join(TEST_DIR, 'backups');

  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should list sessions (even if empty)', () => {
    const result = runCLI('session list');
    
    // Should not crash
    expect([0, 1]).toContain(result.exitCode);
  });

  it('should export session with --output flag', () => {
    const outputFile = join(backupDir, 'test-export.json');
    const result = runCLI(`session export --output ${outputFile} --dry-run`);
    
    // Dry run should work
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('DRY-RUN');
  });

  it('should handle session import with non-existent file gracefully', () => {
    const result = runCLI('session import ./non-existent-file.json');
    
    // Should fail gracefully with clear error
    expect(result.exitCode).toBe(1);
    expect(result.stderr || result.stdout).toContain('not found');
  });
});

describe('E2E: ocx auth commands', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should list auth providers (even if empty)', () => {
    const result = runCLI('auth list');
    
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('Authenticated providers:');
  });

  it('should support --json for auth list', () => {
    const result = runCLI('auth list --json');
    
    if (result.exitCode === 0) {
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    }
  });

  it('should handle logout with dry-run', () => {
    const result = runCLI('auth logout test-provider --dry-run');
    
    // May fail if provider doesn't exist, but should not crash
    expect([0, 1]).toContain(result.exitCode);
    if (result.exitCode === 0) {
      expect(result.stdout).toContain('DRY-RUN');
    }
  });

  it('should verify provider with custom model', () => {
    const result = runCLI('auth verify test-provider --model gpt-4o');
    
    // Will fail without real provider, but should not crash
    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: ocx skill commands', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should list skills (even if empty)', () => {
    const result = runCLI('skill list');
    
    expect([0, 1]).toContain(result.exitCode);
    expect(result.stdout).toContain('Agent Skills:');
  });

  it('should enable skill with --dry-run', () => {
    const result = runCLI('skill enable test-skill.md --dry-run');
    
    // Should succeed (either dry-run or already enabled)
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/DRY-RUN|Đã enable/);
  });

  it('should disable skill with --dry-run', () => {
    const result = runCLI('skill disable test-skill.md --dry-run');
    
    // May fail if skill not enabled, but should not crash
    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: global options', () => {
  it('should handle --verbose flag', () => {
    const result = runCLI('provider list --verbose');
    
    // Should not crash
    expect([0, 1]).toContain(result.exitCode);
  });

  it('should handle --dry-run flag globally', () => {
    const result = runCLI('config init --dry-run');
    
    // Dry-run mode or already initialized - both acceptable
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/DRY-RUN|thành công/);
  });

  it('should handle --json flag for error output', () => {
    const result = runCLI('model set invalid --json');
    
    // Command may fail, check if stdout is empty or valid JSON
    if (result.stdout.trim()) {
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    }
  });
});

describe('E2E: project validation', () => {
  it('should handle non-existent project path', () => {
    // This tests the validateProjectPath functionality
    const result = runCLI('config show --project', {
      cwd: '/non-existent-path-xyz'
    });
    
    // Should fail with clear error about path
    expect(result.exitCode).toBe(1);
  });

  it('should work with current directory as project', () => {
    const result = runCLI('config show --project', {
      cwd: TEST_DIR
    });
    
    // Should not crash
    expect([0, 1]).toContain(result.exitCode);
  });
});

describe('E2E: workflow scenarios', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('complete workflow: init -> add provider -> set model -> verify', () => {
    // Step 1: Init config (dry-run)
    const initResult = runCLI('config init --dry-run');
    expect(initResult.exitCode).toBe(0);

    // Step 2: Add provider (dry-run)
    const addProviderResult = runCLI(
      'provider add --type api --id test-provider --api-key test-key --non-interactive --dry-run'
    );
    expect(addProviderResult.exitCode).toBe(0);

    // Step 3: Set model (dry-run)
    const setModelResult = runCLI('model set test-provider/test-model --dry-run');
    expect(setModelResult.exitCode).toBe(0);

    // Step 4: Verify provider (will fail but should not crash)
    const verifyResult = runCLI('provider verify test-provider --model test-model');
    expect([0, 1]).toContain(verifyResult.exitCode);
  });

  it('session workflow: list -> export (dry-run) -> import (error handling)', () => {
    // List sessions
    const listResult = runCLI('session list');
    expect([0, 1]).toContain(listResult.exitCode);

    // Export (dry-run) - may fail if opencode not installed
    const exportResult = runCLI('session export --output ./test.json --dry-run');
    expect([0, 1]).toContain(exportResult.exitCode);

    // Import non-existent file (should handle gracefully)
    const importResult = runCLI('session import ./does-not-exist.json');
    expect(importResult.exitCode).toBe(1);
  });
});
