/**
 * OCX - OpenCode eXtension CLI
 * Module xử lý environment variables và resolve options theo priority:
 * 1. CLI flag
 * 2. Environment variable
 * 3. Config file value
 * 4. Default hard-code
 */
import { ENV_VARS } from './types.js';
import * as path from 'node:path';
import * as os from 'node:os';
/**
 * Lấy giá trị từ environment variable
 */
export function getEnvVar(name) {
    return process.env[name];
}
/**
 * Lấy boolean từ environment variable (truthy: '1', 'true', 'yes')
 */
export function getEnvBool(name, defaultValue = false) {
    const value = process.env[name];
    if (value === undefined)
        return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
/**
 * Lấy số từ environment variable
 */
export function getEnvNumber(name, defaultValue) {
    const value = process.env[name];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
/**
 * Resolve option theo thứ tự ưu tiên:
 * flag > env > config > default
 */
export function resolveOption(flagValue, envName, configValue, defaultValue) {
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
                return ['1', 'true', 'yes', 'on'].includes(envValue.toLowerCase());
            }
            if (typeof defaultValue === 'number') {
                const parsed = parseInt(envValue, 10);
                if (!isNaN(parsed)) {
                    return parsed;
                }
            }
            return envValue;
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
export function isVerbose(flagVerbose) {
    return resolveOption(flagVerbose, ENV_VARS.VERBOSE, undefined, false);
}
/**
 * Kiểm tra chế độ dry-run
 */
export function isDryRun(flagDryRun) {
    return resolveOption(flagDryRun, ENV_VARS.DRY_RUN, undefined, false);
}
/**
 * Lấy thư mục config mặc định của OpenCode
 * Theo OpenCode hiện tại: ~/.config/opencode hoặc XDG_CONFIG_HOME/opencode
 */
function getDefaultConfigDir() {
    // Tôn trọng XDG_CONFIG_HOME nếu được set
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
        return path.join(xdgConfigHome, 'opencode');
    }
    // Mặc định: ~/.config/opencode
    const home = os.homedir();
    return path.join(home, '.config', 'opencode');
}
/**
 * Lấy thư mục config
 * Ưu tiên: OPENCODE_CONFIG_DIR > OpenCode default (~/.config/opencode)
 */
export function getConfigDir(flagProject) {
    if (flagProject) {
        // Project mode: dùng cwd
        return process.cwd();
    }
    // Tôn trọng OPENCODE_CONFIG_DIR nếu được set
    const envConfigDir = process.env[ENV_VARS.OPENCODE_CONFIG_DIR];
    if (envConfigDir) {
        return envConfigDir;
    }
    return getDefaultConfigDir();
}
/**
 * Lấy path tới opencode.json
 * P0.1: Phải resolve đúng theo OpenCode hiện tại
 * Ưu tiên:
 * 1. OPENCODE_CONFIG env var (absolute path)
 * 2. Project mode: <cwd>/opencode.json
 * 3. Global: <configDir>/config.json (support .json / .jsonc)
 */
export function getConfigPath(flagProject) {
    if (flagProject) {
        return path.join(process.cwd(), 'opencode.json');
    }
    // Tôn trọng OPENCODE_CONFIG nếu được set (absolute path)
    const envConfig = process.env[ENV_VARS.OPENCODE_CONFIG];
    if (envConfig) {
        return envConfig;
    }
    // Default: <configDir>/config.json
    const configDir = getConfigDir(false);
    const configPath = path.join(configDir, 'config.json');
    // Support .jsonc extension nếu tồn tại
    const jsoncPath = path.join(configDir, 'config.jsonc');
    if (!existsSync(configPath) && existsSync(jsoncPath)) {
        return jsoncPath;
    }
    return configPath;
}
function existsSync(filePath) {
    try {
        const fs = require('node:fs');
        return fs.existsSync(filePath);
    }
    catch {
        return false;
    }
}
/**
 * Lấy API key cho provider từ environment
 */
export function getProviderApiKey(providerId) {
    // Map provider ID -> env var name
    const providerEnvMap = {
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
export function parseList(value) {
    if (!value)
        return [];
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}
/**
 * Format output dựa trên flag --json
 */
export function formatOutput(data, asJson) {
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
