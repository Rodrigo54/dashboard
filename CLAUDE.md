# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dashboard is an Electron desktop app with an Angular 22 renderer and a SQLite
data layer via Drizzle ORM. The package manager is **bun** (`bun@1.3.11`);
`ng` and `drizzle-kit` are configured to use it.

## Commands

```bash
bun run dev              # full dev loop: ng serve + Electron concurrently
bun run start            # renderer only (ng serve on :4200)
bun run build            # Angular production build -> dist/renderer
bun run electron:build   # compile main process (tsc) -> dist/main
bun run dist             # full package: ng build + tsc + electron-builder -> release/
bun test                 # unit tests (Vitest via @angular/build:unit-test)
```

`bun run dev` is the normal entry point. It serves the Angular app and, once
`:4200` is reachable, compiles the main process and launches Electron through
`scripts/start-electron.mjs` (see "Gotchas").

### Database (Drizzle + node:sqlite)

```bash
bun run db:generate      # generate a migration from schema.ts changes -> ./drizzle
bun run db:migrate       # apply migrations to the drizzle-kit dev db (./.data)
bun run db:push          # push schema directly (dev only)
bun run db:studio        # open Drizzle Studio
```

Migrations are also applied automatically at runtime on app ready (see `initDb`),
reading from the bundled `./drizzle` folder.

## Architecture

The codebase is split by Electron process; the two halves are built by
**different toolchains** and never share a runtime.

- **`src/main/`** — Electron main process. Plain TypeScript compiled by `tsc`
  using `src/main/tsconfig.json` (NodeNext modules) into `dist/main/`. Because
  modules are NodeNext, **relative imports use `.js` extensions** even in `.ts`
  source (e.g. `import { initDb } from './db/index.js'`).
- **`src/renderer/`** — Angular 22 app (standalone components, `sourceRoot` in
  `angular.json`). Built by `@angular/build` into `dist/renderer/`. Routes live
  in `app/app.routes.ts` (currently empty); config in `app/app.config.ts`.

These two processes communicate over a single, deliberately narrow IPC bridge:

- `src/main/preload.ts` exposes `window.electron.invoke(channel, ...args)` via
  `contextBridge` (sandboxed, `contextIsolation: true`, `nodeIntegration: false`).
- `src/main/main.ts` registers handlers with `ipcMain.handle('<channel>', ...)`.
- `src/renderer/electron.d.ts` types the `window.electron` surface.

To add an IPC feature: register a handler in `main.ts`, then call
`window.electron.invoke('<channel>', payload)` from the renderer. Keep the
bridge surface minimal and typed.

### Data layer

- `src/main/db/schema.ts` defines all tables, enums, the Relational Queries v2
  `relations` object, and inferred row types (`User`/`NewUser`, etc.).
  **This file must stay free of Electron/Node-runtime imports** — `drizzle-kit`
  imports it directly to generate migrations.
- `src/main/db/index.ts` owns the runtime connection. `initDb()` (call once on
  app ready) opens `node:sqlite` `DatabaseSync` at
  `app.getPath('userData')/dashboard.db`, sets WAL + foreign keys, applies
  pending migrations, and memoizes the instance. `getDb()` returns it afterward.
- Drizzle is wired with `drizzle({ client, schema, relations })` so the
  `db.query.*` relational API is available.
- The runtime DB (userData) and the drizzle-kit dev DB (`./.data/dashboard.db`
  from `drizzle.config.ts`) are **separate files**.

## Gotchas

- **`ELECTRON_RUN_AS_NODE`**: some shells/IDEs export this, which makes the
  Electron binary run as plain Node (no window, `require('electron')` returns a
  path). Always launch via `scripts/start-electron.mjs`, which strips it before
  spawning. Don't invoke the electron binary directly.
- **Drizzle must stay on the `1.0.0-beta` line** — the `node:sqlite` driver and
  the `defineRelations` v2 API only exist in the beta of `drizzle-orm`/
  `drizzle-kit`. Do not downgrade to stable.
- **`.js` import extensions** are required in `src/main/` (NodeNext); Angular
  renderer code does not use them.
