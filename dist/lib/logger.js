/**
 * OCX - OpenCode eXtension CLI
 * Structured logging với pino
 */
import pino from 'pino';
const defaultOptions = {
    level: process.env.OCX_LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label }),
    },
};
let logger;
/**
 * Khởi tạo logger
 */
export function initLogger(options) {
    const opts = { ...defaultOptions, ...options };
    logger = pino(opts);
    return logger;
}
/**
 * Lấy logger instance
 */
export function getLogger() {
    if (!logger) {
        logger = initLogger();
    }
    return logger;
}
/**
 * Tạo child logger với context
 */
export function createChildLogger(context) {
    const parent = getLogger();
    return parent.child(context);
}
/**
 * Set log level dynamically
 */
export function setLogLevel(level) {
    const currentLogger = getLogger();
    currentLogger.level = level;
}
/**
 * Convenience methods
 */
export const log = {
    fatal: (msg, context) => getLogger().fatal(context, msg),
    error: (msg, context) => getLogger().error(context, msg),
    warn: (msg, context) => getLogger().warn(context, msg),
    info: (msg, context) => getLogger().info(context, msg),
    debug: (msg, context) => getLogger().debug(context, msg),
    trace: (msg, context) => getLogger().trace(context, msg),
};
/**
 * Parse log level từ env var hoặc CLI option
 */
export function parseLogLevel(level) {
    if (!level)
        return 'info';
    const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
    const normalized = level.toLowerCase();
    return validLevels.includes(normalized) ? normalized : 'info';
}
