import { Command } from 'commander';
import { readConfig, addMCPServerToConfig, removeMCPServerFromConfig } from '../lib/config.js';
import { authMCPServer, logoutMCPServer } from '../lib/opencode-shell.js';

const mcp = new Command('mcp');

function splitCommand(value: string): string[] {
  // Keep the CLI contract simple: each argument may be supplied separately by quoting one token.
  // Avoid shell execution; this parser only splits whitespace and does not evaluate shell syntax.
  return value.trim().split(/\s+/).filter(Boolean);
}

mcp.command('add <id>')
  .description('Thêm MCP server')
  .requiredOption('--type <type>', 'local hoặc remote')
  .option('--url <url>', 'URL (cho remote)')
  .option('--command <cmd>', 'Command (cho local)')
  .option('--project', 'Áp dụng cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (serverId, options) => {
    try {
      if (options.type !== 'local' && options.type !== 'remote') throw new Error('--type phải là local hoặc remote');
      if (options.type === 'remote' && !options.url) throw new Error('Remote MCP server requires --url');
      if (options.type === 'local' && !options.command) throw new Error('Local MCP server requires --command');

      const serverConfig = {
        type: options.type as 'local' | 'remote',
        ...(options.type === 'remote' ? { url: options.url } : { command: splitCommand(options.command) }),
        enabled: true,
      };
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      addMCPServerToConfig(serverId, serverConfig, configPath, { dryRun: options.dryRun, verbose: options.verbose });
      console.log(`✓ Đã thêm MCP server "${serverId}" (${options.type})`);
    } catch (error) {
      console.error('Error adding MCP server:', (error as Error).message);
      process.exitCode = 1;
    }
  });

mcp.command('list')
  .description('Liệt kê MCP servers')
  .option('--json', 'Output JSON')
  .option('--project', 'Project config')
  .action(options => {
    try {
      const config = readConfig(options.project ? `${process.cwd()}/opencode.json` : undefined);
      const servers = config.mcp || {};
      if (options.json) console.log(JSON.stringify(servers, null, 2));
      else {
        console.log('\n🔌 MCP Servers:');
        for (const [id, server] of Object.entries(servers)) {
          console.log(`  ${server.enabled !== false ? '✓' : '○'} ${id} (${server.type}): ${server.url || server.command?.join(' ') || ''}`);
        }
        if (!Object.keys(servers).length) console.log('  (none)');
        console.log();
      }
    } catch (error) {
      console.error('Error listing MCP servers:', (error as Error).message);
      process.exitCode = 1;
    }
  });

mcp.command('auth <id>')
  .description('Auth OAuth MCP server')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (id, options) => {
    try { await authMCPServer(id, { verbose: options.verbose }); console.log(`✓ Auth completed for ${id}`); }
    catch (error) { console.error('Error authenticating MCP server:', (error as Error).message); process.exitCode = 1; }
  });

mcp.command('logout <id>')
  .description('Logout MCP server')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (id, options) => {
    try { await logoutMCPServer(id, { verbose: options.verbose }); console.log(`✓ Logged out from ${id}`); }
    catch (error) { console.error('Error logging out MCP server:', (error as Error).message); process.exitCode = 1; }
  });

mcp.command('remove <id>')
  .alias('rm')
  .description('Xóa MCP server khỏi config')
  .option('--project', 'Project config')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (id, options) => {
    try {
      removeMCPServerFromConfig(id, options.project ? `${process.cwd()}/opencode.json` : undefined, { dryRun: options.dryRun, verbose: options.verbose });
      console.log(`✓ Đã xóa MCP server "${id}"`);
    } catch (error) { console.error('Error removing MCP server:', (error as Error).message); process.exitCode = 1; }
  });

export { mcp };
