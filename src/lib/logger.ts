/**
 * OCX - OpenCode eXtension CLI
 * Structured logging với pino
 */

import pino, { Logger, LoggerOptions } from 'pino';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogContext {
  module?: string;
  command?: string;
  [key: string]: unknown;
}

const defaultOptions: LoggerOptions = {
  level: process.env.OCX_LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
};

let logger: Logger;

/**
 * Khởi tạo logger
 */
export function initLogger(options?: Partial<LoggerOptions>): Logger {
  const opts = { ...defaultOptions, ...options };
  logger = pino(opts);
  return logger;
}

/**
 * Lấy logger instance
 */
export function getLogger(): Logger {
  if (!logger) {
    logger = initLogger();
  }
  return logger;
}

/**
 * Tạo child logger với context
 */
export function createChildLogger(context: LogContext): Logger {
  const parent = getLogger();
  return parent.child(context);
}

/**
 * Set log level dynamically
 */
export function setLogLevel(level: LogLevel): void {
  const currentLogger = getLogger();
  currentLogger.level = level;
}

/**
 * Convenience methods
 */
export const log = {
  fatal: (msg: string, context?: Record<string, unknown>) => getLogger().fatal(context, msg),
  error: (msg: string, context?: Record<string, unknown>) => getLogger().error(context, msg),
  warn: (msg: string, context?: Record<string, unknown>) => getLogger().warn(context, msg),
  info: (msg: string, context?: Record<string, unknown>) => getLogger().info(context, msg),
  debug: (msg: string, context?: Record<string, unknown>) => getLogger().debug(context, msg),
  trace: (msg: string, context?: Record<string, unknown>) => getLogger().trace(context, msg),
};

/**
 * Parse log level từ env var hoặc CLI option
 */
export function parseLogLevel(level?: string): LogLevel {
  if (!level) return 'info';
  
  const validLevels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
  const normalized = level.toLowerCase() as LogLevel;
  
  return validLevels.includes(normalized) ? normalized : 'info';
}
