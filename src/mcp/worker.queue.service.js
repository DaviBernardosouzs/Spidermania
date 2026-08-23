import { McpDomainError } from './errors.js';
import { taskStore } from './orchestrator.service.js';
import { executeWorkerTask } from './worker.executor.service.js';

const queue = [];
const active = new Set();

export async function enqueueWorkerTask(taskId, requestedBy) {
    const task = await taskStore.get(taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (requestedBy !== 'miguel') throw new McpDomainError('TOOL_NOT_ALLOWED', 'Somente Miguel coloca workers na fila.');
    if (active.has(taskId) || queue.includes(taskId)) return { taskId, status: task.status, queued: true };
    queue.push(taskId);
    await taskStore.save({ ...task, progress: 'queued', queuedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    void drainQueue();
    return { taskId, status: 'queued', queued: true };
}

async function drainQueue() {
    if (!queue.length) return;
    const taskId = queue.shift();
    active.add(taskId);
    try {
        await executeWorkerTask(taskId);
    } catch {
        // O executor registra o bloqueio na tarefa; a fila continua com as próximas tasks.
    } finally {
        active.delete(taskId);
        void drainQueue();
    }
}

export async function getWorkerQueueStatus() {
    return { queued: [...queue], active: [...active] };
}
