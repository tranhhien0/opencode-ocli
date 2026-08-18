/**
 * OCX - OpenCode eXtension CLI
 * Module xử lý environment variables và resolve options theo priority:
 * 1. CLI flag
 * 2. Environment variable
 * 3. Config file value
 * 4. Default hard-code
 */
/**
 * Lấy giá trị từ environment variable
 */
export declare function getEnvVar(name: string): string | undefined;
/**
 * Lấy boolean từ environment variable (truthy: '1', 'true', 'yes')
 */
export declare function getEnvBool(name: string, defaultValue?: boolean): boolean;
/**
 * Lấy số từ environment variable
 */
export declare function getEnvNumber(name: string, defaultValue: number): number;
/**
 * Resolve option theo thứ tự ưu tiên:
 * flag > env > config > default
 */
export declare function resolveOption<T>(flagValue: T | undefined, envName: string | null, configValue: T | undefined, defaultValue: T): T;
/**
 * Kiểm tra chế độ verbose
 */
export declare function isVerbose(flagVerbose?: boolean): boolean;
/**
 * Kiểm tra chế độ dry-run
 */
export declare function isDryRun(flagDryRun?: boolean): boolean;
/**
 * Lấy thư mục config
 * Ưu tiên: OCX_CONFIG_DIR > OPENCODE_CONFIG_DIR > ~/.local/share/ocx
 */
export declare function getConfigDir(flagProject?: boolean): string;
/**
 * Lấy path tới opencode.json
 */
export declare function getConfigPath(flagProject?: boolean): string;
/**
 * Lấy API key cho provider từ environment
 */
export declare function getProviderApiKey(providerId: string): string | undefined;
/**
 * Parse list từ string (comma-separated)
 */
export declare function parseList(value: string | undefined): string[];
/**
 * Format output dựa trên flag --json
 */
export declare function formatOutput<T>(data: T, asJson: boolean): string;
