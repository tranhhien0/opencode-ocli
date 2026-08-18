/**
 * OCX - OpenCode eXtension CLI
 * Config commands với support JSONC
 */

import { Command } from 'commander';
import { readConfig, writeConfig, validateConfig, initConfig } from '../lib/config.js';
import { getConfigPath } from '../lib/env.js';

const configCmd = new Command('config');

configCmd.command('init')
  .description('Khởi tạo opencode.json mới')
  .option('--project', 'Init cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action((options) => {
    try {
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      initConfig(configPath, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      console.log(`✓ Khởi tạo config thành công`);
    } catch (error) {
      console.error('Error initializing config:', (error as Error).message);
      process.exit(1);
    }
  });

configCmd.command('validate')
  .description('Validate config hiện có')
  .option('--json', 'Output JSON')
  .action((options) => {
    try {
      const config = readConfig();
      const result = validateConfig(config);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.valid) {
          console.log('✓ Config is valid!');
        } else {
          console.log('✗ Config has errors:');
          result.errors.forEach(e => console.log(`  • ${e}`));
          process.exit(1);
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
