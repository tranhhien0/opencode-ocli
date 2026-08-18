import { spawn, type SpawnOptions } from 'node:child_process';
import { isVerbose } from './env.js';

export interface OpenCodeShellOptions {
  verbose?: boolean;
  dryRun?: boolean;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

type CommandResult = { stdout: string; stderr: string; exitCode: number };

export async function runOpenCodeCommand(args: string[], options?: OpenCodeShellOptions): Promise<CommandResult> {
  const verbose = options?.verbose ?? isVerbose();
  if (options?.dryRun) {
    console.error(`[DRY-RUN] Would run: opencode ${args.join(' ')}`);
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  return new Promise((resolve, reject) => {
    const opencodePath = process.env.OPENCODE_PATH || 'opencode';
    const spawnOptions: SpawnOptions = {
      cwd: options?.cwd || process.cwd(),
      env: { ...process.env, ...(options?.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    };
    const proc = spawn(opencodePath, args, spawnOptions);
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    let killTimer: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      options?.signal?.removeEventListener('abort', onAbort);
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const resolveOnce = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const terminate = () => {
      if (settled) return;
      proc.kill('SIGTERM');
      killTimer = setTimeout(() => {
        if (!settled && !proc.killed) proc.kill('SIGKILL');
      }, 2000);
    };
    const onAbort = () => terminate();

    if (options?.signal) {
      if (options.signal.aborted) terminate();
      else options.signal.addEventListener('abort', onAbort, { once: true });
    }
    if (options?.timeout && options.timeout > 0) {
      timer = setTimeout(() => {
        terminate();
        rejectOnce(new Error(`OpenCode command timed out after ${options.timeout}ms`));
      }, options.timeout);
    }

    proc.stdout?.on('data', (data: Buffer | string) => {
      const chunk = data.toString();
      stdout += chunk;
      if (verbose) process.stderr.write(chunk);
    });
    proc.stderr?.on('data', (data: Buffer | string) => {
      const chunk = data.toString();
      stderr += chunk;
      if (verbose) process.stderr.write(chunk);
    });
    proc.once('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        rejectOnce(new Error('Không tìm thấy lệnh `opencode`. Vui lòng cài đặt OpenCode trước.'));
      } else {
        rejectOnce(error instanceof Error ? error : new Error(String(error)));
      }
    });
    proc.once('close', (exitCode) => resolveOnce({ stdout, stderr, exitCode: exitCode ?? 1 }));
  });
}

export async function listModels(providerId?: string, options?: OpenCodeShellOptions & { refresh?: boolean }): Promise<string[]> {
  const args = ['models'];
  if (providerId) args.push(providerId);
  if (options?.refresh) args.push('--refresh');
  const result = await runOpenCodeCommand(args, options);
  if (result.exitCode !== 0) throw new Error(`opencode models failed: ${result.stderr}`);
  return result.stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.includes('/'));
}

export async function listAuthProviders(options?: OpenCodeShellOptions): Promise<string[]> {
  const result = await runOpenCodeCommand(['providers', 'list'], options);
  if (result.exitCode !== 0) throw new Error(`opencode providers list failed: ${result.stderr}`);
  const providers: string[] = [];
  const credentialMatch = result.stdout.match(/(\d+)\s+credentials?/);
  if (credentialMatch && parseInt(credentialMatch[1], 10) > 0) {
    const credBlock = result.stdout.split('Credentials')[1]?.split('Environment')[0] || '';
    for (const line of credBlock.split('\n')) {
      const m = line.match(/[●✓]\s+(\S+)/);
      if (m) providers.push(m[1]);
    }
  }
  const envBlock = result.stdout.split('Environment')[1] || '';
  for (const line of envBlock.split('\n')) {
    const m = line.match(/[●✓]\s+.+?\s+(\S+)/);
    if (m) providers.push(m[1]);
  }
  return providers;
}

export async function listSessions(options?: OpenCodeShellOptions): Promise<Array<{ id: string; createdAt: number }>> {
  const result = await runOpenCodeCommand(['session', 'list', '--format', 'json'], options);
  if (result.exitCode !== 0) throw new Error(`opencode session list failed: ${result.stderr}`);
  const data = JSON.parse(result.stdout);
  return Array.isArray(data) ? (data as Array<{ id: string; created?: number; createdAt?: number }>).map(s => ({ id: s.id, createdAt: s.createdAt || s.created || 0 })) : [];
}

export async function exportSession(sessionId: string | null, outputPath: string, sanitize = false, options?: OpenCodeShellOptions): Promise<void> {
  if (options?.dryRun) {
    console.log(`[DRY-RUN] Would export session ${sessionId || 'current'} to: ${outputPath}`);
    return;
  }
  const args = ['export'];
  if (sessionId) args.push(sessionId);
  if (sanitize) args.push('--sanitize');
  const result = await runOpenCodeCommand(args, { ...options });
  if (result.exitCode !== 0) throw new Error(`opencode export failed: ${result.stderr}`);
  const fs = await import('node:fs');
  fs.writeFileSync(outputPath, result.stdout, 'utf-8');
}

export async function importSession(inputPath: string, options?: OpenCodeShellOptions): Promise<void> {
  const result = await runOpenCodeCommand(['import', inputPath], { ...options });
  if (result.exitCode !== 0) throw new Error(`opencode import failed: ${result.stderr}`);
}

export async function verifyProvider(providerId: string, modelId: string, options?: OpenCodeShellOptions & { timeout?: number }): Promise<{ valid: boolean; error?: string }> {
  const args = ['run', '--model', `${providerId}/${modelId}`, '--auto', 'Say "OK" in exactly 2 characters'];
  try {
    const result = await runOpenCodeCommand(args, { ...options, verbose: false, timeout: options?.timeout ?? 10000 });
    if (result.exitCode === 0) return { valid: true };
    const stderr = result.stderr.trim();
    const lower = stderr.toLowerCase();
    if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('api key') || lower.includes('authentication')) return { valid: false, error: 'auth_failed: Lỗi xác thực' };
    if (lower.includes('404') || lower.includes('not found')) return { valid: false, error: 'invalid_model: Không tìm thấy model hoặc endpoint' };
    if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('network') || lower.includes('fetch failed')) return { valid: false, error: 'network_error: Mất kết nối mạng hoặc server không phản hồi' };
    return { valid: false, error: stderr || 'unknown: Lỗi không xác định' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('timed out')) return { valid: false, error: message };
    return { valid: false, error: message };
  }
}

export async function installPlugin(moduleName: string, globalInstall = false, force = false, options?: OpenCodeShellOptions): Promise<void> {
  const args = ['plugin', moduleName];
  if (globalInstall) args.push('--global');
  if (force) args.push('--force');
  const result = await runOpenCodeCommand(args, options);
  if (result.exitCode !== 0) throw new Error(`opencode plugin install failed: ${result.stderr}`);
}

export async function uninstallPlugin(moduleName: string, options?: OpenCodeShellOptions): Promise<void> {
  if (options?.dryRun) {
    console.error(`[DRY-RUN] Would remove plugin: ${moduleName} from config`);
    return;
  }
  console.error(`Note: opencode does not have a built-in plugin uninstall. Removing "${moduleName}" from config only.`);
}

export async function authMCPServer(serverId: string, options?: OpenCodeShellOptions): Promise<void> {
  const result = await runOpenCodeCommand(['mcp', 'auth', serverId], options);
  if (result.exitCode !== 0) throw new Error(`opencode mcp auth failed: ${result.stderr}`);
}

export async function logoutMCPServer(serverId: string, options?: OpenCodeShellOptions): Promise<void> {
  const result = await runOpenCodeCommand(['mcp', 'logout', serverId], options);
  if (result.exitCode !== 0) throw new Error(`opencode mcp logout failed: ${result.stderr}`);
}

export async function logoutProvider(providerId: string, options?: OpenCodeShellOptions): Promise<void> {
  const result = await runOpenCodeCommand(['auth', 'logout', providerId], options);
  if (result.exitCode !== 0) throw new Error(`opencode auth logout failed: ${result.stderr}`);
}

export async function verifyProviderAuth(providerId: string, options?: OpenCodeShellOptions & { modelId?: string }): Promise<{ valid: boolean; details?: string; error?: string }> {
  if (!options?.modelId) return { valid: false, error: 'invalid_input: Vui lòng chỉ định --model để verify provider' };
  const result = await verifyProvider(providerId, options.modelId, options);
  return result.valid
    ? { valid: true, details: `Provider ${providerId} authenticated and working with ${options.modelId}` }
    : { valid: false, error: result.error || 'unknown: Unknown error' };
}
