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
      let localSkills: string[] = [];
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
      } else {
        console.log('\n🎯 Agent Skills:');
        console.log('\n  Instructions:');
        if (instructions.length === 0) {
          console.log('    (none)');
        } else {
          instructions.forEach(i => console.log(`    • ${i}`));
        }
        
        console.log('\n  Local skills:');
        if (localSkills.length === 0) {
          console.log('    (none)');
        } else {
          localSkills.forEach(s => console.log(`    • ${s}`));
        }
        console.log();
      }
    } catch (error) {
      console.error('Error listing skills:', (error as Error).message);
      process.exit(1);
    }
  });

skill.command('enable <name>')
  .description('Enable skill')
  .action((name) => {
    console.log(`Note: Skill enabling depends on your OpenCode version. Consider adding to instructions.`);
    console.log(`Suggested: Add "${name}" to instructions array in opencode.json`);
  });

skill.command('disable <name>')
  .description('Disable skill')
  .action((name) => {
    console.log(`Note: Skill disabling depends on your OpenCode version.`);
  });

export { skill };
