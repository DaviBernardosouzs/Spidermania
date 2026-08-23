# Spidermania MCP

Este projeto possui um servidor MCP Node em `src/mcp/server.js`, usando o SDK oficial `@modelcontextprotocol/sdk` e transporte stdio.

## Arquitetura

- `src/mcp/team.config.js`: especialistas e domínios de atuação.
- `src/mcp/task.store.js`: ledger persistente local de tarefas em `mcp-data/tasks.json`.
- `src/mcp/orchestrator.service.js`: regras de atribuição, status e relatórios.
- `src/mcp/server.js`: ferramentas MCP expostas ao cliente.
- `src/index.js`: contato Baileys e comandos de gestão do PeterPark.
- `src/mcp/context.loader.js`: carregamento seguro dos arquivos em `contexts/`.
- `src/mcp/policy.service.js`: hierarquia, permissões e máquina de estados.
- `src/mcp/workspace.service.js`: filesystem e busca limitados ao workspace.
- `src/mcp/validation.service.js`: allowlist de comandos de validação.
- `src/mcp/provider.service.js`: perfis primary/worker sem fallback.
- `src/mcp/audit.service.js`: auditoria sanitizada.
- `src/mcp/git.service.js`: status, diff e log read-only.
- `src/mcp/domain.store.js`: stores atômicos de features e tarefas.
- `src/database/002_adaptive_team_memory.sql`: escopo compartilhado de feedback de engenharia para Peter e Miguel.

## Contrato de trabalho

Leia `contexts/00_CONTRATO_GLOBAL.md` antes de editar. Não invente arquivos,
comandos ou resultados; inspecione o repositório e as alterações existentes.
Preserve alterações do usuário, use menor privilégio, execute validações reais e
relate o que não foi executado. Especialistas não criam commits. Não use ações
Git remotas, shell arbitrário, `eval`, `git reset --hard`, `git clean -fd` ou
acesse `.env`, `auth_info_baileys` e dados privados.

## Ferramentas MCP

- `project.inspect`, `context.list`, `context.read`
- `feature.create`, `feature.update`, `feature.get`
- `task.delegate`, `task.report`
- `task.start`, `worker.plan_task`, `get_engineering_guidance`
- `task.review`, `task.enqueue`, `task.queue_status`
- `code.search`, `file.read`, `file.patch`, `validation.run`
- `git.status`, `git.diff`, `git.log`, `git.prepareCommit`, `git.remoteAction`
- `git.commit_task`, `git.integrate_task` (exclusivas de Miguel; somente local)
- `audit.get`, `documentation.request`, `documentation.report`
- `documentation.generate_pdf` (exclusiva de Ben; saída em `reports/*.pdf`)
- `design.generate_prototype`, `design.export_spec` (exclusivas de Pavitr; saída em `designs/`)
- `get_project_status`, `generate_code_health_report`, `format_progress_update`

## Comandos WhatsApp

- `/equipe`
- `/status`
- `/relatorio`
- `/tarefa responsável | título | descrição opcional`
- `/atualizar ID | status | nota opcional`
- `/feedback preferência ou regra de engenharia`
- `/enviar-arquivo caminho do artefato | legenda opcional`

Status válidos: `queued`, `in_progress`, `blocked`, `completed`.

## Execução

- `npm start`: inicia o contato Baileys.
- `npm run mcp`: inicia o servidor MCP stdio.

Consulte a especificação e o SDK em https://modelcontextprotocol.io/ e https://github.com/modelcontextprotocol.
Nunca exponha `.env`, `auth_info_baileys`, tokens, memórias privadas ou conteúdo integral de mensagens em ferramentas, logs ou relatórios.
