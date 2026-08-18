/**
 * OCX - OpenCode eXtension CLI
 * Module đọc/ghi/merge config với support JSONC và validation schema
 */
import { OpenCodeConfig, ProviderConfig, MCPServerConfig } from './types.js';
/**
 * Đọc config file từ path chỉ định với support JSONC
 */
export declare function readConfig(configPath?: string): OpenCodeConfig;
/**
 * Ghi config ra file với atomic write + backup
 */
export declare function writeConfig(config: OpenCodeConfig, configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): void;
/**
 * Merge configs theo thứ tự ưu tiên (later overrides earlier)
 */
export declare function mergeConfigs(...configs: (OpenCodeConfig | undefined)[]): OpenCodeConfig;
/**
 * Validate config có đúng schema cơ bản không
 */
export declare function validateConfig(config: OpenCodeConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Thêm provider vào config
 */
export declare function addProviderToConfig(providerId: string, providerConfig: ProviderConfig, configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): void;
/**
 * Xóa provider khỏi config
 */
export declare function removeProviderFromConfig(providerId: string, configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): void;
/**
 * Thêm MCP server vào config
 */
export declare function addMCPServerToConfig(serverId: string, serverConfig: MCPServerConfig, configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): void;
/**
 * Xóa MCP server khỏi config
 */
export declare function removeMCPServerFromConfig(serverId: string, configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): void;
/**
 * Set model mặc định
 */
export declare function setDefaultModel(model: string, configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): void;
/**
 * Khởi tạo config mới với giá trị mặc định an toàn
 */
export declare function initConfig(configPath?: string, options?: {
    dryRun?: boolean;
    verbose?: boolean;
}): OpenCodeConfig;
