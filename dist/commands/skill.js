/**
 * OCX - OpenCode eXtension CLI
 * Skill commands
 */
import { Command } from 'commander';
import * as fs from 'node:fs';
import { readConfig } from '../lib/config.js';
const skill = new Command('skill');
skill.command('list')
    .description('Liệt kê agent skills khả dụng')
    .option('--json', 'Output JSON')
    .action((options) => {
    try {
        const config = readConfig();
        // Skills có thể được định nghĩa trong instructions hoặc thư mục .opencode/skills
        const instructions = config.instructions || [];
        // Check project folder cho .opencode/skills
        const skillsDir = './.opencode/skills';
        let localSkills = [];
        if (fs.existsSync(skillsDir)) {
            localSkills = fs.readdirSync(skillsDir)
                .filter(f => f.endsWith('.md') || f.endsWith('.txt'));
        }
        const result = {
            instructions,
            local_skills: localSkills
        };
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            console.log('\n🎯 Agent Skills:');
            console.log('\n  Instructions:');
            if (instructions.length === 0) {
                console.log('    (none)');
            }
            else {
                instructions.forEach(i => console.log(`    • ${i}`));
            }
            console.log('\n  Local skills:');
            if (localSkills.length === 0) {
                console.log('    (none)');
            }
            else {
                localSkills.forEach(s => console.log(`    • ${s}`));
            }
            console.log();
        }
    }
    catch (error) {
        console.error('Error listing skills:', error.message);
        process.exit(1);
    }
});
skill.command('enable <name>')
    .description('Enable skill')
    .option('--project', 'Áp dụng cho project hiện tại')
    .option('--dry-run', 'Không ghi file, chỉ hiển thị')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (name, options) => {
    try {
        const config = readConfig(options.project ? undefined : undefined);
        if (!config.instructions) {
            config.instructions = [];
        }
        if (config.instructions.includes(name)) {
            console.log(`Skill "${name}" đã được enable rồi.`);
            return;
        }
        config.instructions.push(name);
        const { writeConfig } = await import('../lib/config.js');
        writeConfig(config, options.project ? undefined : undefined, {
            dryRun: options.dryRun,
            verbose: options.verbose
        });
        const scope = options.project ? 'project' : 'global';
        console.log(`✓ Đã enable skill "${name}" (${scope})`);
        console.log(`  Added to instructions array in opencode.json`);
    }
    catch (error) {
        console.error('Error enabling skill:', error.message);
        process.exit(1);
    }
});
skill.command('disable <name>')
    .description('Disable skill')
    .option('--project', 'Áp dụng cho project hiện tại')
    .option('--dry-run', 'Không ghi file, chỉ hiển thị')
    .option('-v, --verbose', 'Verbose mode')
    .action(async (name, options) => {
    try {
        const config = readConfig(options.project ? undefined : undefined);
        if (!config.instructions || config.instructions.length === 0) {
            console.log(`Không có skill nào được enable.`);
            return;
        }
        const index = config.instructions.indexOf(name);
        if (index === -1) {
            console.log(`Skill "${name}" không tìm thấy trong danh sách enabled.`);
            return;
        }
        config.instructions.splice(index, 1);
        const { writeConfig } = await import('../lib/config.js');
        writeConfig(config, options.project ? undefined : undefined, {
            dryRun: options.dryRun,
            verbose: options.verbose
        });
        const scope = options.project ? 'project' : 'global';
        console.log(`✓ Đã disable skill "${name}" (${scope})`);
        console.log(`  Removed from instructions array in opencode.json`);
    }
    catch (error) {
        console.error('Error disabling skill:', error.message);
        process.exit(1);
    }
});
export { skill };
