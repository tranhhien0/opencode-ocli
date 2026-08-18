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
 * Supports timeout với proper process termination (SIGTERM → grace → SIGKILL)
 */
export async function runOpenCodeCommand(
  args: string[],
  options?: OpenCodeShellOptions & { timeout?: number; signal?: AbortSignal }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const verbose = options?.verbose ?? isVerbose();
  const dryRun = options?.dryRun ?? false;
  const timeoutMs = options?.timeout;

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
    let timeoutId: NodeJS.Timeout | undefined;
    let settled = false;

    // Handle external abort signal (from caller's AbortController)
    const onAbort = () => {
      if (settled) return;

      if (verbose) {
        console.log(`[OPENCODE] Abort signal received, terminating process...`);
      }

      // Send SIGTERM first
      proc.kill('SIGTERM');

      // Grace period rồi SIGKILL
      setTimeout(() => {
        if (!proc.killed) {
          if (verbose) {
            console.log(`[OPENCODE] Process still running after SIGTERM, sending SIGKILL...`);
          }
          proc.kill('SIGKILL');
        }
      }, 2000); // 2 second grace period
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        onAbort();
      } else {
        options.signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    // Setup timeout nếu có
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        if (settled) return;

        if (verbose) {
          console.log(`[OPENCODE] Timeout after ${timeoutMs}ms, terminating process...`);
        }

        // Send SIGTERM first
        proc.kill('SIGTERM');

        // Grace period rồi SIGKILL
        setTimeout(() => {
          if (!proc.killed) {
            if (verbose) {
              console.log(`[OPENCODE] Process still running after SIGTERM, sending SIGKILL...`);
            }
            proc.kill('SIGKILL');
          }
        }, 2000); // 2 second grace period

        // Clear timeout timer để không gọi lại
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }, timeoutMs);
    }

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (verbose) {
          process.stdout.write(chunk);
        }
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        if (verbose) {
          process.stderr.write(chunk);
        }
      });
    }

    proc.on('error', (err) => {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);

      if (err.message.includes('ENOENT')) {
        reject(new Error(
          'Không tìm thấy lệnh `opencode`. Vui lòng cài đặt OpenCode trước:\\n' +
          '  npm install -g opencode\\n' +
          'hoặc\\n' +
          '  curl -sSL https://opencode.ai/install | bash'
        ));
      } else {
        reject(err);
      }
    });

    proc.on('close', (exitCode) => {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);

      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });

    proc.on('exit', () => {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
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
    return result.stdout.split('\\n').filter(line => line.trim().length > 0);
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
    // Không log warning để tránh làm bẩn output khi test
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
    return result.stdout.split('\\n').filter(line => line.trim().length > 0);
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
  options?: OpenCodeShellOptions & { timeout?: number }
): Promise<{ valid: boolean; error?: string }> {
  const verbose = options?.verbose ?? isVerbose();
  const timeout = options?.timeout ?? 10000; // Default 10 giây

  // Kiểm tra nếu provider trùng với provider preload
  const preloadedProviders = ['openai', 'anthropic', 'google', 'groq'];
  if (preloadedProviders.includes(providerId.toLowerCase())) {
    console.warn(`\\x1b[33m⚠ Cảnh báo: Provider "${providerId}" là provider mặc định của OpenCode.\\x1b[0m`);
    console.warn(`\\x1b[33m  Nếu bạn đang cấu hình lại, hãy đảm bảo API key được cập nhật đúng.\\x1b[0m\\n`);
  }

  // Tạo AbortController cho timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
    if (verbose) {
      console.log(`[VERIFY] Timeout after ${timeout}ms`);
    }
  }, timeout);

  // Thử chạy một prompt rất nhỏ để verify
  const args = [
    'run',
    '--model', `${providerId}/${modelId}`,
    '--non-interactive',
    'Say "OK" in exactly 2 characters'
  ];

  if (verbose) {
    console.log(`[VERIFY] Testing ${providerId}/${modelId} with timeout ${timeout}ms...`);
  }

  try {
    const result = await runOpenCodeCommand(args, { ...options, verbose: false, timeout, signal: abortController.signal });
    clearTimeout(timeoutId);

    if (result.exitCode !== 0) {
      // Phân tích lỗi chi tiết
      const stderr = result.stderr.toLowerCase();
      const originalStderr = result.stderr.trim();

      let errorMessage = '';
      let errorType = 'unknown';

      // Check 401 - Unauthorized / API Key sai
      if (stderr.includes('401') || stderr.includes('unauthorized') ||
          stderr.includes('api key') || stderr.includes('authentication')) {
        errorType = 'invalid_api_key';
        errorMessage = `Lỗi xác thực (API key sai hoặc thiếu)`;
      }
      // Check 404 - Not Found
      else if (stderr.includes('404') || stderr.includes('not found')) {
        errorType = 'invalid_model';
        errorMessage = `Không tìm thấy model hoặc endpoint`;
      }
      // Check network errors
      else if (stderr.includes('econnrefused') || stderr.includes('enotfound') ||
               stderr.includes('network') || stderr.includes('fetch failed')) {
        errorType = 'network_error';
        errorMessage = `Mất kết nối mạng hoặc server không phản hồi`;
      }
      // Check timeout
      else if (stderr.includes('timeout') || stderr.includes('timed out')) {
        errorType = 'timeout';
        errorMessage = `Yêu cầu hết thời gian chờ (${timeout}ms)`;
      }
      // Default error
      else {
        errorType = 'unknown';
        errorMessage = originalStderr || 'Lỗi không xác định';
      }

      if (verbose) {
        console.log(`[VERIFY] Error type: ${errorType}`);
        console.log(`[VERIFY] Raw stderr: ${originalStderr}`);
      }

      return {
        valid: false,
        error: `${errorType}: ${errorMessage}`
      };
    }

    return { valid: true };
  } catch (error) {
    clearTimeout(timeoutId);

    const err = error as Error;

    // Handle abort (timeout)
    if (err.name === 'AbortError' || err.message.includes('aborted')) {
      return {
        valid: false,
        error: `timeout: Yêu cầu hết thời gian chờ sau ${timeout}ms`
      };
    }

    // Handle ENOENT - opencode not found
    if (err.message.includes('ENOENT')) {
      return {
        valid: false,
        error: `not_found: Không tìm thấy lệnh opencode`
      };
    }

    return {
      valid: false,
      error: `unknown: ${err.message}`
    };
  }
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

/**
 * Logout provider bằng opencode auth logout
 */
export async function logoutProvider(
  providerId: string,
  options?: OpenCodeShellOptions
): Promise<void> {
  const args = ['auth', 'logout', providerId];

  const result = await runOpenCodeCommand(args, options);

  if (result.exitCode !== 0) {
    throw new Error(`opencode auth logout failed: ${result.stderr}`);
  }
}

/**
 * Verify provider authentication
 */
export async function verifyProviderAuth(
  providerId: string,
  options?: OpenCodeShellOptions & { modelId?: string }
): Promise<{ valid: boolean; details?: string; error?: string }> {
  const verbose = options?.verbose ?? isVerbose();
  const modelId = options?.modelId || 'gpt-4o'; // Default model để test

  if (verbose) {
    console.log(`[VERIFY] Checking auth for provider: ${providerId}`);
  }

  // Sử dụng verifyProvider đã có sẵn
  const result = await verifyProvider(providerId, modelId, options);

  if (result.valid) {
    return {
      valid: true,
      details: `Provider ${providerId} is authenticated and working`
    };
  } else {
    return {
      valid: false,
      error: result.error || 'Unknown error'
    };
  }
}
