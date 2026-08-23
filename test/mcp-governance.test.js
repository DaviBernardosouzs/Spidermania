import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextLoader } from '../src/mcp/context.loader.js';
import { asToolError, McpDomainError } from '../src/mcp/errors.js';
import { sanitize } from '../src/mcp/audit.service.js';
import { getProviderForAgent } from '../src/mcp/provider.service.js';
import { assertCanCommit, assertDelegation, assertStateTransition } from '../src/mcp/policy.service.js';
import { readWorkspaceFile } from '../src/mcp/workspace.service.js';

const loader = new ContextLoader();

test('carrega todos os contextos registrados', async () => {
    const contexts = await loader.list();
    assert.equal(contexts.length, 11);
    assert.equal((await loader.readForAgent('peter')).content.includes('PeterPark'), true);
});

test('rejeita path traversal de contexto', () => {
    assert.throws(() => loader.resolveContextPath('../.env'), { code: 'PATH_OUTSIDE_WORKSPACE' });
});

test('rejeita leitura de secret no workspace', async () => {
    await assert.rejects(() => readWorkspaceFile('.env'), { code: 'PATH_NOT_ALLOWED' });
});

test('aplica hierarquia de delegação', () => {
    assert.doesNotThrow(() => assertDelegation('peter', 'miguel'));
    assert.doesNotThrow(() => assertDelegation('miguel', 'otto'));
    assert.throws(() => assertDelegation('peter', 'otto'), { code: 'INVALID_DELEGATION' });
});

test('impede commit por especialista e transição inválida', () => {
    assert.throws(() => assertCanCommit('otto'), { code: 'GIT_ACTION_NOT_ALLOWED' });
    assert.throws(() => assertStateTransition('task', 'assigned', 'completed'), { code: 'INVALID_STATE_TRANSITION' });
});

test('não usa fallback da worker key', () => {
    delete process.env.WORKER_LLM_API_KEY;
    assert.throws(() => getProviderForAgent('otto'), { code: 'WORKER_PROVIDER_NOT_CONFIGURED' });
});

test('redige segredos e serializa erros com segurança', () => {
    assert.equal(sanitize({ token: 'secret', summary: 'ok' }).token, '[redacted]');
    assert.deepEqual(asToolError(new McpDomainError('TEST_ERROR', 'falha')), { code: 'TEST_ERROR', message: 'falha', details: {} });
});
