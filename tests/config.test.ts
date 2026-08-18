/**
 * Tests cho config.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { readConfig, writeConfig, validateConfig } from '../src/lib/config.js';

const TEST_CONFIG_PATH = '/tmp/test-opencode.json';

describe('config.ts', () => {
  beforeEach(() => {
    // Cleanup trước mỗi test
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  afterEach(() => {
    // Cleanup sau mỗi test
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
    if (fs.existsSync(`${TEST_CONFIG_PATH}.bak`)) {
      fs.unlinkSync(`${TEST_CONFIG_PATH}.bak`);
    }
  });

  describe('readConfig', () => {
    it('should return default config when file does not exist', () => {
      const config = readConfig(TEST_CONFIG_PATH);
      expect(config).toEqual({ $schema: 'https://opencode.ai/config.json' });
    });

    it('should read valid config file', () => {
      const validConfig = {
        $schema: 'https://opencode.ai/config.json',
        model: 'anthropic/claude-sonnet-4-20250514',
        provider: {
          openai: {
            options: { apiKey: '{env:OPENAI_API_KEY}' }
          }
        }
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(validConfig, null, 2));
      
      const config = readConfig(TEST_CONFIG_PATH);
      expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
      expect(config.provider?.openai).toBeDefined();
    });

    it('should throw error when config file is invalid JSON', () => {
      fs.writeFileSync(TEST_CONFIG_PATH, '{ invalid json }');
      
      expect(() => readConfig(TEST_CONFIG_PATH)).toThrow(/Không thể đọc config/);
    });
  });

  describe('writeConfig', () => {
    it('should write config atomically', () => {
      const config = {
        $schema: 'https://opencode.ai/config.json',
        model: 'openai/gpt-4o'
      };
      
      writeConfig(config, TEST_CONFIG_PATH);
      
      expect(fs.existsSync(TEST_CONFIG_PATH)).toBe(true);
      const written = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'));
      expect(written.model).toBe('openai/gpt-4o');
    });

    it('should create backup before overwriting', () => {
      // Write initial config
      writeConfig({ $schema: 'https://opencode.ai/config.json', model: 'old-model' }, TEST_CONFIG_PATH);
      
      // Write new config
      writeConfig({ $schema: 'https://opencode.ai/config.json', model: 'new-model' }, TEST_CONFIG_PATH);
      
      expect(fs.existsSync(`${TEST_CONFIG_PATH}.bak`)).toBe(true);
    });

    it('should create directory if not exists', () => {
      const nestedPath = '/tmp/test-nested/opencode.json';
      const config = { $schema: 'https://opencode.ai/config.json' };
      
      writeConfig(config, nestedPath);
      
      expect(fs.existsSync(nestedPath)).toBe(true);
      
      // Cleanup
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath));
    });
  });

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const config = {
        $schema: 'https://opencode.ai/config.json',
        model: 'anthropic/claude-sonnet-4-20250514',
        server: { port: 4096 },
        permission: { edit: 'ask', bash: 'ask' }
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid schema', () => {
      const config = {
        $schema: 'https://wrong-schema.com/config.json',
        model: 'openai/gpt-4o'
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('$schema'))).toBe(true);
    });

    it('should reject invalid model format', () => {
      const config = {
        $schema: 'https://opencode.ai/config.json',
        model: 'invalid-model-format'
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('model'))).toBe(true);
    });

    it('should reject invalid port range', () => {
      const config = {
        $schema: 'https://opencode.ai/config.json',
        server: { port: 99999 }
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('port'))).toBe(true);
    });

    it('should reject invalid permission values', () => {
      const config = {
        $schema: 'https://opencode.ai/config.json',
        permission: { edit: 'invalid-value', bash: 'ask' }
      };
      
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('permission.edit'))).toBe(true);
    });
  });
});
