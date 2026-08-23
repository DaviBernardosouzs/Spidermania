import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { McpDomainError } from './errors.js';
import { workspaceRoot } from './workspace.service.js';

const execFileAsync = promisify(execFile);
const commands = {
    test: { command: 'npm', args: ['test'] },
    syntax: { command: 'node', args: ['--check', 'src/mcp/server.js'] },
    mcp: { command: 'npm', args: ['run', 'mcp'] }
};

export async function runValidation(name, timeout = 30_000, rootOverride = workspaceRoot) {
    const definition = commands[name];
    if (!definition) throw new McpDomainError('COMMAND_NOT_ALLOWED', 'Comando de validação não cadastrado.');
    const startedAt = Date.now();
    try {
        const result = await execFileAsync(definition.command, definition.args, { cwd: rootOverride, timeout, maxBuffer: 256 * 1024 });
        return { name, command: `${definition.command} ${definition.args.join(' ')}`, exitCode: 0, stdout: result.stdout.slice(0, 256 * 1024), stderr: result.stderr.slice(0, 64 * 1024), durationMs: Date.now() - startedAt };
    } catch (error) {
        return { name, command: `${definition.command} ${definition.args.join(' ')}`, exitCode: typeof error.code === 'number' ? error.code : 1, stdout: String(error.stdout || '').slice(0, 256 * 1024), stderr: String(error.stderr || error.message || '').slice(0, 64 * 1024), durationMs: Date.now() - startedAt, passed: false };
    }
}

export { commands };
