---
name: "Finalizar MCP Server do Spider-Team"
description: "Inspeciona e conclui o MCP Server do Spider-Team com ContextLoader, AgentRegistry, orquestração PeterPark-Miguel-especialistas, permissões, filesystem seguro, validação, Git governado, auditoria, providers, resources, prompts e testes"
argument-hint: "Descreva a demanda ou feature que PeterPark deve organizar"
agent: "Spidermania MCP Architect"
tools: [read, search, edit, execute, todo]
---

# Tarefa

Conclua a configuração do MCP Server do Spider-Team no repositório atual. Não recomece o projeto, não substitua a stack e preserve alterações existentes. Ao terminar, entregue o resultado para revisão de Miguel O'Hara.

## Inspeção obrigatória antes de editar

Leia, nesta ordem:

1. README e documentação relevante.
2. Manifesto e lockfile.
3. Linguagem, versão do runtime, SDK MCP e transporte atual.
4. Entrypoint do servidor e runtime do WhatsApp.
5. Pasta de contextos e todos os contextos existentes.
6. Configuração, ferramentas, providers, persistência e testes.
7. `git status --short` e diffs dos arquivos que serão modificados.

Antes do plano, separe claramente: observado, inferido, proposto e não verificado. Apresente um plano curto e só então edite. Não crie commits, branches, push, merge, rebase, PR ou qualquer ação remota.

## Arquitetura obrigatória

Implemente ou complete, adaptando aos nomes existentes:

- `ContextLoader`: carrega apenas contextos autorizados, UTF-8, extensões permitidas, limite de tamanho, arquivo vazio/inexistente, path traversal e symlink externo bloqueados, erros estruturados e recarregamento controlado.
- `AgentRegistry`: registra `id`, nome, função, contexto, hierarquia, ferramentas/capacidades, status, provider, contato com usuário, delegação, commit e Git remoto.
- `FeatureStore`, `TaskStore` e `AuditStore`: persistência atômica e sobrevivente a reinicializações, usando a abstração de armazenamento já existente.
- Orquestração: PeterPark recebe a demanda e delega somente a Miguel; Miguel coordena especialistas; especialistas reportam a Miguel; Miguel revisa/integra; Ben documenta; Miguel valida; Peter apresenta a Davi.
- Workspace/Code Search: raiz explícita, canonicalização, allowlist de caminhos, respeito ao `.gitignore`, limites de arquivo/resultado e bloqueio de symlink escape.
- Validation: somente comandos cadastrados, sem shell arbitrário, com timeout, cancelamento, limite de saída e código de saída real.
- Git Governance: `status`, `diff` e `log` somente leitura; `git.prepareCommit` exclusivo de Miguel, por caminhos exatos, sem `git add .`; remote actions bloqueadas por padrão.
- Audit: ator, tarefa, horário, argumentos sanitizados, resultado, duração, erro e mudanças de estado; nunca secrets, API keys, prompts completos ou mensagens privadas.
- Provider: perfis `primary` e `worker`, sem expor API keys e sem fallback silencioso.
- Documentation: Ben recebe apenas fatos confirmados e features obrigatórias não podem concluir sem documentação.

## Registro e permissões

Registre estes agentes e faça a política rejeitar agente desconhecido, ferramenta proibida, delegação fora da hierarquia, comunicação direta proibida e commit de especialista:

- PeterPark: Product Manager, fala com Davi, delega somente a Miguel, não edita, não commita, não usa Git remoto.
- Miguel O'Hara: Tech Lead, reporta a Peter, delega especialistas, revisa código, pode preparar commit local, não executa remoto sem autorização.
- Otto: Backend Engineer.
- Miles: Frontend Engineer.
- Pavitr: UI/UX Designer.
- Peni: DevOps Engineer.
- Spider-Byte: Cybersecurity Engineer, somente testes defensivos autorizados.
- Gwen: Quality Engineer.
- Spider-Man Noir: QA Test Engineer.
- Ben Reilly: Technical Writer.

Todos os especialistas reportam a Miguel, não falam com Davi e não criam commits. Use menor privilégio nas ferramentas e caminhos.

## Modelos e estados

Valide schemas de toda entrada externa. Crie estruturas para Feature, AgentTask e AgentResult com IDs, requisitos, critérios de aceite, dependências, escopo, caminhos, comandos, risco, status, evidências, bloqueios, resultados e timestamps.

Use máquina de estados explícita. Feature: `received`, `analyzing`, `waiting_for_product_decision`, `approved`, `technical_planning`, `delegated`, `in_progress`, `blocked`, `under_review`, `quality_validation`, `security_validation`, `documentation`, `ready_for_product_acceptance`, `completed`, `rejected`, `cancelled`. Task: `pending`, `assigned`, `in_progress`, `blocked`, `delivered_for_review`, `changes_requested`, `validated`, `completed`, `cancelled`.

Rejeite transições inválidas, conclusão por especialista, conclusão antes da revisão de Miguel, documentação obrigatória ausente e validação/testes de risco pendentes. Audite estado anterior, novo estado, agente, data, motivo e evidência.

## Tools MCP mínimas

Registre tools tipadas e de responsabilidade única:

`project.inspect`, `context.list`, `context.read`, `feature.create`, `feature.update`, `feature.get`, `task.delegate`, `task.report`, `code.search`, `file.read`, `file.patch`, `validation.run`, `git.status`, `git.diff`, `git.log`, `git.prepareCommit`, `git.remoteAction` bloqueada, `audit.get`, `documentation.request` e `documentation.report`.

Não permita shell genérico, `eval`, acesso fora da raiz, `.env`, auth do WhatsApp, escrita sem tarefa ativa, `git reset --hard`, `git clean -fd`, force push ou exclusão remota.

## Resources e prompts

Exponha, apenas com dados seguros e preferencialmente read-only:

- `spiderteam://agents`
- `spiderteam://agents/{agentId}`
- `spiderteam://contexts/{agentId}`
- `spiderteam://features`
- `spiderteam://features/{featureId}`
- `spiderteam://tasks/{taskId}`
- `spiderteam://project/summary`
- `spiderteam://audit/recent`

Registre prompts para `analyze_project`, `plan_feature`, delegação de backend/front-end/UI/UX/DevOps/segurança/qualidade/QA/documentação, `review_delivery` e `prepare_product_report`. Injete somente o contexto necessário: contrato global, agente, tarefa e resumo seguro do projeto.

## Providers

Prepare configuração e schema para:

```env
PRIMARY_LLM_API_KEY=
WORKER_LLM_API_KEY=
```

Peter usa `primary`; Miguel e especialistas usam `worker`. Não solicite, invente, copie, registre ou teste a worker key. O servidor deve iniciar sem ela para inspeção estrutural. Se um worker for realmente chamado sem configuração, retorne erro estruturado `WORKER_PROVIDER_NOT_CONFIGURED` sem revelar configuração sensível.

## Segurança e testes

Implemente erros estruturados como `AGENT_NOT_FOUND`, `TOOL_NOT_ALLOWED`, `INVALID_DELEGATION`, `INVALID_STATE_TRANSITION`, `CONTEXT_NOT_FOUND`, `PATH_OUTSIDE_WORKSPACE`, `PATH_NOT_ALLOWED`, `COMMAND_NOT_ALLOWED`, `VALIDATION_FAILED`, `TASK_BLOCKED`, `GIT_ACTION_NOT_ALLOWED`, `REMOTE_AUTHORIZATION_REQUIRED` e `CONCURRENT_FILE_EDIT`.

Crie/atualize testes para contextos, composição, traversal, symlink, permissões, hierarquia, comunicação, commits, Git remoto, estados, documentação, provider ausente, secrets, timeout, concorrência e código de saída real. Execute os testes; nunca declare sucesso sem evidência.

## Documentação e entrega

Atualize README e `.github/copilot-instructions.md` com arquitetura, hierarquia, fluxo, contexts, tools, resources, prompts, transporte, ambiente, testes, limitações, worker key, política Git e segurança. Não replique prompts privados integralmente.

Ao finalizar, entregue em formato conciso:

1. diagnóstico observado;
2. arquitetura encontrada;
3. arquivos criados e modificados;
4. dependências e motivo;
5. tools, resources e prompts;
6. fluxo e permissões;
7. providers primary/worker;
8. testes executados e resultados reais;
9. testes não executados e motivo;
10. riscos e limitações;
11. próximos passos;
12. sugestão de commits atômicos para Miguel.

Não crie commit nem altere histórico Git. Preserve alterações do usuário e informe qualquer bloqueio.
