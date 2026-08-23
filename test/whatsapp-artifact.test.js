import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'fs/promises';
import { sendDeliverableArtifact, readDeliverableArtifact } from '../src/service/whatsapp-artifact.service.js';

const artifactPath = 'reports/test-delivery.txt';

test('lê artefato permitido para envio', async () => {
    await mkdir('reports', { recursive: true });
    await writeFile(artifactPath, 'relatório confirmado', 'utf8');
    const artifact = await readDeliverableArtifact(artifactPath);
    assert.equal(artifact.fileName, 'test-delivery.txt');
    assert.equal(artifact.mimetype, 'text/plain');
    assert.equal(artifact.size > 0, true);
    await rm(artifactPath, { force: true });
});

test('Baileys envia o documento validado', async () => {
    await mkdir('reports', { recursive: true });
    await writeFile(artifactPath, 'conteúdo', 'utf8');
    const messages = [];
    const sock = { sendMessage: async (jid, message) => messages.push({ jid, message }) };
    const result = await sendDeliverableArtifact(sock, 'owner', artifactPath, 'Documento');
    assert.equal(result.sent, true);
    assert.equal(messages[0].message.fileName, 'test-delivery.txt');
    assert.equal(messages[0].message.caption, 'Documento');
    await rm(artifactPath, { force: true });
});

test('rejeita caminho fora dos diretórios de artefatos', async () => {
    await assert.rejects(() => readDeliverableArtifact('package.json'), { code: 'PATH_NOT_ALLOWED' });
});
