import { randomUUID } from 'crypto';
import { z } from 'zod';
import { team, findAgent } from './team.config.js';
import { FeatureStore, JsonStateStore, TaskStore } from './domain.store.js';
import { McpDomainError } from './errors.js';
import { assertDelegation, assertStateTransition } from './policy.service.js';
import { provisionTaskWorktree } from './worktree.service.js';

const stateStore = new JsonStateStore();
const featureStore = new FeatureStore(stateStore);
const taskStore = new TaskStore(stateStore);

export const featureSchema = z.object({
    id: z.string(), title: z.string().min(1), objective: z.string().min(1), context: z.string().default(''), requirements: z.array(z.string()).default([]), businessRules: z.array(z.string()).default([]), acceptanceCriteria: z.array(z.string()).default([]), priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'), constraints: z.array(z.string()).default([]), dependencies: z.array(z.string()).default([]), outOfScope: z.array(z.string()).default([]), status: z.string(), createdAt: z.string(), updatedAt: z.string(), documentationRequired: z.boolean().default(true), documentationComplete: z.boolean().default(false), securityRequired: z.boolean().default(false), securityValidated: z.boolean().default(false)
});

export const taskSchema = z.object({
    id: z.string(), featureId: z.string(), assignedBy: z.string(), assignedTo: z.string(), objective: z.string().min(1), scope: z.string().default(''), allowedPaths: z.array(z.string()).default([]), forbiddenPaths: z.array(z.string()).default([]), requiredInputs: z.array(z.string()).default([]), expectedOutput: z.string().default(''), validationCommands: z.array(z.string()).default([]), riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'), status: z.string(), evidence: z.array(z.string()).default([]), blockers: z.array(z.string()).default([]), createdAt: z.string(), updatedAt: z.string()
});

const now = () => new Date().toISOString();

export async function createFeature(input) {
    const feature = featureSchema.parse({ ...input, id: `feature-${randomUUID()}`, status: 'received', createdAt: now(), updatedAt: now() });
    await featureStore.save(feature);
    return feature;
}

export async function updateFeature(id, actor, changes) {
    const feature = await featureStore.get(id);
    if (!feature) throw new McpDomainError('FEATURE_NOT_FOUND', 'Feature não encontrada.');
    const allowed = actor === 'peter' ? ['title', 'objective', 'context', 'requirements', 'businessRules', 'acceptanceCriteria', 'priority', 'constraints', 'dependencies', 'outOfScope'] : ['status', 'documentationComplete', 'securityRequired', 'securityValidated'];
    const sanitized = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
    if (changes.status) assertStateTransition('feature', feature.status, changes.status);
    if (changes.status === 'completed' && (feature.documentationRequired && !feature.documentationComplete || feature.securityRequired && !changes.securityValidated)) {
        throw new McpDomainError('FEATURE_NOT_READY', 'Feature não pode ser concluída sem documentação e validações obrigatórias.');
    }
    const updated = featureSchema.parse({ ...feature, ...sanitized, updatedAt: now() });
    await featureStore.save(updated);
    return updated;
}

export async function getFeature(id) {
    const feature = await featureStore.get(id);
    if (!feature) throw new McpDomainError('FEATURE_NOT_FOUND', 'Feature não encontrada.');
    const tasks = (await taskStore.list()).filter((task) => task.featureId === id);
    return { feature, tasks, risks: tasks.filter((task) => ['high', 'critical'].includes(task.riskLevel)), blockers: tasks.flatMap((task) => task.blockers || []) };
}

export async function delegateTask(input) {
    const { sender, recipient } = assertDelegation(input.assignedBy, input.assignedTo);
    const feature = await featureStore.get(input.featureId);
    if (!feature) throw new McpDomainError('FEATURE_NOT_FOUND', 'Feature não encontrada.');
    const guidance = input.engineeringGuidance || [];
    const task = taskSchema.parse({ ...input, id: `task-${randomUUID()}`, assignedBy: sender.id, assignedTo: recipient.id, objective: input.objective, scope: input.scope || '', expectedOutput: [input.expectedOutput || '', guidance.length ? `Preferências de Davi para esta delegação:\n${guidance.map((item) => item.context || item).join('\n')}` : ''].filter(Boolean).join('\n\n'), riskLevel: input.riskLevel || 'low', status: 'assigned', createdAt: now(), updatedAt: now() });
    await taskStore.save(task);
    if (feature.status === 'technical_planning') await updateFeature(feature.id, 'miguel', { status: 'delegated' });
    return task;
}

export async function reportTask(input) {
    const task = await taskStore.get(input.taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (task.assignedTo !== input.agentId) throw new McpDomainError('TASK_NOT_ALLOWED', 'A tarefa não pertence a este agente.');
    assertStateTransition('task', task.status, 'delivered_for_review');
    const updated = { ...task, status: 'delivered_for_review', evidence: input.validationResults || [], updatedAt: now() };
    await taskStore.save(updated);
    return updated;
}

export async function reviewTask(taskId, reviewer, approved = true) {
    const task = await taskStore.get(taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (reviewer !== 'miguel') throw new McpDomainError('TOOL_NOT_ALLOWED', 'Somente Miguel revisa entregas.');
    const nextStatus = approved ? 'validated' : 'changes_requested';
    assertStateTransition('task', task.status, nextStatus);
    const updated = { ...task, status: nextStatus, reviewedBy: reviewer, updatedAt: now() };
    await taskStore.save(updated);
    return updated;
}

export async function startTask(taskId, agentId) {
    const task = await taskStore.get(taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (task.assignedTo !== agentId) throw new McpDomainError('TASK_NOT_ALLOWED', 'A tarefa não pertence a este agente.');
    assertStateTransition('task', task.status, 'in_progress');
    const updated = { ...task, status: 'in_progress', updatedAt: now() };
    await taskStore.save(updated);
    return updated;
}

export async function provisionTaskWorkspace(taskId, agentId) {
    const task = await taskStore.get(taskId);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    if (task.assignedTo !== agentId && agentId !== 'miguel') throw new McpDomainError('TASK_NOT_ALLOWED', 'Somente o agente responsável ou Miguel pode criar o workspace.');
    if (task.workspacePath) return task;
    const workspace = await provisionTaskWorktree({ taskId, agentId: task.assignedTo });
    const updated = { ...task, ...workspace, updatedAt: now() };
    await taskStore.save(updated);
    return updated;
}

export async function getProjectStatus() {
    return { team, features: await featureStore.list(), tasks: await taskStore.list() };
}

export async function buildHealthReport() {
    const status = await getProjectStatus();
    return ['# Relatório de saúde do Spidermania', '', `Gerado em: ${now()}`, `Features: ${status.features.length}`, `Tarefas: ${status.tasks.length}`, `Bloqueios: ${status.tasks.filter((task) => task.status === 'blocked').length}`, '', '## Equipe', ...team.map((agent) => `- ${agent.name}: ${agent.role}`), '', 'Este relatório descreve o estado persistido do orquestrador.'].join('\n');
}

export async function formatStatus() {
    const status = await getProjectStatus();
    return [`Projeto: Spidermania`, `Features: ${status.features.length}`, `Tarefas: ${status.tasks.length}`, ...status.tasks.map((task) => `- [${task.status}] ${task.id}: ${task.objective} (${task.assignedTo})`)].join('\n');
}

export { featureStore, taskStore };

export async function createManagedTask(input) {
    const member = findAgent(input.owner);
    if (!member) throw new McpDomainError('AGENT_NOT_FOUND', 'Responsável inválido.');
    const feature = await createFeature({ title: input.title, objective: input.description || input.title });
    return delegateTask({ featureId: feature.id, assignedBy: 'miguel', assignedTo: member.id, objective: input.title, scope: input.description || '', expectedOutput: input.acceptanceCriteria || '', riskLevel: 'low' });
}

export async function updateManagedTask(id, status, note = '') {
    const task = await taskStore.get(id);
    if (!task) throw new McpDomainError('TASK_NOT_FOUND', 'Tarefa não encontrada.');
    assertStateTransition('task', task.status, status);
    const updated = { ...task, status, evidence: note ? [...task.evidence, note] : task.evidence, updatedAt: now() };
    await taskStore.save(updated);
    return updated;
}