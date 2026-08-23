import { McpDomainError } from './errors.js';
import { findAgent } from './team.config.js';
import { GoogleGenAI } from '@google/genai';
import { acquireWorkerRequest, getWorkerRateLimitConfig } from './rate-limit.service.js';

export function getProviderConfig(profile) {
    const keyName = profile === 'primary' ? 'PRIMARY_LLM_API_KEY' : 'WORKER_LLM_API_KEY';
    const key = process.env[keyName];
    if (!key) {
        if (profile === 'worker') throw new McpDomainError('WORKER_PROVIDER_NOT_CONFIGURED', 'O provider dos agentes especialistas ainda não foi configurado.');
        throw new McpDomainError('PRIMARY_PROVIDER_NOT_CONFIGURED', 'O provider principal ainda não foi configurado.');
    }
    return { profile, configured: true };
}

export function createProviderClient(profile) {
    const keyName = profile === 'primary' ? 'PRIMARY_LLM_API_KEY' : 'WORKER_LLM_API_KEY';
    const key = process.env[keyName];
    if (!key) {
        getProviderConfig(profile);
    }

    return new GoogleGenAI({ apiKey: key });
}

export async function generateWorkerTaskPlan({ agentId, task, context, guidance = [] }) {
    const client = createProviderClient('worker');
    const config = getWorkerRateLimitConfig();
    let plan = '';
    const totalIterations = agentId === 'miguel' ? config.promptLoopMax : 1;
    for (let iteration = 1; iteration <= totalIterations; iteration += 1) {
        const release = acquireWorkerRequest(agentId);
        try {
            const previous = plan ? `\n\nPlano anterior para revisar:\n${plan}` : '';
            const response = await client.models.generateContent({
                model: process.env.WORKER_LLM_MODEL || 'gemini-3.5-flash-lite',
                contents: `Tarefa delegada por Miguel:\n${task.objective}\n\nEscopo:\n${task.scope}\n\nCaminhos permitidos:\n${task.allowedPaths.join(', ') || 'defina após inspeção'}\n\nPreferências de engenharia:\n${guidance.join('\n') || 'nenhuma registrada'}${previous}\n\nIteração ${iteration}/${totalIterations}. Entregue um plano técnico objetivo, arquivos que precisam ser lidos, alteração proposta e validações necessárias. Não invente arquivos ou resultados.`,
                config: { systemInstruction: context }
            });
            plan = response.text;
        } finally {
            release();
        }
    }
    return plan;
}

export async function generateWorkerImplementation({ agentId, task, context, plan, files }) {
    const client = createProviderClient('worker');
    const release = acquireWorkerRequest(agentId);
    try {
        const fileContext = files.map((file) => `FILE ${file.path}\n${file.content}`).join('\n\n').slice(0, 300_000);
        const response = await client.models.generateContent({
            model: process.env.WORKER_LLM_MODEL || 'gemini-3.5-flash-lite',
            contents: `Implemente somente a tarefa delegada.\n\nTAREFA:\n${task.objective}\n\nESCOPO:\n${task.scope}\n\nCAMINHOS PERMITIDOS:\n${task.allowedPaths.join(', ')}\n\nPLANO:\n${plan}\n\nARQUIVOS DISPONÍVEIS:\n${fileContext}\n\nResponda SOMENTE JSON válido no formato: {"summary":"...","patches":[{"path":"...","oldText":"trecho único existente","newText":"novo trecho"}],"validationCommands":["test"]}. Não invente conteúdo de arquivos ausentes, não inclua secrets e não use caminhos fora da lista permitida.`,
            config: { systemInstruction: context, responseMimeType: 'application/json' }
        });
        try {
            return JSON.parse(response.text);
        } catch {
            throw new McpDomainError('WORKER_INVALID_RESPONSE', 'O worker retornou uma implementação inválida.');
        }
    } finally {
        release();
    }
}

export function getProviderForAgent(agentId) {
    const agent = findAgent(agentId);
    if (!agent) throw new McpDomainError('AGENT_NOT_FOUND', 'Agente não encontrado.');
    return getProviderConfig(agent.providerProfile);
}

export function inspectProviderProfiles() {
    return { primary: Boolean(process.env.PRIMARY_LLM_API_KEY), worker: Boolean(process.env.WORKER_LLM_API_KEY) };
}
