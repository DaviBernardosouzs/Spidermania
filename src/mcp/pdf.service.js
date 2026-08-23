import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir, readFile, unlink } from 'fs/promises';
import { basename, join, relative, resolve } from 'path';
import { workspaceRoot } from './workspace.service.js';
import { McpDomainError } from './errors.js';

const reportsDirectory = resolve(workspaceRoot, 'reports');
const secretPattern = /(api[_-]?key|token|password|secret|authorization)\s*[:=]/i;

function safeOutputPath(outputPath) {
    const normalized = outputPath || 'reports/spider-team-report.pdf';
    if (!normalized.endsWith('.pdf') || normalized.includes('..') || normalized.startsWith('/') || normalized.includes('\\')) {
        throw new McpDomainError('PATH_NOT_ALLOWED', 'O PDF deve ser um arquivo .pdf dentro do workspace.');
    }

    const absolutePath = resolve(workspaceRoot, normalized);
    if (!absolutePath.startsWith(`${workspaceRoot}/`)) {
        throw new McpDomainError('PATH_OUTSIDE_WORKSPACE', 'Destino do PDF fora do workspace.');
    }

    return absolutePath;
}

function assertSafeContent(sections) {
    const content = sections.map((section) => `${section.heading}\n${section.content}`).join('\n');
    if (secretPattern.test(content)) {
        throw new McpDomainError('SENSITIVE_CONTENT_BLOCKED', 'O conteúdo do PDF parece conter credenciais ou dados sensíveis.');
    }
}

export async function generatePdf({ title, sections, outputPath = 'reports/spider-team-report.pdf' }) {
    if (!title?.trim() || !Array.isArray(sections) || sections.length === 0) {
        throw new McpDomainError('INVALID_INPUT', 'O PDF exige título e pelo menos uma seção.');
    }

    assertSafeContent(sections);
    const absolutePath = safeOutputPath(outputPath);
    await mkdir(join(workspaceRoot, 'reports'), { recursive: true });

    await new Promise((resolveDocument, rejectDocument) => {
        const document = new PDFDocument({ margin: 50 });
        const stream = document.pipe(createWriteStream(absolutePath));
        stream.on('finish', resolveDocument);
        stream.on('error', rejectDocument);
        document.fontSize(20).text(title.trim(), { underline: true });
        document.moveDown();
        document.fontSize(9).fillColor('#666666').text(`Gerado em ${new Date().toISOString()}`);
        document.fillColor('#000000').moveDown();
        for (const section of sections) {
            document.fontSize(14).text(String(section.heading || 'Seção'));
            document.moveDown(0.3);
            document.fontSize(10).text(String(section.content || ''));
            document.moveDown();
        }
        document.end();
    });

    const file = await readFile(absolutePath);
    if (file.length < 5 || file.subarray(0, 5).toString() !== '%PDF-') {
        await unlink(absolutePath).catch(() => {});
        throw new McpDomainError('PDF_INVALID', 'O arquivo gerado não é um PDF válido.');
    }

    return { path: relative(workspaceRoot, absolutePath), fileName: basename(absolutePath), size: file.length, verified: true };
}
