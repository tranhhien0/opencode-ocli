/**
 * OCX - OpenCode eXtension CLI
 * OpenCodeClient abstraction layer
 */
export interface ClientOptions {
    verbose?: boolean;
    dryRun?: boolean;
    cwd?: string;
    timeout?: number;
    maxRetries?: number;
}
export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export interface Model {
    id: string;
    name?: string;
    provider?: string;
}
export interface AuthProvider {
    id: string;
    type?: string;
    authenticated?: boolean;
}
export interface PluginOptions {
    global?: boolean;
    force?: boolean;
}
export interface SessionExportOptions {
    output?: string;
    sanitize?: boolean;
}
/**
 * OpenCodeClient - Abstraction layer để tương tác với OpenCode CLI
 */
export declare class OpenCodeClient {
    private options;
    constructor(options?: ClientOptions);
    /**
     * List models từ OpenCode
     * @param provider Optional provider ID để filter
     */
    listModels(provider?: string): Promise<Model[]>;
    /**
     * List auth providers
     */
    listAuthProviders(): Promise<AuthProvider[]>;
    /**
     * Install plugin
     * @param name Plugin module name
     * @param options Installation options
     */
    installPlugin(name: string, options?: PluginOptions): Promise<void>;
    /**
     * Export session
     * @param id Session ID (null for current)
     * @param options Export options
     */
    exportSession(id: string | null, options?: SessionExportOptions): Promise<string>;
    /**
     * Generic method để chạy lệnh opencode với retry và timeout
     * @param args Command arguments
     */
    runCommand(args: string[]): Promise<CommandResult>;
    /**
     * Execute command với timeout
     */
    private executeCommand;
}
