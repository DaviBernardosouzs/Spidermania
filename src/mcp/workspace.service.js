import { access, lstat, readFile, readdir, stat, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { dirname, extname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { McpDomainError } from './errors.js';

const execFileAsync = promisify(execFile);
const serverProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const workspaceRoot = resolve(process.env.SPIDERTEAM_WORKSPACE_ROOT || serverProjectRoot);
const blockedNames = new Set(['.env', 'context.md', 'auth_info_baileys']);
const allowedExtensions = new Set(['.js', '.json', '.md', '.txt', '.sql', '.config', '.yml', '.yaml', '.dockerfile']);
const maxFileBytes = 512 * 1024;

export function resolveWorkspaceRoot(rootOverride = workspaceRoot) {
    const root = resolve(rootOverride);
    const relativeRoot = relative(workspaceRoot, root);
    if (relativeRoot.startsWith('..') || relativeRoot.includes('/..')) throw new McpDomainError('PATH_OUTSIDE_WORKSPACE', 'Workspace da tarefa fora da raiz autorizada.');
    return root;
}

function safePath(inputPath, rootOverride = workspaceRoot) {
    const root = resolveWorkspaceRoot(rootOverride);
    const candidate = resolve(root, inputPath || '.');
    const relativePath = relative(root, candidate);
    if (relativePath.startsWith('..') || relativePath.includes('/..')) throw new McpDomainError('PATH_OUTSIDE_WORKSPACE', 'Caminho fora do workspace.');
    const firstPart = relativePath.split('/')[0];
    if (blockedNames.has(firstPart) || firstPart === '.git' || firstPart === 'node_modules') throw new McpDomainError('PATH_NOT_ALLOWED', 'Caminho protegido ou não permitido.');
    return candidate;
}

async function assertRegularFile(filePath) {
    const info = await lstat(filePath).catch(() => null);
    if (!info || !info.isFile()) throw new McpDomainError('PATH_NOT_ALLOWED', 'Arquivo não encontrado ou não é regular.');
    if (info.size > maxFileBytes) throw new McpDomainError('FILE_TOO_LARGE', 'Arquivo excede o tamanho permitido.');
    return info;
}

export async function readWorkspaceFile(inputPath, rootOverride = workspaceRoot) {
    const root = resolveWorkspaceRoot(rootOverride);
    const filePath = safePath(inputPath, root);
    const info = await assertRegularFile(filePath);
    return { path: relative(root, filePath), content: await readFile(filePath, 'utf8'), size: info.size };
}

export async function patchWorkspaceFile({ inputPath, oldText, newText, allowedPaths = [], rootOverride = workspaceRoot }) {
    const root = resolveWorkspaceRoot(rootOverride);
    const filePath = safePath(inputPath, root);
    const relativePath = relative(root, filePath);
    if (!allowedPaths.includes(relativePath)) throw new McpDomainError('PATH_NOT_ALLOWED', 'Arquivo fora dos caminhos autorizados pela tarefa.');
    if (!oldText || !newText) throw new McpDomainError('INVALID_INPUT', 'file.patch exige oldText e newText.');
    const info = await assertRegularFile(filePath);
    if (info.isSymbolicLink?.()) throw new McpDomainError('PATH_NOT_ALLOWED', 'Symlink não é permitido.');
    const content = await readFile(filePath, 'utf8');
    if (!content.includes(oldText)) throw new McpDomainError('PATCH_NOT_APPLIED', 'Trecho original não encontrado.');
    if (content.indexOf(oldText) !== content.lastIndexOf(oldText)) throw new McpDomainError('PATCH_NOT_APPLIED', 'Trecho original não é único.');
    await writeFile(filePath, content.replace(oldText, newText), 'utf8');
    return { path: relativePath, changed: true };
}

export async function searchWorkspace(pattern, directory = '.', rootOverride = workspaceRoot) {
    if (!pattern || pattern.length > 200) throw new McpDomainError('INVALID_INPUT', 'Padrão de busca inválido.');
    const root = resolveWorkspaceRoot(rootOverride);
    const target = safePath(directory, root);
    const result = await execFileAsync('rg', ['--line-number', '--no-heading', '--hidden', '--glob', '!.git', '--glob', '!node_modules', '--glob', '!.env*', pattern, target], { cwd: root, maxBuffer: 256 * 1024 }).catch((error) => {
        if (error.code === 1) return { stdout: '' };
        throw new McpDomainError('SEARCH_FAILED', 'Busca de código falhou.');
    });
    return result.stdout.slice(0, 256 * 1024);
}

export async function inspectProject(rootOverride = workspaceRoot) {
    const root = resolveWorkspaceRoot(rootOverride);
    const entries = await readdir(root, { withFileTypes: true });
    const manifest = await access(resolve(root, 'package.json')).then(() => true).catch(() => false);
    const git = await execFileAsync('git', ['status', '--short'], { cwd: root, maxBuffer: 64 * 1024 }).then((result) => result.stdout).catch(() => 'unavailable');
    return { root, runtime: process.version, manifest, entries: entries.filter((entry) => !['node_modules', '.git', 'auth_info_baileys'].includes(entry.name)).map((entry) => entry.name), gitStatus: git.slice(0, 64 * 1024) };
}

export async function assertAllowedExtension(inputPath) {
    const extension = extname(inputPath).toLowerCase();
    if (!allowedExtensions.has(extension)) throw new McpDomainError('PATH_NOT_ALLOWED', 'Extensão não permitida.');
}
