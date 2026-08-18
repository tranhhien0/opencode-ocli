/**
 * OCX - OpenCode eXtension CLI
 * Types và interfaces chung
 */

// Provider types dựa trên docs.opencode.ai/docs/providers/
export type ProviderType = 
  | 'oauth'           // OAuth flow (GitHub Copilot, OpenCode Zen...)
  | 'api'             // API key chuẩn (Anthropic, OpenAI, Google...)
  | 'openai-compatible'  // Custom OpenAI-compatible
  | 'local'           // Local model (Ollama...)
  | 'bedrock'         // AWS Bedrock
  | 'azure'           // Azure OpenAI/Cognitive Services
  | 'cloudflare'      // Cloudflare AI Gateway
  | 'gitlab'          // GitLab Duo
  ;

// MCP Server types
export type MCPServerType = 'local' | 'remote';

// Config structure dựa trên docs.opencode.ai/docs/config/
export interface OpenCodeConfig {
  $schema?: string;
  model?: string;
  autoupdate?: boolean;
  server?: {
    port?: number;
    hostname?: string;
  };
  provider?: Record<string, ProviderConfig>;
  mcp?: Record<string, MCPServerConfig>;
  plugin?: string[];
  instructions?: string[];
  permission?: {
    edit?: 'ask' | 'allow' | 'deny';
    bash?: 'ask' | 'allow' | 'deny';
  };
  compaction?: {
    auto?: boolean;
    prune?: boolean;
    reserved?: number;
  };
  watcher?: {
    ignore?: string[];
  };
  formatter?: boolean | Record<string, FormatterConfig>;
  lsp?: boolean | Record<string, LSPConfig>;
  disabled_providers?: string[];
  enabled_providers?: string[];
  experimental?: Record<string, unknown>;
  share?: 'enabled' | 'disabled' | 'url-only';
  snapshot?: boolean;
}

export interface ProviderConfig {
  npm?: string;
  name?: string;
  options?: Record<string, string | number | boolean>;
  models?: Record<string, ModelConfig>;
  blacklist?: string[];
  whitelist?: string[];
}

export interface ModelConfig {
  id?: string;
  name?: string;
  options?: Record<string, string | number | boolean>;
  variants?: Record<string, ModelVariantConfig>;
  disabled?: boolean;
}

export interface ModelVariantConfig {
  reasoningEffort?: 'low' | 'medium' | 'high';
  textVerbosity?: 'low' | 'medium' | 'high';
  reasoningSummary?: 'auto' | 'enabled' | 'disabled';
  thinking?: {
    type: 'enabled' | 'disabled';
    budgetTokens?: number;
  };
  disabled?: boolean;
}

export interface MCPServerConfig {
  type: MCPServerType;
  url?: string;  // cho remote
  command?: string[];  // cho local
  enabled?: boolean;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
  oauth?: {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
  } | false;
}

export interface FormatterConfig {
  disabled?: boolean;
  command?: string[];
  environment?: Record<string, string>;
  extensions?: string[];
}

export interface LSPConfig {
  disabled?: boolean;
  command?: string[];
  environment?: Record<string, string>;
}

// Auth store structure (internal - không public trong docs)
export interface AuthStore {
  providers?: Record<string, AuthCredential>;
}

export interface AuthCredential {
  type: 'api-key' | 'oauth' | 'token';
  apiKey?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  metadata?: Record<string, string>;
}

// Session structure
export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model?: string;
  provider?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

// CLI Options
export interface CLIGlobalOptions {
  verbose?: boolean;
  json?: boolean;
  dryRun?: boolean;
  project?: boolean;
  help?: boolean;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  exitCode: number;
}

// Env var mapping
export const ENV_VARS = {
  // OCX specific
  CONFIG_DIR: 'OCX_CONFIG_DIR',
  VERBOSE: 'OCX_VERBOSE',
  DRY_RUN: 'OCX_DRY_RUN',
  
  // OpenCode original (tôn trọng)
  OPENCODE_CONFIG: 'OPENCODE_CONFIG',
  OPENCODE_CONFIG_DIR: 'OPENCODE_CONFIG_DIR',
  OPENCODE_MODEL: 'OPENCODE_MODEL',
  OPENCODE_SERVER_PASSWORD: 'OPENCODE_SERVER_PASSWORD',
  
  // Provider API keys
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  GOOGLE_API_KEY: 'GOOGLE_API_KEY',
  GROQ_API_KEY: 'GROQ_API_KEY',
  DEEPSEEK_API_KEY: 'DEEPSEEK_API_KEY',
  OPENROUTER_API_KEY: 'OPENROUTER_API_KEY',
  AZURE_RESOURCE_NAME: 'AZURE_RESOURCE_NAME',
  AZURE_COGNITIVE_SERVICES_RESOURCE_NAME: 'AZURE_COGNITIVE_SERVICES_RESOURCE_NAME',
  CLOUDFLARE_ACCOUNT_ID: 'CLOUDFLARE_ACCOUNT_ID',
  CLOUDFLARE_GATEWAY_ID: 'CLOUDFLARE_GATEWAY_ID',
  CLOUDFLARE_API_TOKEN: 'CLOUDFLARE_API_TOKEN',
  CLOUDFLARE_API_KEY: 'CLOUDFLARE_API_KEY',
  DIGITALOCEAN_ACCESS_TOKEN: 'DIGITALOCEAN_ACCESS_TOKEN',
  GITLAB_INSTANCE_URL: 'GITLAB_INSTANCE_URL',
  GITLAB_TOKEN: 'GITLAB_TOKEN',
  GITLAB_AI_GATEWAY_URL: 'GITLAB_AI_GATEWAY_URL',
  GITLAB_OAUTH_CLIENT_ID: 'GITLAB_OAUTH_CLIENT_ID',
  AWS_PROFILE: 'AWS_PROFILE',
  AWS_REGION: 'AWS_REGION',
} as const;
