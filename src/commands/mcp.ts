/**
 * OCX - OpenCode eXtension CLI
 * MCP commands
 */

import { Command } from 'commander';
import { readConfig, addMCPServerToConfig, removeMCPServerFromConfig } from '../lib/config.js';
import { authMCPServer, logoutMCPServer } from '../lib/opencode-shell.js';

const mcp = new Command('mcp');

mcp.command('add <id>')
  .description('Thêm MCP server')
  .requiredOption('--type <type>', 'local hoặc remote')
  .option('--url <url>', 'URL (cho remote)')
  .option('--command <cmd>', 'Command (cho local, ví dụ: "npx -y @mcp/server-everything")')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (serverId, options) => {
    try {
      if (options.type === 'remote' && !options.url) {
        console.error('Error: Remote MCP server requires --url');
        process.exit(1);
      }
      if (options.type === 'local' && !options.command) {
        console.error('Error: Local MCP server requires --command');
        process.exit(1);
      }
      
      const serverConfig = {
        type: options.type as 'local' | 'remote',
        url: options.url,
        command: options.command ? options.command.split(' ') : undefined,
        enabled: true
      };
      
      addMCPServerToConfig(serverId, serverConfig as any, undefined, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      console.log(`✓ Đã thêm MCP server "${serverId}" (${options.type})`);
    } catch (error) {
      console.error('Error adding MCP server:', (error as Error).message);
      process.exit(1);
    }
  });

mcp.command('list')
  .description('Liệt kê MCP servers')
  .option('--json', 'Output JSON')
  .action((options) => {
    try {
      const config = readConfig();
      const mcpServers = config.mcp || {};
      
      if (options.json) {
        console.log(JSON.stringify(mcpServers, null, 2));
      } else {
        console.log('\n🔌 MCP Servers:');
        const ids = Object.keys(mcpServers);
        if (ids.length === 0) {
          console.log('  (none)');
        } else {
          for (const id of ids) {
            const server = mcpServers[id];
            const status = server.enabled !== false ? '✓' : '○';
            console.log(`  ${status} ${id} (${server.type}): ${server.url || server.command?.join(' ') || ''}`);
          }
        }
        console.log();
      }
    } catch (error) {
      console.error('Error listing MCP servers:', (error as Error).message);
      process.exit(1);
    }
  });

mcp.command('auth <id>')
  .description('Auth OAuth MCP server')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (serverId, options) => {
    try {
      console.log(`Starting OAuth flow for MCP server: ${serverId}`);
      await authMCPServer(serverId, { verbose: options.verbose });
      console.log(`✓ Auth completed for ${serverId}`);
    } catch (error) {
      console.error('Error authenticating MCP server:', (error as Error).message);
      process.exit(1);
    }
  });

mcp.command('logout <id>')
  .description('Logout MCP server')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (serverId, options) => {
    try {
      await logoutMCPServer(serverId, { verbose: options.verbose });
      console.log(`✓ Logged out from ${serverId}`);
    } catch (error) {
      console.error('Error logging out MCP server:', (error as Error).message);
      process.exit(1);
    }
  });

mcp.command('remove <id>')
  .alias('rm')
  .description('Xóa MCP server khỏi config')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (serverId, options) => {
    try {
      removeMCPServerFromConfig(serverId, undefined, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      console.log(`✓ Đã xóa MCP server "${serverId}"`);
    } catch (error) {
      console.error('Error removing MCP server:', (error as Error).message);
      process.exit(1);
    }
  });

export { mcp };
