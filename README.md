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
│   ├── utils/
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