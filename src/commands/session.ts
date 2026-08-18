import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listSessions, exportSession, importSession, runOpenCodeCommand } from '../lib/opencode-shell.js';

const session = new Command('session');

session.command('backup')
  .description('Backup toàn bộ sessions vào thư mục')
  .option('--out-dir <path>', 'Output directory', './backups/sessions')
  .option('--sanitize', 'Sanitize sensitive data')
  .option('--max-count <number>', 'Số session tối đa')
  .option('--days <number>', 'Chỉ backup sessions trong N ngày qua')
  .option('--project', 'Reserved for project-aware OpenCode session filtering')
  .option('--dry-run', 'Dry run')
  .option('-v, --verbose', 'Verbose mode')
  .action(async options => {
    try {
      const outDir = options.outDir;
      const maxCount = options.maxCount === undefined ? undefined : Number(options.maxCount);
      const days = options.days === undefined ? undefined : Number(options.days);
      if (maxCount !== undefined && (!Number.isInteger(maxCount) || maxCount < 1)) throw new Error('--max-count must be a positive integer');
      if (days !== undefined && (!Number.isInteger(days) || days < 0)) throw new Error('--days must be a non-negative integer');

      let sessions = await listSessions({ verbose: options.verbose });
      if (days !== undefined) sessions = sessions.filter(s => s.createdAt >= Date.now() - days * 86400000);
      sessions.sort((a, b) => b.createdAt - a.createdAt);
      if (maxCount !== undefined) sessions = sessions.slice(0, maxCount);

      if (options.dryRun) {
        console.log(JSON.stringify({ dryRun: true, count: sessions.length, outDir, sessions }, null, 2));
        return;
      }
      fs.mkdirSync(outDir, { recursive: true });
      let success = 0;
      for (const item of sessions) {
        const safeId = item.id.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(outDir, `session-${safeId}-${new Date(item.createdAt).toISOString().slice(0, 10)}.json`);
        try {
          await exportSession(item.id, filePath, Boolean(options.sanitize), { verbose: false });
          success++;
        } catch (error) {
          console.error(`✗ Failed to backup ${item.id}: ${(error as Error).message}`);
        }
      }
      console.log(`Backup complete: ${success}/${sessions.length}`);
      if (success !== sessions.length) process.exitCode = 1;
    } catch (error) {
      console.error('Error backing up sessions:', (error as Error).message);
      process.exitCode = 1;
    }
  });

session.command('export [sessionId]')
  .description('Export session ra file')
  .option('--output <path>', 'Output file path')
  .option('--sanitize', 'Sanitize sensitive data')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (sessionId, options) => {
    try {
      const outputPath = options.output || `session-${Date.now()}.json`;
      await exportSession(sessionId || null, outputPath, Boolean(options.sanitize), { verbose: options.verbose });
      console.log(`✓ Exported session to: ${outputPath}`);
    } catch (error) {
      console.error('Error exporting session:', (error as Error).message);
      process.exitCode = 1;
    }
  });

session.command('import <file>')
  .description('Import session file hoặc OpenCode share URL')
  .option('-v, --verbose', 'Verbose mode')
  .action(async (input, options) => {
    try {
      if (!input.startsWith('http://') && !input.startsWith('https://') && !fs.existsSync(input)) throw new Error(`File not found: ${input}`);
      await importSession(input, { verbose: options.verbose });
      console.log(`✓ Imported session from: ${input}`);
    } catch (error) {
      console.error('Error importing session:', (error as Error).message);
      process.exitCode = 1;
    }
  });

session.command('list')
  .description('Liệt kê sessions')
  .option('--json', 'Output JSON')
  .option('--limit <number>', 'Số session tối đa')
  .option('-v, --verbose', 'Verbose mode')
  .action(async options => {
    try {
      let sessions = await listSessions({ verbose: options.verbose });
      if (options.limit !== undefined) {
        const limit = Number(options.limit);
        if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');
        sessions = sessions.slice(0, limit);
      }
      if (options.json) console.log(JSON.stringify(sessions, null, 2));
      else {
        console.log('\n📁 Sessions:');
        sessions.forEach(s => console.log(`  • ${s.id} (${new Date(s.createdAt).toLocaleString()})`));
        if (!sessions.length) console.log('  (none)');
        console.log();
      }
    } catch (error) {
      console.error('Error listing sessions:', (error as Error).message);
      process.exitCode = 1;
    }
  });

session.command('delete <sessionId>')
  .description('Xóa session bằng OpenCode CLI')
  .option('--force', 'Force delete without confirmation')
  .action(async (sessionId, options) => {
    try {
      if (!options.force) {
        console.error('Refusing to delete without --force.');
        process.exitCode = 2;
        return;
      }
      const result = await runOpenCodeCommand(['session', 'delete', sessionId], { timeout: 10000 });
      if (result.exitCode !== 0) throw new Error(result.stderr || `OpenCode exited with ${result.exitCode}`);
      console.log(`✓ Deleted session: ${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', (error as Error).message);
      process.exitCode = 1;
    }
  });

export { session };
