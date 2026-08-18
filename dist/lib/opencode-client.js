/**
 * OCX - OpenCode eXtension CLI
 * OpenCodeClient abstraction layer
 */
import { spawn } from 'node:child_process';
import { NetworkError, OpenCodeError, TimeoutError } from './errors.js';
import { log } from './logger.js';
/**
 * OpenCodeClient - Abstraction layer để tương tác với OpenCode CLI
 */
export class OpenCodeClient {
    options;
    constructor(options = {}) {
        this.options = {
            verbose: options.verbose ?? false,
            dryRun: options.dryRun ?? false,
            cwd: options.cwd ?? process.cwd(),
            timeout: options.timeout ?? 30000, // 30s default
            maxRetries: options.maxRetries ?? 3,
        };
    }
    /**
     * List models từ OpenCode
     * @param provider Optional provider ID để filter
     */
    async listModels(provider) {
        log.debug('Listing models', { provider });
        const args = ['models', '--json'];
        if (provider) {
            args.push('--provider', provider);
        }
        const result = await this.runCommand(args);
        if (result.exitCode !== 0) {
            throw new OpenCodeError(`Failed to list models: ${result.stderr}`);
        }
        try {
            const data = JSON.parse(result.stdout);
            if (Array.isArray(data)) {
                return data.map((item) => {
                    if (typeof item === 'string')
                        return { id: item };
                    if (item && typeof item === 'object' && 'id' in item) {
                        return item;
                    }
                    return { id: String(item) };
                });
            }
            return [];
        }
        catch (error) {
            log.error('Failed to parse models response', { error });
            return [];
        }
    }
    /**
     * List auth providers
     */
    async listAuthProviders() {
        log.debug('Listing auth providers');
        const args = ['auth', 'list', '--json'];
        const result = await this.runCommand(args);
        if (result.exitCode !== 0) {
            log.warn('Failed to list auth providers', { stderr: result.stderr });
            return [];
        }
        try {
            const data = JSON.parse(result.stdout);
            if (Array.isArray(data)) {
                return data.map((item) => {
                    if (typeof item === 'string')
                        return { id: item, authenticated: true };
                    if (item && typeof item === 'object' && 'id' in item) {
                        return item;
                    }
                    return { id: String(item), authenticated: true };
                });
            }
            return [];
        }
        catch (error) {
            log.error('Failed to parse auth providers response', { error });
            return [];
        }
    }
    /**
     * Install plugin
     * @param name Plugin module name
     * @param options Installation options
     */
    async installPlugin(name, options = {}) {
        log.info('Installing plugin', { name, options });
        const args = ['plugin', name];
        if (options.global)
            args.push('--global');
        if (options.force)
            args.push('--force');
        const result = await this.runCommand(args);
        if (result.exitCode !== 0) {
            throw new OpenCodeError(`Failed to install plugin ${name}: ${result.stderr}`);
        }
        log.info('Plugin installed successfully', { name });
    }
    /**
     * Export session
     * @param id Session ID (null for current)
     * @param options Export options
     */
    async exportSession(id, options = {}) {
        log.info('Exporting session', { id, options });
        const outputPath = options.output || `session-${Date.now()}.json`;
        const args = ['export', '--output', outputPath];
        if (id) {
            args.unshift(id);
        }
        if (options.sanitize) {
            args.push('--sanitize');
        }
        const result = await this.runCommand(args);
        if (result.exitCode !== 0) {
            throw new OpenCodeError(`Failed to export session: ${result.stderr}`);
        }
        log.info('Session exported successfully', { outputPath });
        return outputPath;
    }
    /**
     * Generic method để chạy lệnh opencode với retry và timeout
     * @param args Command arguments
     */
    async runCommand(args) {
        const { timeout, maxRetries, dryRun, cwd } = this.options;
        if (dryRun) {
            log.info('[DRY-RUN] Would run command', { args });
            return { stdout: '', stderr: '', exitCode: 0 };
        }
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            log.debug(`Running command (attempt ${attempt}/${maxRetries})`, { args });
            try {
                const result = await this.executeCommand(args, timeout, cwd);
                if (result.exitCode === 0) {
                    return result;
                }
                lastError = new Error(`Command failed with exit code ${result.exitCode}`);
                log.warn(`Command failed (attempt ${attempt}/${maxRetries})`, {
                    exitCode: result.exitCode,
                    stderr: result.stderr
                });
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                log.error(`Command execution error (attempt ${attempt}/${maxRetries})`, {
                    error: lastError.message
                });
            }
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError || new Error('Command failed after all retries');
    }
    /**
     * Execute command với timeout
     */
    executeCommand(args, timeoutMs, cwd) {
        return new Promise((resolve, reject) => {
            const opencodePath = process.env.OPENCODE_PATH || 'opencode';
            const spawnOptions = {
                cwd: cwd || process.cwd(),
                env: { ...process.env },
                stdio: ['ignore', 'pipe', 'pipe'],
            };
            const proc = spawn(opencodePath, args, spawnOptions);
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                proc.kill('SIGTERM');
                reject(new TimeoutError(`Command timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('error', (err) => {
                clearTimeout(timeoutId);
                if (err.message.includes('ENOENT')) {
                    reject(new OpenCodeError('OpenCode CLI not found. Please install it first.', { suggestion: 'Run: npm install -g opencode' }));
                }
                else {
                    reject(new NetworkError(err.message));
                }
            });
            proc.on('close', (exitCode) => {
                clearTimeout(timeoutId);
                if (timedOut)
                    return;
                resolve({
                    stdout,
                    stderr,
                    exitCode: exitCode ?? 1,
                });
            });
        });
    }
}
