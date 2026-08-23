import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';

export class JsonStateStore {
    constructor(filePath = resolve('mcp-data/spider-team.json')) {
        this.filePath = filePath;
    }

    async read() {
        try {
            const value = JSON.parse(await readFile(this.filePath, 'utf8'));
            return value && typeof value === 'object' ? value : {};
        } catch {
            return {};
        }
    }

    async write(value) {
        await mkdir(dirname(this.filePath), { recursive: true });
        const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
        await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        await rename(temporaryPath, this.filePath);
    }
}

export class FeatureStore {
    constructor(stateStore = new JsonStateStore()) {
        this.stateStore = stateStore;
    }

    async list() {
        const state = await this.stateStore.read();
        return state.features || [];
    }

    async get(id) {
        return (await this.list()).find((feature) => feature.id === id) || null;
    }

    async save(feature) {
        const state = await this.stateStore.read();
        const features = state.features || [];
        const index = features.findIndex((item) => item.id === feature.id);
        if (index >= 0) features[index] = feature;
        else features.push(feature);
        await this.stateStore.write({ ...state, features });
        return feature;
    }
}

export class TaskStore {
    constructor(stateStore = new JsonStateStore()) {
        this.stateStore = stateStore;
    }

    async list() {
        const state = await this.stateStore.read();
        return state.tasks || [];
    }

    async get(id) {
        return (await this.list()).find((task) => task.id === id) || null;
    }

    async save(task) {
        const state = await this.stateStore.read();
        const tasks = state.tasks || [];
        const index = tasks.findIndex((item) => item.id === task.id);
        if (index >= 0) tasks[index] = task;
        else tasks.push(task);
        await this.stateStore.write({ ...state, tasks });
        return task;
    }
}
