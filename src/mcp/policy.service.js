import { findAgent } from './team.config.js';
import { McpDomainError } from './errors.js';

export const featureStates = ['received', 'analyzing', 'waiting_for_product_decision', 'approved', 'technical_planning', 'delegated', 'in_progress', 'blocked', 'under_review', 'quality_validation', 'security_validation', 'documentation', 'ready_for_product_acceptance', 'completed', 'rejected', 'cancelled'];
export const taskStates = ['pending', 'assigned', 'in_progress', 'blocked', 'delivered_for_review', 'changes_requested', 'validated', 'completed', 'cancelled'];

const featureTransitions = {
    received: ['analyzing', 'rejected', 'cancelled'], analyzing: ['waiting_for_product_decision', 'approved', 'blocked'], waiting_for_product_decision: ['approved', 'rejected'], approved: ['technical_planning', 'cancelled'], technical_planning: ['delegated', 'blocked'], delegated: ['in_progress', 'blocked'], in_progress: ['under_review', 'blocked', 'cancelled'], under_review: ['quality_validation', 'changes_requested', 'blocked'], quality_validation: ['security_validation', 'documentation', 'changes_requested', 'blocked'], security_validation: ['documentation', 'changes_requested', 'blocked'], documentation: ['ready_for_product_acceptance', 'changes_requested'], ready_for_product_acceptance: ['completed', 'rejected'], completed: [], rejected: [], cancelled: []
};
const taskTransitions = { pending: ['assigned', 'cancelled'], assigned: ['in_progress', 'cancelled'], in_progress: ['blocked', 'delivered_for_review', 'cancelled'], blocked: ['in_progress', 'cancelled'], delivered_for_review: ['changes_requested', 'validated'], changes_requested: ['in_progress', 'cancelled'], validated: ['completed', 'changes_requested'], completed: [], cancelled: [] };

export function assertAgent(agentId) {
    const agent = findAgent(agentId);
    if (!agent) throw new McpDomainError('AGENT_NOT_FOUND', 'Agente não encontrado.');
    return agent;
}

export function assertToolAllowed(agentId, tool) {
    const agent = assertAgent(agentId);
    const workerTaskTool = ['task.start', 'worker.plan_task', 'task.provision_workspace'].includes(tool) && agent.reportsTo === 'miguel';
    if (!agent.allowedTools.includes(tool) && !workerTaskTool) throw new McpDomainError('TOOL_NOT_ALLOWED', 'Ferramenta não permitida para este agente.');
    return agent;
}

export function assertDelegation(assignedBy, assignedTo) {
    const sender = assertAgent(assignedBy);
    const recipient = assertAgent(assignedTo);
    const allowed = (sender.id === 'peter' && recipient.id === 'miguel') || (sender.id === 'miguel' && recipient.reportsTo === 'miguel');
    if (!allowed) throw new McpDomainError('INVALID_DELEGATION', 'Delegação fora da hierarquia permitida.');
    return { sender, recipient };
}

export function assertStateTransition(kind, from, to) {
    const transitions = kind === 'feature' ? featureTransitions : taskTransitions;
    if (!transitions[from]?.includes(to)) throw new McpDomainError('INVALID_STATE_TRANSITION', `Transição inválida: ${from} -> ${to}.`);
}

export function assertCanContactUser(agentId) {
    const agent = assertAgent(agentId);
    if (!agent.canContactUser) throw new McpDomainError('COMMUNICATION_NOT_ALLOWED', 'Este agente não pode falar diretamente com Davi.');
}

export function assertCanCommit(agentId) {
    const agent = assertAgent(agentId);
    if (!agent.canCommit) throw new McpDomainError('GIT_ACTION_NOT_ALLOWED', 'Somente Miguel pode preparar commits locais.');
}

export function assertRemoteActionDenied() {
    throw new McpDomainError('REMOTE_AUTHORIZATION_REQUIRED', 'Ações Git remotas exigem autorização explícita de Davi transmitida por Peter.');
}
