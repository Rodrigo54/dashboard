# Visão Geral do Projeto

> Leia este documento para entender o que o app é, para quem existe, qual a
> stack e o que está construído vs. planejado. Detalhes de arquitetura em
> [`architecture.md`](./architecture.md); semântica de domínio em
> [`business-context.md`](./business-context.md).

## O que é

O **Dashboard** é um aplicativo desktop de **organização pessoal** — finanças,
projetos, tarefas e notas — construído para uso individual (single-user, dados
locais). Não há backend nem nuvem: tudo vive num banco SQLite local, e o app
funciona 100% offline.

O domínio mais desenvolvido hoje é o **financeiro**: contas bancárias,
transações (receitas/despesas), recorrências (contas fixas, assinaturas,
salário) e importação de extratos em PDF dos bancos brasileiros, com
reconciliação automática contra as previsões de recorrência.

## Para quem

Uso pessoal do autor (Rodrigo). Isso simplifica decisões: um usuário logado por
vez (sessão única no processo main), sem necessidade de sincronização,
multi-tenancy real ou i18n — a UI é em português do Brasil e a moeda padrão é
BRL.

## Stack

| Camada           | Tecnologia                                                       |
| ---------------- | ---------------------------------------------------------------- |
| Shell desktop    | Electron (janela frameless, sandbox, contextIsolation)           |
| Build            | electron-vite (main + preload + renderer numa config única)      |
| UI               | Angular 22 zoneless (standalone, signals, `resource`)            |
| Compilação do NG | `@analogjs/vite-plugin-angular`                                  |
| Estilo           | Tailwind CSS 4 + design system zard (vendorizado)                |
| Banco            | SQLite via `node:sqlite` + Drizzle ORM `1.0.0-beta`              |
| Validação        | Zod (schemas compartilhados main ↔ renderer)                     |
| Config           | YAML por ambiente (`environments/*.yml`), embutido em build-time |
| PDF              | pdfjs-dist (extração de extratos, no processo main)              |
| Recorrência      | rrule + módulo próprio `@shared/recurrence`                      |
| Pacotes          | bun `1.3.11`                                                     |
| Testes           | Vitest (`bun run test`)                                          |

## Features

### Ativas na UI

- **auth** — login local (hash de senha no banco); a sessão vive no processo
  main. O login também dispara a materialização de recorrências vencidas.
- **accounts** — CRUD de contas (corrente, poupança, crédito, investimento,
  dinheiro), com saldo mantido transacionalmente.
- **transactions** — extrato unificado: transações reais + previsões de
  recorrência; CRUD de transações e de regras de recorrência.
- **import** — importação de extratos PDF (Itaú e Banco do Brasil), com
  preview, deduplicação por fingerprint, categorização automática por
  dicionário e reconciliação com recorrências.
- **home** — página inicial (receberá os cards de resumo financeiro do mês:
  receitas, despesas e saldo).
- **notes** — CRUD básico de notas (controller no main; UI mínima).

### Só no schema (features futuras)

`budgets`, `goals`, `projects`, `tasks`, `task-comments` e `tags` já têm
tabelas, schemas Zod e enums, mas ainda não têm controller nem UI. A intenção
de cada uma está descrita em [`business-context.md`](./business-context.md).

## Desenvolvimento futuro

- **Esteira de CI** (GitHub Actions): typecheck + lint + testes com coverage
  publicado (badge dinâmico substituindo o badge estático do README).
- **Cards de resumo financeiro na home** (receitas/despesas/saldo do mês).
- **UI para budgets, goals, projects, tasks e tags** sobre o schema existente.
- **Transferências entre contas** (`type: transfer` existe no enum e no schema,
  mas é rejeitado pela validação hoje).
- **Regras de categorização aprendidas do usuário** na importação (aplicadas
  antes do dicionário-semente).
- **Mais parsers de banco** na importação de extratos (a engine é genérica;
  cada banco é um parser calibrado).
