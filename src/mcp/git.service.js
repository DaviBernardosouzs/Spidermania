import { execFile } from 'child_process';
import { promisify } from 'util';
import { McpDomainError } from './errors.js';
import { workspaceRoot } from './workspace.service.js';

const execFileAsync = promisify(execFile);

export async function gitStatus(rootOverride = workspaceRoot) {
    const result = await execFileAsync('git', ['status', '--short'], { cwd: rootOverride, maxBuffer: 128 * 1024 });
    return result.stdout;
}

export async function gitDiff(path = '.', staged = false, rootOverride = workspaceRoot) {
    if (path.includes('..') || path.startsWith('/') || path === '.git') throw new McpDomainError('PATH_NOT_ALLOWED', 'Caminho Git não permitido.');
    const args = ['diff'];
    if (staged) args.push('--cached');
    args.push('--', path);
    const result = await execFileAsync('git', args, { cwd: rootOverride, maxBuffer: 512 * 1024 });
    return result.stdout;
}

export async function gitLog(limit = 20, rootOverride = workspaceRoot) {
    const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 50);
    const result = await execFileAsync('git', ['log', `-${safeLimit}`, '--oneline', '--decorate'], { cwd: rootOverride, maxBuffer: 128 * 1024 });
    return result.stdout;
}
