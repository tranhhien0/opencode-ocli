/**
 * OCX - OpenCode eXtension CLI
 * Auth commands với dynamic provider discovery
 */

import { Command } from 'commander';
import { listAuthProviders, logoutProvider, verifyProviderAuth, runOpenCodeCommand } from '../lib/opencode-shell.js';
import { formatJsonOutput } from '../lib/global-options.js';
import { classifyError, printError, printSuccess } from '../lib/error-handler.js';

const auth = new Command('auth');

auth.command('list')
  .description('Liệt kê providers đã auth')
  .option('--json', 'Output JSON')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (options) => {
    try {
      const providers = await listAuthProviders({ verbose: options.verbose });
      
      if (options.json) {
        console.log(formatJsonOutput(providers));
      } else {
        console.log('\n🔑 Authenticated providers:');
        if (providers.length === 0) {
          console.log('  (none)');
        } else {
          providers.forEach(p => console.log(`  ✓ ${p}`));
        }
        console.log();
      }
    } catch (error) {
      const ocxError = classifyError(error);
      if (options.json) {
        console.log(formatJsonOutput(null, false, ocxError.message));
      } else {
        printError(ocxError);
      }
      process.exit(1);
    }
  });

auth.command('logout <provider>')
  .description('Logout provider bằng cách gọi opencode auth logout và xóa token trong config')
  .option('--dry-run', 'Không thực hiện logout, chỉ hiển thị')
  .option('-v, --verbose', 'Verbose mode')
  .option('--json', 'Output JSON')
  .action(async (providerId, options) => {
    try {
      const dryRun = options.dryRun || false;
      const verbose = options.verbose || false;
      
      if (dryRun) {
        const result = { provider: providerId, action: 'logout', dryRun: true };
        if (options.json) {
          console.log(formatJsonOutput(result));
        } else {
          console.log(`[DRY-RUN] Would logout provider: ${providerId}`);
        }
        return;
      }
      
      // Gọi opencode auth logout <provider>
      const result = await runOpenCodeCommand(['auth', 'logout', providerId], { verbose });
      
      if (result.exitCode !== 0) {
        throw new Error(`opencode auth logout failed: ${result.stderr}`);
      }
      
      if (options.json) {
        console.log(formatJsonOutput({ 
          provider: providerId, 
          loggedOut: true,
          message: `Successfully logged out from ${providerId}`
        }));
      } else {
        printSuccess(`Logged out provider: ${providerId}`);
        console.log('  Token removed from ~/.opencode/auth.json (if exists)');
      }
    } catch (error) {
      const ocxError = classifyError(error);
      if (options.json) {
        console.log(formatJsonOutput(null, false, ocxError.message));
      } else {
        printError(ocxError);
      }
      process.exit(1);
    }
  });

auth.command('verify <provider>')
  .description('Verify provider credentials bằng cách test API call thực tế')
  .option('--json', 'Output JSON')
  .option('-v, --verbose', 'Verbose mode')
  .option('--model <model>', 'Model để test (default: gpt-4o-mini)')
  .action(async (providerId, options) => {
    try {
      const verbose = options.verbose || false;
      const modelId = options.model || 'gpt-4o-mini';
      
      const result = await verifyProviderAuth(providerId, { verbose, modelId });
      
      if (options.json) {
        console.log(formatJsonOutput({
          provider: providerId,
          model: modelId,
          valid: result.valid,
          details: result.details,
          error: result.error
        }, result.valid));
      } else {
        if (result.valid) {
          printSuccess(`Provider "${providerId}" is authenticated and valid`);
          if (result.details) {
            console.log(`  Details: ${result.details}`);
          }
        } else {
          console.error(`✗ Provider "${providerId}" authentication failed`);
          if (result.error) {
            console.error(`  Error: ${result.error}`);
          }
          process.exit(1);
        }
      }
    } catch (error) {
      const ocxError = classifyError(error);
      if (options.json) {
        console.log(formatJsonOutput(null, false, ocxError.message));
      } else {
        printError(ocxError);
      }
      process.exit(1);
    }
  });

export { auth };
