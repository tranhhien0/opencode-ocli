import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { ENV_VARS } from './types.js';

export function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

export function getEnvBool(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function resolveOption<T>(
  flagValue: T | undefined,
  envName: string | null,
  configValue: T | undefined,
  defaultValue: T
): T {
  if (flagValue !== undefined && flagValue !== null) return flagValue;
  if (envName !== null) {
    const envValue = process.env[envName];
    if (envValue !== undefined) {
      if (typeof defaultValue === 'boolean') {
        return (['1', 'true', 'yes', 'on'].includes(envValue.toLowerCase()) as unknown) as T;
      }
      if (typeof defaultValue === 'number') {
        const parsed = Number(envValue);
        if (Number.isFinite(parsed)) return (parsed as unknown) as T;
      }
      return (envValue as unknown) as T;
    }
  }
  if (configValue !== undefined && configValue !== null) return configValue;
  return defaultValue;
}

export function isVerbose(flagVerbose?: boolean): boolean {
  return resolveOption(flagVerbose, ENV_VARS.VERBOSE, undefined, false);
}

export function isDryRun(flagDryRun?: boolean): boolean {
  return resolveOption(flagDryRun, ENV_VARS.DRY_RUN, undefined, false);
}

function getDefaultConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  return path.join(xdgConfigHome || path.join(os.homedir(), '.config'), 'opencode');
}

export function getConfigDir(flagProject = false): string {
  if (flagProject) return process.cwd();
  return process.env[ENV_VARS.OPENCODE_CONFIG_DIR] || getDefaultConfigDir();
}

export function getConfigPath(flagProject = false): string {
  if (flagProject) return path.join(process.cwd(), 'opencode.json');

  const explicit = process.env[ENV_VARS.OPENCODE_CONFIG];
  if (explicit) return path.resolve(explicit);

  const configDir = getConfigDir(false);
  const jsonPath = path.join(configDir, 'opencode.json');
  const jsoncPath = path.join(configDir, 'opencode.jsonc');
  if (fs.existsSync(jsonPath)) return jsonPath;
  if (fs.existsSync(jsoncPath)) return jsoncPath;
  return jsonPath;
}

export function getProviderApiKey(providerId: string): string | undefined {
  const providerEnvMap: Record<string, string> = {
    anthropic: ENV_VARS.ANTHROPIC_API_KEY,
    openai: ENV_VARS.OPENAI_API_KEY,
    google: ENV_VARS.GOOGLE_API_KEY,
    groq: ENV_VARS.GROQ_API_KEY,
    deepseek: ENV_VARS.DEEPSEEK_API_KEY,
    openrouter: ENV_VARS.OPENROUTER_API_KEY,
    cloudflare: ENV_VARS.CLOUDFLARE_API_KEY,
    digitalocean: ENV_VARS.DIGITALOCEAN_ACCESS_TOKEN,
    gitlab: ENV_VARS.GITLAB_TOKEN,
  };
  const envVar = providerEnvMap[providerId.toLowerCase()];
  if (envVar) return process.env[envVar];
  return process.env[`OPENCODE_${providerId.toUpperCase()}_API_KEY`];
}

export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function formatOutput<T>(data: T, asJson: boolean): string {
  if (asJson) return JSON.stringify(data, null, 2);
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.join('\n');
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join('\n');
  }
  return String(data);
}
