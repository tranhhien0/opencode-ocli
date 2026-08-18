/**
 * OCX - OpenCode eXtension CLI
 * Commands nhóm: model
 */

import { Command } from 'commander';
import * as readline from 'node:readline';
import { readConfig, setDefaultModel } from '../lib/config.js';
import { formatOutput } from '../lib/env.js';
import { listModels } from '../lib/opencode-shell.js';
import { classifyError, printError, printSuccess, createOCXError } from '../lib/error-handler.js';

// ANSI color codes for inline usage
const colors = {
  reset: '\x1b[0m',
  brightRed: '\x1b[91m',
  cyan: '\x1b[36m'
};

const model = new Command('model');

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
 * Validate model ID format (provider/model-name)
 */
function validateModelFormat(modelId: string): boolean {
  const modelRegex = /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/;
  return modelRegex.test(modelId);
}

/**
 * ocx model list
 * Liệt kê models theo provider
 */
model.command('list [provider]')
  .description('Liệt kê models theo provider')
  .option('--refresh', 'Refresh danh sách từ API')
  .option('--verbose', 'Verbose mode')
  .option('--json', 'Output dạng JSON')
  .action(async (providerId, options) => {
    try {
      const refresh = options.refresh || false;
      
      if (providerId) {
        // List models cho provider cụ thể
        const models = await listModels(providerId, { 
          verbose: options.verbose,
          // Note: --refresh flag của opencode models
        });
        
        if (options.json) {
          console.log(JSON.stringify(models, null, 2));
        } else {
          console.log(`\n📦 Models for ${providerId}:`);
          if (models.length === 0) {
            console.log('  (none found)');
          } else {
            models.forEach(m => console.log(`  • ${m}`));
          }
          console.log();
        }
      } else {
        // List tất cả models từ config
        const config = readConfig();
        const providers = Object.keys(config.provider || {});
        
        if (options.json) {
          const result: Record<string, string[]> = {};
          for (const p of providers) {
            result[p] = Object.keys(config.provider?.[p]?.models || {});
          }
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\n📦 Models configured in opencode.json:');
          for (const p of providers) {
            const models = Object.keys(config.provider?.[p]?.models || {});
            if (models.length > 0) {
              console.log(`\n  ${p}:`);
              models.forEach(m => console.log(`    • ${m}`));
            }
          }
          console.log('\n💡 Gợi ý: Dùng `ocx model list <provider>` để xem models từ API');
          console.log();
        }
      }
    } catch (error) {
      console.error('Error listing models:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * ocx model set
 * Set model mặc định cho project/global
 */
model.command('set <model>')
  .description('Set model mặc định (format: provider/model)')
  .option('--project', 'Áp dụng cho project hiện tại')
  .option('--dry-run', 'Không ghi file, chỉ hiển thị')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (modelArg, options) => {
    try {
      // Validate model format với regex
      if (!validateModelFormat(modelArg)) {
        throw createOCXError(
          `Invalid model format: "${modelArg}"`,
          'invalid_input',
          'Expected format: <provider>/<model-name>\n' +
          'Examples:\n' +
          '  openai/gpt-4o\n' +
          '  anthropic/claude-sonnet-4-20250514\n' +
          '  google/gemini-2.5-pro'
        );
      }
      
      const configPath = options.project ? undefined : undefined; // global vs project
      
      setDefaultModel(modelArg, configPath, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      const scope = options.project ? 'project' : 'global';
      printSuccess(`Đã set model mặc định (${scope}): ${modelArg}`);
      
    } catch (error) {
      const ocxError = classifyError(error);
      printError(ocxError, { showStack: options?.verbose });
      process.exit(1);
    }
  });

/**
 * ocx model switch
 * Interactive picker để đổi nhanh model
 */
model.command('switch')
  .description('Interactive switch model')
  .option('--provider <provider>', 'Filter theo provider')
  .action(async (options) => {
    try {
      const config = readConfig();
      const currentModel = config.model;
      
      console.log(`Current model: ${currentModel || '(not set)'}\n`);
      
      // Lấy providers từ config
      const providers = options.provider 
        ? [options.provider]
        : Object.keys(config.provider || {});
      
      if (providers.length === 0) {
        console.log('No providers configured. Add one with: ocx provider add');
        process.exit(0);
      }
      
      // Build danh sách models available
      const allModels: string[] = [];
      for (const p of providers) {
        const models = Object.keys(config.provider?.[p]?.models || {});
        for (const m of models) {
          allModels.push(`${p}/${m}`);
        }
      }
      
      // Thêm các model phổ biến nếu chưa có
      const commonModels = [
        'anthropic/claude-sonnet-4-20250514',
        'anthropic/claude-opus-4-20250514',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'google/gemini-2.5-pro',
        'groq/llama-3.1-70b-versatile'
      ];
      
      for (const cm of commonModels) {
        if (!allModels.includes(cm)) {
          allModels.push(cm);
        }
      }
      
      // Interactive selection
      const rl = createInterface();
      
      console.log('Chọn model:');
      allModels.forEach((m, i) => {
        const marker = m === currentModel ? ' (current)' : '';
        console.log(`  ${i + 1}) ${m}${marker}`);
      });
      
      const choice = await prompt(rl, '\nSố thứ tự (hoặc Enter để giữ nguyên): ');
      rl.close();
      
      if (!choice.trim()) {
        console.log('Giữ nguyên model hiện tại.');
        return;
      }
      
      const index = parseInt(choice, 10) - 1;
      if (index < 0 || index >= allModels.length) {
        console.log('Lựa chọn không hợp lệ.');
        process.exit(1);
      }
      
      const selectedModel = allModels[index];
      
      setDefaultModel(selectedModel, undefined, { verbose: true });
      console.log(`✓ Đã chuyển sang: ${selectedModel}`);
      
    } catch (error) {
      console.error('Error switching model:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * ocx model variant
 * Set model variant (reasoning effort, text verbosity...)
 */
model.command('variant <model> <variantName>')
  .description('Set model variant (ví dụ: gpt-5/thinking)')
  .option('--reasoning-effort <level>', 'Reasoning effort: low, medium, high')
  .option('--text-verbosity <level>', 'Text verbosity: low, medium, high')
  .option('--dry-run', 'Không ghi file')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (modelArg, variantName, options) => {
    try {
      const config = readConfig();
      
      // Parse provider và model từ arg
      const parts = modelArg.split('/');
      if (parts.length !== 2) {
        throw createOCXError(
          `Invalid model format: "${modelArg}"`,
          'invalid_input',
          'Expected format: <provider></model-name>'
        );
        process.exit(1);
      }
      
      const [providerId, modelId] = parts;
      
      if (!config.provider) {
        config.provider = {};
      }
      if (!config.provider[providerId]) {
        config.provider[providerId] = {};
      }
      if (!config.provider[providerId].models) {
        config.provider[providerId].models = {};
      }
      if (!config.provider[providerId].models![modelId]) {
        config.provider[providerId].models![modelId] = {};
      }
      
      if (!config.provider[providerId].models![modelId].variants) {
        config.provider[providerId].models![modelId].variants = {};
      }
      
      // Build variant config
      const variantConfig: Record<string, unknown> = {};
      
      if (options.reasoningEffort) {
        const validLevels = ['low', 'medium', 'high'];
        if (!validLevels.includes(options.reasoningEffort)) {
          console.error(`Error: reasoning-effort phải là một trong: ${validLevels.join(', ')}`);
          process.exit(1);
        }
        variantConfig.reasoningEffort = options.reasoningEffort;
      }
      
      if (options.textVerbosity) {
        const validLevels = ['low', 'medium', 'high'];
        if (!validLevels.includes(options.textVerbosity)) {
          console.error(`Error: text-verbosity phải là một trong: ${validLevels.join(', ')}`);
          process.exit(1);
        }
        variantConfig.textVerbosity = options.textVerbosity;
      }
      
      // Default: thinking variant cho OpenAI
      if (Object.keys(variantConfig).length === 0 && providerId === 'openai') {
        variantConfig.reasoningEffort = 'high';
        variantConfig.textVerbosity = 'low';
      }
      
      config.provider[providerId].models![modelId].variants![variantName] = variantConfig;
      
      // Import writeConfig
      const { writeConfig } = await import('../lib/config.js');
      writeConfig(config, undefined, {
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      console.log(`✓ Đã set variant "${variantName}" cho ${modelArg}`);
      if (Object.keys(variantConfig).length > 0) {
        console.log('  Config:', JSON.stringify(variantConfig, null, 2));
      }
      
    } catch (error) {
      console.error('Error setting variant:', (error as Error).message);
      process.exit(1);
    }
  });

export default model;
