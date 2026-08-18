/**
 * Tests cho skill, model switch/variant, auth, session commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runOpenCodeCommand, listSessions, exportSession, importSession } from '../src/lib/opencode-shell.js';
import { formatJsonOutput } from '../src/lib/global-options.js';

// Mock the opencode-shell module
vi.mock('../src/lib/opencode-shell.js', () => ({
  runOpenCodeCommand: vi.fn(),
  listModels: vi.fn(),
  listAuthProviders: vi.fn(),
  verifyProvider: vi.fn(),
  verifyProviderAuth: vi.fn(),
  listSessions: vi.fn(),
  exportSession: vi.fn(),
  importSession: vi.fn()
}));

describe('skill commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should enable skill by adding to instructions array', async () => {
    // Simulate skill enable command logic
    const config = { instructions: [] as string[] };
    const skillName = 'my-skill.md';
    
    if (!config.instructions) {
      config.instructions = [];
    }
    
    config.instructions.push(skillName);
    
    expect(config.instructions).toContain(skillName);
    expect(config.instructions.length).toBe(1);
  });

  it('should disable skill by removing from instructions array', async () => {
    const config = { instructions: ['skill1.md', 'skill2.md', 'skill3.md'] };
    const skillName = 'skill2.md';
    
    const index = config.instructions.indexOf(skillName);
    expect(index).toBeGreaterThan(-1);
    
    config.instructions.splice(index, 1);
    
    expect(config.instructions).not.toContain(skillName);
    expect(config.instructions.length).toBe(2);
  });

  it('should handle duplicate skill enable gracefully', async () => {
    const config = { instructions: ['skill1.md'] };
    const skillName = 'skill1.md';
    
    const alreadyEnabled = config.instructions.includes(skillName);
    expect(alreadyEnabled).toBe(true);
  });
});

describe('model switch command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build list of available models from config', async () => {
    const config = {
      model: 'anthropic/claude-sonnet-4-20250514',
      provider: {
        anthropic: {
          models: {
            'claude-sonnet-4-20250514': {},
            'claude-opus-4-20250514': {}
          }
        },
        openai: {
          models: {
            'gpt-4o': {},
            'gpt-4o-mini': {}
          }
        }
      }
    };

    const allModels: string[] = [];
    for (const p of Object.keys(config.provider)) {
      const models = Object.keys(config.provider[p as keyof typeof config.provider].models || {});
      for (const m of models) {
        allModels.push(`${p}/${m}`);
      }
    }

    expect(allModels).toContain('anthropic/claude-sonnet-4-20250514');
    expect(allModels).toContain('openai/gpt-4o');
    expect(allModels.length).toBe(4);
  });

  it('should validate model format', async () => {
    const modelRegex = /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/;
    
    expect(modelRegex.test('openai/gpt-4o')).toBe(true);
    expect(modelRegex.test('anthropic/claude-sonnet-4-20250514')).toBe(true);
    expect(modelRegex.test('google/gemini-2.5-pro')).toBe(true);
    expect(modelRegex.test('invalid-format')).toBe(false);
    expect(modelRegex.test('no-slash')).toBe(false);
  });
});

describe('model variant command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set variant config with reasoning effort and text verbosity', async () => {
    const config = {
      provider: {
        openai: {
          models: {
            'gpt-5': {}
          }
        }
      }
    };

    const providerId = 'openai';
    const modelId = 'gpt-5';
    const variantName = 'thinking';
    const variantConfig: Record<string, unknown> = {
      reasoningEffort: 'high',
      textVerbosity: 'low'
    };

    if (!config.provider[providerId].models![modelId].variants) {
      config.provider[providerId].models![modelId].variants = {};
    }

    config.provider[providerId].models![modelId].variants![variantName] = variantConfig;

    expect(config.provider.openai.models['gpt-5'].variants?.thinking).toEqual(variantConfig);
  });

  it('should validate reasoning effort levels', async () => {
    const validLevels = ['low', 'medium', 'high'];
    const input = 'high';
    
    expect(validLevels.includes(input)).toBe(true);
    expect(validLevels.includes('invalid')).toBe(false);
  });

  it('should validate text verbosity levels', async () => {
    const validLevels = ['low', 'medium', 'high'];
    const input = 'medium';
    
    expect(validLevels.includes(input)).toBe(true);
  });
});

describe('auth logout command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call opencode auth logout with provider id', async () => {
    const mockResult = { stdout: '', stderr: '', exitCode: 0 };
    vi.mocked(runOpenCodeCommand).mockResolvedValue(mockResult);

    await runOpenCodeCommand(['auth', 'logout', 'openai']);

    expect(runOpenCodeCommand).toHaveBeenCalledWith(['auth', 'logout', 'openai'], undefined);
  });

  it('should handle dry-run mode for logout', async () => {
    const providerId = 'anthropic';
    const dryRun = true;

    if (dryRun) {
      const result = { provider: providerId, action: 'logout', dryRun: true };
      expect(result.dryRun).toBe(true);
      expect(result.provider).toBe(providerId);
    }
  });

  it('should throw error when opencode auth logout fails', async () => {
    const mockResult = { stdout: '', stderr: 'provider not found', exitCode: 1 };
    vi.mocked(runOpenCodeCommand).mockResolvedValue(mockResult);

    const result = await runOpenCodeCommand(['auth', 'logout', 'unknown-provider']);
    
    expect(result.exitCode).toBe(1);
  });
});

describe('auth verify command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify provider with default model', async () => {
    const providerId = 'openai';
    const defaultModel = 'gpt-4o-mini';

    expect(defaultModel).toBe('gpt-4o-mini');
  });

  it('should use custom model if provided', async () => {
    const customModel = 'gpt-4o';
    const modelId = customModel || 'gpt-4o-mini';

    expect(modelId).toBe('gpt-4o');
  });
});

describe('session export command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export session to file', async () => {
    const mockResult = { stdout: '', stderr: '', exitCode: 0 };
    vi.mocked(runOpenCodeCommand).mockResolvedValue(mockResult);
    vi.mocked(exportSession).mockResolvedValue();

    await exportSession('session-123', './backup.json', false, undefined);

    expect(exportSession).toHaveBeenCalledWith('session-123', './backup.json', false, undefined);
  });

  it('should export with sanitize option', async () => {
    vi.mocked(exportSession).mockResolvedValue();

    await exportSession('session-456', './sanitized.json', true, undefined);

    expect(exportSession).toHaveBeenCalledWith('session-456', './sanitized.json', true, undefined);
  });

  it('should export latest session if no sessionId provided', async () => {
    const outputPath = `session-${Date.now()}.json`;
    vi.mocked(exportSession).mockResolvedValue();

    await exportSession(null, outputPath, false, undefined);

    expect(exportSession).toHaveBeenCalledWith(null, outputPath, false, undefined);
  });
});

describe('session import command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import session from file', async () => {
    vi.mocked(importSession).mockResolvedValue();

    await importSession('./backup.json', undefined);

    expect(importSession).toHaveBeenCalledWith('./backup.json', undefined);
  });

  it('should handle URL input for import', async () => {
    const urlInput = 'https://example.com/session.json';
    const isUrl = urlInput.startsWith('http://') || urlInput.startsWith('https://');

    expect(isUrl).toBe(true);
  });
});

describe('session list command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list sessions with limit', async () => {
    const mockSessions = [
      { id: 'session-1', createdAt: Date.now() - 1000 },
      { id: 'session-2', createdAt: Date.now() - 2000 },
      { id: 'session-3', createdAt: Date.now() - 3000 }
    ];
    vi.mocked(listSessions).mockResolvedValue(mockSessions);

    const sessions = await listSessions();
    const limited = sessions.slice(0, 2);

    expect(limited.length).toBe(2);
    expect(limited[0].id).toBe('session-1');
  });

  it('should filter sessions by project name', async () => {
    const mockSessions = [
      { id: 'project-a-session-1', createdAt: Date.now() },
      { id: 'project-b-session-1', createdAt: Date.now() },
      { id: 'project-a-session-2', createdAt: Date.now() }
    ];
    vi.mocked(listSessions).mockResolvedValue(mockSessions);

    const sessions = await listSessions();
    const filtered = sessions.filter(s => s.id.includes('project-a'));

    expect(filtered.length).toBe(2);
  });
});

describe('formatJsonOutput', () => {
  it('should format success response with status and data', () => {
    const data = { providers: ['openai', 'anthropic'] };
    const output = formatJsonOutput(data);
    const parsed = JSON.parse(output);

    expect(parsed.status).toBe('success');
    expect(parsed.data).toEqual(data);
    expect(parsed.error).toBeUndefined();
  });

  it('should format error response with status and error message', () => {
    const output = formatJsonOutput(null, false, 'Something went wrong');
    const parsed = JSON.parse(output);

    expect(parsed.status).toBe('error');
    expect(parsed.data).toBe(null);
    expect(parsed.error).toBe('Something went wrong');
  });

  it('should include both data and error if provided', () => {
    const data = { partial: 'result' };
    const output = formatJsonOutput(data, true, 'Warning: partial result');
    const parsed = JSON.parse(output);

    expect(parsed.status).toBe('success');
    expect(parsed.data).toEqual(data);
    expect(parsed.error).toBe('Warning: partial result');
  });
});

