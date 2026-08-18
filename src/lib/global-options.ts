/**
 * OCX - OpenCode eXtension CLI
 * Middleware xử lý global options và validation
 */

import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { isVerbose, isDryRun } from './env.js';
import { setLogLevel } from './logger.js';
import { printError, createOCXError } from './error-handler.js';

export interface GlobalOptions {
  verbose?: boolean;
  json?: boolean;
  dryRun?: boolean;
  project?: boolean;
}

/**
 * Chuẩn hóa output JSON theo format thống nhất
 */
export function formatJsonOutput<T>(data: T, success: boolean = true, error?: string): string {
  const output = {
    status: success ? 'success' : 'error',
    data,
    ...(error && { error })
  };
  return JSON.stringify(output, null, 2);
}

/**
 * Validate project path nếu --project được truyền
 */
export function validateProjectPath(projectPath?: string): void {
  if (projectPath && !existsSync(projectPath)) {
    throw createOCXError(
      `Project path không tồn tại: ${projectPath}`,
      'not_found',
      'Vui lòng kiểm tra lại đường dẫn hoặc chạy từ thư mục project hợp lệ.\n' +
      '  ocx config init --project  # Khởi tạo config cho project hiện tại'
    );
  }
}

/**
 * Xử lý global options trước khi command thực thi
 * Áp dụng: log level, output format, project validation
 */
export function handleGlobalOptions(
  program: Command,
  options: GlobalOptions
): void {
  // Set verbose mode
  if (options.verbose || isVerbose()) {
    setLogLevel('debug');
  }
  
  // Validate project path nếu có
  if (options.project) {
    const projectPath = process.cwd();
    validateProjectPath(projectPath);
  }
  
  // Log dry-run mode
  if (options.dryRun || isDryRun()) {
    console.log('[DRY-RUN MODE] Không ghi file, chỉ hiển thị thay đổi');
  }
}

/**
 * Wrapper cho action handler để tự động áp dụng global options
 */
export function withGlobalOptions<T extends GlobalOptions>(
  actionFn: (options: T) => Promise<void>
) {
  return async (options: T) => {
    try {
      handleGlobalOptions(new Command(), options);
      await actionFn(options);
    } catch (error) {
      const useJson = options?.json ?? false;
      
      if (useJson) {
        const ocxError = createOCXError(
          (error as Error).message,
          'unknown'
        );
        console.log(formatJsonOutput(null, false, ocxError.message));
        process.exit(1);
      } else {
        printError(error);
        process.exit(1);
      }
    }
  };
}
