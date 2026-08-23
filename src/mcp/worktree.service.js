import { access, mkdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { workspaceRoot } from './workspace.service.js';
import { McpDomainError } from './errors.js';

const execFileAsync = promisify(execFile);
const worktreeRoot = join(workspaceRoot, '.spiderteam', 'worktrees');

function branchPart(value) {
    return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'task';
}

export async function provisionTaskWorktree({ taskId, agentId }) {
    const suffix = randomUUID().slice(0, 8);
    const branchName = `spider/task/${branchPart(agentId)}-${suffix}`;
    const path = join(worktreeRoot, `${branchPart(agentId)}-${suffix}`);
    await mkdir(worktreeRoot, { recursive: true });

    try {
        await execFileAsync('git', ['worktree', 'add', '-b', branchName, path, 'HEAD'], { cwd: workspaceRoot, maxBuffer: 64 * 1024 });
    } catch (error) {
        throw new McpDomainError('WORKTREE_CREATE_FAILED', 'O worktree da tarefa não pôde ser criado.', { taskId, exitCode: error.code });
    }

    return { taskId, agentId, branchName, workspacePath: path, relativeWorkspacePath: path.slice(workspaceRoot.length + 1) };
}

export async function assertWorktreeExists(path) {
    try {
        await access(path);
        return path;
    } catch {
        throw new McpDomainError('WORKTREE_NOT_FOUND', 'Worktree da tarefa não encontrado.');
    }
}

export { worktreeRoot };
