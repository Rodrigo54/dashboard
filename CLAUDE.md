# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com
o código deste repositório.

## Visão Geral

O Dashboard é um aplicativo desktop em Electron com um renderer em Angular 22
(zoneless) e uma camada de dados SQLite via Drizzle ORM. O build dos três
processos (main/preload/renderer) é unificado pelo **electron-vite**, com o
Angular compilado pelo `@analogjs/vite-plugin-angular`. O gerenciador de pacotes
é o **bun** (`bun@1.3.11`); `ng` e `drizzle-kit` estão configurados para usá-lo.

## Comandos

```bash
bun run dev              # electron-vite dev: main + preload + renderer + Electron (HMR)
bun run build            # electron-vite build -> out/{main,preload,renderer}
bun run preview          # roda o app a partir do build de produção
bun run dist             # electron-vite build + electron-builder -> release/
bun run typecheck        # type-check do main e do renderer (tsc --noEmit)
bun test                 # testes unitários (Vitest via @angular/build:unit-test)
```

`bun run dev` é o ponto de entrada normal: o electron-vite serve o renderer (Vite
dev server), builda main/preload e sobe o Electron, que carrega o renderer via
`process.env.ELECTRON_RENDERER_URL`. Os scripts `dev`/`preview` passam pelo
wrapper `scripts/electron-vite.mjs` (veja "Pegadinhas").

### Banco de Dados (Drizzle + node:sqlite)

```bash
bun run db:generate      # gera uma migração a partir de mudanças no schema.ts -> ./drizzle
bun run db:migrate       # aplica migrações ao banco de dev do drizzle-kit (./.data)
bun run db:push          # envia o schema diretamente (apenas dev)
bun run db:studio        # abre o Drizzle Studio
```

As migrações também são aplicadas automaticamente em tempo de execução quando o
app fica pronto (veja `initDb`), lendo da pasta `./drizzle` empacotada.

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
  `provideZonelessChangeDetection()` (**sem zone.js**). As rotas ficam em
  `app/app.routes.ts` (atualmente vazio); a configuração em `app/app.config.ts`.
  O `angular.json` é mantido **apenas** para `ng test`/schematics.
- **`src/shared/`** — contrato em nível de tipo compartilhado entre os processos
  (ex.: `ipc-channels.d.ts`, fonte única de verdade dos canais de IPC tipados).

Esses dois processos se comunicam por uma única ponte de IPC deliberadamente
estreita:

- `src/main/preload.ts` expõe `window.electron.invoke(channel, ...args)` via
  `contextBridge` (sandboxed, `contextIsolation: true`, `nodeIntegration: false`).
- `src/main/main.ts` registra handlers com `ipcMain.handle('<channel>', ...)`.
- `src/renderer/electron.d.ts` tipa a superfície de `window.electron`.

Para adicionar um recurso de IPC: registre um handler em `main.ts`, depois chame
`window.electron.invoke('<channel>', payload)` no renderer. Mantenha a superfície
da ponte mínima e tipada.

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
  `node:sqlite` em `app.getPath('userData')/dashboard.db`, ativa WAL + foreign
  keys, aplica migrações pendentes e memoiza a instância. `getDb()` a retorna
  depois disso. As constantes de conexão ficam em `database.tokens.ts`;
  `database.module.ts` é o barrel público de onde os consumidores importam.
- O Drizzle é configurado com `drizzle({ client, schema, relations })` para que a
  API relacional `db.query.*` fique disponível.
- O banco de runtime (userData) e o banco de dev do drizzle-kit
  (`./.data/dashboard.db` definido em `drizzle.config.ts`) são **arquivos
  separados**.

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
