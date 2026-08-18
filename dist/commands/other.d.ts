/**
 * OCX - OpenCode eXtension CLI
 * Commands nhóm: plugin, skill, mcp, session, config, auth
 */
import { Command } from 'commander';
declare const plugin: Command;
declare const skill: Command;
declare const mcp: Command;
declare const session: Command;
declare const configCmd: Command;
declare const auth: Command;
export { plugin, skill, mcp, session, configCmd, auth };
