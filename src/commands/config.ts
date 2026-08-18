import { Command } from 'commander';
import { readConfig, writeConfig, validateConfig, initConfig } from '../lib/config.js';
import { getConfigPath } from '../lib/env.js';
import * as fs from 'node:fs';
import { parse as parseJSONC } from 'jsonc-parser';

const configCmd = new Command('config');

function redactSecrets<T>(value: T): T {
  const secretKeys = new Set(['apiKey', 'api_key', 'token', 'refreshToken', 'clientSecret', 'password', 'secret']);
  const redact = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(redact);
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, secretKeys.has(k) ? '********' : redact(v)]));
    }
    return input;
  };
  return redact(value) as T;
}

configCmd.command('init')
  .description('Khởi tạo opencode.json mới')
  .option('--project', 'Init cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(options => {
    try {
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      initConfig(configPath, { dryRun: options.dryRun, verbose: options.verbose });
      console.log('✓ Khởi tạo config thành công');
    } catch (error) {
      console.error('Error initializing config:', (error as Error).message);
      process.exitCode = 1;
    }
  });

configCmd.command('validate')
  .description('Validate config hiện có')
  .option('--json', 'Output JSON')
  .option('--project', 'Validate project config')
  .action(options => {
    try {
      const configPath = getConfigPath(Boolean(options.project));
      if (!fs.existsSync(configPath)) {
        const result = { valid: false, errors: [`Config file not found: ${configPath}`], warnings: [] };
        if (options.json) console.log(JSON.stringify(result, null, 2));
        else console.error(`✗ ${result.errors[0]}`);
        process.exitCode = 1;
        return;
      }
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = parseJSONC(content);
      const result = validateConfig(config);
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else if (result.valid) console.log('✓ Config is valid!');
      else {
        console.error(`✗ Config has ${result.errors.length} error(s):`);
        result.errors.forEach(error => console.error(`  • ${error}`));
        process.exitCode = 1;
      }
    } catch (error) {
      console.error('Error validating config:', (error as Error).message);
      process.exitCode = 1;
    }
  });

configCmd.command('show')
  .description('Hiển thị config đang dùng')
  .option('--json', 'Output JSON')
  .option('--project', 'Show project config')
  .option('--show-secrets', 'Không redact secrets; chỉ dùng khi cần debug')
  .action(options => {
    try {
      const config = readConfig(getConfigPath(Boolean(options.project)));
      const output = options.showSecrets ? config : redactSecrets(config);
      if (options.json) console.log(JSON.stringify(output, null, 2));
      else {
        console.log(`\n📄 Config file: ${getConfigPath(Boolean(options.project))}`);
        console.log(JSON.stringify(output, null, 2));
        console.log();
      }
    } catch (error) {
      console.error('Error showing config:', (error as Error).message);
      process.exitCode = 1;
    }
  });

export { configCmd };
