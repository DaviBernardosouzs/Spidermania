import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'fs/promises';
import { generatePdf } from '../src/mcp/pdf.service.js';

test('gera PDF verificável para documentação do Ben', async () => {
    const outputPath = 'reports/test-ben-report.pdf';
    const result = await generatePdf({
        title: 'Relatório de teste',
        sections: [{ heading: 'Resumo', content: 'Documento confirmado para validação.' }],
        outputPath
    });
    const file = await readFile(result.path);
    assert.equal(result.verified, true);
    assert.equal(file.subarray(0, 5).toString(), '%PDF-');
    await unlink(result.path);
});

test('bloqueia conteúdo com aparência de segredo', async () => {
    await assert.rejects(
        () => generatePdf({ title: 'Inválido', sections: [{ heading: 'Segredo', content: 'API_KEY: valor' }] }),
        { code: 'SENSITIVE_CONTENT_BLOCKED' }
    );
});