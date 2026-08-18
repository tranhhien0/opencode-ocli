/**
 * OCX - OpenCode eXtension CLI
 * Commands nhóm: provider
 */

import { Command } from 'commander';
import * as readline from 'node:readline';
import { ProviderType, ProviderConfig } from '../lib/types.js';
import { readConfig, addProviderToConfig, removeProviderFromConfig } from '../lib/config.js';
import { getProviderApiKey, parseList, formatOutput } from '../lib/env.js';
import { listAuthProviders, verifyProvider, listModels } from '../lib/opencode-shell.js';
import { classifyError, printError, printSuccess, printWarning, createOCXError } from '../lib/error-handler.js';

// ANSI color codes for inline usage
const colors = {
  reset: '\x1b[0m',
  brightRed: '\x1b[91m',
  cyan: '\x1b[36m'
};

const provider = new Command('provider');

// Helper cho interactive prompts
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

/**
 * ocx provider list
 * Liệt kê providers đã kết nối / chưa kết nối
 */
provider.command('list')
  .description('Liệt kê các providers (đã auth và available)')
  .option('--json', 'Output dạng JSON')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (options) => {
    try {
      const config = readConfig();
      const authedProviders = await listAuthProviders({ verbose: options.verbose });
      
      // Lấy danh sách providers từ config
      const configProviders = Object.keys(config.provider || {});
      
      // Providers có trong models.dev nhưng chưa auth (hardcoded list phổ biến)
      const knownProviders = [
        'anthropic', 'openai', 'google', 'groq', 'deepseek', 'openrouter',
        'amazon-bedrock', 'azure', 'cloudflare', 'gitlab', 'ollama',
        'lmstudio', 'together', 'fireworks', 'perplexity', 'mistral'
      ];
      
      const result = {
        authenticated: authedProviders,
        in_config: configProviders,
        available_not_authed: knownProviders.filter(p => 
          !authedProviders.includes(p) && !configProviders.includes(p)
        )
      };
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\n📌 Authenticated providers:');
        if (result.authenticated.length === 0) {
          console.log('  (none)');
        } else {
          result.authenticated.forEach(p => console.log(`  ✓ ${p}`));
        }
        
        console.log('\n📝 Providers in config:');
        if (result.in_config.length === 0) {
          console.log('  (none)');
        } else {
          result.in_config.forEach(p => console.log(`  ⚙ ${p}`));
        }
        
        console.log('\n🔌 Available but not authenticated:');
        if (result.available_not_authed.length === 0) {
          console.log('  (none)');
        } else {
          result.available_not_authed.slice(0, 10).forEach(p => console.log(`  ○ ${p}`));
          if (result.available_not_authed.length > 10) {
            console.log(`  ... and ${result.available_not_authed.length - 10} more`);
          }
        }
        console.log();
      }
    } catch (error) {
      const ocxError = classifyError(error);
      printError(ocxError, { showStack: options?.verbose });
      process.exit(1);
    }
  });

/**
 * ocx provider add
 * Thêm provider mới (interactive hoặc non-interactive)
 */
provider.command('add')
  .description('Thêm provider mới')
  .option('--type <type>', 'Loại provider: oauth, api, openai-compatible, local, bedrock, azure, cloudflare, gitlab')
  .option('--id <id>', 'Provider ID')
  .option('--api-key <key>', 'API key (cho type=api)')
  .option('--base-url <url>', 'Base URL (cho openai-compatible)')
  .option('--models <models>', 'Danh sách models (comma-separated, cho openai-compatible)')
  .option('--name <name>', 'Tên hiển thị (cho custom provider)')
  .option('--npm <npm>', 'NPM module (cho custom provider)')
  .option('--non-interactive', 'Chạy không tương tác (dùng flags)')
  .option('--dry-run', 'Không ghi file, chỉ hiển thị')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (options) => {
    try {
      let providerId = options.id;
      let providerType = options.type as ProviderType | undefined;
      let apiKey = options.apiKey;
      let baseUrl = options.baseUrl;
      let models = parseList(options.models);
      let name = options.name;
      let npmModule = options.npm;
      
      // Interactive mode nếu không có đủ flags
      if (!options.nonInteractive || !providerId || !providerType) {
        const rl = createInterface();
        
        if (!providerType) {
          console.log('Chọn loại provider:');
          console.log('  1) api - API key chuẩn (Anthropic, OpenAI, Google...)');
          console.log('  2) openai-compatible - Custom OpenAI-compatible endpoint');
          console.log('  3) oauth - OAuth flow (GitHub Copilot, GitLab...)');
          console.log('  4) local - Local model (Ollama, LM Studio...)');
          console.log('  5) bedrock - AWS Bedrock');
          console.log('  6) cloudflare - Cloudflare AI Gateway');
          
          const typeChoice = await prompt(rl, 'Loại provider (1-6): ');
          const typeMap: Record<string, ProviderType> = {
            '1': 'api',
            '2': 'openai-compatible',
            '3': 'oauth',
            '4': 'local',
            '5': 'bedrock',
            '6': 'cloudflare'
          };
          providerType = typeMap[typeChoice] || 'api';
        }
        
        if (!providerId) {
          providerId = await prompt(rl, 'Provider ID (ví dụ: my-llm): ');
        }
        
        if (providerType === 'api' || providerType === 'openai-compatible') {
          if (!apiKey) {
            apiKey = await prompt(rl, 'API Key: ');
          }
        }
        
        if (providerType === 'openai-compatible') {
          if (!baseUrl) {
            baseUrl = await prompt(rl, 'Base URL (ví dụ: https://api.my-llm.com/v1): ');
          }
          if (!options.models) {
            const modelsInput = await prompt(rl, 'Models (comma-separated, ví dụ: gpt-4,gpt-3.5-turbo): ');
            models = parseList(modelsInput);
          }
          if (!name) {
            name = await prompt(rl, 'Tên hiển thị: ');
          }
        }
        
        rl.close();
      }
      
      if (!providerId || !providerType) {
        throw createOCXError(
          'Thiếu provider ID hoặc type',
          'invalid_input',
          'Vui lòng cung cấp cả --type và --id.\n' +
          '  Ví dụ: ocx provider add --type api --id openai'
        );
      }
      
      // Build provider config
      const providerConfig: ProviderConfig = {};
      
      if (name) {
        providerConfig.name = name;
      }
      
      if (npmModule) {
        providerConfig.npm = npmModule;
      }
      
      providerConfig.options = {};
      
      // Setup options dựa trên type
      switch (providerType) {
        case 'api':
          // API key sẽ được lưu vào auth.json qua opencode auth, không ghi vào config
          if (apiKey) {
            // Có thể ghi vào config như fallback
            providerConfig.options!.apiKey = `{env:${providerId.toUpperCase()}_API_KEY}`;
          }
          break;
          
        case 'openai-compatible':
          if (baseUrl) {
            providerConfig.options!.baseURL = baseUrl;
          }
          if (apiKey) {
            providerConfig.options!.apiKey = apiKey;
          }
          // Add models
          if (models.length > 0) {
            providerConfig.models = {};
            for (const modelId of models) {
              providerConfig.models[modelId] = {
                name: modelId,
                id: modelId
              };
            }
          }
          break;
          
        case 'local':
          // Ollama/LM Studio thường không cần API key
          if (baseUrl) {
            providerConfig.options!.baseURL = baseUrl;
          }
          // num_ctx sẽ được set trong interactive mode hoặc qua flag
          break;
          
        case 'bedrock':
          providerConfig.options!.region = 'us-east-1';
          break;
          
        case 'cloudflare':
          if (apiKey) {
            providerConfig.options!.apiKey = apiKey;
          }
          break;
      }
      
      // Ghi vào config
      addProviderToConfig(providerId, providerConfig, undefined, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      printSuccess(`Đã thêm provider "${providerId}" (${providerType})`);
      
      // Gợi ý set env var nếu là API provider
      if (providerType === 'api' && apiKey) {
        const envVar = `${providerId.toUpperCase()}_API_KEY`;
        console.log(`  Đặt biến môi trường: export ${envVar}=<your-key>`);
      }
      
    } catch (error) {
      const ocxError = classifyError(error);
      printError(ocxError, { showStack: options?.verbose });
      process.exit(1);
    }
  });

/**
 * ocx provider remove
 * Xóa provider khỏi config
 */
provider.command('remove <id>')
  .alias('rm')
  .description('Xóa provider khỏi config')
  .option('--dry-run', 'Không ghi file, chỉ hiển thị')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (providerId, options) => {
    try {
      removeProviderFromConfig(providerId, undefined, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      printSuccess(`Đã xóa provider "${providerId}"`);
    } catch (error) {
      const ocxError = classifyError(error);
      printError(ocxError, { showStack: options?.verbose });
      process.exit(1);
    }
  });

/**
 * ocx provider verify
 * Health check provider
 */
provider.command('verify <id>')
  .description('Kiểm tra provider có hoạt động không')
  .option('--model <model>', 'Model ID để test (default: model nhỏ nhất)')
  .option('--json', 'Output dạng JSON')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (providerId, options) => {
    try {
      const modelId = options.model || 'gpt-4o-mini'; // Default model nhỏ
      
      console.log(`Verifying ${providerId}/${modelId}...`);
      
      const result = await verifyProvider(providerId, modelId, { verbose: options.verbose });
      
      if (options.json) {
        console.log(JSON.stringify({
          provider: providerId,
          model: modelId,
          valid: result.valid,
          error: result.error
        }, null, 2));
      } else {
        if (result.valid) {
          printSuccess(`${providerId}/${modelId} is working!`);
        } else {
          console.error(`${colors.brightRed}✗ ${providerId}/${modelId} failed:${colors.reset}`);
          console.error(`  ${result.error}`);
          
          // Gợi ý khắc phục dựa trên loại lỗi
          const ocxError = classifyError(new Error(result.error || 'Unknown error'));
          if (ocxError.suggestion) {
            console.error(`\n${colors.cyan}💡 Gợi ý:${colors.reset}`);
            console.error(ocxError.suggestion);
          }
          
          process.exit(1);
        }
      }
    } catch (error) {
      const ocxError = classifyError(error);
      printError(ocxError, { showStack: options?.verbose });
      process.exit(1);
    }
  });

export default provider;
