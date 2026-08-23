import { z } from 'zod';
import { ContextLoader } from './context.loader.js';
import { McpDomainError } from './errors.js';
import { generateWorkerImplementation, generateWorkerTaskPlan } from './provider.service.js';
import { taskStore, startTask, reportTask } from './orchestrator.service.js';
import { provisionTaskWorktree } from './worktree.service.js';
import { readWorkspaceFile, patchWorkspaceFile } from './workspace.service.js';
import { runValidation } from './validation.service.js';

const contexts = new ContextLoader();
const implementationSchema = z.object({
    summary: z.string(),
    patches: z.array(z.object({ path: z.string(), oldText: z.string().min(1), newText: z.string().min(1) })).default([]),
    validationCommands: z.array(z.string()).default([])
});

async function saveProgress(task, changes) {
    const updated = { ...task, ...changes, events: [...(task.events || []), { at: new Date().toISOString(), ...changes }], updatedAt: new Date().toISOString() };
    await taskStore.save(updated);
    return updated;
}

export async function executeWorkerTask(taskId) {
    let task = await taskStore.get(taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (!task.workspacePath) task = await provisionTaskWorktree(taskId, task.assignedTo).then((workspace) => taskStore.save({ ...task, ...workspace }));
    task = await startTask(taskId, task.assignedTo);

    try {
        const context = (await contexts.readForAgent(task.assignedTo)).content;
        const plan = await generateWorkerTaskPlan({ agentId: task.assignedTo, task, context });
        task = await saveProgress(task, { plan, progress: 'plan_generated' });

        const files = [];
        for (const path of task.allowedPaths || []) {
            try {
                files.push(await readWorkspaceFile(path, task.workspacePath));
            } catch {
                // A path can be a future file; the implementation provider must not assume it exists.
            }
        }

        const implementation = implementationSchema.parse(await generateWorkerImplementation({ agentId: task.assignedTo, task, context, plan, files }));
        task = await saveProgress(task, { progress: 'patches_applying', implementationSummary: implementation.summary });
        const filesChanged = [];
        for (const patch of implementation.patches) {
            if (!task.allowedPaths.includes(patch.path)) throw new McpDomainError('PATH_NOT_ALLOWED', 'O worker tentou alterar um caminho fora da task.');
            await patchWorkspaceFile({ inputPath: patch.path, oldText: patch.oldText, newText: patch.newText, allowedPaths: task.allowedPaths, rootOverride: task.workspacePath });
            filesChanged.push(patch.path);
        }

        const validationResults = [];
        for (const command of implementation.validationCommands.length ? implementation.validationCommands : task.validationCommands || []) {
            validationResults.push(await runValidation(command, 30_000, task.workspacePath));
        }
        task = await saveProgress(task, { filesChanged, validationResults, progress: 'validation_completed' });
        return reportTask({ taskId, agentId: task.assignedTo, summary: implementation.summary, filesChanged, validationResults: validationResults.map((result) => `${result.name}: ${result.exitCode}`), risks: [] });
    } catch (error) {
        await saveProgress(task, { status: 'blocked', progress: 'blocked', blockers: [...(task.blockers || []), error.code || 'WORKER_EXECUTION_FAILED'] });
        throw error;
    }
}
