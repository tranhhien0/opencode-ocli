/**
 * OCX - OpenCode eXtension CLI
 * Types và interfaces chung
 */
export type ProviderType = 'oauth' | 'api' | 'openai-compatible' | 'local' | 'bedrock' | 'azure' | 'cloudflare' | 'gitlab';
export type MCPServerType = 'local' | 'remote';
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
    url?: string;
    command?: string[];
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
export declare const ENV_VARS: {
    readonly CONFIG_DIR: "OCX_CONFIG_DIR";
    readonly VERBOSE: "OCX_VERBOSE";
    readonly DRY_RUN: "OCX_DRY_RUN";
    readonly OPENCODE_CONFIG: "OPENCODE_CONFIG";
    readonly OPENCODE_CONFIG_DIR: "OPENCODE_CONFIG_DIR";
    readonly OPENCODE_MODEL: "OPENCODE_MODEL";
    readonly OPENCODE_SERVER_PASSWORD: "OPENCODE_SERVER_PASSWORD";
    readonly ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY";
    readonly OPENAI_API_KEY: "OPENAI_API_KEY";
    readonly GOOGLE_API_KEY: "GOOGLE_API_KEY";
    readonly GROQ_API_KEY: "GROQ_API_KEY";
    readonly DEEPSEEK_API_KEY: "DEEPSEEK_API_KEY";
    readonly OPENROUTER_API_KEY: "OPENROUTER_API_KEY";
    readonly AZURE_RESOURCE_NAME: "AZURE_RESOURCE_NAME";
    readonly AZURE_COGNITIVE_SERVICES_RESOURCE_NAME: "AZURE_COGNITIVE_SERVICES_RESOURCE_NAME";
    readonly CLOUDFLARE_ACCOUNT_ID: "CLOUDFLARE_ACCOUNT_ID";
    readonly CLOUDFLARE_GATEWAY_ID: "CLOUDFLARE_GATEWAY_ID";
    readonly CLOUDFLARE_API_TOKEN: "CLOUDFLARE_API_TOKEN";
    readonly CLOUDFLARE_API_KEY: "CLOUDFLARE_API_KEY";
    readonly DIGITALOCEAN_ACCESS_TOKEN: "DIGITALOCEAN_ACCESS_TOKEN";
    readonly GITLAB_INSTANCE_URL: "GITLAB_INSTANCE_URL";
    readonly GITLAB_TOKEN: "GITLAB_TOKEN";
    readonly GITLAB_AI_GATEWAY_URL: "GITLAB_AI_GATEWAY_URL";
    readonly GITLAB_OAUTH_CLIENT_ID: "GITLAB_OAUTH_CLIENT_ID";
    readonly AWS_PROFILE: "AWS_PROFILE";
    readonly AWS_REGION: "AWS_REGION";
};
