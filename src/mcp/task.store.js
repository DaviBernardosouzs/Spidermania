import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const statePath = resolve('mcp-data/tasks.json');

function ensureState() {
    const directory = dirname(statePath);

    if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }

    if (!existsSync(statePath)) {
        writeFileSync(statePath, '[]', 'utf8');
    }
}

function readTasks() {
    ensureState();

    try {
        const tasks = JSON.parse(readFileSync(statePath, 'utf8'));
        return Array.isArray(tasks) ? tasks : [];
    } catch {
        return [];
    }
}

function writeTasks(tasks) {
    ensureState();
    writeFileSync(statePath, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
}

export function createTask({ title, description = '', owner, priority = 'normal', acceptanceCriteria = '' }) {
    const now = new Date().toISOString();
    const task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        description,
        owner,
        priority,
        acceptanceCriteria,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
        notes: []
    };

    const tasks = readTasks();
    tasks.push(task);
    writeTasks(tasks);
    return task;
}

export function updateTask(id, { status, note } = {}) {
    const tasks = readTasks();
    const task = tasks.find((item) => item.id === id);

    if (!task) {
        return null;
    }

    if (status) {
        task.status = status;
    }

    if (note) {
        task.notes.push({ text: note, at: new Date().toISOString() });
    }

    task.updatedAt = new Date().toISOString();
    writeTasks(tasks);
    return task;
}

export function listTasks(status) {
    const tasks = readTasks();
    return status ? tasks.filter((task) => task.status === status) : tasks;
}