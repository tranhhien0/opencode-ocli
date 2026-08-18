import { Command } from 'commander';
import * as readline from 'node:readline';
import { ProviderType, ProviderConfig } from '../lib/types.js';
import { readConfig, addProviderToConfig, removeProviderFromConfig } from '../lib/config.js';
import { getProviderApiKey, parseList } from '../lib/env.js';
import { listAuthProviders, verifyProvider } from '../lib/opencode-shell.js';
import { classifyError, printError, printSuccess, createOCXError } from '../lib/error-handler.js';

const provider = new Command('provider');

function createInterface() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function promptSecret(question: string): Promise<string> {
  if (!process.stdin.isTTY) throw createOCXError('Không thể nhập API key dạng ẩn khi stdin không phải TTY. Dùng biến môi trường.', 'invalid_input');
  process.stdout.write(question);
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString()) {
        if (char === '\n' || char === '\r') {
          stdin.setRawMode?.(false); stdin.pause(); stdin.off('data', onData); process.stdout.write('\n'); resolve(value); return;
        }
        if (char === '\u0003') {
          stdin.setRawMode?.(false); stdin.pause(); stdin.off('data', onData); reject(new Error('Input cancelled')); return;
        }
        if (char === '\u007f') value = value.slice(0, -1); else value += char;
      }
    };
    stdin.setRawMode?.(true); stdin.resume(); stdin.on('data', onData);
  });
}

provider.command('list')
  .description('Liệt kê providers đã auth và trong config')
  .option('--json', 'Output JSON')
  .option('-v, --verbose', 'Verbose mode')
  .action(async options => {
    try {
      const config = readConfig();
      const authenticated = await listAuthProviders({ verbose: options.verbose });
      const configured = Object.keys(config.provider || {});
      const result = { authenticated, in_config: configured };
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log('\n📌 Authenticated providers:');
        authenticated.forEach(id => console.log(`  ✓ ${id}`));
        console.log('\n📝 Providers in config:');
        configured.forEach(id => console.log(`  ⚙ ${id}`));
        if (!authenticated.length && !configured.length) console.log('  (none)');
        console.log();
      }
    } catch (error) {
      const e = classifyError(error);
      if (options.json) console.log(JSON.stringify({ status: 'error', data: null, error: e.message }));
      else printError(e, { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

provider.command('add')
  .description('Thêm provider mới')
  .option('--type <type>', 'api, openai-compatible, local, bedrock, cloudflare')
  .option('--id <id>', 'Provider ID')
  .option('--api-key <key>', 'API key; không được lưu plaintext')
  .option('--base-url <url>', 'Base URL')
  .option('--models <models>', 'Danh sách models, comma-separated')
  .option('--name <name>', 'Tên hiển thị')
  .option('--npm <npm>', 'NPM module')
  .option('--project', 'Áp dụng cho project hiện tại')
  .option('--non-interactive', 'Không tương tác')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async options => {
    try {
      let providerId = options.id as string | undefined;
      let providerType = options.type as ProviderType | undefined;
      let apiKey = options.apiKey as string | undefined;
      let baseUrl = options.baseUrl as string | undefined;
      let models = parseList(options.models);
      let name = options.name as string | undefined;
      const supported: ProviderType[] = ['api', 'openai-compatible', 'local', 'bedrock', 'cloudflare'];

      if (options.nonInteractive && (!providerId || !providerType)) {
        throw createOCXError('--non-interactive yêu cầu --id và --type', 'invalid_input');
      }
      if (!providerId || !providerType) {
        const rl = createInterface();
        if (!providerType) providerType = (await prompt(rl, 'Loại provider (api/openai-compatible/local/bedrock/cloudflare): ')) as ProviderType;
        if (!providerId) providerId = await prompt(rl, 'Provider ID: ');
        if (providerType === 'openai-compatible') {
          if (!baseUrl) baseUrl = await prompt(rl, 'Base URL: ');
          if (!models.length) models = parseList(await prompt(rl, 'Models (comma-separated): '));
          if (!name) name = await prompt(rl, 'Tên hiển thị: ');
        }
        rl.close();
      }
      if (!providerId || !providerType) throw createOCXError('Thiếu provider ID hoặc type', 'invalid_input');
      if (!supported.includes(providerType)) throw createOCXError(`Provider type ${providerType} chưa được hỗ trợ bởi OCX`, 'invalid_input');

      if (providerType === 'api' || providerType === 'openai-compatible' || providerType === 'cloudflare') {
        if (!apiKey) apiKey = getProviderApiKey(providerId);
        if (!apiKey && !options.nonInteractive) apiKey = await promptSecret('API Key: ');
      }

      const config: ProviderConfig = { options: {} };
      if (name) config.name = name;
      if (options.npm) config.npm = options.npm;

      if (providerType === 'api') {
        const envName = `${providerId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`;
        config.options!.apiKey = `{env:${envName}}`;
        if (apiKey && !process.env[envName]) console.error(`Set ${envName} in the environment; OCX will not persist the secret.`);
      } else if (providerType === 'openai-compatible') {
        if (!baseUrl) throw createOCXError('--base-url is required for openai-compatible', 'invalid_input');
        config.options!.baseURL = baseUrl;
        if (apiKey) config.options!.apiKey = `{env:${providerId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY}`;
        if (models.length) config.models = Object.fromEntries(models.map(id => [id, { id, name: id }]));
      } else if (providerType === 'local') {
        if (baseUrl) config.options!.baseURL = baseUrl;
      } else if (providerType === 'bedrock') {
        if (process.env.AWS_REGION) config.options!.region = process.env.AWS_REGION;
      } else if (providerType === 'cloudflare') {
        config.options!.apiKey = '{env:CLOUDFLARE_API_TOKEN}';
      }

      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      addProviderToConfig(providerId, config, configPath, { dryRun: options.dryRun, verbose: options.verbose });
      printSuccess(`Đã thêm provider "${providerId}" (${providerType})`);
    } catch (error) {
      printError(classifyError(error), { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

provider.command('remove <id>')
  .alias('rm')
  .description('Xóa provider khỏi config')
  .option('--project', 'Áp dụng cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (providerId, options) => {
    try {
      removeProviderFromConfig(providerId, options.project ? `${process.cwd()}/opencode.json` : undefined, { dryRun: options.dryRun, verbose: options.verbose });
      printSuccess(`Đã xóa provider "${providerId}"`);
    } catch (error) {
      printError(classifyError(error), { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

provider.command('verify <id>')
  .description('Kiểm tra provider có hoạt động không')
  .requiredOption('--model <model>', 'Model ID để test')
  .option('--json', 'Output JSON')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (providerId, options) => {
    try {
      const result = await verifyProvider(providerId, options.model, { verbose: options.verbose, timeout: 10000 });
      if (options.json) console.log(JSON.stringify({ provider: providerId, model: options.model, valid: result.valid, error: result.error }, null, 2));
      else if (result.valid) printSuccess(`${providerId}/${options.model} is working!`);
      else { console.error(`✗ ${providerId}/${options.model} failed: ${result.error || 'Unknown error'}`); process.exitCode = 1; }
    } catch (error) {
      const e = classifyError(error);
      if (options.json) console.log(JSON.stringify({ status: 'error', data: null, error: e.message }));
      else printError(e, { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

export default provider;
