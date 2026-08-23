import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'fs/promises';
import { generatePrototype, exportDesignSpec } from '../src/mcp/design.service.js';

const outputName = 'test-pavitr-prototype';
const screens = [
    { id: 'inicio', heading: 'Painel inicial', body: 'Resumo da operação.', actions: ['Abrir tarefa'] },
    { id: 'tarefa', heading: 'Detalhe da tarefa', body: 'Critérios e progresso.' }
];

test('Pavitr gera protótipo navegável real', async () => {
    const result = await generatePrototype({ title: 'Teste Pavitr', outputName, screens });
    const html = await readFile(result.absolutePath, 'utf8');
    assert.equal(result.verified, true);
    assert.equal(result.screens, 2);
    assert.equal(html.includes('data-screen="inicio"'), true);
    assert.equal(html.includes('data-screen-panel="tarefa"'), true);
    await rm(result.absolutePath, { force: true });
});

test('Pavitr exporta especificação estruturada', async () => {
    const result = await exportDesignSpec({ title: 'Spec Pavitr', outputName, screens });
    const specification = JSON.parse(await readFile(`${result.path}`, 'utf8'));
    assert.equal(specification.format, 'spider-team-design-spec-v1');
    assert.equal(specification.designer, 'pavitr');
    assert.equal(specification.screens.length, 2);
    await rm(`${result.path}`, { force: true });
});
