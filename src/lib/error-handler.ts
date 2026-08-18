/**
 * OCX - OpenCode eXtension CLI
 * Module xử lý lỗi với màu sắc và gợi ý khắc phục
 */

import { isVerbose } from './env.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m'
};

export type ErrorType = 
  | 'network'
  | 'permission'
  | 'not_found'
  | 'invalid_config'
  | 'invalid_input'
  | 'auth_failed'
  | 'timeout'
  | 'unknown';

export interface OCXError extends Error {
  type: ErrorType;
  suggestion?: string;
  details?: Record<string, unknown>;
}

/**
 * Tạo một OCXError với phân loại và gợi ý
 */
export function createOCXError(
  message: string,
  type: ErrorType = 'unknown',
  suggestion?: string,
  details?: Record<string, unknown>
): OCXError {
  const error = new Error(message) as OCXError;
  error.type = type;
  error.suggestion = suggestion;
  error.details = details;
  return error;
}

/**
 * Phân loại lỗi từ message hoặc error object
 */
export function classifyError(error: unknown): OCXError {
  if (error && typeof error === 'object' && 'type' in error) {
    return error as OCXError;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('unable to connect')
  ) {
    return createOCXError(
      message,
      'network',
      'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.\n' +
      '  Nếu đang dùng proxy, hãy đảm bảo biến môi trường HTTP_PROXY/HTTPS_PROXY được đặt đúng.'
    );
  }

  // Permission errors
  if (
    lowerMessage.includes('permission denied') ||
    lowerMessage.includes('eacces') ||
    lowerMessage.includes('eperm') ||
    lowerMessage.includes('not authorized') ||
    lowerMessage.includes('unauthorized')
  ) {
    return createOCXError(
      message,
      'permission',
      'Lỗi phân quyền. Thử chạy lại với sudo (nếu cần) hoặc kiểm tra quyền truy cập file.\n' +
      '  chmod 644 ~/.opencode/config.json  # Sửa quyền file config\n' +
      '  chown -R $USER:$USER ~/.opencode   # Sửa owner thư mục'
    );
  }

  // Not found errors
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('no such file') ||
    lowerMessage.includes('does not exist') ||
    lowerMessage.includes('enoent')
  ) {
    return createOCXError(
      message,
      'not_found',
      'Không tìm thấy resource. Kiểm tra lại tên/id đã nhập.\n' +
      '  ocx provider list  # Xem danh sách providers có sẵn\n' +
      '  ocx model list     # Xem danh sách models có sẵn'
    );
  }

  // Invalid config errors
  if (
    lowerMessage.includes('invalid json') ||
    lowerMessage.includes('parse error') ||
    lowerMessage.includes('syntax error') ||
    lowerMessage.includes('malformed') ||
    lowerMessage.includes('schema')
  ) {
    return createOCXError(
      message,
      'invalid_config',
      'Config file bị lỗi định dạng. Kiểm tra lại file opencode.json.\n' +
      '  ocx config validate  # Validate config\n' +
      '  ocx config show      # Xem config hiện tại'
    );
  }

  // Auth errors
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('credential') ||
    lowerMessage.includes('token expired')
  ) {
    return createOCXError(
      message,
      'auth_failed',
      'Lỗi xác thực. Kiểm tra API key hoặc thực hiện auth lại.\n' +
      `  ocx auth list              # Xem providers đã auth\n` +
      `  ocx provider verify <id>   # Verify provider cụ thể`
    );
  }

  // Timeout errors
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('etimedout')
  ) {
    return createOCXError(
      message,
      'timeout',
      'Yêu cầu hết thời gian chờ. Kiểm tra kết nối mạng hoặc thử lại sau.\n' +
      '  Có thể do server đang quá tải hoặc kết nối chậm.'
    );
  }

  // Default: unknown error
  return createOCXError(
    message,
    'unknown',
    'Đã xảy ra lỗi không xác định. Thử chạy với --verbose để xem chi tiết.'
  );
}

/**
 * In thông báo lỗi với màu sắc và gợi ý
 */
export function printError(error: unknown, options?: { showStack?: boolean }): void {
  const verbose = options?.showStack ?? isVerbose();
  const ocxError = classifyError(error);

  // Header với màu đỏ
  console.error(`\n${colors.bgRed}${colors.white} LỖI ${colors.reset}\n`);

  // Message chính
  console.error(`${colors.brightRed}✗ ${ocxError.message}${colors.reset}\n`);

  // Loại lỗi
  const errorTypeLabels: Record<ErrorType, string> = {
    network: '🌐 Lỗi mạng',
    permission: '🔒 Lỗi phân quyền',
    not_found: '🔍 Không tìm thấy',
    invalid_config: '⚙️ Config không hợp lệ',
    invalid_input: '❌ Input không hợp lệ',
    auth_failed: '🔑 Lỗi xác thực',
    timeout: '⏱️ Hết thời gian chờ',
    unknown: '❓ Lỗi không xác định'
  };

  console.error(`${colors.yellow}Loại: ${errorTypeLabels[ocxError.type]}${colors.reset}\n`);

  // Gợi ý khắc phục
  if (ocxError.suggestion) {
    console.error(`${colors.cyan}💡 Gợi ý khắc phục:${colors.reset}`);
    console.error(`${colors.white}${ocxError.suggestion}${colors.reset}\n`);
  }

  // Chi tiết lỗi nếu có
  if (ocxError.details && Object.keys(ocxError.details).length > 0) {
    console.error(`${colors.yellow}Chi tiết:${colors.reset}`);
    console.error(JSON.stringify(ocxError.details, null, 2));
    console.error();
  }

  // Stack trace nếu verbose
  if (verbose && error instanceof Error && error.stack) {
    console.error(`${colors.yellow}Stack trace:${colors.reset}`);
    console.error(error.stack);
    console.error();
  }

  // Footer
  console.error(`${colors.yellow}─────────────────────────────────────────${colors.reset}`);
  console.error(`${colors.white}Chạy với --verbose để xem thêm chi tiết.${colors.reset}\n`);
}

/**
 * In thông báo thành công với màu xanh
 */
export function printSuccess(message: string): void {
  console.log(`${colors.brightGreen}✓ ${message}${colors.reset}`);
}

/**
 * In thông báo cảnh báo với màu vàng
 */
export function printWarning(message: string): void {
  console.warn(`${colors.brightYellow}⚠ ${message}${colors.reset}`);
}

/**
 * In thông báo info với màu xanh dương
 */
export function printInfo(message: string): void {
  console.log(`${colors.brightCyan}ℹ ${message}${colors.reset}`);
}

/**
 * Wrap một async function để tự động handle lỗi
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: OCXError) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const ocxError = classifyError(error);
    if (errorHandler) {
      errorHandler(ocxError);
    } else {
      printError(ocxError);
    }
    process.exit(1);
  }
}
