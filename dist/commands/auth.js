/**
 * OCX - OpenCode eXtension CLI
 * Auth commands với dynamic provider discovery
 */
import { Command } from 'commander';
import { listAuthProviders, logoutProvider, verifyProviderAuth } from '../lib/opencode-shell.js';
const auth = new Command('auth');
auth.command('list')
    .description('Liệt kê providers đã auth')
    .option('--json', 'Output JSON')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const providers = await listAuthProviders({ verbose: options.verbose });
        if (options.json) {
            console.log(JSON.stringify(providers, null, 2));
        }
        else {
            console.log('\n🔑 Authenticated providers:');
            if (providers.length === 0) {
                console.log('  (none)');
            }
            else {
                providers.forEach(p => console.log(`  ✓ ${p}`));
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing auth:', error.message);
        process.exit(1);
    }
});
auth.command('logout <provider>')
    .description('Logout provider')
    .option('--dry-run', 'Không thực hiện logout, chỉ hiển thị')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (providerId, options) => {
    try {
        const dryRun = options.dryRun || false;
        const verbose = options.verbose || false;
        if (dryRun) {
            console.log(`[DRY-RUN] Would logout provider: ${providerId}`);
            return;
        }
        await logoutProvider(providerId, { verbose });
        console.log(`✓ Logged out provider: ${providerId}`);
    }
    catch (error) {
        console.error('Error logging out:', error.message);
        process.exit(1);
    }
});
auth.command('verify <provider>')
    .description('Verify provider credentials')
    .option('--json', 'Output JSON')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (providerId, options) => {
    try {
        const verbose = options.verbose || false;
        const result = await verifyProviderAuth(providerId, { verbose });
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            if (result.valid) {
                console.log(`✓ Provider "${providerId}" is authenticated and valid`);
                if (result.details) {
                    console.log(`  Details: ${result.details}`);
                }
            }
            else {
                console.log(`✗ Provider "${providerId}" authentication failed`);
                if (result.error) {
                    console.log(`  Error: ${result.error}`);
                }
            }
        }
    }
    catch (error) {
        console.error('Error verifying provider:', error.message);
        process.exit(1);
    }
});
export { auth };
