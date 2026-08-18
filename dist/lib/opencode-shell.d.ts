/**
 * OCX - OpenCode eXtension CLI
 * Module spawn tiến trình `opencode` con và xử lý output
 */
export interface OpenCodeShellOptions {
    verbose?: boolean;
    dryRun?: boolean;
    cwd?: string;
    env?: Record<string, string>;
}
/**
 * Chạy lệnh opencode và trả về output
 */
export declare function runOpenCodeCommand(args: string[], options?: OpenCodeShellOptions): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
/**
 * Chạy opencode models để lấy danh sách models cho provider
 */
export declare function listModels(providerId?: string, options?: OpenCodeShellOptions): Promise<string[]>;
/**
 * Chạy opencode auth list để lấy danh sách providers đã auth
 */
export declare function listAuthProviders(options?: OpenCodeShellOptions): Promise<string[]>;
/**
 * Chạy opencode session list để lấy danh sách sessions
 */
export declare function listSessions(options?: OpenCodeShellOptions): Promise<Array<{
    id: string;
    createdAt: number;
}>>;
/**
 * Export session ra file
 */
export declare function exportSession(sessionId: string | null, outputPath: string, sanitize?: boolean, options?: OpenCodeShellOptions): Promise<void>;
/**
 * Import session từ file
 */
export declare function importSession(inputPath: string, options?: OpenCodeShellOptions): Promise<void>;
/**
 * Health check provider bằng cách thử load model nhỏ
 */
export declare function verifyProvider(providerId: string, modelId: string, options?: OpenCodeShellOptions & {
    timeout?: number;
}): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Chạy opencode plugin install
 */
export declare function installPlugin(moduleName: string, globalInstall?: boolean, force?: boolean, options?: OpenCodeShellOptions): Promise<void>;
/**
 * Chạy opencode plugin uninstall
 */
export declare function uninstallPlugin(moduleName: string, options?: OpenCodeShellOptions): Promise<void>;
/**
 * Chạy opencode mcp auth
 */
export declare function authMCPServer(serverId: string, options?: OpenCodeShellOptions): Promise<void>;
/**
 * Chạy opencode mcp logout
 */
export declare function logoutMCPServer(serverId: string, options?: OpenCodeShellOptions): Promise<void>;
