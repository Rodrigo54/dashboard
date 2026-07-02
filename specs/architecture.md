# Arquitetura

> Leia este documento ao mexer em IPC, processos do Electron, environments,
> banco de dados, organização do renderer ou build. O operacional do dia a dia
> (comandos, pegadinhas, estilo de commit) fica no [`CLAUDE.md`](../CLAUDE.md).

## Visão geral dos processos

O Dashboard é um aplicativo desktop em Electron com um renderer em Angular 22
(zoneless) e uma camada de dados SQLite via Drizzle ORM. O build dos três
processos (main/preload/renderer) é unificado pelo **electron-vite**, com o
Angular compilado pelo `@analogjs/vite-plugin-angular`. A UI usa **Tailwind CSS
4** + o design system **zard** (componentes portados, vendorizados em
`src/renderer/app/shared/zard`). O gerenciador de pacotes é o **bun**
(`bun@1.3.11`); `ng` e `drizzle-kit` estão configurados para usá-lo.

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
  que ainda funcionam; remoção em massa é um follow-up opcional.) Organizado em
  `core/` (wiring de IPC/DI, sem domínio) e `features/*` (um diretório por
  domínio), além de `database/` e `environment/`.
- **`src/renderer/`** — app Angular 22 zoneless (componentes standalone),
  compilado pelo `@analogjs/vite-plugin-angular` sob o Vite, saída em
  `out/renderer/`. O entry é o `src/renderer/index.html` (com
  `<script type="module" src="/main.ts">`); a detecção de mudança usa
  `provideZonelessChangeDetection()` (**sem zone.js**). Organizado em `core/`
  (infra transversal: IPC, environment), `features/*` (`auth`, `home`,
  `accounts`, `transactions`, `import`, `profile`) e `shared/` (blocos de UI neutros ao
  domínio: `frame`, `zard`, `currency-input`). As rotas raiz ficam em
  `app/app.routes.ts` (lazy `loadChildren` por feature, `authGuard`, hash
  routing); a configuração em `app/app.config.ts`. O `angular.json` é mantido
  **apenas** para `ng test`/schematics.
- **`src/shared/`** — contrato compartilhado entre os processos, importável dos
  dois lados sem acoplar runtimes. Centraliza: `ipc-channels.d.ts` (canais de IPC
  tipados, fonte única de verdade), `enums/` (constantes `{ value: label }` +
  helpers `enumValues`/`enumOptions`), `schemas/` (schemas **Zod** de validação,
  um arquivo por entidade + `common.schema.ts` com os primitivos públicos —
  `uuidSchema`, `decimalSchema`, etc. — e os helpers internos `keysOf`/`guid`/
  `timestamps`, que o barrel `schemas/index.ts` **não** reexporta), `types/`
  (tipos inferidos dos schemas via `z.infer`), `decimal/` (aritmética decimal
  sobre strings — `addDecimal`, `negateDecimal`, etc.) e `recurrence/` (cálculo
  de ocorrências de recorrência, usado por main e renderer). Reexportado por
  `shared/index.ts`.

A ponte de IPC é deliberadamente estreita:

- `src/main/preload.ts` expõe via `contextBridge` (sandboxed,
  `contextIsolation: true`, `nodeIntegration: false`) duas superfícies:
  `window.electron.invoke(channel, payload)` para os controllers e
  `window.electron.window.*` para os controles da janela frameless
  (minimizar/maximizar/fechar).
- `src/renderer/electron.d.ts` tipa a superfície de `window.electron`.

## Estrutura do processo main (`core/` + `features/`)

O `src/main/` é organizado em duas árvores, além de `database/` e `environment/`:

- **`src/main/core/`** — a infraestrutura de wiring de IPC/DI, sem domínio:
  `controller.decorator.ts` e `service.decorator.ts` (os decorators),
  `controllers.providers.ts` e `services.providers.ts` (registro + `inject`),
  `session.ts` (sessão do usuário autenticado) e `window-controls.ts`
  (`registerWindowControls`, os handlers `window:*` da janela frameless — ficam
  fora do pipeline de controllers porque dependem do `event.sender`, não de um
  `payload`).
- **`src/main/features/<feature>/`** — um diretório por domínio, com o
  `<feature>.controller.ts` e os `*.service.ts` daquela feature. Hoje: `auth`,
  `accounts`, `transactions`, `recurring`, `import` (importação de extratos
  PDF), `profile` (edição do usuário logado: nome, avatar e senha; inclui o
  protocol handler `avatar://` que serve `userData/avatars` — scheme
  privilegiado registrado antes do `app.whenReady` em `main.ts`),
  `application` (metadados de app-level: environment + appData) e
  `notes`. Services compartilhados moram na feature "dona" e são importados
  cross-feature quando preciso (o registry de DI é por **nome**, então
  `inject()` independe do path do arquivo).

## IPC via controllers (decorators)

Os handlers de IPC do main são organizados como **controllers** decorados, não
como `ipcMain.handle` avulsos (`main.ts` fica só com bootstrap + janela):

- `@Controller('<nome>')` registra o prefixo de IPC da classe; os métodos são
  decorados com `@action('<ação>')` ou com os atalhos CRUD prontos
  (`@create`/`@save`/`@read`/`@update`/`@remove`/`@list`). O nome do método pode
  diferir da ação (ex.: `findOne` → `read`). Usa decorators **padrão do ECMAScript**
  (stage 3, via `Symbol.metadata`) — **não** `experimentalDecorators`.
- **Auto-registro por glob**: `core/controllers.providers.ts` (`initControllers()`,
  chamado em `app.whenReady`) avalia todos os controllers em build-time via
  `import.meta.glob('../features/**/*.controller.ts', { eager: true })` — cada
  classe se auto-registra pelo `@Controller`. Depois instancia cada uma e registra
  um `ipcMain.handle('<nome>:<ação>')` por método, envolvendo o retorno no envelope
  `{ success, result } | { success, error }`. **Basta o arquivo casar com o glob**
  (`features/**/*.controller.ts`) — não há lista manual de controllers.
- A sessão do usuário autenticado vive em `core/session.ts` (estado único do
  processo main): `auth` grava com `setCurrentUser`, os demais leem com
  `requireCurrentUser()` para resolver o `userId`.
- No renderer, use o helper `invoke<T>(channel, payload)` de
  `app/core/ipc/invoke.ts`, que já desempacota o envelope (lança em
  `success: false`). Não chame `window.electron.invoke` direto fora desse helper.
- Os canais válidos são tipados em `shared/ipc-channels.d.ts` via o mapa
  `ControllerChannelMap` (`<controller>: <ações>`). Como os literais dos decorators
  somem em runtime, esse mapa é **mantido à mão** — uma linha por controller.

Para adicionar um recurso de IPC: crie/edite um controller com `@Controller` +
ações em `features/<feature>/`, declare o canal em `ControllerChannelMap` e consuma
no renderer via `invoke<T>(...)`. Extraia lógica reutilizável para um `@Service` na
feature dona. Valide todo payload de entrada com um schema Zod de `@shared/schemas`.

## Services (injeção de dependência)

Lógica de domínio reutilizável entre controllers vive em **services** decorados
com `@Service('<nome>')` (arquivos `*.service.ts` dentro da feature dona):

- `core/services.providers.ts` (`initServices()`, chamado em `app.whenReady`
  **antes** de `initControllers()`) descobre os services por
  `import.meta.glob('../features/**/*.service.ts', { eager: true })`, instancia
  cada um e os registra num `registry` por nome.
- Consuma um service com `inject(ServiceClass)` (estilo Angular): devolve um proxy
  de resolução **preguiçosa** (só consulta o registry no primeiro acesso), então
  pode ser usado direto em campo de classe e suporta dependências circulares.
- Ex.: `account-balance` (mutação de saldo, em `accounts`) e `transaction-rules`
  (regras de transação, em `transactions`) são compartilhados por `transactions`,
  `recurring` e `import`; `recurring-materializer` (em `recurring`) materializa
  recorrências e é usado pelo próprio `recurring` e no login (`auth`).

## Environments (environments/\*.yml)

A configuração por ambiente vive em YAML na raiz do projeto
(`environments/development.yml` e `environments/production.yml`), validada por
schema Zod: identidade do app (`app.id` técnico — define a pasta de userData via
`app.setName` —, `app.name` de exibição, `app.version`, `app.environment`),
banco (`database.directory`: `'userData'` ou um caminho de diretório, +
`database.fileName`), segredo de encriptação (`security.encryptionSecret`),
janela (`window.width`/`height`/`devTools`) e `logging.level`. Os valores
aceitam interpolação `${VAR}` / `${VAR:-fallback}` com variáveis de ambiente —
o segredo lê `DASHBOARD_ENCRYPTION_SECRET` e só cai no fallback se ela não
existir.

- O schema fica em `src/shared/schemas/environment.schema.ts` (arquivo próprio,
  **sem dependências do resto de shared** — o drizzle.config o importa por
  caminho relativo); os tipos `Environment`/`PublicEnvironment` são inferidos em
  `shared/types`.
- `src/main/environment/` é o dono do environment no processo main:
  `environment.parser.ts` (parse YAML + interpolação + validação Zod; **puro,
  imports relativos** — reutilizado pelo `drizzle.config.ts` em Node puro) e
  `environment.providers.ts`, que embute os dois YAML no bundle via import
  `?raw` do Vite e escolhe por `import.meta.env.DEV` **em build-time** — o YAML
  não usado sai por tree-shaking e não há leitura de disco em runtime. Consuma
  com `getEnvironment()` (completo, só no main) ou `getPublicEnvironment()`
  (sem `security`); o barrel é `environment.module.ts`.
- O renderer recebe o environment pelo canal `application:env`
  (`features/application/application.controller.ts`, que também expõe `application:info`
  com os metadados de runtime do app) e o consome via `EnvironmentService`
  (`app/shared/environment/environment.service.ts`, `resource` + computeds
  `appName`/`appVersion`/`isDevelopment`/`logLevel`). **O bloco `security`
  nunca atravessa o IPC** — o controller envia o parse de
  `publicEnvironmentSchema`, que descarta a chave.
- As declarações de tipo dos imports `*.yml?raw` (e do `import.meta.env` do
  electron-vite) ficam em `src/main/env.d.ts`.

O modo do build decide o environment carregado: `dev` embute
`environments/development.yml`; `build`/`preview`/`dist` embutem
`environments/production.yml`.

## Camada de dados (Drizzle + node:sqlite)

- `src/main/database/schema/` define todas as tabelas, enums, o objeto
  `relations` da Relational Queries v2 e os tipos de linha inferidos
  (`User`/`NewUser`, etc.) — um arquivo por entidade, construtores de coluna
  compartilhados em `columns.ts`, as `relations` entre tabelas em `relations.ts`,
  tudo reexportado por `schema/index.ts`. **Esta árvore deve permanecer livre de
  imports de runtime Electron/Node** — o `drizzle-kit` a importa diretamente para
  gerar migrações.
- `src/main/database/database.providers.ts` é dono da conexão de runtime.
  `initDb()` (chamado uma vez quando o app fica pronto) abre o `DatabaseSync` do
  `node:sqlite` no arquivo resolvido do environment ativo
  (`database.directory` + `database.fileName`; a env `DASHBOARD_DB` sobrescreve
  tudo), ativa `PRAGMA journal_mode = WAL` + `PRAGMA foreign_keys = ON`, aplica
  as migrações pendentes de `<appPath>/drizzle` (a pasta `./drizzle` empacotada)
  e memoiza a instância no módulo. `getDb()` a retorna depois (lança se
  `initDb()` ainda não rodou). `database.tokens.ts` guarda
  `MIGRATIONS_DIRNAME`; `database.module.ts` é o barrel público de onde os
  consumidores importam (reexporta os providers, os tokens e o `schema`).
- O Drizzle é configurado com `drizzle({ client, schema, relations })` para que a
  API relacional `db.query.*` fique disponível.
- **Cada environment tem seu próprio banco**: development usa
  `.data/dashboard.dev.db` (relativo à raiz do projeto) e production usa
  `<userData>/dashboard.db` — ambos definidos nos `environments/*.yml`. O
  drizzle-kit (CLI) resolve o mesmo arquivo do runtime parseando o mesmo YAML
  (`DASHBOARD_ENV` seleciona o environment; `development` é o padrão); a env
  `DASHBOARD_DB` sobrescreve tudo quando quiser isolar um arquivo.
- O `drizzle.config.ts` resolve **o mesmo** arquivo que o runtime, parseando o
  mesmo `environments/<env>.yml` em Node puro (sem electron, via
  `src/main/environment/environment.parser.ts`) — então `migrate`/`push`/`studio`
  refletem os dados reais do app.

## Renderer (Angular)

- **`app/core/`** — infraestrutura transversal, sem domínio: `ipc/` (helper
  `invoke<T>` que fala com o preload) e `environment/` (`EnvironmentService`,
  consome o canal `application:env`). Nada aqui importa de `features/*`.
- **Organização por feature** em `app/features/*` (`auth`, `home`, `accounts`,
  `transactions`, `import`, `profile`), por **proximidade de uso**, não por tipo — sem
  pastas genéricas `components/`, `services/`, `models/`:
  - `<feature>.routes.ts` na raiz da feature (lazy via `loadChildren`).
  - `pages/<entidade>-<papel>/` — uma pasta por tela, nome no **plural da
    entidade do banco** (`accounts`, `transactions`, `recurring`) + sufixo de
    papel: `-list` (leitura de coleção), `-form` (criação e edição, uma tela
    serve as duas rotas) e `-view` (leitura de um registro). Componentes/utils
    filhos usados só por aquela tela vivem **dentro** da pasta da tela (ex.:
    `transactions-table.ts`, `ledger-row.ts` e `recurring-forecast.ts` moram
    em `transactions/pages/transactions-list/`, pois só a lista os usa).
  - `shared/` interno à feature — o que cruza **2+ telas** da mesma feature:
    o `*.service.ts` que fala IPC, models/payloads compartilhados. Ex.:
    `transactions/shared/` guarda `transactions.service.ts`,
    `recurring.service.ts`, `date-input.utils.ts` e
    `transactions-payloads.ts`, usados tanto por `transactions-form` quanto
    por `recurring-form`.
  - Sub-domínios fortemente acoplados na UI não viram feature própria mesmo
    quando são controllers separados no main: `recurring` é sub-conceito de
    `transactions` no renderer (o extrato mistura transações reais com
    previsões de recorrência), não uma feature irmã.
  - Guards/services que dependem de estado de domínio ficam na feature dona,
    não em `core/`: `auth/auth.guard.ts` (`authGuard`) importa o `AuthService`
    da própria feature — movê-lo para `core/` inverteria a dependência
    (`core` não importa de `features/*`).
- **Roteamento**: `app.routes.ts` usa **hash routing** (`withHashLocation`) —
  obrigatório no Electron, onde a parte antes do `#` não muda e funciona via
  `file://` no build de produção (sem servidor para o fallback de SPA). As rotas
  protegidas ficam sob o `FrameLayout` com `authGuard`.
- **Template inline é a preferência** (`template:` com template string),
  não `templateUrl` + `.html` separado — mantém componente e marcação juntos
  num único arquivo, mais fácil de navegar. O limite de **400 linhas por
  arquivo** (ESLint `max-lines`) continua valendo por cima disso: se o
  componente com o template inline ultrapassar o limite, é sinal de que ele
  deveria ser quebrado em componentes menores (ex.: extrair uma tabela ou seção
  repetida para um componente filho na própria pasta da tela) — não
  simplesmente mover a marcação para um `.html` pra escapar da contagem.
- **Serviços de feature** preferem `signal`/`computed` para estado e
  `resource(...)` para dados assíncronos de IPC (recarregue com `.reload()` após
  mutações). Todo acesso ao IPC passa pelo helper `invoke<T>` de
  `app/core/ipc/invoke.ts` (não use `window.electron.invoke` direto).
- **`app/shared/`** — blocos de UI neutros ao domínio, organizados **por
  bloco/tema** (sem nível `ui/` intermediário, que seria pasta por tipo):
  `shared/frame/` (moldura/título da janela frameless — a janela é
  **frameless**, `frame: false` — usa `window.electron.window.*` para os
  controles), `shared/zard/` (design system portado e vendorizado — botões,
  layout, tabela, select etc., seletores prefixados `z-`; tem regras de
  ESLint próprias; trate como código de terceiros — não reescreva no estilo
  do app) e `shared/currency-input/`. Estilização com **Tailwind CSS 4**
  (plugin `@tailwindcss/vite`).

## Path aliases

`@shared/*`, `@main/*`, `@renderer/*` e `@/*` (→ `src/renderer/app/*`). Espelhados
em três lugares que **devem permanecer sincronizados**: `tsconfig.json` (paths),
`src/main/tsconfig.json` e o objeto `alias` de `electron.vite.config.ts` (resolução
em runtime/build). **A árvore de schema (`src/main/database/schema/`) usa imports
relativos** — o drizzle-kit a importa direto, ignorando os paths do tsconfig.

## Lint, Format e Type-check

- **ESLint** (flat config em `eslint.config.mjs`) com blocos distintos: renderer
  (angular-eslint + templates HTML com regras de acessibilidade), main/preload/
  shared (TS/Node, `no-console` liberado), limites de tamanho para todo
  `src/**/*.ts` (`max-lines: 400` e `max-lines-per-function: 75`, ignorando
  linhas em branco e comentários), e um bloco que **relaxa** regras de
  seletor/`any` e os limites de tamanho para a lib zard vendorizada. `out/`,
  `dist/`, `release/`, `drizzle/` e `.data/` são ignorados.
- **Prettier** roda por último no ESLint via `eslint-config-prettier` (desativa
  regras conflitantes). Formate com `bun run format`.
- Um hook **PostToolUse** (`.claude/settings.json` → `scripts/format-hook.mjs`)
  roda Prettier/ESLint automaticamente após cada Write/Edit.
