import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, relative, resolve } from 'path';
import { workspaceRoot } from './workspace.service.js';
import { McpDomainError } from './errors.js';

function safeName(value) {
    const name = String(value || 'prototype').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
    if (!name) throw new McpDomainError('INVALID_INPUT', 'Nome do protótipo inválido.');
    return name;
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function validateScreens(screens) {
    if (!Array.isArray(screens) || screens.length === 0 || screens.length > 20) throw new McpDomainError('INVALID_INPUT', 'O protótipo exige entre 1 e 20 telas.');
    for (const screen of screens) {
        if (!screen.id || !screen.heading) throw new McpDomainError('INVALID_INPUT', 'Cada tela exige id e heading.');
    }
}

export async function generatePrototype({ title, screens, outputName = 'spider-prototype' }, rootOverride = workspaceRoot) {
    validateScreens(screens);
    const name = safeName(outputName);
    const root = resolve(rootOverride);
    const outputDirectory = resolve(root, 'designs', name);
    if (!outputDirectory.startsWith(`${root}/`)) throw new McpDomainError('PATH_OUTSIDE_WORKSPACE', 'Destino do protótipo fora do workspace.');
    await mkdir(outputDirectory, { recursive: true });

    const navigation = screens.map((screen, index) => `<button class="nav-item${index === 0 ? ' active' : ''}" data-screen="${escapeHtml(screen.id)}">${escapeHtml(screen.heading)}</button>`).join('');
    const screenMarkup = screens.map((screen, index) => `<section class="screen${index === 0 ? ' visible' : ''}" data-screen-panel="${escapeHtml(screen.id)}" aria-labelledby="title-${escapeHtml(screen.id)}"><p class="eyebrow">Tela ${index + 1}</p><h2 id="title-${escapeHtml(screen.id)}">${escapeHtml(screen.heading)}</h2><p>${escapeHtml(screen.body || '')}</p><div class="actions">${(screen.actions || []).map((action) => `<button class="action" data-action="${escapeHtml(action)}">${escapeHtml(action)}</button>`).join('')}</div></section>`).join('\n');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>:root{font-family:Georgia,serif;color:#17221d;background:#edf1e9}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(135deg,#edf1e9,#d9e4dc)}.shell{max-width:1100px;margin:auto;padding:32px}.brand{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #a9b8ad;padding-bottom:24px}.brand h1{font-size:clamp(2rem,5vw,4.8rem);line-height:.95;margin:0;max-width:700px}.eyebrow{font:700 .75rem monospace;text-transform:uppercase;letter-spacing:.12em;color:#c04c32}.layout{display:grid;grid-template-columns:220px 1fr;gap:24px;padding-top:30px}.nav{display:grid;align-content:start;gap:8px}.nav-item,.action{border:1px solid #9aab9d;background:#f7f8f3;color:#17221d;padding:12px 14px;text-align:left;cursor:pointer}.nav-item.active,.action:hover{background:#c04c32;color:#fff;border-color:#c04c32}.screen{display:none;min-height:430px;background:#fffaf0;border:1px solid #b9c7bb;padding:clamp(24px,5vw,64px);box-shadow:12px 12px 0 #b9c7bb}.screen.visible{display:block}.screen h2{font-size:clamp(2rem,5vw,4rem);margin:0 0 18px;max-width:620px}.screen p:not(.eyebrow){font:1.1rem/1.6 system-ui,sans-serif;max-width:620px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:36px}.action{text-align:center}@media(max-width:700px){.shell{padding:20px}.brand{display:block}.layout{grid-template-columns:1fr}.nav{display:flex;overflow:auto}.nav-item{white-space:nowrap}.screen{min-height:420px;box-shadow:7px 7px 0 #b9c7bb}}</style></head><body><main class="shell"><header class="brand"><div><p class="eyebrow">Spider-Team prototype</p><h1>${escapeHtml(title)}</h1></div><span aria-label="Protótipo criado por Pavitr">Pavitr</span></header><div class="layout"><nav class="nav" aria-label="Telas do protótipo">${navigation}</nav><div>${screenMarkup}</div></div></main><script>const items=[...document.querySelectorAll('.nav-item')];const panels=[...document.querySelectorAll('.screen')];items.forEach(item=>item.addEventListener('click',()=>{items.forEach(button=>button.classList.toggle('active',button===item));panels.forEach(panel=>panel.classList.toggle('visible',panel.dataset.screenPanel===item.dataset.screen))}));document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{button.textContent='Ação selecionada';}));</script></body></html>`;
    const outputPath = join(outputDirectory, 'index.html');
    await writeFile(outputPath, html, 'utf8');
    const content = await readFile(outputPath, 'utf8');
    if (!content.includes('<!doctype html>') || !content.includes('data-screen')) throw new McpDomainError('PROTOTYPE_INVALID', 'Protótipo gerado inválido.');
    return { path: relative(root, outputPath), absolutePath: outputPath, screens: screens.length, verified: true };
}

export async function exportDesignSpec({ title, screens, outputName = 'spider-prototype' }, rootOverride = workspaceRoot) {
    validateScreens(screens);
    const name = safeName(outputName);
    const root = resolve(rootOverride);
    const outputDirectory = resolve(root, 'designs', name);
    await mkdir(outputDirectory, { recursive: true });
    const outputPath = join(outputDirectory, 'design-spec.json');
    const specification = { format: 'spider-team-design-spec-v1', title, designer: 'pavitr', screens: screens.map(({ id, heading, body = '', actions = [] }) => ({ id, heading, body, actions })) };
    await writeFile(outputPath, `${JSON.stringify(specification, null, 2)}\n`, 'utf8');
    return { path: relative(root, outputPath), screens: screens.length, verified: true };
}
