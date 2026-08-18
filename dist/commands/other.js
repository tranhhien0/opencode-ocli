/**
 * OCX - OpenCode eXtension CLI
 * Commands nhóm: plugin, skill, mcp, session, config, auth
 */
import { Command } from 'commander';
import * as fs from 'node:fs';
import { readConfig, writeConfig, addMCPServerToConfig, removeMCPServerFromConfig, initConfig, validateConfig } from '../lib/config.js';
import { getConfigPath } from '../lib/env.js';
import { listSessions, exportSession, importSession, installPlugin, uninstallPlugin, authMCPServer, logoutMCPServer, listAuthProviders } from '../lib/opencode-shell.js';
// ============== PLUGIN COMMANDS ==============
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
    }
    catch (error) {
        console.error('Error installing plugin:', error.message);
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
    }
    catch (error) {
        console.error('Error removing plugin:', error.message);
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
        }
        else {
            console.log('\n📦 Installed plugins:');
            if (plugins.length === 0) {
                console.log('  (none)');
            }
            else {
                plugins.forEach(p => console.log(`  • ${p}`));
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing plugins:', error.message);
        process.exit(1);
    }
});
// ============== SKILL COMMANDS ==============
const skill = new Command('skill');
skill.command('list')
    .description('Liệt kê agent skills khả dụng')
    .option('--json', 'Output JSON')
    .action((options) => {
    try {
        const config = readConfig();
        // Skills có thể được định nghĩa trong instructions hoặc thư mục .opencode/skills
        const instructions = config.instructions || [];
        // Check project folder cho .opencode/skills
        const skillsDir = './.opencode/skills';
        let localSkills = [];
        if (fs.existsSync(skillsDir)) {
            localSkills = fs.readdirSync(skillsDir)
                .filter(f => f.endsWith('.md') || f.endsWith('.txt'));
        }
        const result = {
            instructions,
            local_skills: localSkills
        };
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            console.log('\n🎯 Agent Skills:');
            console.log('\n  Instructions:');
            if (instructions.length === 0) {
                console.log('    (none)');
            }
            else {
                instructions.forEach(i => console.log(`    • ${i}`));
            }
            console.log('\n  Local skills:');
            if (localSkills.length === 0) {
                console.log('    (none)');
            }
            else {
                localSkills.forEach(s => console.log(`    • ${s}`));
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing skills:', error.message);
        process.exit(1);
    }
});
skill.command('enable <name>')
    .description('Enable skill')
    .action((name) => {
    console.log(`Note: Skill enabling depends on your OpenCode version. Consider adding to instructions.`);
    console.log(`Suggested: Add "${name}" to instructions array in opencode.json`);
});
skill.command('disable <name>')
    .description('Disable skill')
    .action((name) => {
    console.log(`Note: Skill disabling depends on your OpenCode version.`);
});
// ============== MCP COMMANDS ==============
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
            type: options.type,
            url: options.url,
            command: options.command ? options.command.split(' ') : undefined,
            enabled: true
        };
        addMCPServerToConfig(serverId, serverConfig, undefined, {
            dryRun: options.dryRun,
            verbose: options.verbose
        });
        console.log(`✓ Đã thêm MCP server "${serverId}" (${options.type})`);
    }
    catch (error) {
        console.error('Error adding MCP server:', error.message);
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
        }
        else {
            console.log('\n🔌 MCP Servers:');
            const ids = Object.keys(mcpServers);
            if (ids.length === 0) {
                console.log('  (none)');
            }
            else {
                for (const id of ids) {
                    const server = mcpServers[id];
                    const status = server.enabled !== false ? '✓' : '○';
                    console.log(`  ${status} ${id} (${server.type}): ${server.url || server.command?.join(' ') || ''}`);
                }
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing MCP servers:', error.message);
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
    }
    catch (error) {
        console.error('Error authenticating MCP server:', error.message);
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
    }
    catch (error) {
        console.error('Error logging out MCP server:', error.message);
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
    }
    catch (error) {
        console.error('Error removing MCP server:', error.message);
        process.exit(1);
    }
});
// ============== SESSION COMMANDS ==============
const session = new Command('session');
session.command('export [sessionId]')
    .description('Export session ra file')
    .option('--output <path>', 'Output file path')
    .option('--sanitize', 'Sanitize sensitive data')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (sessionId, options) => {
    try {
        const outputPath = options.output || `session-${Date.now()}.json`;
        await exportSession(sessionId || null, outputPath, options.sanitize, {
            verbose: options.verbose
        });
        console.log(`✓ Exported session to: ${outputPath}`);
    }
    catch (error) {
        console.error('Error exporting session:', error.message);
        process.exit(1);
    }
});
session.command('import <file>')
    .description('Import session từ file')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (inputFile, options) => {
    try {
        if (!fs.existsSync(inputFile)) {
            console.error(`Error: File not found: ${inputFile}`);
            process.exit(1);
        }
        await importSession(inputFile, { verbose: options.verbose });
        console.log(`✓ Imported session from: ${inputFile}`);
    }
    catch (error) {
        console.error('Error importing session:', error.message);
        process.exit(1);
    }
});
session.command('list')
    .description('Liệt kê sessions')
    .option('--json', 'Output JSON')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const sessions = await listSessions({ verbose: options.verbose });
        if (options.json) {
            console.log(JSON.stringify(sessions, null, 2));
        }
        else {
            console.log('\n📁 Sessions:');
            if (sessions.length === 0) {
                console.log('  (none)');
            }
            else {
                for (const s of sessions) {
                    const date = new Date(s.createdAt).toLocaleString();
                    console.log(`  • ${s.id} (${date})`);
                }
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing sessions:', error.message);
        process.exit(1);
    }
});
session.command('delete <sessionId>')
    .description('Xóa session')
    .option('--force', 'Force delete without confirmation')
    .action((sessionId, options) => {
    console.log(`Note: Session deletion may require using opencode directly.`);
    console.log(`Try: opencode session delete ${sessionId}`);
});
// ============== CONFIG COMMANDS ==============
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
    }
    catch (error) {
        console.error('Error initializing config:', error.message);
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
        }
        else {
            if (result.valid) {
                console.log('✓ Config is valid!');
            }
            else {
                console.log('✗ Config has errors:');
                result.errors.forEach(e => console.log(`  • ${e}`));
                process.exit(1);
            }
        }
    }
    catch (error) {
        console.error('Error validating config:', error.message);
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
        }
        else {
            console.log(`\n📄 Config file: ${configPath}`);
            console.log(JSON.stringify(config, null, 2));
            console.log();
        }
    }
    catch (error) {
        console.error('Error showing config:', error.message);
        process.exit(1);
    }
});
// ============== AUTH COMMANDS ==============
const auth = new Command('auth');
auth.command('list')
    .description('Liệt kê providers đã auth')
    .option('--json', 'Output JSON')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const providers = await listAuthProviders({ verbose: options.verbose });
        if (options.json) {
            console.log(JSON.stringify(providers, null, 2));
        }
        else {
            console.log('\n🔑 Authenticated providers:');
            if (providers.length === 0) {
                console.log('  (none)');
            }
            else {
                providers.forEach(p => console.log(`  ✓ ${p}`));
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing auth:', error.message);
        process.exit(1);
    }
});
auth.command('logout <provider>')
    .description('Logout provider')
    .action((providerId) => {
    console.log(`Note: Use opencode auth logout ${providerId} for full logout`);
});
auth.command('verify <provider>')
    .description('Verify provider credentials')
    .action((providerId) => {
    console.log(`Note: Use ocx provider verify ${providerId} instead`);
});
export { plugin, skill, mcp, session, configCmd, auth };
