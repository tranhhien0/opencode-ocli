/**
 * OCX - OpenCode eXtension CLI
 * Error hierarchy và error codes
 */
/**
 * Base error class cho OCX
 */
export class OCXError extends Error {
    code;
    details;
    constructor(message, code = 'OCX_UNKNOWN', details) {
        super(message);
        this.name = 'OCXError';
        this.code = code;
        this.details = details;
        // Maintain proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, OCXError);
        }
    }
}
/**
 * Lỗi liên quan đến network
 */
export class NetworkError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_NETWORK_ERROR', details);
        this.name = 'NetworkError';
    }
}
/**
 * Lỗi liên quan đến config
 */
export class ConfigError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_CONFIG_ERROR', details);
        this.name = 'ConfigError';
    }
}
/**
 * Lỗi liên quan đến OpenCode CLI
 */
export class OpenCodeError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_OPENCODE_ERROR', details);
        this.name = 'OpenCodeError';
    }
}
/**
 * Lỗi xác thực
 */
export class AuthError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_AUTH_ERROR', details);
        this.name = 'AuthError';
    }
}
/**
 * Lỗi permission
 */
export class PermissionError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_PERMISSION_ERROR', details);
        this.name = 'PermissionError';
    }
}
/**
 * Lỗi không tìm thấy resource
 */
export class NotFoundError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_NOT_FOUND_ERROR', details);
        this.name = 'NotFoundError';
    }
}
/**
 * Lỗi timeout
 */
export class TimeoutError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_TIMEOUT_ERROR', details);
        this.name = 'TimeoutError';
    }
}
/**
 * Lỗi validation
 */
export class ValidationError extends OCXError {
    constructor(message, details) {
        super(message, 'OCX_VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
/**
 * Error codes mapping
 */
export const ERROR_CODES = {
    // General
    OCX_UNKNOWN: 'Unknown error',
    // Network
    OCX_NETWORK_ERROR: 'Network connection failed',
    OCX_NETWORK_TIMEOUT: 'Network request timed out',
    OCX_NETWORK_DNS: 'DNS resolution failed',
    OCX_NETWORK_CONNECTION_REFUSED: 'Connection refused',
    // Config
    OCX_CONFIG_ERROR: 'Configuration error',
    OCX_CONFIG_NOT_FOUND: 'Config file not found',
    OCX_CONFIG_INVALID_JSON: 'Config file is not valid JSON',
    OCX_CONFIG_INVALID_SCHEMA: 'Config schema validation failed',
    OCX_CONFIG_WRITE_FAILED: 'Failed to write config file',
    // OpenCode
    OCX_OPENCODE_ERROR: 'OpenCode CLI error',
    OCX_OPENCODE_NOT_FOUND: 'OpenCode CLI not installed',
    OCX_OPENCODE_COMMAND_FAILED: 'OpenCode command failed',
    // Auth
    OCX_AUTH_ERROR: 'Authentication error',
    OCX_AUTH_INVALID_CREDENTIALS: 'Invalid credentials',
    OCX_AUTH_TOKEN_EXPIRED: 'Authentication token expired',
    OCX_AUTH_PROVIDER_NOT_FOUND: 'Auth provider not found',
    // Permission
    OCX_PERMISSION_ERROR: 'Permission denied',
    OCX_PERMISSION_FILE_ACCESS: 'File access denied',
    OCX_PERMISSION_DIRECTORY_ACCESS: 'Directory access denied',
    // Not Found
    OCX_NOT_FOUND_ERROR: 'Resource not found',
    OCX_NOT_FOUND_MODEL: 'Model not found',
    OCX_NOT_FOUND_PROVIDER: 'Provider not found',
    OCX_NOT_FOUND_SESSION: 'Session not found',
    OCX_NOT_FOUND_PLUGIN: 'Plugin not found',
    OCX_NOT_FOUND_MCP_SERVER: 'MCP server not found',
    // Timeout
    OCX_TIMEOUT_ERROR: 'Operation timed out',
    OCX_TIMEOUT_COMMAND: 'Command execution timed out',
    OCX_TIMEOUT_NETWORK: 'Network request timed out',
    // Validation
    OCX_VALIDATION_ERROR: 'Validation failed',
    OCX_VALIDATION_INVALID_INPUT: 'Invalid input provided',
    OCX_VALIDATION_MISSING_REQUIRED: 'Required field missing',
};
