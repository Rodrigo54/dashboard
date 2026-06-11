# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com
o código deste repositório.

## Visão Geral

O Dashboard é um aplicativo desktop em Electron com um renderer em Angular 22
(zoneless) e uma camada de dados SQLite via Drizzle ORM. O build dos três
processos (main/preload/renderer) é unificado pelo **electron-vite**, com o
Angular compilado pelo `@analogjs/vite-plugin-angular`. A UI usa **Tailwind CSS
4** + o design system **zard** (componentes portados, vendorizados em
`src/renderer/app/shared/ui/zard`). O gerenciador de pacotes é o **bun**
(`bun@1.3.11`); `ng` e `drizzle-kit` estão configurados para usá-lo.

## Comandos

```bash
bun run dev              # electron-vite dev: main + preload + renderer + Electron (HMR)
bun run build            # electron-vite build -> out/{main,preload,renderer}
bun run preview          # roda o app a partir do build de produção
bun run dist             # electron-vite build + electron-builder -> release/
bun run typecheck        # type-check do main e do renderer (tsc --noEmit)
bun run lint             # eslint .
bun run lint:fix         # eslint . --fix
bun run format           # prettier --write "src/**/*.{ts,html,css,json}"
bun test                 # testes unitários (Vitest via @angular/build:unit-test)
```

`bun run dev` é o ponto de entrada normal: o electron-vite serve o renderer (Vite
dev server), builda main/preload e sobe o Electron, que carrega o renderer via
`process.env.ELECTRON_RENDERER_URL`. Os scripts `dev`/`preview` passam pelo
wrapper `scripts/electron-vite.mjs` (veja "Pegadinhas").

### Banco de Dados (Drizzle + node:sqlite)

```bash
bun run db:generate      # gera uma migração a partir de mudanças no schema -> ./drizzle
bun run db:migrate       # aplica as migrações de ./drizzle ao banco (mesmo arquivo do runtime)
bun run db:push          # empurra o schema direto ao banco, sem gerar migração (apenas dev)
bun run db:studio        # abre o Drizzle Studio sobre o mesmo banco
```

O `drizzle.config.ts` resolve **o mesmo** arquivo que o runtime
(`<userData>/dashboard.db`), recalculando o diretório de userData por plataforma
sem importar o electron (o CLI roda em Node puro) — então `migrate`/`push`/`studio`
refletem os dados reais do app. Sobrescreva com a env `DASHBOARD_DB` para apontar
para outro arquivo (ex.: um banco de teste). As migrações também são aplicadas
automaticamente em tempo de execução quando o app fica pronto (veja `initDb`),
lendo da pasta `./drizzle` empacotada.

## Arquitetura

O código é dividido por processo do Electron. O build de todos é orquestrado por
uma config única, `electron.vite.config.ts` (seções `main`/`preload`/`renderer`),
mas cada processo continua sendo um runtime isolado — main e renderer nunca
compartilham runtime; só atravessam a fronteira tipos e a ponte de IPC.

- **`src/main/`** — processo main + preload do Electron. Buildados pelo
  electron-vite (Rollup) para `out/main/` e `out/preload/`; deps de runtime
  (`electron`, `node:sqlite`, `drizzle-orm`) ficam externalizadas via
  `externalizeDepsPlugin`. O `src/main/tsconfig.json` usa `moduleResolution:
Bundler` + `noEmit` (só type-check; o Vite emite). **Imports relativos não
  precisam de extensão `.js`** — o bundler resolve os `.ts`. (Há `.js` legados
  que ainda funcionam; remoção em massa é um follow-up opcional.)
- **`src/renderer/`** — app Angular 22 zoneless (componentes standalone),
  compilado pelo `@analogjs/vite-plugin-angular` sob o Vite, saída em
  `out/renderer/`. O entry é o `src/renderer/index.html` (com
  `<script type="module" src="/main.ts">`); a detecção de mudança usa
  `provideZonelessChangeDetection()` (**sem zone.js**). Organizado por feature em
  `app/features/*` (`auth`, `home`, `accounts`), com o design system **zard** e a
  ponte de IPC isolados em `app/shared/*`. As rotas raiz ficam em
  `app/app.routes.ts` (lazy `loadChildren` por feature, `authGuard`, hash
  routing); a configuração em `app/app.config.ts`. O `angular.json` é mantido
  **apenas** para `ng test`/schematics. Veja "Renderer" abaixo.
- **`src/shared/`** — contrato compartilhado entre os processos, importável dos
  dois lados sem acoplar runtimes. Centraliza: `ipc-channels.d.ts` (canais de IPC
  tipados, fonte única de verdade), `enums/` (constantes `{ value: label }` +
  helpers `enumValues`/`enumOptions`), `schemas/` (schemas **Zod** de validação) e
  `types/` (tipos inferidos dos schemas via `z.infer`). Reexportado por
  `shared/index.ts`.

Esses dois processos se comunicam por uma única ponte de IPC deliberadamente
estreita:

- `src/main/preload.ts` expõe via `contextBridge` (sandboxed,
  `contextIsolation: true`, `nodeIntegration: false`) duas superfícies:
  `window.electron.invoke(channel, payload)` para os controllers e
  `window.electron.window.*` para os controles da janela frameless
  (minimizar/maximizar/fechar).
- `src/renderer/electron.d.ts` tipa a superfície de `window.electron`.

### IPC via controllers (decorators)

Os handlers de IPC do main são organizados como **controllers** decorados, não
como `ipcMain.handle` avulsos (`src/main/controllers/`):

- `@Controller('<nome>')` registra o prefixo de IPC da classe; os métodos são
  decorados com `@action('<ação>')` ou com os atalhos CRUD prontos
  (`@create`/`@save`/`@read`/`@update`/`@remove`/`@list`). O nome do método pode
  diferir da ação (ex.: `findOne` → `read`). Usa decorators **padrão do ECMAScript**
  (stage 3, via `Symbol.metadata`) — **não** `experimentalDecorators`.
- `controllers.providers.ts` (`initControllers()`, chamado em `app.whenReady`)
  instancia cada controller e registra um `ipcMain.handle('<nome>:<ação>')` por
  método, envolvendo o retorno no envelope `{ success, result } | { success, error }`.
- A sessão do usuário autenticado vive em `controllers/session.ts` (estado único
  do processo main): `auth` grava com `setCurrentUser`, os demais leem com
  `requireCurrentUser()` para resolver o `userId`.
- No renderer, use o helper `invoke<T>(channel, payload)` de
  `app/shared/ipc/invoke.ts`, que já desempacota o envelope (lança em
  `success: false`). Não chame `window.electron.invoke` direto fora desse helper.
- Os canais válidos são tipados em `shared/ipc-channels.d.ts` via o mapa
  `ControllerChannelMap` (`<controller>: <ações>`). Como os literais dos decorators
  somem em runtime, esse mapa é **mantido à mão** — uma linha por controller.

Para adicionar um recurso de IPC: crie/edite um controller com `@Controller` +
ações, registre a classe no array de `controllers.providers.ts`, declare o canal
em `ControllerChannelMap` e consuma no renderer via `invoke<T>(...)`. Valide todo
payload de entrada com um schema Zod de `@shared/schemas`.

### Camada de Dados

- `src/main/database/schema/` define todas as tabelas, enums, o objeto
  `relations` da Relational Queries v2 e os tipos de linha inferidos
  (`User`/`NewUser`, etc.) — um arquivo por entidade, construtores de coluna
  compartilhados em `columns.ts`, as `relations` entre tabelas em `relations.ts`,
  tudo reexportado por `schema/index.ts`. **Esta árvore deve permanecer livre de
  imports de runtime Electron/Node** — o `drizzle-kit` a importa diretamente para
  gerar migrações.
- `src/main/database/database.providers.ts` é dono da conexão de runtime.
  `initDb()` (chamado uma vez quando o app fica pronto) abre o `DatabaseSync` do
  `node:sqlite` em `app.getPath('userData')/dashboard.db`, ativa `PRAGMA
journal_mode = WAL` + `PRAGMA foreign_keys = ON`, aplica as migrações pendentes
  de `<appPath>/drizzle` (a pasta `./drizzle` empacotada) e memoiza a instância
  no módulo. `getDb()` a retorna depois (lança se `initDb()` ainda não rodou). Os
  nomes de arquivo/pasta ficam em `database.tokens.ts` (`DB_FILENAME`,
  `MIGRATIONS_DIRNAME`); `database.module.ts` é o barrel público de onde os
  consumidores importam (reexporta os providers, os tokens e o `schema`).
- O Drizzle é configurado com `drizzle({ client, schema, relations })` para que a
  API relacional `db.query.*` fique disponível.
- **Não há banco de dev separado**: por padrão o drizzle-kit (CLI) e o runtime
  apontam para o **mesmo** arquivo em userData — o `drizzle.config.ts` recalcula
  esse caminho em Node puro. Use a env `DASHBOARD_DB` quando quiser isolar um
  arquivo (a pasta `.data/` é apenas ignorada pelo ESLint, não é o alvo padrão).

### Renderer (Angular)

- **Organização por feature** em `app/features/*`. Cada feature tem suas
  `*.routes.ts` (lazy via `loadChildren`), um `*.service.ts` injetável
  (`providedIn: 'root'`) que fala IPC, e seus componentes/páginas. `auth` define
  ainda `auth.guard.ts` (`authGuard`) e seu próprio layout.
- **Roteamento**: `app.routes.ts` usa **hash routing** (`withHashLocation`) —
  obrigatório no Electron, onde a parte antes do `#` não muda e funciona via
  `file://` no build de produção (sem servidor para o fallback de SPA). As rotas
  protegidas ficam sob o `FrameLayout` com `authGuard`.
- **Serviços de feature** preferem `signal`/`computed` para estado e
  `resource(...)` para dados assíncronos de IPC (recarregue com `.reload()` após
  mutações). Todo acesso ao IPC passa pelo helper `invoke<T>` (não use
  `window.electron.invoke` direto).
- **Design system zard** (`app/shared/ui/zard/`) — componentes portados e
  vendorizados (botões, layout, tabela, select, etc.), com seletores prefixados
  `z-`. Estilização com **Tailwind CSS 4** (plugin `@tailwindcss/vite`). Tem regras
  de ESLint próprias (veja abaixo); trate como código de terceiros — não reescreva
  no estilo do app.
- A janela é **frameless** (`frame: false`); a moldura/título custom vive em
  `app/shared/ui/frame/` e usa `window.electron.window.*` para os controles.

### Path aliases

`@shared/*`, `@main/*`, `@renderer/*` e `@/*` (→ `src/renderer/app/*`). Espelhados
em três lugares que **devem permanecer sincronizados**: `tsconfig.json` (paths),
`src/main/tsconfig.json` e o objeto `alias` de `electron.vite.config.ts` (resolução
em runtime/build). **A árvore de schema (`src/main/database/schema/`) usa imports
relativos** — o drizzle-kit a importa direto, ignorando os paths do tsconfig.

## Lint, Format e Type-check

- **ESLint** (flat config em `eslint.config.mjs`) com blocos distintos: renderer
  (angular-eslint + templates HTML com regras de acessibilidade), main/preload/
  shared (TS/Node, `no-console` liberado), e um bloco que **relaxa** regras de
  seletor/`any` para a lib zard vendorizada. `out/`, `dist/`, `release/`,
  `drizzle/` e `.data/` são ignorados.
- **Prettier** roda por último no ESLint via `eslint-config-prettier` (desativa
  regras conflitantes). Formate com `bun run format`.
- Um hook **PostToolUse** (`.claude/settings.json` → `scripts/format-hook.mjs`)
  roda Prettier/ESLint automaticamente após cada Write/Edit.
- Sempre rode `bun run typecheck` (main + renderer) antes de considerar uma
  mudança pronta.

## Pegadinhas

- **`ELECTRON_RUN_AS_NODE`**: alguns shells/IDEs exportam isso, o que faz o
  binário do Electron rodar como Node puro (sem janela, `require('electron')`
  retorna um caminho → `app` fica `undefined`). O launcher do electron-vite **não**
  remove essa variável, então `dev`/`preview` passam pelo wrapper
  `scripts/electron-vite.mjs`, que faz `delete env.ELECTRON_RUN_AS_NODE` antes de
  delegar ao CLI do electron-vite. Não rode `electron-vite dev` (nem o binário do
  electron) diretamente nos scripts.
- **O Drizzle deve permanecer na linha `1.0.0-beta`** — o driver `node:sqlite` e
  a API `defineRelations` v2 só existem no beta de `drizzle-orm`/`drizzle-kit`.
  Não faça downgrade para a versão estável.
- **`@analogjs/vite-plugin-angular` precisa do `tsconfig` explícito** apontando
  para `tsconfig.app.json` (na config do renderer); sem isso o plugin não acha o
  tsconfig, cai pra JIT e o type-check de template não roda.

## Estilo de Commit

Conventional commits com emojis:

```
✨ feat(escopo): descrição
🧪 test(escopo): descrição
🔥 fix(escopo): descrição
💄 style(escopo): descrição
```

## Regras Críticas

### 1. Organização de Código

- Muitos arquivos pequenos em vez de poucos arquivos grandes
- Alta coesão, baixo acoplamento
- 200-400 linhas típico, 800 máximo por arquivo
- Organize por feature/domínio, não por tipo

### 2. Estilo de Código

- Imutabilidade sempre - nunca mutar objetos ou arrays
- Sem console.log em código de produção
- Tratamento de erro adequado com try/catch
- Validação de entrada com Zod ou similar

### 3. Testes

- TDD: escreva testes primeiro
- Cobertura mínima de 80%
- Testes unitários para utilitários
- Testes de integração para APIs
- Testes E2E para fluxos críticos

### 4. Segurança

- Sem segredos hardcoded
- Variáveis de ambiente para dados sensíveis
- Validar toda entrada de usuário
- Apenas queries parametrizadas
- Proteção CSRF habilitada

### 5. Idioma

- Sempre responder em português do Brasil
