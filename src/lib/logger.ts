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

export function initLogger(options?: Partial<LoggerOptions>): Logger {
  const opts = { ...defaultOptions, ...options };
  // stderr keeps stdout clean for `--json` and shell scripting.
  logger = pino(opts, pino.destination(2));
  return logger;
}

export function getLogger(): Logger {
  if (!logger) logger = initLogger();
  return logger;
}

export function createChildLogger(context: LogContext): Logger {
  return getLogger().child(context);
}

export function setLogLevel(level: LogLevel): void {
  getLogger().level = level;
}

export const log = {
  fatal: (msg: string, context?: Record<string, unknown>) => getLogger().fatal(context, msg),
  error: (msg: string, context?: Record<string, unknown>) => getLogger().error(context, msg),
  warn: (msg: string, context?: Record<string, unknown>) => getLogger().warn(context, msg),
  info: (msg: string, context?: Record<string, unknown>) => getLogger().info(context, msg),
  debug: (msg: string, context?: Record<string, unknown>) => getLogger().debug(context, msg),
  trace: (msg: string, context?: Record<string, unknown>) => getLogger().trace(context, msg),
};

export function parseLogLevel(level?: string): LogLevel {
  if (!level) return 'info';
  const validLevels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
  const normalized = level.toLowerCase() as LogLevel;
  return validLevels.includes(normalized) ? normalized : 'info';
}
