import { execFile } from 'child_process';
import { promisify } from 'util';
import { McpDomainError } from './errors.js';
import { workspaceRoot } from './workspace.service.js';
import { taskStore } from './orchestrator.service.js';

const execFileAsync = promisify(execFile);
const secretPattern = /(api[_-]?key|token|password|secret|authorization)\s*[:=]/i;

async function getTask(taskId) {
    const task = await taskStore.get(taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (!task.workspacePath || !task.branchName) throw new McpDomainError('WORKTREE_NOT_FOUND', 'A tarefa não possui branch/worktree provisionado.');
    return task;
}

async function runGit(args, cwd) {
    try {
        return await execFileAsync('git', args, { cwd, maxBuffer: 512 * 1024 });
    } catch (error) {
        throw new McpDomainError('GIT_COMMAND_FAILED', 'A operação Git local falhou.', { exitCode: error.code });
    }
}

export async function commitTask(taskId, message) {
    const task = await getTask(taskId);
    if (task.status !== 'validated') throw new McpDomainError('TASK_NOT_READY', 'A task precisa estar validada por Miguel antes do commit.');
    if (!task.allowedPaths?.length) throw new McpDomainError('PATH_NOT_ALLOWED', 'A task não possui caminhos autorizados.');

    const status = (await runGit(['status', '--porcelain'], task.workspacePath)).stdout;
    const changedPaths = status.split('\n').filter(Boolean).map((line) => line.slice(3).trim()).filter(Boolean);
    if (changedPaths.some((path) => !task.allowedPaths.includes(path))) throw new McpDomainError('PATH_NOT_ALLOWED', 'A branch contém alteração fora dos caminhos da task.');
    if (!changedPaths.length) throw new McpDomainError('NO_CHANGES', 'Não há alterações para criar commit.');

    await runGit(['add', '--', ...task.allowedPaths], task.workspacePath);
    const staged = (await runGit(['diff', '--cached'], task.workspacePath)).stdout;
    if (secretPattern.test(staged)) throw new McpDomainError('SENSITIVE_CONTENT_BLOCKED', 'O commit contém conteúdo que parece ser segredo.');
    const commit = await runGit(['commit', '-m', message], task.workspacePath);
    const hash = (await runGit(['rev-parse', 'HEAD'], task.workspacePath)).stdout.trim();
    const updated = { ...task, commitHash: hash, commitOutput: commit.stdout, updatedAt: new Date().toISOString() };
    await taskStore.save(updated);
    return { taskId, branchName: task.branchName, commitHash: hash, paths: changedPaths };
}

export async function integrateTask(taskId) {
    const task = await getTask(taskId);
    if (task.status !== 'validated' || !task.commitHash) throw new McpDomainError('TASK_NOT_READY', 'A task precisa de revisão e commit local antes da integração.');
    const baseStatus = (await runGit(['status', '--porcelain'], workspaceRoot)).stdout;
    if (baseStatus.trim()) throw new McpDomainError('WORKTREE_NOT_CLEAN', 'O workspace principal possui alterações; a integração foi bloqueada.');
    const merge = await runGit(['merge', '--no-ff', task.branchName, '-m', `merge: integrate ${task.branchName}`], workspaceRoot);
    const updated = { ...task, status: 'completed', integratedAt: new Date().toISOString(), mergeOutput: merge.stdout, updatedAt: new Date().toISOString() };
    await taskStore.save(updated);
    return { taskId, branchName: task.branchName, status: updated.status, output: merge.stdout };
}
