import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { isVerbose } from '../lib/env.js';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m'
};

async function runServerCommand(
  subCommand: string,
  args: string[],
  options?: { verbose?: boolean; port?: number; hostname?: string }
): Promise<void> {
  const verbose = options?.verbose ?? isVerbose();
  const port = options?.port ?? 4096;
  const hostname = options?.hostname ?? '127.0.0.1';
  const opencodePath = process.env.OPENCODE_PATH || 'opencode';
  const cmdArgs = [subCommand];

  if (subCommand === 'serve' || subCommand === 'web') {
    cmdArgs.push('--port', String(port), '--hostname', hostname);
  }
  cmdArgs.push(...args);

  if (verbose) console.error(`[SERVER] Running: ${opencodePath} ${cmdArgs.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(opencodePath, cmdArgs, {
      stdio: 'inherit',
      env: { ...process.env },
      shell: false,
    });
    proc.once('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('Không tìm thấy lệnh `opencode`. Vui lòng cài đặt OpenCode trước.'));
      } else {
        reject(err);
      }
    });
    proc.once('close', (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`Command exited with code ${exitCode ?? 1}`));
    });
  });
}

function addServerCommand(command: Command, name: 'serve' | 'web') {
  command.command(name)
    .description(name === 'serve' ? 'Chạy OpenCode server mode' : 'Chạy OpenCode web interface')
    .option('--port <number>', 'Port', '4096')
    .option('--hostname <hostname>', 'Hostname', '127.0.0.1')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
      const port = Number(options.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error('Invalid port: expected an integer from 1 to 65535');
        process.exit(1);
      }
      try {
        console.log(`${colors.cyan}${name === 'serve' ? '🚀 Starting OpenCode server...' : '🌐 Starting OpenCode web interface...'}${colors.reset}`);
        console.log(`   Host: ${options.hostname}`);
        console.log(`   Port: ${port}`);
        if (process.env.OPENCODE_SERVER_PASSWORD) console.log(`   ${colors.yellow}⚠ Password protection enabled${colors.reset}`);
        console.log();
        await runServerCommand(name, [], { verbose: options.verbose, port, hostname: options.hostname });
      } catch (error) {
        console.error(`${colors.yellow}✗ ${name} error:${colors.reset}`, (error as Error).message);
        process.exit(1);
      }
    });
}

function addAttachCommand(command: Command) {
  command.command('attach [url]')
    .description('Attach vào OpenCode server URL')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (url, options) => {
      try {
        const args = url ? [url] : [];
        await runServerCommand('attach', args, { verbose: options.verbose });
      } catch (error) {
        console.error(`${colors.yellow}✗ Attach error:${colors.reset}`, (error as Error).message);
        process.exit(1);
      }
    });
}

const server = new Command('server');
addServerCommand(server, 'serve');
addServerCommand(server, 'web');
addAttachCommand(server);

const serve = new Command('serve').description('Chạy OpenCode server mode (shortcut)');
serve.option('--port <number>', 'Port', '4096').option('--hostname <hostname>', 'Hostname', '127.0.0.1').option('-v, --verbose', 'Verbose mode');
serve.action(async (options) => {
  const port = Number(options.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) process.exit(1);
  try { await runServerCommand('serve', [], { verbose: options.verbose, port, hostname: options.hostname }); }
  catch (error) { console.error((error as Error).message); process.exit(1); }
});

const web = new Command('web').description('Chạy OpenCode web interface (shortcut)');
web.option('--port <number>', 'Port', '4096').option('--hostname <hostname>', 'Hostname', '127.0.0.1').option('-v, --verbose', 'Verbose mode');
web.action(async (options) => {
  const port = Number(options.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) process.exit(1);
  try { await runServerCommand('web', [], { verbose: options.verbose, port, hostname: options.hostname }); }
  catch (error) { console.error((error as Error).message); process.exit(1); }
});

const attach = new Command('attach').description('Attach vào OpenCode server (shortcut)');
attach.argument('[url]', 'OpenCode server URL').option('-v, --verbose', 'Verbose mode');
attach.action(async (url, options) => {
  try { await runServerCommand('attach', url ? [url] : [], { verbose: options.verbose }); }
  catch (error) { console.error((error as Error).message); process.exit(1); }
});

export { server, serve, web, attach };
