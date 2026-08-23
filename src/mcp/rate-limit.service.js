import { McpDomainError } from './errors.js';

const minuteBuckets = new Map();
const dayBuckets = new Map();
const activeRequests = new Map();

function positiveEnv(name, fallback) {
    const value = Number.parseInt(process.env[name] || '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function bucketKey(agentId, period) {
    return `${agentId}:${period}`;
}

function incrementBucket(store, key, expiresAt) {
    const current = store.get(key);
    if (!current || current.expiresAt <= Date.now()) {
        store.set(key, { count: 1, expiresAt });
        return 1;
    }
    current.count += 1;
    return current.count;
}

export function acquireWorkerRequest(agentId) {
    const now = Date.now();
    const minuteLimit = positiveEnv('WORKER_LLM_REQUESTS_PER_MINUTE', 30);
    const dailyLimit = positiveEnv('WORKER_LLM_REQUESTS_PER_DAY', 1000);
    const concurrentLimit = positiveEnv('WORKER_LLM_MAX_CONCURRENT', 2);
    const active = activeRequests.get(agentId) || 0;

    if (active >= concurrentLimit) {
        throw new McpDomainError('WORKER_CONCURRENCY_LIMIT', 'O limite de chamadas simultâneas do agente foi atingido.');
    }

    const minute = Math.floor(now / 60_000);
    const day = Math.floor(now / 86_400_000);
    const minuteCount = (minuteBuckets.get(bucketKey(agentId, minute)) || {}).count || 0;
    const dayCount = (dayBuckets.get(bucketKey(agentId, day)) || {}).count || 0;

    if (minuteCount >= minuteLimit || dayCount >= dailyLimit) {
        throw new McpDomainError('WORKER_RATE_LIMITED', 'O limite de requisições do agente foi atingido.');
    }

    incrementBucket(minuteBuckets, bucketKey(agentId, minute), (minute + 1) * 60_000);
    incrementBucket(dayBuckets, bucketKey(agentId, day), (day + 1) * 86_400_000);
    activeRequests.set(agentId, active + 1);
    let released = false;

    return () => {
        if (released) return;
        released = true;
        const current = activeRequests.get(agentId) || 1;
        if (current <= 1) activeRequests.delete(agentId);
        else activeRequests.set(agentId, current - 1);
    };
}

export function getWorkerRateLimitConfig() {
    return {
        requestsPerMinute: positiveEnv('WORKER_LLM_REQUESTS_PER_MINUTE', 30),
        requestsPerDay: positiveEnv('WORKER_LLM_REQUESTS_PER_DAY', 1000),
        maxConcurrent: positiveEnv('WORKER_LLM_MAX_CONCURRENT', 2),
        promptLoopMax: positiveEnv('MIGUEL_PROMPT_LOOP_MAX', 2)
    };
}
