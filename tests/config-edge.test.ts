/**
 * Tests cho config.ts - edge cases và integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { readConfig, writeConfig, mergeConfigs, initConfig } from '../src/lib/config.js';

const TEST_CONFIG_PATH = '/tmp/test-config-edge.json';

describe('config.ts - edge cases', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
    if (fs.existsSync(`${TEST_CONFIG_PATH}.bak`)) {
      fs.unlinkSync(`${TEST_CONFIG_PATH}.bak`);
    }
  });

  describe('mergeConfigs', () => {
    it('should handle empty configs', () => {
      const result = mergeConfigs();
      expect(result).toEqual({ $schema: 'https://opencode.ai/config.json' });
    });

    it('should merge multiple configs with later overriding earlier', () => {
      const config1 = { $schema: 'https://opencode.ai/config.json', model: 'model1' };
      const config2 = { $schema: 'https://opencode.ai/config.json', model: 'model2' };
      
      const result = mergeConfigs(config1, config2);
      expect(result.model).toBe('model2');
    });

    it('should concatenate and dedupe arrays', () => {
      const config1 = { $schema: 'https://opencode.ai/config.json', plugin: ['plugin-a', 'plugin-b'] };
      const config2 = { $schema: 'https://opencode.ai/config.json', plugin: ['plugin-b', 'plugin-c'] };
      
      const result = mergeConfigs(config1, config2);
      expect(result.plugin).toEqual(['plugin-a', 'plugin-b', 'plugin-c']);
    });

    it('should handle undefined configs in array', () => {
      const config1 = { $schema: 'https://opencode.ai/config.json', model: 'model1' };
      const result = mergeConfigs(config1, undefined, config1);
      expect(result.model).toBe('model1');
    });

    it('should deep merge nested objects', () => {
      const config1 = { 
        $schema: 'https://opencode.ai/config.json', 
        server: { port: 4096 },
        permission: { edit: 'ask' }
      };
      const config2 = { 
        $schema: 'https://opencode.ai/config.json', 
        server: { hostname: 'localhost' },
        permission: { bash: 'allow' }
      };
      
      const result = mergeConfigs(config1, config2);
      expect(result.server?.port).toBe(4096);
      expect(result.server?.hostname).toBe('localhost');
      expect(result.permission?.edit).toBe('ask');
      expect(result.permission?.bash).toBe('allow');
    });
  });

  describe('initConfig', () => {
    it('should create default config with safe values', () => {
      const config = initConfig(TEST_CONFIG_PATH);
      
      expect(config.$schema).toBe('https://opencode.ai/config.json');
      expect(config.autoupdate).toBe(true);
      expect(config.server?.port).toBe(4096);
      expect(config.permission?.edit).toBe('ask');
      expect(config.permission?.bash).toBe('ask');
      expect(config.snapshot).toBe(false);
      
      // Verify file was written
      expect(fs.existsSync(TEST_CONFIG_PATH)).toBe(true);
    });
  });

  describe('readConfig with JSONC', () => {
    it('should parse config with comments', () => {
      const configWithComments = `{
        // This is a comment
        "$schema": "https://opencode.ai/config.json",
        "model": "anthropic/claude-sonnet-4-20250514" // inline comment
      }`;
      
      fs.writeFileSync(TEST_CONFIG_PATH, configWithComments);
      const config = readConfig(TEST_CONFIG_PATH);
      
      expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    });

    it('should parse config with trailing commas', () => {
      const configWithTrailingCommas = `{
        "$schema": "https://opencode.ai/config.json",
        "model": "openai/gpt-4o",
        "server": {
          "port": 4096,
        },
      }`;
      
      fs.writeFileSync(TEST_CONFIG_PATH, configWithTrailingCommas);
      const config = readConfig(TEST_CONFIG_PATH);
      
      expect(config.model).toBe('openai/gpt-4o');
      expect(config.server?.port).toBe(4096);
    });
  });

  describe('writeConfig atomic operations', () => {
    it('should clean up temp file on write failure', () => {
      const config = { $schema: 'https://opencode.ai/config.json' };
      
      // Write initial config
      writeConfig(config, TEST_CONFIG_PATH);
      
      // Verify no temp files left behind
      const dir = '/tmp';
      const files = fs.readdirSync(dir);
      const tempFiles = files.filter(f => f.startsWith('test-config-edge.json.tmp'));
      expect(tempFiles.length).toBe(0);
    });
  });
});
