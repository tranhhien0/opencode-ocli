/**
 * OCX - OpenCode eXtension CLI
 * Structured logging với pino
 */
import { Logger, LoggerOptions } from 'pino';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
export interface LogContext {
    module?: string;
    command?: string;
    [key: string]: unknown;
}
/**
 * Khởi tạo logger
 */
export declare function initLogger(options?: Partial<LoggerOptions>): Logger;
/**
 * Lấy logger instance
 */
export declare function getLogger(): Logger;
/**
 * Tạo child logger với context
 */
export declare function createChildLogger(context: LogContext): Logger;
/**
 * Set log level dynamically
 */
export declare function setLogLevel(level: LogLevel): void;
/**
 * Convenience methods
 */
export declare const log: {
    fatal: (msg: string, context?: Record<string, unknown>) => void;
    error: (msg: string, context?: Record<string, unknown>) => void;
    warn: (msg: string, context?: Record<string, unknown>) => void;
    info: (msg: string, context?: Record<string, unknown>) => void;
    debug: (msg: string, context?: Record<string, unknown>) => void;
    trace: (msg: string, context?: Record<string, unknown>) => void;
};
/**
 * Parse log level từ env var hoặc CLI option
 */
export declare function parseLogLevel(level?: string): LogLevel;
