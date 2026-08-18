/**
 * OCX - OpenCode eXtension CLI
 * Session commands
 */
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listSessions, exportSession, importSession } from '../lib/opencode-shell.js';
const session = new Command('session');
/**
 * Backup all sessions to a directory
 */
session.command('backup')
    .description('Backup toàn bộ sessions vào thư mục')
    .option('--out-dir <path>', 'Output directory (default: ./backups/sessions)', './backups/sessions')
    .option('--sanitize', 'Sanitize sensitive data trong exported sessions')
    .option('--max-count <number>', 'Số session tối đa để backup')
    .option('--days <number>', 'Chỉ backup sessions trong vòng N ngày qua')
    .option('--project', 'Chỉ backup sessions của project hiện tại')
    .option('--dry-run', 'Không thực hiện backup, chỉ hiển thị số session sẽ backup')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const verbose = options.verbose || false;
        const dryRun = options.dryRun || false;
        const outDir = options.outDir || './backups/sessions';
        const maxCount = options.maxCount ? parseInt(options.maxCount, 10) : null;
        const days = options.days ? parseInt(options.days, 10) : null;
        if (verbose) {
            console.log(`[BACKUP] Output directory: ${outDir}`);
            console.log(`[BACKUP] Max count: ${maxCount || 'unlimited'}`);
            console.log(`[BACKUP] Days filter: ${days || 'all'}`);
            console.log(`[BACKUP] Dry run: ${dryRun}`);
        }
        // Lấy danh sách sessions
        const sessions = await listSessions({ verbose });
        if (verbose) {
            console.log(`[BACKUP] Found ${sessions.length} sessions`);
        }
        // Filter sessions theo days
        let filteredSessions = sessions;
        if (days) {
            const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
            filteredSessions = sessions.filter(s => s.createdAt >= cutoffDate);
            if (verbose) {
                console.log(`[BACKUP] After filtering by ${days} days: ${filteredSessions.length} sessions`);
            }
        }
        // Filter theo max count
        if (maxCount && filteredSessions.length > maxCount) {
            // Lấy các session mới nhất
            filteredSessions = filteredSessions
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, maxCount);
            if (verbose) {
                console.log(`[BACKUP] After limiting to ${maxCount}: ${filteredSessions.length} sessions`);
            }
        }
        // Dry run - chỉ in số session sẽ backup
        if (dryRun) {
            console.log(`\n📋 [DRY-RUN] Would backup ${filteredSessions.length} sessions to ${outDir}/`);
            for (const s of filteredSessions) {
                const date = new Date(s.createdAt).toISOString().split('T')[0];
                console.log(`  • ${s.id} (${date})`);
            }
            console.log();
            return;
        }
        // Tạo thư mục output
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
            if (verbose) {
                console.log(`[BACKUP] Created directory: ${outDir}`);
            }
        }
        // Backup từng session
        let successCount = 0;
        let failCount = 0;
        for (const sessionItem of filteredSessions) {
            const sessionId = sessionItem.id;
            const date = new Date(sessionItem.createdAt).toISOString().split('T')[0];
            const timestamp = new Date(sessionItem.createdAt).getTime();
            const fileName = `session-${sessionId}-${date}.json`;
            const filePath = path.join(outDir, fileName);
            try {
                if (verbose) {
                    console.log(`[BACKUP] Exporting session ${sessionId}...`);
                }
                await exportSession(sessionId, filePath, options.sanitize || false, { verbose: false });
                successCount++;
                if (verbose) {
                    console.log(`  ✓ ${fileName}`);
                }
            }
            catch (error) {
                failCount++;
                console.error(`  ✗ Failed to backup session ${sessionId}: ${error.message}`);
            }
        }
        console.log(`\n✅ Backup complete!`);
        console.log(`   Success: ${successCount}/${filteredSessions.length}`);
        console.log(`   Failed: ${failCount}/${filteredSessions.length}`);
        console.log(`   Output: ${outDir}/`);
        console.log();
    }
    catch (error) {
        console.error('Error backing up sessions:', error.message);
        process.exit(1);
    }
});
session.command('export [sessionId]')
    .description('Export session ra file')
    .option('--output <path>', 'Output file path')
    .option('--sanitize', 'Sanitize sensitive data (thay thế bằng [REDACTED])')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (sessionId, options) => {
    try {
        const outputPath = options.output || `session-${Date.now()}.json`;
        if (options.verbose) {
            console.log(`[EXPORT] Session: ${sessionId || 'latest'}`);
            console.log(`[EXPORT] Output: ${outputPath}`);
            console.log(`[EXPORT] Sanitize: ${options.sanitize || false}`);
        }
        await exportSession(sessionId || null, outputPath, options.sanitize, {
            verbose: options.verbose
        });
        console.log(`✓ Exported session to: ${outputPath}`);
        if (options.sanitize) {
            console.log('  Note: Sensitive data has been replaced with [REDACTED]');
        }
    }
    catch (error) {
        console.error('Error exporting session:', error.message);
        process.exit(1);
    }
});
session.command('import <file>')
    .description('Import session từ file hoặc URL')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (inputFile, options) => {
    try {
        const verbose = options.verbose || false;
        // Check if input is a URL
        let actualInputFile = inputFile;
        let tempFilePath = null;
        if (inputFile.startsWith('http://') || inputFile.startsWith('https://')) {
            if (verbose) {
                console.log(`[IMPORT] Downloading from URL: ${inputFile}`);
            }
            // Download file từ URL
            const { get } = await import('node:http');
            const { get: getHttps } = await import('node:https');
            const fs = await import('node:fs');
            const path = await import('node:path');
            const os = await import('node:os');
            const httpLib = inputFile.startsWith('https://') ? getHttps : get;
            tempFilePath = path.join(os.tmpdir(), `ocx-session-${Date.now()}.json`);
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(tempFilePath);
                httpLib(inputFile, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}: Failed to download from URL`));
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlinkSync(tempFilePath);
                    reject(err);
                });
            });
            actualInputFile = tempFilePath;
            if (verbose) {
                console.log(`[IMPORT] Downloaded to: ${tempFilePath}`);
            }
        }
        else {
            // Local file
            if (!fs.existsSync(inputFile)) {
                console.error(`Error: File not found: ${inputFile}`);
                process.exit(1);
            }
        }
        if (verbose) {
            console.log(`[IMPORT] Importing from: ${actualInputFile}`);
        }
        await importSession(actualInputFile, { verbose });
        console.log(`✓ Imported session from: ${inputFile}`);
        // Cleanup temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            if (verbose) {
                console.log(`[IMPORT] Cleaned up temp file: ${tempFilePath}`);
            }
        }
    }
    catch (error) {
        console.error('Error importing session:', error.message);
        process.exit(1);
    }
});
session.command('list')
    .description('Liệt kê sessions')
    .option('--json', 'Output JSON')
    .option('--limit <number>', 'Số session tối đa hiển thị')
    .option('--project <name>', 'Lọc sessions theo project name (nếu có)')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (options) => {
    try {
        const verbose = options.verbose || false;
        if (verbose) {
            console.log(`[LIST] Fetching sessions...`);
            if (options.limit) {
                console.log(`[LIST] Limit: ${options.limit}`);
            }
            if (options.project) {
                console.log(`[LIST] Project filter: ${options.project}`);
            }
        }
        let sessions = await listSessions({ verbose });
        // Filter by project name nếu có
        if (options.project) {
            sessions = sessions.filter(s => {
                // Check nếu session ID chứa project name hoặc metadata liên quan
                return s.id.includes(options.project);
            });
            if (verbose) {
                console.log(`[LIST] After filtering: ${sessions.length} sessions`);
            }
        }
        // Apply limit
        if (options.limit) {
            const limit = parseInt(options.limit, 10);
            if (!isNaN(limit) && limit > 0) {
                sessions = sessions.slice(0, limit);
                if (verbose) {
                    console.log(`[LIST] After limiting: ${sessions.length} sessions`);
                }
            }
        }
        if (options.json) {
            console.log(JSON.stringify(sessions, null, 2));
        }
        else {
            console.log('\n📁 Sessions:');
            if (sessions.length === 0) {
                console.log('  (none)');
            }
            else {
                for (const s of sessions) {
                    const date = new Date(s.createdAt).toLocaleString();
                    console.log(`  • ${s.id} (${date})`);
                }
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing sessions:', error.message);
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
