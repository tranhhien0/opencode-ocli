import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { readConfig, validateConfig } from '../lib/config.js';
import { getConfigPath } from '../lib/env.js';

interface CheckResult { name: string; status: 'ok' | 'warning' | 'error'; message: string; details?: string; }
const doctor = new Command('doctor');

doctor.description('Kiểm tra toàn bộ hệ thống OCX')
  .option('--json', 'Output JSON')
  .action(async options => {
    const results: CheckResult[] = [];
    const nodeMajor = Number.parseInt(process.version.slice(1).split('.')[0], 10);
    results.push(nodeMajor >= 18
      ? { name: 'Node.js Version', status: 'ok', message: `Node.js ${process.version}` }
      : { name: 'Node.js Version', status: 'error', message: `Node.js ${process.version} (yêu cầu >= 18)` });

    try {
      const command = process.env.OPENCODE_PATH || 'opencode';
      const version = await getCommandVersion(command, 5000);
      results.push({ name: 'OpenCode CLI', status: 'ok', message: `Installed (${version || 'unknown version'})` });
    } catch (error) {
      results.push({ name: 'OpenCode CLI', status: 'error', message: 'Not found', details: (error as Error).message });
    }

    const configPath = getConfigPath(false);
    if (fs.existsSync(configPath)) {
      try {
        const validation = validateConfig(readConfig(configPath));
        results.push(validation.valid
          ? { name: 'Config File', status: 'ok', message: `Valid config at ${configPath}` }
          : { name: 'Config File', status: 'error', message: `Invalid config at ${configPath}`, details: validation.errors.join('\n') });
      } catch (error) {
        results.push({ name: 'Config File', status: 'error', message: 'Cannot read config', details: (error as Error).message });
      }
    } else {
      results.push({ name: 'Config File', status: 'warning', message: 'No global config found', details: `Expected path: ${configPath}` });
    }

    const projectConfigPath = path.join(process.cwd(), 'opencode.json');
    if (fs.existsSync(projectConfigPath)) {
      try {
        const validation = validateConfig(readConfig(projectConfigPath));
        results.push(validation.valid
          ? { name: 'Project Config', status: 'ok', message: `Valid config at ${projectConfigPath}` }
          : { name: 'Project Config', status: 'error', message: 'Project config has issues', details: validation.errors.join('\n') });
      } catch (error) {
        results.push({ name: 'Project Config', status: 'error', message: 'Cannot read project config', details: (error as Error).message });
      }
    }

    const keyNames = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'CLOUDFLARE_API_TOKEN'];
    const setKeys = keyNames.filter(key => Boolean(process.env[key]));
    results.push(setKeys.length
      ? { name: 'Environment Variables', status: 'ok', message: `${setKeys.length} supported credential env vars configured`, details: setKeys.join(', ') }
      : { name: 'Environment Variables', status: 'warning', message: 'No supported credential env vars found' });

    const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
    const configDir = path.dirname(configPath);
    try {
      fs.accessSync(home, fs.constants.R_OK);
      results.push({ name: 'Home Directory', status: 'ok', message: `${home} is readable` });
      fs.accessSync(configDir, fs.constants.W_OK | fs.constants.R_OK);
      results.push({ name: 'Config Directory', status: 'ok', message: `${configDir} is writable` });
    } catch (error) {
      results.push({ name: 'Filesystem Permissions', status: 'warning', message: `Cannot verify ${configDir}`, details: (error as Error).message });
    }

    const summary = {
      ok: results.filter(r => r.status === 'ok').length,
      warning: results.filter(r => r.status === 'warning').length,
      error: results.filter(r => r.status === 'error').length,
    };

    if (options.json) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), checks: results, summary }, null, 2));
    } else {
      console.log('\n🔍 OCX Doctor - System Check\n');
      for (const result of results) console.log(`${result.status === 'ok' ? '✓' : result.status === 'warning' ? '⚠' : '✗'} ${result.name}: ${result.message}${result.details ? `\n  ${result.details}` : ''}`);
      if (summary.error > 0) process.exitCode = 1;
    }
    if (summary.error > 0) process.exitCode = 1;
  });

function getCommandVersion(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let output = '';
    const timer = setTimeout(() => { proc.kill('SIGTERM'); reject(new Error(`Command timed out after ${timeoutMs}ms`)); }, timeoutMs);
    proc.stdout?.on('data', data => { output += data.toString(); });
    proc.once('error', error => { clearTimeout(timer); reject(error); });
    proc.once('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Command exited with code ${code ?? 1}`));
    });
  });
}

export { doctor };
