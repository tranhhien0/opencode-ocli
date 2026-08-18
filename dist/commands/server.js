/**
 * OCX - OpenCode eXtension CLI
 * Server commands: serve, web, attach
 */
import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { isVerbose } from '../lib/env.js';
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    green: '\x1b[32m'
};
// Helper để spawn opencode server commands
async function runServerCommand(subCommand, args, options) {
    const verbose = options?.verbose ?? isVerbose();
    const port = options?.port || 3000;
    const host = options?.host || 'localhost';
    const opencodePath = process.env.OPENCODE_PATH || 'opencode';
    // Build command args
    const cmdArgs = [subCommand];
    // Add port và host nếu có
    if (subCommand === 'serve' || subCommand === 'web') {
        cmdArgs.push('--port', port.toString());
        cmdArgs.push('--host', host);
    }
    // Thêm các args bổ sung
    cmdArgs.push(...args);
    if (verbose) {
        console.log(`[SERVER] Running: ${opencodePath} ${cmdArgs.join(' ')}`);
    }
    // Đọc environment variables
    const env = { ...process.env };
    // OPENCODE_SERVER_PASSWORD
    if (process.env.OPENCODE_SERVER_PASSWORD) {
        env.OPENCODE_SERVER_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD;
        if (verbose) {
            console.log(`[SERVER] Using OPENCODE_SERVER_PASSWORD (masked)`);
        }
    }
    // OPENCODE_SERVER_USERNAME
    if (process.env.OPENCODE_SERVER_USERNAME) {
        env.OPENCODE_SERVER_USERNAME = process.env.OPENCODE_SERVER_USERNAME;
        if (verbose) {
            console.log(`[SERVER] Using OPENCODE_SERVER_USERNAME: ${process.env.OPENCODE_SERVER_USERNAME}`);
        }
    }
    return new Promise((resolve, reject) => {
        const proc = spawn(opencodePath, cmdArgs, {
            stdio: 'inherit',
            env,
            shell: true
        });
        proc.on('error', (err) => {
            if (err.message.includes('ENOENT')) {
                reject(new Error('Không tìm thấy lệnh `opencode`. Vui lòng cài đặt OpenCode trước.'));
            }
            else {
                reject(err);
            }
        });
        proc.on('close', (exitCode) => {
            if (exitCode === 0) {
                resolve();
            }
            else {
                reject(new Error(`Command exited with code ${exitCode}`));
            }
        });
    });
}
// Create main server command group
const server = new Command('server');
server.command('serve')
    .description('Chạy OpenCode server mode')
    .option('--port <number>', 'Port mặc định (default: 3000)', '3000')
    .option('--host <hostname>', 'Hostname mặc định (default: localhost)', 'localhost')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const port = parseInt(options.port, 10);
        const host = options.host;
        console.log(`${colors.cyan}🚀 Starting OpenCode server...${colors.reset}`);
        console.log(`   Host: ${host}`);
        console.log(`   Port: ${port}`);
        if (process.env.OPENCODE_SERVER_PASSWORD) {
            console.log(`   ${colors.yellow}⚠ Password protection enabled${colors.reset}`);
        }
        console.log();
        await runServerCommand('serve', [], {
            verbose: options.verbose,
            port,
            host
        });
        console.log(`\n${colors.green}✓ Server stopped${colors.reset}`);
    }
    catch (error) {
        console.error(`${colors.yellow}✗ Server error:${colors.reset}`, error.message);
        process.exit(1);
    }
});
server.command('web')
    .description('Chạy OpenCode web interface')
    .option('--port <number>', 'Port mặc định (default: 3000)', '3000')
    .option('--host <hostname>', 'Hostname mặc định (default: localhost)', 'localhost')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const port = parseInt(options.port, 10);
        const host = options.host;
        console.log(`${colors.cyan}🌐 Starting OpenCode web interface...${colors.reset}`);
        console.log(`   URL: http://${host}:${port}`);
        console.log();
        if (process.env.OPENCODE_SERVER_PASSWORD) {
            console.log(`${colors.yellow}⚠ Password protection enabled${colors.reset}`);
            console.log(`   Username: ${process.env.OPENCODE_SERVER_USERNAME || 'admin'}`);
            console.log();
        }
        await runServerCommand('web', [], {
            verbose: options.verbose,
            port,
            host
        });
        console.log(`\n${colors.green}✓ Web interface stopped${colors.reset}`);
    }
    catch (error) {
        console.error(`${colors.yellow}✗ Web interface error:${colors.reset}`, error.message);
        process.exit(1);
    }
});
server.command('attach')
    .description('Attach vào session đang chạy')
    .option('--session <id>', 'Session ID để attach')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const args = [];
        if (options.session) {
            args.push(options.session);
        }
        console.log(`${colors.cyan}🔗 Attaching to OpenCode session...${colors.reset}`);
        console.log();
        await runServerCommand('attach', args, {
            verbose: options.verbose
        });
        console.log(`\n${colors.green}✓ Detached from session${colors.reset}`);
    }
    catch (error) {
        console.error(`${colors.yellow}✗ Attach error:${colors.reset}`, error.message);
        process.exit(1);
    }
});
// Export individual commands for use in main index
export { server };
// Also export serve, web, attach as standalone commands for easier access
const serve = new Command('serve')
    .description('Chạy OpenCode server mode (shortcut)')
    .option('--port <number>', 'Port mặc định (default: 3000)', '3000')
    .option('--host <hostname>', 'Hostname mặc định (default: localhost)', 'localhost')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const port = parseInt(options.port, 10);
        const host = options.host;
        console.log(`${colors.cyan}🚀 Starting OpenCode server...${colors.reset}`);
        console.log(`   Host: ${host}`);
        console.log(`   Port: ${port}`);
        if (process.env.OPENCODE_SERVER_PASSWORD) {
            console.log(`   ${colors.yellow}⚠ Password protection enabled${colors.reset}`);
        }
        console.log();
        await runServerCommand('serve', [], {
            verbose: options.verbose,
            port,
            host
        });
        console.log(`\n${colors.green}✓ Server stopped${colors.reset}`);
    }
    catch (error) {
        console.error(`${colors.yellow}✗ Server error:${colors.reset}`, error.message);
        process.exit(1);
    }
});
const web = new Command('web')
    .description('Chạy OpenCode web interface (shortcut)')
    .option('--port <number>', 'Port mặc định (default: 3000)', '3000')
    .option('--host <hostname>', 'Hostname mặc định (default: localhost)', 'localhost')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const port = parseInt(options.port, 10);
        const host = options.host;
        console.log(`${colors.cyan}🌐 Starting OpenCode web interface...${colors.reset}`);
        console.log(`   URL: http://${host}:${port}`);
        console.log();
        if (process.env.OPENCODE_SERVER_PASSWORD) {
            console.log(`${colors.yellow}⚠ Password protection enabled${colors.reset}`);
            console.log(`   Username: ${process.env.OPENCODE_SERVER_USERNAME || 'admin'}`);
            console.log();
        }
        await runServerCommand('web', [], {
            verbose: options.verbose,
            port,
            host
        });
        console.log(`\n${colors.green}✓ Web interface stopped${colors.reset}`);
    }
    catch (error) {
        console.error(`${colors.yellow}✗ Web interface error:${colors.reset}`, error.message);
        process.exit(1);
    }
});
const attach = new Command('attach')
    .description('Attach vào session đang chạy (shortcut)')
    .option('--session <id>', 'Session ID để attach')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const args = [];
        if (options.session) {
            args.push(options.session);
        }
        console.log(`${colors.cyan}🔗 Attaching to OpenCode session...${colors.reset}`);
        console.log();
        await runServerCommand('attach', args, {
            verbose: options.verbose
        });
        console.log(`\n${colors.green}✓ Detached from session${colors.reset}`);
    }
    catch (error) {
        console.error(`${colors.yellow}✗ Attach error:${colors.reset}`, error.message);
        process.exit(1);
    }
});
export { serve, web, attach };
