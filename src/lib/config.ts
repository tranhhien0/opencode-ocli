import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseJSONC } from 'jsonc-parser';
import { OpenCodeConfig, ProviderConfig, MCPServerConfig, ModelConfig, FormatterConfig, LSPConfig } from './types.js';
import { getConfigPath, isDryRun, isVerbose } from './env.js';
import { ConfigError, ValidationError } from './errors.js';
import { log } from './logger.js';

const CONFIG_SCHEMA = 'https://opencode.ai/config.json';

export function readConfig(configPath?: string): OpenCodeConfig {
  const pathToUse = configPath || getConfigPath(false);
  if (!fs.existsSync(pathToUse)) {
    log.debug('Config file not found, returning default', { path: pathToUse });
    return { $schema: CONFIG_SCHEMA };
  }

  try {
    const content = fs.readFileSync(pathToUse, 'utf-8');
    const errors: unknown[] = [];
    const config = parseJSONC(content, errors as never);
    if (errors.length > 0 || config === undefined || config === null || typeof config !== 'object') {
      throw new Error('Invalid JSON/JSONC configuration');
    }
    log.debug('Config loaded successfully', { path: pathToUse });
    return config as OpenCodeConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to read config', { path: pathToUse, error: message });
    throw new ConfigError(`Không thể đọc config từ ${pathToUse}: ${message}`);
  }
}

export function writeConfig(
  config: OpenCodeConfig,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const pathToUse = configPath || getConfigPath(false);
  const dryRun = options?.dryRun ?? isDryRun();
  const verbose = options?.verbose ?? isVerbose();

  if (dryRun) {
    console.error('[DRY-RUN] Would write config to:', pathToUse);
    console.error('[DRY-RUN] Config content:', JSON.stringify(redactSecrets(config), null, 2));
    return;
  }

  const dir = path.dirname(pathToUse);
  fs.mkdirSync(dir, { recursive: true });
  const backupPath = `${pathToUse}.bak`;
  const tempPath = `${pathToUse}.tmp.${process.pid}.${Date.now()}`;

  try {
    if (fs.existsSync(pathToUse)) fs.copyFileSync(pathToUse, backupPath);
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tempPath, pathToUse);
    if (verbose) console.error(`[CONFIG] Written to: ${pathToUse}`);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

export function mergeConfigs(...configs: (OpenCodeConfig | undefined)[]): OpenCodeConfig {
  let result: OpenCodeConfig = { $schema: CONFIG_SCHEMA };

  for (const config of configs) {
    if (!config) continue;
    result = {
      ...result,
      ...config,
      server: mergeObject(result.server, config.server),
      permission: mergeObject(result.permission, config.permission),
      compaction: mergeObject(result.compaction, config.compaction),
      watcher: mergeObject(result.watcher, config.watcher),
      experimental: mergeObject(result.experimental, config.experimental),
      provider: mergeProviders(result.provider, config.provider),
      mcp: mergeObject(result.mcp, config.mcp),
      plugin: mergeList(result.plugin, config.plugin),
      instructions: mergeList(result.instructions, config.instructions),
      disabled_providers: mergeList(result.disabled_providers, config.disabled_providers),
      enabled_providers: mergeList(result.enabled_providers, config.enabled_providers),
      formatter: mergeConfigMap(result.formatter, config.formatter),
      lsp: mergeConfigMap(result.lsp, config.lsp),
    };
  }

  return result;
}

function mergeObject<T extends object>(left: T | undefined, right: T | undefined): T | undefined {
  if (!left && !right) return undefined;
  return { ...(left || {}), ...(right || {}) } as T;
}

function mergeList(left?: string[], right?: string[]): string[] | undefined {
  if (!left && !right) return undefined;
  return [...new Set([...(left || []), ...(right || [])])];
}

function mergeProviders(
  left?: Record<string, ProviderConfig>,
  right?: Record<string, ProviderConfig>
): Record<string, ProviderConfig> | undefined {
  if (!left && !right) return undefined;
  const result: Record<string, ProviderConfig> = { ...(left || {}) };

  for (const [id, next] of Object.entries(right || {})) {
    const prev = result[id];
    result[id] = {
      ...(prev || {}),
      ...next,
      options: { ...(prev?.options || {}), ...(next.options || {}) },
      models: mergeModels(prev?.models, next.models),
    };
  }

  return result;
}

function mergeModels(
  left?: Record<string, ModelConfig>,
  right?: Record<string, ModelConfig>
): Record<string, ModelConfig> | undefined {
  if (!left && !right) return undefined;
  const result: Record<string, ModelConfig> = { ...(left || {}) };
  for (const [id, next] of Object.entries(right || {})) {
    const prev = result[id];
    result[id] = {
      ...(prev || {}),
      ...next,
      options: { ...(prev?.options || {}), ...(next.options || {}) },
      variants: { ...(prev?.variants || {}), ...(next.variants || {}) },
    };
  }
  return result;
}

function mergeConfigMap<T>(
  left: boolean | Record<string, T> | undefined,
  right: boolean | Record<string, T> | undefined
): boolean | Record<string, T> | undefined {
  if (right === undefined) return left;
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    return { ...left, ...right };
  }
  return right;
}

export function validateConfig(config: OpenCodeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.$schema && config.$schema !== CONFIG_SCHEMA) {
    errors.push(`$schema không khớp: mong đợi ${CONFIG_SCHEMA}, nhận ${config.$schema}`);
  }
  if (config.model && !config.model.includes('/')) {
    errors.push(`model phải có format "provider/model", nhận: ${config.model}`);
  }
  if (config.server?.port !== undefined && (!Number.isInteger(config.server.port) || config.server.port < 1 || config.server.port > 65535)) {
    errors.push(`server.port phải là số nguyên từ 1-65535, nhận: ${config.server.port}`);
  }
  const validPermissionValues = ['ask', 'allow', 'deny'];
  if (config.permission?.edit && !validPermissionValues.includes(config.permission.edit)) {
    errors.push(`permission.edit phải là một trong: ${validPermissionValues.join(', ')}`);
  }
  if (config.permission?.bash && !validPermissionValues.includes(config.permission.bash)) {
    errors.push(`permission.bash phải là một trong: ${validPermissionValues.join(', ')}`);
  }
  const validShareValues = ['enabled', 'disabled', 'url-only'];
  if (config.share && !validShareValues.includes(config.share)) {
    errors.push(`share phải là một trong: ${validShareValues.join(', ')}`);
  }

  if (errors.length > 0) throwValidationType(false, errors);
  return { valid: errors.length === 0, errors };
}

function throwValidationType(valid: boolean, errors: string[]): void {
  if (!valid && errors.length > 0) {
    // Keep validateConfig non-throwing for CLI callers while centralizing validation shape.
    void ValidationError;
  }
}

function redactSecrets<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  const secretKeys = new Set(['apiKey', 'api_key', 'token', 'refreshToken', 'clientSecret', 'password', 'secret']);
  const redact = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(redact);
    if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;
      return Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, secretKeys.has(key) ? '********' : redact(val)]));
    }
    return input;
  };
  return redact(value) as T;
}

export function addProviderToConfig(
  providerId: string,
  providerConfig: ProviderConfig,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  config.provider = config.provider || {};
  config.provider[providerId] = {
    ...(config.provider[providerId] || {}),
    ...providerConfig,
    options: { ...(config.provider[providerId]?.options || {}), ...(providerConfig.options || {}) },
    models: mergeModels(config.provider[providerId]?.models, providerConfig.models),
  };
  writeConfig(config, configPath, options);
}

export function removeProviderFromConfig(
  providerId: string,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  if (config.provider && providerId in config.provider) {
    delete config.provider[providerId];
    writeConfig(config, configPath, options);
  }
}

export function addMCPServerToConfig(
  serverId: string,
  serverConfig: MCPServerConfig,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  config.mcp = config.mcp || {};
  config.mcp[serverId] = { ...(config.mcp[serverId] || {}), ...serverConfig };
  writeConfig(config, configPath, options);
}

export function removeMCPServerFromConfig(
  serverId: string,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  if (config.mcp && serverId in config.mcp) {
    delete config.mcp[serverId];
    writeConfig(config, configPath, options);
  }
}

export function setDefaultModel(
  model: string,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  config.model = model;
  writeConfig(config, configPath, options);
}

export function initConfig(
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): OpenCodeConfig {
  const defaultConfig: OpenCodeConfig = {
    $schema: CONFIG_SCHEMA,
    autoupdate: true,
    permission: { edit: 'ask', bash: 'ask' },
    snapshot: false,
  };
  writeConfig(defaultConfig, configPath, options);
  return defaultConfig;
}
