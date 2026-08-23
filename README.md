# 🕷️ PeterPark

Assistente pessoal de IA integrado ao WhatsApp, inspirado na personalidade do **Peter Parker / Homem-Aranha**.

O PeterPark foi desenvolvido em **Node.js** e utiliza **Baileys** para comunicação com o WhatsApp, **Google Gemini** para inteligência artificial, interpretação e geração de áudio, além de **PostgreSQL + pgvector** para memória de longo prazo.

O objetivo do projeto é criar um assistente que não apenas responda perguntas, mas também mantenha contexto, aprenda informações relevantes sobre o usuário e converse de uma forma mais natural.

---

## ✨ Funcionalidades

- 💬 Conversa com IA diretamente pelo WhatsApp
- 🎤 Recebe e entende mensagens de áudio
- 🔊 Responde utilizando voz gerada por IA
- 🧠 Memória persistente de longo prazo
- 🔎 Busca semântica de memórias utilizando embeddings
- 🗑️ Possibilidade de esquecer informações
- 📝 Comando `/lembrar` para salvar informações manualmente
- 🤖 Aprendizado automático de informações relevantes
- 🕷️ Personalidade inspirada no Peter Parker
- 🎬 Envio aleatório de GIFs/clipes após respostas
- 🔐 Variáveis sensíveis protegidas através de `.env`
- 📱 Comunicação com WhatsApp através do Baileys

---

# 🧠 Como funciona

O funcionamento geral do PeterPark pode ser resumido assim:

```text
Usuário
   ↓
WhatsApp
   ↓
Baileys
   ↓
PeterPark
   ├── Gemini
   │      ├── geração de respostas
   │      ├── interpretação de áudio
   │      ├── embeddings
   │      └── geração de voz
   │
   ├── PostgreSQL + pgvector
   │      └── memória de longo prazo
   │
   └── WhatsApp
          ├── texto
          ├── áudio
          └── GIF
```

Quando uma mensagem é recebida, o sistema busca memórias relacionadas à conversa e adiciona essas informações ao contexto enviado para a IA.

Dessa forma, o PeterPark consegue utilizar informações aprendidas anteriormente sem precisar colocar todos os dados do usuário permanentemente dentro do arquivo de personalidade.

---

# 🧠 Sistema de memória

O PeterPark possui memória persistente utilizando **PostgreSQL** e **pgvector**.

As mensagens importantes podem ser transformadas em embeddings e armazenadas no banco de dados.

Quando uma nova mensagem chega:

```text
Mensagem
   ↓
Embedding
   ↓
Busca vetorial
   ↓
Memórias relacionadas
   ↓
Contexto da IA
   ↓
Resposta
```

Isso permite que informações relevantes sejam recuperadas mesmo que tenham sido registradas há bastante tempo.

---

## `/lembrar`

O comando:

```text
/lembrar informação
```

força o PeterPark a armazenar uma informação.

Exemplo:

```text
/lembrar meu projeto atual usa React e Spring Boot
```

---

## `/esquecer`

O sistema também possui suporte para remover memórias anteriormente registradas.

Exemplo:

```text
/esquecer meu projeto atual usa React
```

O PeterPark procura a memória semanticamente mais próxima e a desativa.

---

# 🎤 Sistema de áudio

O PeterPark consegue receber mensagens de voz pelo WhatsApp.

O fluxo é:

```text
Áudio do WhatsApp
      ↓
Baileys
      ↓
Buffer de áudio
      ↓
Gemini
      ↓
Interpretação
      ↓
Resposta da IA
```

Além disso, a própria resposta pode ser transformada em áudio:

```text
Resposta em texto
      ↓
Gemini TTS
      ↓
PCM
      ↓
WAV
      ↓
OGG / Opus
      ↓
WhatsApp
```

A conversão para **OGG/Opus** permite que o áudio seja enviado como uma mensagem de voz compatível com o WhatsApp.

---

# 🕷️ Personalidade

A personalidade do assistente fica definida no arquivo:

```text
context.md
```

O contexto padrão do projeto é inspirado no **Peter Parker**, com características como:

- inteligência;
- curiosidade;
- sarcasmo;
- humor;
- espontaneidade;
- informalidade;
- preocupação genuína em assuntos sérios;
- personalidade própria;
- comunicação parecida com uma conversa entre amigos.

A ideia não é simplesmente colocar bordões do Homem-Aranha, mas criar um comportamento inspirado na personalidade do personagem.

---

# ⚠️ IMPORTANTE — `context_public.md`

Por questões de privacidade, o repositório utiliza:

```text
context_public.md
```

em vez do `context.md` utilizado localmente pela aplicação.

Depois de clonar o projeto, **renomeie**:

```text
context_public.md
```

para:

```text
context.md
```

### Windows

```bash
ren context_public.md context.md
```

### Linux / macOS

```bash
mv context_public.md context.md
```

A estrutura deve ficar:

```text
SpiderManIA/
├── context.md
├── package.json
├── src/
└── ...
```

> O arquivo `context.md` está no `.gitignore`, permitindo que você personalize a personalidade e informações locais sem enviar essas alterações para o GitHub.

O arquivo `context_public.md` contém apenas a personalidade padrão e utiliza **Usuário** no lugar de informações pessoais.

---

# 📁 Estrutura do projeto

A estrutura principal é semelhante a:

```text
SpiderManIA/
│
├── public/
│   └── mídias utilizadas pelo bot
│
├── src/
│   │
│   ├── config/
│   │   └── env.config
│   │
│   ├── database/
│   │
│   ├── integrations/
│   │
│   ├── mcp/
│   │
│   ├── service/
│   │   ├── ia.service.js
│   │   ├── memory.service.js
│   │   └── tts.service.js
│   │
dele uma entrada para o servidor MCP com o caminho do `server.js` do Spidermania:
│   │   ├── audio.utils.js
│   │   └── randomizer.js
│   │
│   └── index.js
│
├── context_public.md
├── package.json
├── package-lock.json
└── README.md
```

Algumas pastas podem variar conforme a versão atual do projeto.

---

# ⚙️ Instalação

## 1. Clone o repositório

```bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta:

```bash
cd SpiderManIA
```

---

## 2. Instale as dependências

```bash
npm install
```

---

# 🔐 Variáveis de ambiente

O projeto utiliza variáveis de ambiente para impedir que chaves e credenciais sejam enviadas ao GitHub.

Existe um arquivo de exemplo em:

```text
src/config/env.config
```

Crie um arquivo:

```text
.env
```

na **raiz do projeto**.

Exemplo:

```text
SpiderManIA/
├── .env
├── context.md
├── package.json
└── src/
```

Configure:

```env
IA_APIKEY=sua_chave_gemini

DATABASE_URL=postgresql://usuario:senha@host:5432/banco
```

### `IA_APIKEY`

Chave utilizada para acessar a API do Google Gemini.

Ela é usada para:

- respostas da IA;
- interpretação de áudio;
- geração de embeddings;
- geração de voz.

### `DATABASE_URL`

String de conexão com o PostgreSQL utilizada pelo sistema de memória.

---

# 🗄️ Banco de dados

O sistema de memória utiliza:

```text
PostgreSQL
+
pgvector
```

O `pgvector` permite armazenar embeddings e realizar buscas por similaridade vetorial.

Configure um banco PostgreSQL compatível e coloque sua URL no `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
```

O código responsável pela memória está principalmente em:

```text
src/service/memory.service.js
```

e nos arquivos relacionados ao banco em:

```text
src/database/
```

---

# ▶️ Executando

Depois de:

- instalar as dependências;
- configurar `.env`;
- configurar o PostgreSQL;
- renomear `context_public.md` para `context.md`;

execute:

```bash
node src/index.js
```

---

# 📱 Conectando ao WhatsApp

Na primeira execução, o Baileys poderá solicitar a autenticação da conta do WhatsApp.

Após a autenticação, os dados da sessão serão armazenados localmente em:

```text
auth_info_baileys/
```

Essa pasta **não deve ser enviada ao GitHub**.

Ela contém informações relacionadas à sessão autenticada do WhatsApp.

---

# 🔒 Arquivos que não devem ser enviados

O `.gitignore` deve incluir pelo menos:

```gitignore
node_modules/

.env
.env.*

auth_info_baileys/
auth_info_baileys_backup/

context.md

*.wav
*.ogg
```

Nunca envie:

```text
.env
auth_info_baileys/
```

para um repositório público.

---

# 🎬 Mídias

O diretório:

```text
public/
```

contém mídias utilizadas pelo PeterPark.

O bot pode selecionar aleatoriamente um dos arquivos disponíveis e enviá-lo após determinadas respostas.

Isso ajuda a deixar as interações mais naturais e imprevisíveis.

---

# 🧩 Principais tecnologias

### Runtime

- Node.js
- JavaScript ES Modules

### Inteligência Artificial

- Google Gemini
- Gemini Embeddings
- Gemini TTS

### WhatsApp

- Baileys

### Banco de dados

- PostgreSQL
- pgvector

### Áudio

- FFmpeg
- OGG
- Opus
- PCM
- WAV

---

# 🛡️ Segurança

Algumas recomendações importantes:

### Nunca versione seu `.env`

Ele pode conter:

- API Keys;
- URLs privadas;
- usuários;
- senhas.

### Nunca versione sua sessão do WhatsApp

```text
auth_info_baileys/
```

deve permanecer apenas na máquina onde o bot está executando.

### Não coloque informações pessoais no contexto público

Utilize:

```text
context_public.md
```

como template público.

Informações pessoais podem ser armazenadas localmente pelo sistema de memória.

---

# 🚧 Estado do projeto

O PeterPark é um projeto em desenvolvimento.

Algumas áreas podem continuar sendo modificadas, incluindo:

- memória;
- gerenciamento de contexto;
- integração com ferramentas;
- sistema de voz;
- integrações externas;
- automações;
- personalidade;
- suporte a novas funcionalidades.

---

# 💡 Ideia do projeto

A ideia do PeterPark é experimentar uma arquitetura de assistente pessoal que combine:

```text
LLM
+
Memória
+
WhatsApp
+
Voz
+
Personalidade
+
Integrações
```

em vez de funcionar apenas como um chatbot tradicional.

O objetivo é criar um assistente capaz de manter continuidade entre conversas e utilizar informações aprendidas anteriormente de maneira contextual.

---

# 📄 Licença

Defina a licença do projeto de acordo com a forma como deseja permitir seu uso, modificação e distribuição.

Para projetos open source, uma opção comum é adicionar um arquivo:

```text
LICENSE
```

na raiz do repositório.

---

# 🕷️ PeterPark

> Inteligente quando precisa.  
> Idiota quando pode.  
> Sarcástico quando combina.  
> Sério quando importa.  
> Curioso quando algo é interessante.

**Your friendly neighborhood AI assistant. 🕷️**

---

# Spider-Team MCP

O servidor MCP em `src/mcp/server.js` coordena o time local do Spider-Team por
stdio. A hierarquia é `Davi -> PeterPark -> Miguel O'Hara -> especialistas`.
Peter organiza demandas de produto, Miguel planeja e revisa, especialistas
entregam resultados a Miguel e Ben documenta somente o que foi confirmado.

## Contextos e agentes

Os contextos canônicos ficam em `contexts/`. O `ContextLoader` associa cada
arquivo ao agente correto, limita extensão e tamanho, bloqueia traversal e
symlink externo e não registra o conteúdo completo em logs.

O registro e as permissões ficam em `src/mcp/team.config.js`. Os agentes têm
tools, capacidades, hierarquia e provider próprios. Especialistas não falam
diretamente com Davi e não podem criar commits.

## Tools, resources e prompts

O MCP expõe inspeção de projeto, contextos, features, tarefas, busca, leitura e
patch autorizado, validação allowlisted, Git read-only, governança de commit,
auditoria e documentação. Também mantém aliases de status/relatório legados.

Resources read-only incluem `spiderteam://agents`,
`spiderteam://agents/{agentId}`, `spiderteam://contexts/{agentId}`,
`spiderteam://features`, `spiderteam://tasks` e
`spiderteam://project/summary`. Prompts reutilizáveis cobrem análise,
planejamento, delegação, revisão e relatório de produto.

## Execução

```bash
npm run mcp
npm test
npm start
```

O arquivo `.vscode/mcp.json` configura o servidor stdio para o VS Code. O
estado persistente do orquestrador fica em `mcp-data/`, ignorado pelo Git.

## Usar o time em outro projeto

O servidor MCP pode continuar instalado no Spidermania enquanto trabalha em
outro repositório. Abra o projeto-alvo no VS Code e adicione ao `.vscode/mcp.json`
dele o servidor MCP com o caminho do `server.js` do Spidermania:

```json
{
      "servers": {
            "spider-team": {
                  "type": "stdio",
                  "command": "node",
                  "args": ["/caminho/absoluto/Spidermania/src/mcp/server.js"],
                  "env": {
                        "SPIDERTEAM_WORKSPACE_ROOT": "${workspaceFolder}",
                        "SPIDERTEAM_CONTEXT_ROOT": "/caminho/absoluto/Spidermania/contexts"
                  }
            }
      }
}
```

Assim, o código lido e alterado é o projeto aberto, mas os papéis e contextos
do Spider-Team continuam vindo do Spidermania. Para o time programar, Miguel
primeiro cria e delega a task; o especialista usa `task.start`,
`worker.plan_task`, `code.search`, `file.read`, `file.patch`,
`validation.run` e `task.report`. O projeto-alvo precisa ter sua própria
configuração de testes e seus contextos devem ser adicionados ao diretório
informado em `SPIDERTEAM_CONTEXT_ROOT` se forem diferentes dos atuais.

Pavitr possui as tools `design.generate_prototype` e `design.export_spec`.
Elas criam telas navegáveis HTML/CSS/JS e uma especificação JSON em `designs/`,
sem permitir edição do código de produção. O arquivo pode ser revisado por
Miguel e enviado pelo Baileys como documento quando a integração de entrega
for acionada.

Depois da revisão, o proprietário pode receber um artefato pelo contato
Baileys usando:

```text
/enviar-arquivo reports/feature-123.pdf | Relatório da feature
/enviar-arquivo .spiderteam/worktrees/miles-ab12/designs/dashboard/index.html | Protótipo
```

O runtime valida diretório, extensão, symlink e tamanho antes de enviar. O
Pavitr não envia diretamente nem acessa o socket do WhatsApp.

Para permitir trabalho simultâneo, Miguel deve chamar
`task.provision_workspace` para cada task. O MCP cria uma branch local e um
worktree em `.spiderteam/worktrees/`. Nunca use o mesmo diretório para duas
tasks. Ao revisar, Miguel compara cada branch, integra somente as alterações
aprovadas e remove o worktree encerrado com a operação Git correspondente.

## Memória adaptativa de engenharia

Peter pode receber uma orientação explícita pelo comando:

```text
/feedback Não usar lógica de negócio dentro dos handlers do WhatsApp
```

Esse feedback é salvo no PostgreSQL em `context_memory` com escopo `team`,
origem `davi`, categoria `engineering_feedback` e visibilidade para Peter e
Miguel. Ele não é misturado às memórias pessoais do usuário. Antes de delegar,
Miguel consulta `get_engineering_guidance`; as orientações relevantes são
anexadas ao campo de saída da tarefa para que o especialista saiba as
preferências do proprietário.

A migração está em `src/database/002_adaptive_team_memory.sql`. Execute-a no
banco existente antes de usar `/feedback`.

## Providers

Use `.env.example` como referência. Peter usa `PRIMARY_LLM_API_KEY`; Miguel e
especialistas usarão `WORKER_LLM_API_KEY` quando o provider worker for ativado.
A worker key não é exigida para inspeção ou startup estrutural e não existe
fallback para a chave principal. Nenhuma chave deve ser versionada.

## Execução real de uma tarefa

Depois de Miguel delegar uma tarefa, o especialista segue este ciclo:

```text
task.start
      -> worker.plan_task
      -> code.search / file.read
      -> file.patch com caminho autorizado
      -> validation.run
      -> task.report para Miguel
```

O provider worker usa `WORKER_LLM_API_KEY`. Sem essa variável, o planejamento
retorna `WORKER_PROVIDER_NOT_CONFIGURED`; isso não impede o servidor de iniciar
para inspeção, nem faz fallback para `IA_APIKEY` ou para o provider principal.

## Segurança e Git

O workspace tem raiz explícita, caminhos protegidos, limites de arquivo e
saída, comandos de validação cadastrados, auditoria sanitizada e erros
estruturados. `git.remoteAction` é bloqueada. Somente Miguel pode preparar um
commit local após revisão; push, merge, rebase, PR e outras ações remotas
exigem autorização explícita de Davi transmitida por Peter.

## Limitações atuais

O servidor ainda não executa os agentes LLM como subprocessos e não mantém uma
fila distribuída. O relatório atual é Markdown baseado no estado do
orquestrador. O Ben já possui geração local de PDF por
`documentation.generate_pdf`, mas a publicação e o envio do arquivo ainda
dependem do canal de integração escolhido.

## Fila, execução e integração de tasks

Miguel pode colocar uma task na fila com `task.enqueue`. O executor automático
provisiona o worktree, inicia a task, gera o plano, solicita uma implementação
estruturada ao worker, aplica somente patches nos caminhos autorizados, roda as
validações cadastradas e entrega o resultado para revisão. O andamento fica
registrado na task em `progress`, `plan`, `filesChanged`, `validationResults`,
`blockers` e `events`; `task.queue_status` mostra workers ativos e pendentes.

Após revisar com `task.review`, Miguel usa `git.commit_task` para criar commit
somente na branch da task. Depois, `git.integrate_task` faz merge local da
branch no workspace principal, desde que a task esteja validada, tenha commit e
o workspace principal esteja limpo. Nenhuma dessas operações faz push ou usa
Git remoto.

## PDFs do Ben

Ben pode gerar um documento confirmado usando a tool
`documentation.generate_pdf`. Ela recebe título e seções, salva somente em
`reports/*.pdf`, valida o arquivo gerado e retorna o caminho e o tamanho real.
Conteúdo com aparência de credencial é recusado e PDFs são ignorados pelo Git.