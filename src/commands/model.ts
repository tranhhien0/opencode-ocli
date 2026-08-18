import { Command } from 'commander';
import * as readline from 'node:readline';
import { readConfig, setDefaultModel, writeConfig } from '../lib/config.js';
import { listModels } from '../lib/opencode-shell.js';
import { classifyError, printError, printSuccess, createOCXError } from '../lib/error-handler.js';

const model = new Command('model');

function createInterface() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function validateModelFormat(modelId: string): boolean {
  return /^[^\s/]+\/[^\s/]+$/.test(modelId);
}

model.command('list [provider]')
  .description('Liệt kê models theo provider')
  .option('--refresh', 'Refresh danh sách từ OpenCode')
  .option('--verbose', 'Verbose mode')
  .option('--json', 'Output JSON')
  .action(async (providerId, options) => {
    try {
      if (providerId || options.refresh) {
        const models = await listModels(providerId, { verbose: options.verbose, refresh: options.refresh });
        if (options.json) console.log(JSON.stringify(models, null, 2));
        else {
          console.log(`\n📦 Models${providerId ? ` for ${providerId}` : ''}:`);
          models.forEach(m => console.log(`  • ${m}`));
          if (models.length === 0) console.log('  (none found)');
          console.log();
        }
        return;
      }

      const config = readConfig();
      const providers = Object.keys(config.provider || {});
      const result: Record<string, string[]> = {};
      for (const provider of providers) result[provider] = Object.keys(config.provider?.[provider]?.models || {});
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log('\n📦 Models configured in opencode.json:');
        for (const [provider, models] of Object.entries(result)) {
          if (models.length) {
            console.log(`\n  ${provider}:`);
            models.forEach(m => console.log(`    • ${m}`));
          }
        }
        console.log();
      }
    } catch (error) {
      const ocxError = classifyError(error);
      if (options.json) console.error(JSON.stringify({ status: 'error', data: null, error: ocxError.message }));
      else printError(ocxError, { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

model.command('set <model>')
  .description('Set model mặc định (format: provider/model)')
  .option('--project', 'Áp dụng cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (modelArg, options) => {
    try {
      if (!validateModelFormat(modelArg)) {
        throw createOCXError(`Invalid model format: "${modelArg}"`, 'invalid_input', 'Expected format: <provider>/<model-name>');
      }
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      setDefaultModel(modelArg, configPath, { dryRun: options.dryRun, verbose: options.verbose });
      printSuccess(`Đã set model mặc định (${options.project ? 'project' : 'global'}): ${modelArg}`);
    } catch (error) {
      const ocxError = classifyError(error);
      printError(ocxError, { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

model.command('switch')
  .description('Interactive switch model')
  .option('--provider <provider>', 'Filter theo provider')
  .option('--project', 'Áp dụng cho project hiện tại')
  .action(async (options) => {
    try {
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      const config = readConfig(configPath);
      const currentModel = config.model;
      const providers = options.provider ? [options.provider] : Object.keys(config.provider || {});
      const allModels = providers.flatMap((p) => Object.keys(config.provider?.[p]?.models || {}).map(m => `${p}/${m}`));
      if (!allModels.length) {
        console.log('No configured models found. Use `ocx model list <provider> --refresh`.');
        return;
      }
      console.log(`Current model: ${currentModel || '(not set)'}\n`);
      allModels.forEach((m, i) => console.log(`  ${i + 1}) ${m}${m === currentModel ? ' (current)' : ''}`));
      const rl = createInterface();
      const choice = await prompt(rl, '\nSố thứ tự (hoặc Enter để giữ nguyên): ');
      rl.close();
      if (!choice.trim()) return;
      const index = Number.parseInt(choice, 10) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= allModels.length) throw createOCXError('Lựa chọn không hợp lệ', 'invalid_input');
      setDefaultModel(allModels[index], configPath, { verbose: true });
      printSuccess(`Đã chuyển sang: ${allModels[index]}`);
    } catch (error) {
      printError(classifyError(error));
      process.exitCode = 1;
    }
  });

model.command('variant <model> <variantName>')
  .description('Set model variant')
  .option('--reasoning-effort <level>', 'low, medium, high')
  .option('--text-verbosity <level>', 'low, medium, high')
  .option('--project', 'Áp dụng cho project hiện tại')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (modelArg, variantName, options) => {
    try {
      const parts = modelArg.split('/');
      if (parts.length !== 2) throw createOCXError(`Invalid model format: "${modelArg}"`, 'invalid_input', 'Expected format: <provider>/<model-name>');
      const [providerId, modelId] = parts;
      const configPath = options.project ? `${process.cwd()}/opencode.json` : undefined;
      const config = readConfig(configPath);
      config.provider ??= {};
      config.provider[providerId] ??= {};
      config.provider[providerId].models ??= {};
      config.provider[providerId].models![modelId] ??= {};
      config.provider[providerId].models![modelId].variants ??= {};
      const validLevels = ['low', 'medium', 'high'];
      if (options.reasoningEffort && !validLevels.includes(options.reasoningEffort)) throw createOCXError('Invalid reasoning-effort', 'invalid_input');
      if (options.textVerbosity && !validLevels.includes(options.textVerbosity)) throw createOCXError('Invalid text-verbosity', 'invalid_input');
      const variantConfig: Record<string, unknown> = {};
      if (options.reasoningEffort) variantConfig.reasoningEffort = options.reasoningEffort;
      if (options.textVerbosity) variantConfig.textVerbosity = options.textVerbosity;
      if (!Object.keys(variantConfig).length) throw createOCXError('Variant cần ít nhất một option', 'invalid_input');
      config.provider[providerId].models![modelId].variants![variantName] = variantConfig as never;
      writeConfig(config, configPath, { dryRun: options.dryRun, verbose: options.verbose });
      printSuccess(`Đã set variant "${variantName}" cho ${modelArg}`);
    } catch (error) {
      printError(classifyError(error), { showStack: options?.verbose });
      process.exitCode = 1;
    }
  });

export default model;
