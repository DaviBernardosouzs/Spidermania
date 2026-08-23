import { lstat, readFile } from 'fs/promises';
import { extname, relative, resolve } from 'path';
import { workspaceRoot } from '../mcp/workspace.service.js';
import { McpDomainError } from '../mcp/errors.js';

const maxArtifactBytes = 10 * 1024 * 1024;
const allowedDirectories = ['designs', 'reports', '.spiderteam/worktrees'];
const mimeTypes = {
    '.pdf': 'application/pdf',
    '.html': 'text/html',
    '.json': 'application/json',
    '.txt': 'text/plain'
};

export async function readDeliverableArtifact(inputPath) {
    const candidate = resolve(workspaceRoot, inputPath);
    const relativePath = relative(workspaceRoot, candidate);
    const allowed = allowedDirectories.some((directory) => relativePath === directory || relativePath.startsWith(`${directory}/`));
    if (!allowed || relativePath.includes('..') || candidate.includes('/.env')) {
        throw new McpDomainError('PATH_NOT_ALLOWED', 'Somente artefatos gerados em diretórios permitidos podem ser enviados.');
    }

    const info = await lstat(candidate).catch(() => null);
    if (!info?.isFile() || info.isSymbolicLink()) {
        throw new McpDomainError('PATH_NOT_ALLOWED', 'O artefato não é um arquivo regular permitido.');
    }
    if (info.size > maxArtifactBytes) {
        throw new McpDomainError('FILE_TOO_LARGE', 'O artefato excede o limite de envio.');
    }

    const extension = extname(candidate).toLowerCase();
    if (!mimeTypes[extension]) {
        throw new McpDomainError('PATH_NOT_ALLOWED', 'Tipo de artefato não permitido para envio.');
    }

    return {
        path: relativePath,
        buffer: await readFile(candidate),
        fileName: candidate.split('/').pop(),
        mimetype: mimeTypes[extension],
        size: info.size
    };
}

export async function sendDeliverableArtifact(sock, jid, inputPath, caption = '') {
    const artifact = await readDeliverableArtifact(inputPath);
    await sock.sendMessage(jid, {
        document: artifact.buffer,
        fileName: artifact.fileName,
        mimetype: artifact.mimetype,
        caption
    });
    return {
        path: artifact.path,
        fileName: artifact.fileName,
        size: artifact.size,
        sent: true
    };
}
