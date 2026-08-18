import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const skill = new Command('skill');

function skillRoots(project: boolean): string[] {
  const roots: string[] = [];
  if (project) roots.push(path.join(process.cwd(), '.opencode', 'skills'));
  else roots.push(path.join(process.cwd(), '.opencode', 'skills'));
  roots.push(path.join(os.homedir(), '.config', 'opencode', 'skills'));
  return [...new Set(roots)];
}

function listSkillDirs(): string[] {
  const result = new Set<string>();
  for (const root of skillRoots(false)) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'SKILL.md'))) result.add(entry.name);
    }
  }
  return [...result].sort();
}

skill.command('list')
  .description('Liệt kê native OpenCode skills')
  .option('--json', 'Output JSON')
  .action(options => {
    try {
      const skills = listSkillDirs();
      if (options.json) console.log(JSON.stringify({ skills }, null, 2));
      else {
        console.log('\n🎯 OpenCode Skills:');
        skills.forEach(name => console.log(`  • ${name}`));
        if (!skills.length) console.log('  (none)');
        console.log();
      }
    } catch (error) {
      console.error('Error listing skills:', (error as Error).message);
      process.exitCode = 1;
    }
  });

skill.command('enable <name>')
  .description('Enable/report a native skill by creating no implicit instructions')
  .option('--project', 'Project skill')
  .action(name => {
    const exists = skillRoots(Boolean(name)).some(root => fs.existsSync(path.join(root, name, 'SKILL.md')));
    if (!exists) {
      console.error(`Skill "${name}" chưa tồn tại. Tạo ${name}/SKILL.md trong .opencode/skills hoặc ~/.config/opencode/skills.`);
      process.exitCode = 1;
      return;
    }
    console.log(`✓ Skill "${name}" is available to OpenCode.`);
  });

skill.command('disable <name>')
  .description('Xóa native skill khỏi local scope')
  .option('--project', 'Project scope')
  .option('--force', 'Required for destructive removal')
  .action((name, options) => {
    if (!options.force) {
      console.error('Refusing to delete a skill without --force.');
      process.exitCode = 2;
      return;
    }
    const roots = skillRoots(Boolean(options.project));
    const matches = roots.map(root => path.join(root, name)).filter(dir => fs.existsSync(dir));
    if (!matches.length) {
      console.error(`Skill "${name}" không tìm thấy.`);
      process.exitCode = 1;
      return;
    }
    for (const dir of matches) fs.rmSync(dir, { recursive: true, force: true });
    console.log(`✓ Đã disable skill "${name}"`);
  });

export { skill };
