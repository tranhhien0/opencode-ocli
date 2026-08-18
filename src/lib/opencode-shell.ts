/**
 * OCX - OpenCode eXtension CLI
 * Module spawn tiến trình `opencode` con và xử lý output
 */

import { spawn, SpawnOptions } from 'node:child_process';
import { isVerbose } from './env.js';

export interface OpenCodeShellOptions {
  verbose?: boolean;
  dryRun?: boolean;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Chạy lệnh opencode và trả về output
 */
export async function runOpenCodeCommand(
  args: string[],
  options?: OpenCodeShellOptions
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const verbose = options?.verbose ?? isVerbose();
  const dryRun = options?.dryRun ?? false;
  
  if (dryRun) {
    console.log(`[DRY-RUN] Would run: opencode ${args.join(' ')}`);
    return { stdout: '', stderr: '', exitCode: 0 };
  }
  
  if (verbose) {
    console.log(`[OPENCODE] Running: opencode ${args.join(' ')}`);
  }
  
  return new Promise((resolve, reject) => {
    const opencodePath = process.env.OPENCODE_PATH || 'opencode';
    const spawnOptions: SpawnOptions = {
      cwd: options?.cwd || process.cwd(),
      env: { ...process.env, ...(options?.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    };
    
    const proc = spawn(opencodePath, args, spawnOptions);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (verbose) {
        process.stdout.write(chunk);
      }
    });
    
    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (verbose) {
        process.stderr.write(chunk);
      }
    });
    
    proc.on('error', (err) => {
      if (err.message.includes('ENOENT')) {
        reject(new Error(
          'Không tìm thấy lệnh `opencode`. Vui lòng cài đặt OpenCode trước:\n' +
          '  npm install -g opencode\n' +
          'hoặc\n' +
          '  curl -sSL https://opencode.ai/install | bash'
        ));
      } else {
        reject(err);
      }
    });
    
    proc.on('close', (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
  });
}

/**
 * Chạy opencode models để lấy danh sách models cho provider
 */
export async function listModels(providerId?: string, options?: OpenCodeShellOptions): Promise<string[]> {
  const args = ['models'];
  if (providerId) {
    args.push('--provider', providerId);
  }
  args.push('--json');
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode models failed: ${result.stderr}`);
  }
  
  try {
    const data = JSON.parse(result.stdout);
    // Parse dựa trên format output của opencode models --json
    if (Array.isArray(data)) {
      return data.map((m: unknown) => {
        if (typeof m === 'string') return m;
        if (m && typeof m === 'object' && 'id' in m) return (m as { id: string }).id;
        return String(m);
      });
    }
    return [];
  } catch {
    // Fallback: parse từ text output
    return result.stdout.split('\n').filter(line => line.trim().length > 0);
  }
}

/**
 * Chạy opencode auth list để lấy danh sách providers đã auth
 */
export async function listAuthProviders(options?: OpenCodeShellOptions): Promise<string[]> {
  const args = ['auth', 'list', '--json'];
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    // Nếu lệnh thất bại, trả về mảng rỗng thay vì throw
    console.warn(`Warning: opencode auth list failed: ${result.stderr}`);
    return [];
  }
  
  try {
    const data = JSON.parse(result.stdout);
    if (Array.isArray(data)) {
      return data.map((p: unknown) => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object' && 'id' in p) return (p as { id: string }).id;
        return String(p);
      });
    }
    return [];
  } catch {
    return result.stdout.split('\n').filter(line => line.trim().length > 0);
  }
}

/**
 * Chạy opencode session list để lấy danh sách sessions
 */
export async function listSessions(options?: OpenCodeShellOptions): Promise<Array<{ id: string; createdAt: number }>> {
  const args = ['session', 'list', '--json'];
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode session list failed: ${result.stderr}`);
  }
  
  try {
    return JSON.parse(result.stdout);
  } catch {
    return [];
  }
}

/**
 * Export session ra file
 */
export async function exportSession(
  sessionId: string | null,
  outputPath: string,
  sanitize: boolean = false,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['export', '--output', outputPath];
  if (sessionId) {
    args.unshift(sessionId);
  }
  if (sanitize) {
    args.push('--sanitize');
  }
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode export failed: ${result.stderr}`);
  }
}

/**
 * Import session từ file
 */
export async function importSession(
  inputPath: string,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['import', inputPath];
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode import failed: ${result.stderr}`);
  }
}

/**
 * Health check provider bằng cách thử load model nhỏ
 */
export async function verifyProvider(
  providerId: string,
  modelId: string,
  options?: OpenCodeShellOptions
): Promise<{ valid: boolean; error?: string }> {
  const verbose = options?.verbose ?? isVerbose();
  
  // Thử chạy một prompt rất nhỏ để verify
  const args = [
    'run',
    '--model', `${providerId}/${modelId}`,
    '--non-interactive',
    'Say "OK" in exactly 2 characters'
  ];
  
  if (verbose) {
    console.log(`[VERIFY] Testing ${providerId}/${modelId}...`);
  }
  
  const result = await runOpenCodeCommand(args, { ...options, verbose: false });
  
  if (result.exitCode !== 0) {
    // Phân tích lỗi
    const stderr = result.stderr.toLowerCase();
    let errorType = 'unknown';
    
    if (stderr.includes('401') || stderr.includes('unauthorized') || stderr.includes('api key')) {
      errorType = 'invalid_api_key';
    } else if (stderr.includes('404') || stderr.includes('not found') || stderr.includes('model')) {
      errorType = 'invalid_model';
    } else if (stderr.includes('network') || stderr.includes('econnrefused') || stderr.includes('timeout')) {
      errorType = 'network_error';
    }
    
    return {
      valid: false,
      error: `${errorType}: ${result.stderr.trim()}`
    };
  }
  
  return { valid: true };
}

/**
 * Chạy opencode plugin install
 */
export async function installPlugin(
  moduleName: string,
  globalInstall: boolean = false,
  force: boolean = false,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['plugin', moduleName];
  if (globalInstall) {
    args.push('--global');
  }
  if (force) {
    args.push('--force');
  }
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode plugin install failed: ${result.stderr}`);
  }
}

/**
 * Chạy opencode plugin uninstall
 */
export async function uninstallPlugin(
  moduleName: string,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['plugin', 'uninstall', moduleName];
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode plugin uninstall failed: ${result.stderr}`);
  }
}

/**
 * Chạy opencode mcp auth
 */
export async function authMCPServer(
  serverId: string,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['mcp', 'auth', serverId];
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode mcp auth failed: ${result.stderr}`);
  }
}

/**
 * Chạy opencode mcp logout
 */
export async function logoutMCPServer(
  serverId: string,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['mcp', 'logout', serverId];
  
  const result = await runOpenCodeCommand(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(`opencode mcp logout failed: ${result.stderr}`);
  }
}
