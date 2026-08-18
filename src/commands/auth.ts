import { Command } from 'commander';
import { listAuthProviders, runOpenCodeCommand, verifyProviderAuth } from '../lib/opencode-shell.js';
import { formatJsonOutput } from '../lib/global-options.js';
import { classifyError, printError, printSuccess } from '../lib/error-handler.js';

const auth = new Command('auth');

auth.command('list').description('Liệt kê providers đã auth').option('--json', 'Output JSON').option('-v, --verbose', 'Verbose mode').action(async options => {
  try {
    const providers = await listAuthProviders({ verbose: options.verbose });
    if (options.json) console.log(formatJsonOutput(providers));
    else { console.log('\n🔑 Authenticated providers:'); providers.forEach(p => console.log(`  ✓ ${p}`)); if (!providers.length) console.log('  (none)'); console.log(); }
  } catch (error) { const e = classifyError(error); if (options.json) console.log(formatJsonOutput(null, false, e.message)); else printError(e, { showStack: options?.verbose }); process.exitCode = 1; }
});

auth.command('logout <provider>').description('Logout provider').option('--dry-run', 'Dry run').option('-v, --verbose', 'Verbose mode').option('--json', 'Output JSON').action(async (providerId, options) => {
  try {
    if (options.dryRun) { const out = { provider: providerId, action: 'logout', dryRun: true }; if (options.json) console.log(formatJsonOutput(out)); else console.error(`[DRY-RUN] Would logout provider: ${providerId}`); return; }
    const result = await runOpenCodeCommand(['auth', 'logout', providerId], { verbose: options.verbose });
    if (result.exitCode !== 0) throw new Error(result.stderr || `opencode auth logout exited with ${result.exitCode}`);
    if (options.json) console.log(formatJsonOutput({ provider: providerId, loggedOut: true })); else printSuccess(`Logged out provider: ${providerId}`);
  } catch (error) { const e = classifyError(error); if (options.json) console.log(formatJsonOutput(null, false, e.message)); else printError(e, { showStack: options?.verbose }); process.exitCode = 1; }
});

auth.command('verify <provider>').description('Verify provider credentials').requiredOption('--model <model>', 'Model để test').option('--json', 'Output JSON').option('-v, --verbose', 'Verbose mode').action(async (providerId, options) => {
  try {
    const result = await verifyProviderAuth(providerId, { verbose: options.verbose, modelId: options.model, timeout: 10000 });
    if (options.json) console.log(formatJsonOutput({ provider: providerId, model: options.model, valid: result.valid, details: result.details, error: result.error }, result.valid));
    else if (result.valid) printSuccess(`Provider "${providerId}" is authenticated and valid`);
    else { console.error(`✗ Provider "${providerId}" authentication failed`); if (result.error) console.error(`  Error: ${result.error}`); process.exitCode = 1; }
  } catch (error) { const e = classifyError(error); if (options.json) console.log(formatJsonOutput(null, false, e.message)); else printError(e, { showStack: options?.verbose }); process.exitCode = 1; }
});

export { auth };
