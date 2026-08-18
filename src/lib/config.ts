/**
 * OCX - OpenCode eXtension CLI
 * Module đọc/ghi/merge config với support JSONC và validation schema
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseJSONC, printParseErrorCode } from 'jsonc-parser';
import { OpenCodeConfig, ProviderConfig, MCPServerConfig, ModelConfig, FormatterConfig, LSPConfig } from './types.js';
import { getConfigPath, isDryRun, isVerbose } from './env.js';
import { ConfigError } from './errors.js';
import { log } from './logger.js';

const CONFIG_SCHEMA = 'https://opencode.ai/config.json';

/**
 * Đọc config file từ path chỉ định với support JSONC
 */
export function readConfig(configPath?: string): OpenCodeConfig {
  const pathToUse = configPath || getConfigPath(false);
  
  if (!fs.existsSync(pathToUse)) {
    log.debug('Config file not found, returning default', { path: pathToUse });
    return { $schema: CONFIG_SCHEMA };
  }
  
  try {
    const content = fs.readFileSync(pathToUse, 'utf-8');
    
    // Try parsing as JSONC first (supports comments)
    const config = parseJSONC(content);
    if (config === undefined) {
      throw new Error('Failed to parse JSONC');
    }
    
    log.debug('Config loaded successfully', { path: pathToUse });
    return config as OpenCodeConfig;
  } catch (error) {
    const err = error as Error;
    log.error('Failed to read config', { path: pathToUse, error: err.message });
    throw new ConfigError(`Không thể đọc config từ ${pathToUse}: ${err.message}`);
  }
}

/**
 * Ghi config ra file với atomic write + backup
 */
export function writeConfig(
  config: OpenCodeConfig,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const pathToUse = configPath || getConfigPath(false);
  const dryRun = options?.dryRun ?? isDryRun();
  const verbose = options?.verbose ?? isVerbose();
  
  if (dryRun) {
    console.log('[DRY-RUN] Would write config to:', pathToUse);
    console.log('[DRY-RUN] Config content:', JSON.stringify(config, null, 2));
    return;
  }
  
  // Đảm bảo thư mục tồn tại
  const dir = path.dirname(pathToUse);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Backup file cũ nếu tồn tại
  if (fs.existsSync(pathToUse)) {
    const backupPath = `${pathToUse}.bak`;
    fs.copyFileSync(pathToUse, backupPath);
    if (verbose) {
      console.log(`[BACKUP] Created backup: ${backupPath}`);
    }
  }
  
  // Ghi ra file tạm rồi rename (atomic)
  const tempPath = `${pathToUse}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf-8');
    fs.renameSync(tempPath, pathToUse);
    if (verbose) {
      console.log(`[CONFIG] Written to: ${pathToUse}`);
    }
  } catch (error) {
    // Cleanup temp file nếu có lỗi
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    const err = error as Error;
    throw new Error(`Không thể ghi config: ${err.message}`);
  }
}

/**
 * Merge configs theo thứ tự ưu tiên (later overrides earlier)
 */
export function mergeConfigs(...configs: (OpenCodeConfig | undefined)[]): OpenCodeConfig {
  const result: OpenCodeConfig = { $schema: CONFIG_SCHEMA };
  
  for (const config of configs) {
    if (!config) continue;
    
    // Merge top-level fields
    if (config.model) result.model = config.model;
    if (config.autoupdate !== undefined) result.autoupdate = config.autoupdate;
    if (config.server) result.server = { ...result.server, ...config.server };
    if (config.permission) result.permission = { ...result.permission, ...config.permission };
    if (config.compaction) result.compaction = { ...result.compaction, ...config.compaction };
    if (config.watcher) result.watcher = { ...result.watcher, ...config.watcher };
    if (config.share) result.share = config.share;
    if (config.snapshot !== undefined) result.snapshot = config.snapshot;
    
    // Merge provider configs
    if (config.provider) {
      result.provider = { ...result.provider, ...config.provider };
    }
    
    // Merge MCP configs
    if (config.mcp) {
      result.mcp = { ...result.mcp, ...config.mcp };
    }
    
    // Merge arrays (concatenate, dedupe)
    if (config.plugin) {
      result.plugin = [...new Set([...(result.plugin || []), ...config.plugin])];
    }
    if (config.instructions) {
      result.instructions = [...new Set([...(result.instructions || []), ...config.instructions])];
    }
    if (config.disabled_providers) {
      result.disabled_providers = [...new Set([...(result.disabled_providers || []), ...config.disabled_providers])];
    }
    if (config.enabled_providers) {
      result.enabled_providers = [...new Set([...(result.enabled_providers || []), ...config.enabled_providers])];
    }
    
    // Merge experimental
    if (config.experimental) {
      result.experimental = { ...result.experimental, ...config.experimental };
    }
    
    // Merge formatter/lsp
    if (typeof config.formatter === 'object' && config.formatter !== null) {
      if (typeof result.formatter !== 'object' || result.formatter === null) {
        result.formatter = {};
      }
      result.formatter = { ...(result.formatter as Record<string, unknown>) as Record<string, FormatterConfig>, ...config.formatter as Record<string, FormatterConfig> };
    }
    if (typeof config.lsp === 'object' && config.lsp !== null) {
      if (typeof result.lsp !== 'object' || result.lsp === null) {
        result.lsp = {};
      }
      result.lsp = { ...(result.lsp as Record<string, unknown>) as Record<string, LSPConfig>, ...config.lsp as Record<string, LSPConfig> };
    }
  }
  
  return result;
}

/**
 * Validate config có đúng schema cơ bản không
 */
export function validateConfig(config: OpenCodeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check $schema
  if (config.$schema && config.$schema !== CONFIG_SCHEMA) {
    errors.push(`$schema không khớp: mong đợi ${CONFIG_SCHEMA}, nhận ${config.$schema}`);
  }
  
  // Check model format (provider/model)
  if (config.model && !config.model.includes('/')) {
    errors.push(`model phải có format "provider/model", nhận: ${config.model}`);
  }
  
  // Check server.port range
  if (config.server?.port && (config.server.port < 1 || config.server.port > 65535)) {
    errors.push(`server.port phải từ 1-65535, nhận: ${config.server.port}`);
  }
  
  // Check permission values
  const validPermissionValues = ['ask', 'allow', 'deny'];
  if (config.permission?.edit && !validPermissionValues.includes(config.permission.edit)) {
    errors.push(`permission.edit phải là một trong: ${validPermissionValues.join(', ')}`);
  }
  if (config.permission?.bash && !validPermissionValues.includes(config.permission.bash)) {
    errors.push(`permission.bash phải là một trong: ${validPermissionValues.join(', ')}`);
  }
  
  // Check share values
  const validShareValues = ['enabled', 'disabled', 'url-only'];
  if (config.share && !validShareValues.includes(config.share)) {
    errors.push(`share phải là một trong: ${validShareValues.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Thêm provider vào config
 */
export function addProviderToConfig(
  providerId: string,
  providerConfig: ProviderConfig,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  
  if (!config.provider) {
    config.provider = {};
  }
  
  config.provider[providerId] = {
    ...(config.provider[providerId] || {}),
    ...providerConfig
  };
  
  writeConfig(config, configPath, options);
}

/**
 * Xóa provider khỏi config
 */
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

/**
 * Thêm MCP server vào config
 */
export function addMCPServerToConfig(
  serverId: string,
  serverConfig: MCPServerConfig,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  
  if (!config.mcp) {
    config.mcp = {};
  }
  
  config.mcp[serverId] = {
    ...(config.mcp[serverId] || {}),
    ...serverConfig
  };
  
  writeConfig(config, configPath, options);
}

/**
 * Xóa MCP server khỏi config
 */
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

/**
 * Set model mặc định
 */
export function setDefaultModel(
  model: string,
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): void {
  const config = readConfig(configPath);
  config.model = model;
  writeConfig(config, configPath, options);
}

/**
 * Khởi tạo config mới với giá trị mặc định an toàn
 */
export function initConfig(
  configPath?: string,
  options?: { dryRun?: boolean; verbose?: boolean }
): OpenCodeConfig {
  const defaultConfig: OpenCodeConfig = {
    $schema: CONFIG_SCHEMA,
    autoupdate: true,
    server: {
      port: 4096
    },
    permission: {
      edit: 'ask',
      bash: 'ask'
    },
    snapshot: false
  };
  
  writeConfig(defaultConfig, configPath, options);
  return defaultConfig;
}
