import { appendFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';

const auditPath = resolve('mcp-data/audit.jsonl');
const sensitiveKey = /(key|token|secret|password|authorization|cookie|prompt|message|content)/i;

function sanitize(value, depth = 0) {
    if (depth > 3) return '[truncated]';
    if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}...[truncated]` : value;
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? '[redacted]' : sanitize(item, depth + 1)]));
    return value;
}

export async function audit(event) {
    await mkdir(dirname(auditPath), { recursive: true });
    await appendFile(auditPath, `${JSON.stringify({ ...sanitize(event), at: new Date().toISOString() })}\n`, 'utf8');
}

export { sanitize, auditPath };
