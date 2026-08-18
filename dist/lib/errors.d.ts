/**
 * OCX - OpenCode eXtension CLI
 * Error hierarchy và error codes
 */
/**
 * Base error class cho OCX
 */
export declare class OCXError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code?: string, details?: Record<string, unknown>);
}
/**
 * Lỗi liên quan đến network
 */
export declare class NetworkError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi liên quan đến config
 */
export declare class ConfigError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi liên quan đến OpenCode CLI
 */
export declare class OpenCodeError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi xác thực
 */
export declare class AuthError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi permission
 */
export declare class PermissionError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi không tìm thấy resource
 */
export declare class NotFoundError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi timeout
 */
export declare class TimeoutError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Lỗi validation
 */
export declare class ValidationError extends OCXError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Error codes mapping
 */
export declare const ERROR_CODES: {
    readonly OCX_UNKNOWN: "Unknown error";
    readonly OCX_NETWORK_ERROR: "Network connection failed";
    readonly OCX_NETWORK_TIMEOUT: "Network request timed out";
    readonly OCX_NETWORK_DNS: "DNS resolution failed";
    readonly OCX_NETWORK_CONNECTION_REFUSED: "Connection refused";
    readonly OCX_CONFIG_ERROR: "Configuration error";
    readonly OCX_CONFIG_NOT_FOUND: "Config file not found";
    readonly OCX_CONFIG_INVALID_JSON: "Config file is not valid JSON";
    readonly OCX_CONFIG_INVALID_SCHEMA: "Config schema validation failed";
    readonly OCX_CONFIG_WRITE_FAILED: "Failed to write config file";
    readonly OCX_OPENCODE_ERROR: "OpenCode CLI error";
    readonly OCX_OPENCODE_NOT_FOUND: "OpenCode CLI not installed";
    readonly OCX_OPENCODE_COMMAND_FAILED: "OpenCode command failed";
    readonly OCX_AUTH_ERROR: "Authentication error";
    readonly OCX_AUTH_INVALID_CREDENTIALS: "Invalid credentials";
    readonly OCX_AUTH_TOKEN_EXPIRED: "Authentication token expired";
    readonly OCX_AUTH_PROVIDER_NOT_FOUND: "Auth provider not found";
    readonly OCX_PERMISSION_ERROR: "Permission denied";
    readonly OCX_PERMISSION_FILE_ACCESS: "File access denied";
    readonly OCX_PERMISSION_DIRECTORY_ACCESS: "Directory access denied";
    readonly OCX_NOT_FOUND_ERROR: "Resource not found";
    readonly OCX_NOT_FOUND_MODEL: "Model not found";
    readonly OCX_NOT_FOUND_PROVIDER: "Provider not found";
    readonly OCX_NOT_FOUND_SESSION: "Session not found";
    readonly OCX_NOT_FOUND_PLUGIN: "Plugin not found";
    readonly OCX_NOT_FOUND_MCP_SERVER: "MCP server not found";
    readonly OCX_TIMEOUT_ERROR: "Operation timed out";
    readonly OCX_TIMEOUT_COMMAND: "Command execution timed out";
    readonly OCX_TIMEOUT_NETWORK: "Network request timed out";
    readonly OCX_VALIDATION_ERROR: "Validation failed";
    readonly OCX_VALIDATION_INVALID_INPUT: "Invalid input provided";
    readonly OCX_VALIDATION_MISSING_REQUIRED: "Required field missing";
};
/**
 * Type for error code keys
 */
export type ErrorCode = keyof typeof ERROR_CODES;
