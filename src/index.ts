#!/usr/bin/env node

/**
 * OCX - OpenCode eXtension CLI
 * Entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import commands
import provider from './commands/provider.js';
import model from './commands/model.js';
import { plugin } from './commands/plugin.js';
import { skill } from './commands/skill.js';
import { mcp } from './commands/mcp.js';
import { session } from './commands/session.js';
import { configCmd } from './commands/config.js';
import { auth } from './commands/auth.js';
import { doctor } from './commands/doctor.js';
import { server, serve, web, attach } from './commands/server.js';

// Get version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
let version = '0.1.0';
try {
  const pkgPath = join(__dirname, '../../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  version = pkg.version;
} catch {
  // Ignore if can't read package.json
}

// Create main program
const program = new Command();

program
  .name('ocx')
  .description('OpenCode eXtension CLI - Quản trị nhanh cho OpenCode')
  .version(version)
  .showHelpAfterError();

// Global options
program
  .option('-v, --verbose', 'Verbose mode (chi tiết log)')
  .option('--json', 'Output dạng JSON (cho scripting)')
  .option('--dry-run', 'Không ghi file, chỉ hiển thị thay đổi')
  .option('-p, --project', 'Áp dụng cho project hiện tại (thay vì global)');

// Add command groups
program.addCommand(provider);
program.addCommand(model);
program.addCommand(plugin);
program.addCommand(skill);
program.addCommand(mcp);
program.addCommand(session);
program.addCommand(configCmd);
program.addCommand(auth);
program.addCommand(server);
program.addCommand(serve);
program.addCommand(web);
program.addCommand(attach);

// Example usage
program.addHelpText('after', `

Examples:
  $ ocx provider list                     # Liệt kê providers
  $ ocx provider add                      # Thêm provider (interactive)
  $ ocx provider add --type api --id openai --api-key $OPENAI_API_KEY
  $ ocx model set anthropic/claude-sonnet-4-20250514
  $ ocx model switch                      # Interactive switch model
  $ ocx plugin install opencode-helicone-session
  $ ocx mcp add sentry --type remote --url https://mcp.sentry.dev/mcp
  $ ocx session export --output backup.json --sanitize
  $ ocx config init --project             # Init opencode.json cho project
  $ ocx config validate                   # Validate config

Environment Variables:
  OCX_VERBOSE          Bật chế độ verbose
  OCX_DRY_RUN          Mặc định dry-run mode
  OPENCODE_CONFIG      Path tới opencode.json (tôn trọng OpenCode)
  ANTHROPIC_API_KEY    API key cho Anthropic
  OPENAI_API_KEY       API key cho OpenAI

Documentation: https://opencode.ai/docs/
`);

// Parse and run
program.parse(process.argv);

// Show help if no command provided - exit with 0 instead of 1
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}
