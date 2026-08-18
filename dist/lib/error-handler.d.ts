/**
 * OCX - OpenCode eXtension CLI
 * Module xử lý lỗi với màu sắc và gợi ý khắc phục
 */
export type ErrorType = 'network' | 'permission' | 'not_found' | 'invalid_config' | 'invalid_input' | 'auth_failed' | 'timeout' | 'unknown';
export interface OCXError extends Error {
    type: ErrorType;
    suggestion?: string;
    details?: Record<string, unknown>;
}
/**
 * Tạo một OCXError với phân loại và gợi ý
 */
export declare function createOCXError(message: string, type?: ErrorType, suggestion?: string, details?: Record<string, unknown>): OCXError;
/**
 * Phân loại lỗi từ message hoặc error object
 */
export declare function classifyError(error: unknown): OCXError;
/**
 * In thông báo lỗi với màu sắc và gợi ý
 */
export declare function printError(error: unknown, options?: {
    showStack?: boolean;
}): void;
/**
 * In thông báo thành công với màu xanh
 */
export declare function printSuccess(message: string): void;
/**
 * In thông báo cảnh báo với màu vàng
 */
export declare function printWarning(message: string): void;
/**
 * In thông báo info với màu xanh dương
 */
export declare function printInfo(message: string): void;
/**
 * Wrap một async function để tự động handle lỗi
 */
export declare function withErrorHandling<T>(fn: () => Promise<T>, errorHandler?: (error: OCXError) => void): Promise<T>;
