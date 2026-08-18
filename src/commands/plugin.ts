/**
 * OCX - OpenCode eXtension CLI
 * Plugin commands
 */

import { Command } from 'commander';
import { readConfig, writeConfig } from '../lib/config.js';
import { installPlugin, uninstallPlugin } from '../lib/opencode-shell.js';

const plugin = new Command('plugin');

plugin.command('install <module>')
  .description('Cài plugin')
  .alias('add')
  .option('--global', 'Cài global (thay vì local)')
  .option('--force', 'Force cài đặt')
  .option('-v, --verbose', 'Verbose mode')
  .option('--dry-run', 'Dry run')
  .action(async (moduleName, options) => {
    try {
      await installPlugin(moduleName, options.global, options.force, {
        verbose: options.verbose,
        dryRun: options.dryRun
      });
      console.log(`✓ Đã cài plugin: ${moduleName}`);
    } catch (error) {
      console.error('Error installing plugin:', (error as Error).message);
      process.exit(1);
    }
  });

plugin.command('remove <module>')
  .alias('rm')
  .alias('uninstall')
  .description('Gỡ plugin')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (moduleName, options) => {
    try {
      await uninstallPlugin(moduleName, { verbose: options.verbose });
      
      // Remove từ config
      const config = readConfig();
      if (config.plugin) {
        config.plugin = config.plugin.filter(p => p !== moduleName);
        writeConfig(config, undefined, { verbose: options.verbose });
      }
      
      console.log(`✓ Đã gỡ plugin: ${moduleName}`);
    } catch (error) {
      console.error('Error removing plugin:', (error as Error).message);
      process.exit(1);
    }
  });

plugin.command('list')
  .description('Liệt kê plugins đã cài')
  .option('--json', 'Output JSON')
  .action((options) => {
    try {
      const config = readConfig();
      const plugins = config.plugin || [];
      
      if (options.json) {
        console.log(JSON.stringify(plugins, null, 2));
      } else {
        console.log('\n📦 Installed plugins:');
        if (plugins.length === 0) {
          console.log('  (none)');
        } else {
          plugins.forEach(p => console.log(`  • ${p}`));
        }
        console.log();
      }
    } catch (error) {
      console.error('Error listing plugins:', (error as Error).message);
      process.exit(1);
    }
  });

export { plugin };
