import { lstat, readdir, readFile } from 'fs/promises';
import { dirname, extname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { findAgent, team } from './team.config.js';
import { McpDomainError } from './errors.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultContextRoot = resolve(process.env.SPIDERTEAM_CONTEXT_ROOT || projectRoot, process.env.SPIDERTEAM_CONTEXT_ROOT ? '' : 'contexts');
const allowedExtensions = new Set(['.md', '.txt']);
const maxContextBytes = 128 * 1024;

export class ContextLoader {
    constructor(contextRoot = defaultContextRoot) {
        this.contextRoot = resolve(contextRoot);
    }

    resolveContextPath(fileName) {
        if (!fileName || fileName.includes('\0')) {
            throw new McpDomainError('CONTEXT_NOT_FOUND', 'Contexto inválido.');
        }

        const candidate = resolve(this.contextRoot, fileName);
        const relativePath = relative(this.contextRoot, candidate);
        if (relativePath.startsWith('..') || relativePath.includes('/..')) {
            throw new McpDomainError('PATH_OUTSIDE_WORKSPACE', 'Contexto fora da pasta autorizada.');
        }

        if (!allowedExtensions.has(extname(candidate).toLowerCase())) {
            throw new McpDomainError('CONTEXT_NOT_FOUND', 'Extensão de contexto não permitida.');
        }

        return candidate;
    }

    async readFile(fileName) {
        const filePath = this.resolveContextPath(fileName);
        let stats;

        try {
            stats = await lstat(filePath);
        } catch {
            throw new McpDomainError('CONTEXT_NOT_FOUND', 'Contexto não encontrado.');
        }

        if (!stats.isFile()) {
            throw new McpDomainError('CONTEXT_NOT_FOUND', 'Contexto não é um arquivo regular.');
        }

        if (stats.size > maxContextBytes) {
            throw new McpDomainError('CONTEXT_TOO_LARGE', 'Contexto excede o tamanho permitido.');
        }

        const content = await readFile(filePath, 'utf8');
        if (!content.trim()) {
            throw new McpDomainError('CONTEXT_EMPTY', 'Contexto vazio.');
        }

        return { fileName, content, size: stats.size };
    }

    async list() {
        const files = await readdir(this.contextRoot, { withFileTypes: true });
        return files
            .filter((entry) => entry.isFile() && allowedExtensions.has(extname(entry.name).toLowerCase()))
            .map((entry) => {
                const agent = team.find((item) => item.contextFile === entry.name);
                return { agentId: agent?.id || null, name: agent?.name || null, fileName: entry.name };
            });
    }

    async readForAgent(agentId) {
        const agent = findAgent(agentId);
        if (!agent) {
            throw new McpDomainError('AGENT_NOT_FOUND', 'Agente não encontrado.');
        }

        return this.readFile(agent.contextFile);
    }
}

export { defaultContextRoot, maxContextBytes };