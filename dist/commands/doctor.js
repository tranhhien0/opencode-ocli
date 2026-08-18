/**
 * OCX - OpenCode eXtension CLI
 * Doctor command - kiểm tra toàn bộ hệ thống
 */
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { readConfig, validateConfig } from '../lib/config.js';
import { getConfigPath } from '../lib/env.js';
const doctor = new Command('doctor');
doctor.description('Kiểm tra toàn bộ hệ thống OCX')
    .option('--json', 'Output JSON')
    .action(async (options) => {
    const results = [];
    // 1. Check Node.js version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (nodeMajor >= 18) {
        results.push({
            name: 'Node.js Version',
            status: 'ok',
            message: `Node.js ${nodeVersion}`,
        });
    }
    else {
        results.push({
            name: 'Node.js Version',
            status: 'error',
            message: `Node.js ${nodeVersion} (yêu cầu >= 18.0)`,
            details: 'Vui lòng nâng cấp Node.js lên phiên bản 18 hoặc cao hơn',
        });
    }
    // 2. Check opencode CLI installation
    try {
        const opencodePath = process.env.OPENCODE_PATH || 'opencode';
        await checkCommandExists(opencodePath);
        // Get opencode version
        const version = await getCommandVersion(opencodePath);
        results.push({
            name: 'OpenCode CLI',
            status: 'ok',
            message: `Installed (${version || 'unknown version'})`,
        });
    }
    catch (error) {
        results.push({
            name: 'OpenCode CLI',
            status: 'error',
            message: 'Not found',
            details: 'Cài đặt OpenCode: npm install -g opencode\nhoặc\ncurl -sSL https://opencode.ai/install | bash',
        });
    }
    // 3. Check config file
    const configPath = getConfigPath(false);
    if (fs.existsSync(configPath)) {
        try {
            const config = readConfig();
            const validation = validateConfig(config);
            if (validation.valid) {
                results.push({
                    name: 'Config File',
                    status: 'ok',
                    message: `Valid config at ${configPath}`,
                });
            }
            else {
                results.push({
                    name: 'Config File',
                    status: 'warning',
                    message: `Config has issues at ${configPath}`,
                    details: validation.errors.join('\n'),
                });
            }
        }
        catch (error) {
            results.push({
                name: 'Config File',
                status: 'error',
                message: `Cannot read config: ${error.message}`,
            });
        }
    }
    else {
        results.push({
            name: 'Config File',
            status: 'warning',
            message: 'No global config found',
            details: `Config path: ${configPath}\nChạy 'ocx config init' để tạo config mới`,
        });
    }
    // 4. Check project config (if in project)
    const projectConfigPath = path.join(process.cwd(), 'opencode.json');
    if (fs.existsSync(projectConfigPath)) {
        try {
            const projectConfig = readConfig(projectConfigPath);
            const validation = validateConfig(projectConfig);
            if (validation.valid) {
                results.push({
                    name: 'Project Config',
                    status: 'ok',
                    message: `Valid config at ${projectConfigPath}`,
                });
            }
            else {
                results.push({
                    name: 'Project Config',
                    status: 'warning',
                    message: `Project config has issues`,
                    details: validation.errors.join('\n'),
                });
            }
        }
        catch (error) {
            results.push({
                name: 'Project Config',
                status: 'error',
                message: `Cannot read project config: ${error.message}`,
            });
        }
    }
    // 5. Check environment variables
    const envVars = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY'];
    const setEnvVars = envVars.filter(v => process.env[v]);
    if (setEnvVars.length > 0) {
        results.push({
            name: 'Environment Variables',
            status: 'ok',
            message: `${setEnvVars.length} API keys configured`,
            details: setEnvVars.join(', '),
        });
    }
    else {
        results.push({
            name: 'Environment Variables',
            status: 'warning',
            message: 'No API keys found in environment',
            details: 'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.',
        });
    }
    // 6. Check writable directories
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const opencodeDir = path.join(homeDir, '.opencode');
    try {
        if (!fs.existsSync(opencodeDir)) {
            fs.mkdirSync(opencodeDir, { recursive: true });
        }
        const testFile = path.join(opencodeDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        results.push({
            name: 'Directory Permissions',
            status: 'ok',
            message: `${opencodeDir} is writable`,
        });
    }
    catch (error) {
        results.push({
            name: 'Directory Permissions',
            status: 'error',
            message: `Cannot write to ${opencodeDir}`,
            details: error.message,
        });
    }
    // Output results
    if (options.json) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            checks: results,
            summary: {
                ok: results.filter(r => r.status === 'ok').length,
                warning: results.filter(r => r.status === 'warning').length,
                error: results.filter(r => r.status === 'error').length,
            }
        }, null, 2));
    }
    else {
        console.log('\n🔍 OCX Doctor - System Check\n');
        console.log('═'.repeat(50));
        for (const result of results) {
            const icon = result.status === 'ok' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
            const color = result.status === 'ok' ? '\x1b[32m' : result.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
            const reset = '\x1b[0m';
            console.log(`${color}${icon} ${result.name}${reset}`);
            console.log(`  ${result.message}`);
            if (result.details) {
                console.log(`  ${result.details}`);
            }
            console.log();
        }
        console.log('═'.repeat(50));
        const errors = results.filter(r => r.status === 'error').length;
        const warnings = results.filter(r => r.status === 'warning').length;
        if (errors === 0 && warnings === 0) {
            console.log('\n🎉 All checks passed!\n');
        }
        else if (errors === 0) {
            console.log(`\n⚠️  ${warnings} warning(s) found\n`);
        }
        else {
            console.log(`\n❌ ${errors} error(s), ${warnings} warning(s) found\n`);
            process.exit(1);
        }
    }
});
function checkCommandExists(command) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, ['--version'], { stdio: 'ignore' });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Command ${command} not found`));
        });
    });
}
async function getCommandVersion(command) {
    return new Promise((resolve) => {
        const proc = spawn(command, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
        let output = '';
        proc.stdout?.on('data', (data) => {
            output += data.toString();
        });
        proc.on('close', () => {
            resolve(output.trim());
        });
    });
}
export { doctor };
