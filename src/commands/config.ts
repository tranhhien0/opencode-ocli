/**
 * OCX - OpenCode eXtension CLI
 * Config commands với support JSONC và validation sâu
 */

import { Command } from 'commander';
import { readConfig, writeConfig, validateConfig, initConfig } from '../lib/config.js';
import { getConfigPath } from '../lib/env.js';
import * as fs from 'node:fs';
import { parse as parseJSONC } from 'jsonc-parser';

const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  red: '\x1b[91m',
  cyan: '\x1b[36m'
};

// Schema keys chuẩn của OpenCode (cập nhật từ docs chính thức)
const VALID_CONFIG_KEYS = new Set([
  '$schema',
  'model',
  'autoupdate',
  'server',
  'permission',
  'provider',
  'mcp',
  'plugin',
  'instructions',
  'disabled_providers',
  'enabled_providers',
  'experimental',
  'formatter',
  'lsp',
  'share',
  'snapshot',
  'compaction',
  'watcher'
]);

// Type mapping cho validation
const TYPE_VALIDATORS: Record<string, string[]> = {
  'model': ['string'],
  'autoupdate': ['boolean'],
  'snapshot': ['boolean'],
  'server.port': ['number'],
  'server.host': ['string'],
  'permission.edit': ['string'],
  'permission.bash': ['string'],
  'share': ['string'],
  'instructions': ['array'],
  'plugin': ['array'],
  'disabled_providers': ['array'],
  'enabled_providers': ['array']
};

const configCmd = new Command('config');

configCmd.command('init')
  .description('Khởi tạo opencode.json mới')
  .option('--project', 'Init cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action((options) => {
    try {
      const dryRun = options.dryRun || false;
      
      if (dryRun) {
        console.log('[DRY-RUN] Would initialize opencode.json');
        return;
      }
      
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      initConfig(configPath, {
        dryRun: false,
        verbose: options.verbose
      });
      console.log(`✓ Khởi tạo config thành công`);
    } catch (error) {
      console.error('Error initializing config:', (error as Error).message);
      process.exit(1);
    }
  });

configCmd.command('validate')
  .description('Validate config hiện có với kiểm tra sâu')
  .option('--json', 'Output JSON')
  .action((options) => {
    try {
      const configPath = getConfigPath(false);
      
      // Đọc raw content để parse JSONC
      if (!fs.existsSync(configPath)) {
        console.log(`${colors.yellow}⚠ Config file not found: ${configPath}${colors.reset}`);
        process.exit(0);
      }
      
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = parseJSONC(content);
      
      if (!config) {
        console.error(`${colors.red}✗ Failed to parse config file${colors.reset}`);
        process.exit(1);
      }
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // 1. Validate cơ bản từ hàm có sẵn
      const basicResult = validateConfig(config);
      errors.push(...basicResult.errors);
      
      // 2. Check unknown keys (không thuộc schema chuẩn)
      for (const key of Object.keys(config)) {
        if (!VALID_CONFIG_KEYS.has(key)) {
          warnings.push(`[WARN] Unknown key: "${key}" (không thuộc schema chuẩn)`);
        }
      }
      
      // 3. Check type errors chi tiết
      // Check model type
      if (config.model !== undefined && typeof config.model !== 'string') {
        errors.push(`[ERROR] Invalid type for "model": expected string, got ${typeof config.model}`);
      }
      
      // Check autoupdate type
      if (config.autoupdate !== undefined && typeof config.autoupdate !== 'boolean') {
        errors.push(`[ERROR] Invalid type for "autoupdate": expected boolean, got ${typeof config.autoupdate}`);
      }
      
      // Check snapshot type
      if (config.snapshot !== undefined && typeof config.snapshot !== 'boolean') {
        errors.push(`[ERROR] Invalid type for "snapshot": expected boolean, got ${typeof config.snapshot}`);
      }
      
      // Check server.port type
      if (config.server?.port !== undefined && typeof config.server.port !== 'number') {
        errors.push(`[ERROR] Invalid type for "server.port": expected number, got ${typeof config.server.port}`);
      }
      
      // Check instructions type
      if (config.instructions !== undefined && !Array.isArray(config.instructions)) {
        errors.push(`[ERROR] Invalid type for "instructions": expected array, got ${typeof config.instructions}`);
      }
      
      // Check plugin type
      if (config.plugin !== undefined && !Array.isArray(config.plugin)) {
        errors.push(`[ERROR] Invalid type for "plugin": expected array, got ${typeof config.plugin}`);
      }
      
      // Check provider structure
      if (config.provider !== undefined) {
        if (typeof config.provider !== 'object' || config.provider === null) {
          errors.push(`[ERROR] Invalid type for "provider": expected object, got ${typeof config.provider}`);
        } else {
          for (const [providerId, providerConfig] of Object.entries(config.provider)) {
            if (providerConfig && typeof providerConfig === 'object') {
              const pc = providerConfig as Record<string, unknown>;
              if (pc.models !== undefined && (typeof pc.models !== 'object' || pc.models === null)) {
                errors.push(`[ERROR] Invalid type for "provider.${providerId}.models": expected object`);
              }
              if (pc.options !== undefined && (typeof pc.options !== 'object' || pc.options === null)) {
                errors.push(`[ERROR] Invalid type for "provider.${providerId}.options": expected object`);
              }
            }
          }
        }
      }
      
      // Output results
      if (options.json) {
        console.log(JSON.stringify({
          valid: errors.length === 0,
          errors,
          warnings
        }, null, 2));
      } else {
        if (errors.length === 0 && warnings.length === 0) {
          console.log(`${colors.cyan}✓ Config is valid!${colors.reset}`);
        } else {
          if (errors.length > 0) {
            console.log(`${colors.red}✗ Config has ${errors.length} error(s):${colors.reset}`);
            errors.forEach(e => console.log(`  • ${e}`));
          }
          
          if (warnings.length > 0) {
            console.log(`\n${colors.yellow}⚠ Config has ${warnings.length} warning(s):${colors.reset}`);
            warnings.forEach(w => console.log(`  • ${w}`));
          }
          
          if (errors.length > 0) {
            process.exit(1);
          }
        }
      }
    } catch (error) {
      console.error('Error validating config:', (error as Error).message);
      process.exit(1);
    }
  });

configCmd.command('show')
  .description('Hiển thị config đang dùng')
  .option('--json', 'Output JSON')
  .action((options) => {
    try {
      const config = readConfig();
      const configPath = getConfigPath(false);
      
      if (options.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        console.log(`\n📄 Config file: ${configPath}`);
        console.log(JSON.stringify(config, null, 2));
        console.log();
      }
    } catch (error) {
      console.error('Error showing config:', (error as Error).message);
      process.exit(1);
    }
  });

export { configCmd };
