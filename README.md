# Dashboard

Aplicativo desktop em **Electron** com renderer em **Angular 22** (zoneless) e
camada de dados **SQLite** via **Drizzle ORM** (driver nativo `node:sqlite`). O
build dos três processos do Electron (main / preload / renderer) é unificado pelo
**electron-vite**, com o Angular compilado pelo `@analogjs/vite-plugin-angular`.

> Documentação detalhada de arquitetura e convenções para contribuir está em
> [`CLAUDE.md`](./CLAUDE.md).

## Stack

- **Electron** + **electron-vite** (build dos três processos)
- **Angular 22** zoneless (componentes standalone, signals, `resource`)
- **Tailwind CSS 4** + design system **zard** (componentes portados)
- **Drizzle ORM** (`1.0.0-beta`) sobre `node:sqlite`
- **Zod** para validação de entrada (schemas compartilhados main ↔ renderer)
- **Environments em YAML** (`environments/*.yml`) — config por ambiente
  validada com Zod e embutida no build
- **bun** (`bun@1.3.11`) como gerenciador de pacotes
- **ESLint** + **Prettier** para lint/format

## Pré-requisitos

- [bun](https://bun.sh) `1.3.11`
- Node.js 24+ (o `node:sqlite` exige um runtime recente)

```bash
bun install
```

## Comandos

```bash
bun run dev          # electron-vite dev: main + preload + renderer + Electron (HMR)
bun run build        # build de produção -> out/{main,preload,renderer}
bun run preview      # roda o app a partir do build de produção
bun run dist         # build + electron-builder -> release/
bun run typecheck    # type-check do main e do renderer (tsc --noEmit)
bun run lint         # eslint .
bun run lint:fix     # eslint . --fix
bun run format       # prettier --write
bun test             # testes unitários (Vitest via ng test)
```

`bun run dev` é o ponto de entrada normal. Os scripts `dev`/`preview` passam pelo
wrapper `scripts/electron-vite.mjs`, que remove `ELECTRON_RUN_AS_NODE` antes de
delegar ao CLI do electron-vite (veja "Pegadinhas" em `CLAUDE.md`). O modo do
build decide o environment: `dev` usa `environments/development.yml`;
`build`/`preview`/`dist` usam `environments/production.yml`.

## Environments

A configuração por ambiente vive em `environments/development.yml` e
`environments/production.yml`, validada por schema Zod
(`src/shared/schemas/environment.schema.ts`):

| Bloco      | Opções                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| `app`      | `id` (técnico, define a pasta de userData), `name`, `version`, `environment` |
| `database` | `directory` (`userData` ou um caminho) e `fileName`                          |
| `security` | `encryptionSecret` (nunca exposto ao renderer)                               |
| `window`   | `width`, `height`, `devTools`                                                |
| `logging`  | `level` (`debug`/`info`/`warn`/`error`)                                      |

Os valores aceitam interpolação `${VAR}` / `${VAR:-fallback}` com variáveis de
ambiente — em builds de distribuição reais, defina `DASHBOARD_ENCRYPTION_SECRET`
em vez de depender do fallback do YAML.

Os YAML são embutidos no bundle do main em build-time (import `?raw` do Vite).
No processo main, consuma com `getEnvironment()` (`src/main/environment/`); no
renderer, com o `EnvironmentService` (`app/shared/environment/`), que recebe via
IPC (`environment:read`) apenas o subconjunto público — sem o bloco `security`.

### Banco de Dados (Drizzle)

```bash
bun run db:generate  # gera migração a partir de mudanças no schema -> ./drizzle
bun run db:migrate   # aplica as migrações de ./drizzle ao banco (mesmo arquivo do runtime)
bun run db:push      # empurra o schema direto ao banco, sem gerar migração (apenas dev)
bun run db:studio    # abre o Drizzle Studio sobre o mesmo banco
```

As migrações da pasta `./drizzle` também são aplicadas automaticamente em runtime
quando o app fica pronto (veja `initDb`). Cada environment tem seu próprio banco,
definido no YAML: development usa `.data/dashboard.dev.db` (relativo à raiz do
projeto) e production usa `<userData>/dashboard.db`. O `drizzle.config.ts` parseia
o mesmo YAML em Node puro e resolve **o mesmo** arquivo do runtime, para que
`migrate`/`push`/`studio` operem sobre os dados reais do app — o CLI usa
`development.yml` por padrão; selecione outro com `DASHBOARD_ENV=production` ou
sobrescreva o arquivo resolvido com a env `DASHBOARD_DB`.

## Estrutura

```
environments/    # config por ambiente (YAML): development.yml / production.yml
src/
├── main/        # processo main + preload do Electron
│   ├── controllers/   # handlers de IPC via decorators (@Controller/@action)
│   ├── database/      # conexão, schema Drizzle e migrações
│   └── environment/   # parser/provider dos environments (embutidos no build)
├── renderer/    # app Angular 22 (features, design system zard, Tailwind)
└── shared/      # contrato compartilhado main ↔ renderer
                 # (enums, schemas Zod, types inferidos, canais de IPC tipados)
```

Veja [`CLAUDE.md`](./CLAUDE.md) para a descrição completa da arquitetura, da
ponte de IPC, da camada de dados e das regras de estilo de código.
