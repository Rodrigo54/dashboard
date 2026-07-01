# Dashboard

![Electron](https://img.shields.io/badge/Electron-42-47848F?logo=electron&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-1.0.0--beta-C5F74F?logo=drizzle&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003B57?logo=sqlite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.3-000000?logo=bun&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![Coverage](https://img.shields.io/badge/coverage-71.9%25-yellow)

Aplicativo desktop de **organização pessoal** — finanças, projetos, tarefas e
notas — 100% local e offline: Electron + Angular 22 (zoneless) + SQLite via
Drizzle ORM.

> O badge de coverage é estático (medido localmente com `vitest --coverage`);
> a esteira de CI é desenvolvimento futuro.

## Começando

Pré-requisitos: [bun](https://bun.sh) `1.3.11` e Node.js 24+ (o `node:sqlite`
exige um runtime recente).

```bash
bun install
bun run dev
```

## Documentação

- [`specs/project-overview.md`](./specs/project-overview.md) — o que é o app,
  stack, features ativas e planejadas.
- [`specs/architecture.md`](./specs/architecture.md) — arquitetura completa:
  processos do Electron, IPC, camada de dados, renderer.
- [`specs/business-context.md`](./specs/business-context.md) — o domínio:
  entidades, recorrências, importação de extratos, decisões de negócio.
- [`CLAUDE.md`](./CLAUDE.md) — princípios de trabalho, comandos e convenções
  para contribuir (humanos e agentes).
