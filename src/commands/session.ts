/**
 * OCX - OpenCode eXtension CLI
 * Session commands
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import { listSessions, exportSession, importSession } from '../lib/opencode-shell.js';

const session = new Command('session');

session.command('export [sessionId]')
  .description('Export session ra file')
  .option('--output <path>', 'Output file path')
  .option('--sanitize', 'Sanitize sensitive data')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (sessionId, options) => {
    try {
      const outputPath = options.output || `session-${Date.now()}.json`;
      
      await exportSession(sessionId || null, outputPath, options.sanitize, {
        verbose: options.verbose
      });
      
      console.log(`✓ Exported session to: ${outputPath}`);
    } catch (error) {
      console.error('Error exporting session:', (error as Error).message);
      process.exit(1);
    }
  });

session.command('import <file>')
  .description('Import session từ file')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (inputFile, options) => {
    try {
      if (!fs.existsSync(inputFile)) {
        console.error(`Error: File not found: ${inputFile}`);
        process.exit(1);
      }
      
      await importSession(inputFile, { verbose: options.verbose });
      console.log(`✓ Imported session from: ${inputFile}`);
    } catch (error) {
      console.error('Error importing session:', (error as Error).message);
      process.exit(1);
    }
  });

session.command('list')
  .description('Liệt kê sessions')
  .option('--json', 'Output JSON')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (options) => {
    try {
      const sessions = await listSessions({ verbose: options.verbose });
      
      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
      } else {
        console.log('\n📁 Sessions:');
        if (sessions.length === 0) {
          console.log('  (none)');
        } else {
          for (const s of sessions) {
            const date = new Date(s.createdAt).toLocaleString();
            console.log(`  • ${s.id} (${date})`);
          }
        }
        console.log();
      }
    } catch (error) {
      console.error('Error listing sessions:', (error as Error).message);
      process.exit(1);
    }
  });

session.command('delete <sessionId>')
  .description('Xóa session')
  .option('--force', 'Force delete without confirmation')
  .action((sessionId, options) => {
    console.log(`Note: Session deletion may require using opencode directly.`);
    console.log(`Try: opencode session delete ${sessionId}`);
  });

export { session };
