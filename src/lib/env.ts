/**
 * OCX - OpenCode eXtension CLI
 * Module xử lý environment variables và resolve options theo priority:
 * 1. CLI flag
 * 2. Environment variable
 * 3. Config file value
 * 4. Default hard-code
 */

import { ENV_VARS } from './types.js';

/**
 * Lấy giá trị từ environment variable
 */
export function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

/**
 * Lấy boolean từ environment variable (truthy: '1', 'true', 'yes')
 */
export function getEnvBool(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Lấy số từ environment variable
 */
export function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Resolve option theo thứ tự ưu tiên:
 * flag > env > config > default
 */
export function resolveOption<T>(
  flagValue: T | undefined,
  envName: string | null,
  configValue: T | undefined,
  defaultValue: T
): T {
  // 1. CLI flag có độ ưu tiên cao nhất
  if (flagValue !== undefined && flagValue !== null) {
    return flagValue;
  }
  
  // 2. Environment variable
  if (envName !== null) {
    const envValue = process.env[envName];
    if (envValue !== undefined) {
      // Type-safe conversion
      if (typeof defaultValue === 'boolean') {
        return (['1', 'true', 'yes', 'on'].includes(envValue.toLowerCase()) as unknown) as T;
      }
      if (typeof defaultValue === 'number') {
        const parsed = parseInt(envValue, 10);
        if (!isNaN(parsed)) {
          return (parsed as unknown) as T;
        }
      }
      return (envValue as unknown) as T;
    }
  }
  
  // 3. Config file value
  if (configValue !== undefined && configValue !== null) {
    return configValue;
  }
  
  // 4. Default
  return defaultValue;
}

/**
 * Kiểm tra chế độ verbose
 */
export function isVerbose(flagVerbose?: boolean): boolean {
  return resolveOption(
    flagVerbose,
    ENV_VARS.VERBOSE,
    undefined,
    false
  );
}

/**
 * Kiểm tra chế độ dry-run
 */
export function isDryRun(flagDryRun?: boolean): boolean {
  return resolveOption(
    flagDryRun,
    ENV_VARS.DRY_RUN,
    undefined,
    false
  );
}

/**
 * Lấy thư mục config
 * Ưu tiên: OCX_CONFIG_DIR > OPENCODE_CONFIG_DIR > ~/.local/share/ocx
 */
export function getConfigDir(flagProject?: boolean): string {
  if (flagProject) {
    // Project mode: dùng ./.opencode hoặc cwd
    return process.cwd();
  }
  
  return resolveOption(
    undefined,
    ENV_VARS.OPENCODE_CONFIG_DIR,
    undefined,
    getDefaultConfigDir()
  );
}

/**
 * Thư mục config mặc định
 */
function getDefaultConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  return `${home}/.local/share/ocx`;
}

/**
 * Lấy path tới opencode.json
 */
export function getConfigPath(flagProject?: boolean): string {
  if (flagProject) {
    return `${process.cwd()}/opencode.json`;
  }
  
  // Tôn trọng OPENCODE_CONFIG nếu được set
  const envConfig = process.env[ENV_VARS.OPENCODE_CONFIG];
  if (envConfig) {
    return envConfig;
  }
  
  return `${getConfigDir(false)}/config.json`;
}

/**
 * Lấy API key cho provider từ environment
 */
export function getProviderApiKey(providerId: string): string | undefined {
  // Map provider ID -> env var name
  const providerEnvMap: Record<string, string> = {
    'anthropic': ENV_VARS.ANTHROPIC_API_KEY,
    'openai': ENV_VARS.OPENAI_API_KEY,
    'google': ENV_VARS.GOOGLE_API_KEY,
    'groq': ENV_VARS.GROQ_API_KEY,
    'deepseek': ENV_VARS.DEEPSEEK_API_KEY,
    'openrouter': ENV_VARS.OPENROUTER_API_KEY,
    'cloudflare': ENV_VARS.CLOUDFLARE_API_KEY,
    'digitalocean': ENV_VARS.DIGITALOCEAN_ACCESS_TOKEN,
    'gitlab': ENV_VARS.GITLAB_TOKEN,
  };
  
  const envVar = providerEnvMap[providerId.toLowerCase()];
  if (envVar) {
    return process.env[envVar];
  }
  
  // Fallback: thử OPENCODE_<PROVIDER>_API_KEY
  const fallbackEnv = `OPENCODE_${providerId.toUpperCase()}_API_KEY`;
  return process.env[fallbackEnv];
}

/**
 * Parse list từ string (comma-separated)
 */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Format output dựa trên flag --json
 */
export function formatOutput<T>(data: T, asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(data, null, 2);
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.join('\n');
  }
  
  // Object -> simple key=value format
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }
  
  return String(data);
}
