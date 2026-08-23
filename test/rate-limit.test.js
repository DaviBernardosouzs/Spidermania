import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireWorkerRequest, getWorkerRateLimitConfig } from '../src/mcp/rate-limit.service.js';

test('aplica limite de requisições por minuto', () => {
    const previousMinute = process.env.WORKER_LLM_REQUESTS_PER_MINUTE;
    const previousDay = process.env.WORKER_LLM_REQUESTS_PER_DAY;
    const previousConcurrent = process.env.WORKER_LLM_MAX_CONCURRENT;
    process.env.WORKER_LLM_REQUESTS_PER_MINUTE = '1';
    process.env.WORKER_LLM_REQUESTS_PER_DAY = '10';
    process.env.WORKER_LLM_MAX_CONCURRENT = '2';
    const agent = `test-rate-${Date.now()}`;
    const release = acquireWorkerRequest(agent);
    try {
        assert.throws(() => acquireWorkerRequest(agent), { code: 'WORKER_RATE_LIMITED' });
    } finally {
        release();
        process.env.WORKER_LLM_REQUESTS_PER_MINUTE = previousMinute;
        process.env.WORKER_LLM_REQUESTS_PER_DAY = previousDay;
        process.env.WORKER_LLM_MAX_CONCURRENT = previousConcurrent;
    }
});

test('lê configuração do loop e limites', () => {
    process.env.MIGUEL_PROMPT_LOOP_MAX = '3';
    assert.equal(getWorkerRateLimitConfig().promptLoopMax, 3);
    delete process.env.MIGUEL_PROMPT_LOOP_MAX;
});
