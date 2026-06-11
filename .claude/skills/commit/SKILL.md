---
name: commit
description: 'Gera mensagem de commit no padrão do projeto: emoji + tipo + scope opcional + descrição imperativa. Use para gerar mensagem de commit, criar commit, conventional commit.'
argument-hint: 'descrição opcional do que foi feito'
---

# Geração de Mensagem de Commit

## Quando Usar

- Usuário pede para commitar mudanças
- Usuário pede para gerar/sugerir mensagem de commit
- Usuário quer criar um commit seguindo o padrão do projeto

## Formato Obrigatório

```
<emoji> <type>(scope): descrição
```

- Emoji **antes** do tipo — obrigatório
- Scope entre parênteses — opcional
- Descrição no imperativo, curta e clara, em português
- **Sem** emojis extras fora do prefixo

## Tipos Válidos

| Emoji | Tipo     | Quando usar                              |
| ----- | -------- | ---------------------------------------- |
| ✨    | feat     | Nova funcionalidade                      |
| 🐛    | fix      | Correção de bug                          |
| 📚    | docs     | Documentação                             |
| 💄    | style    | Formatação, lint, estilo visual          |
| ♻️    | refactor | Refatoração sem mudança de comportamento |
| 🚀    | perf     | Melhoria de performance                  |
| 🧪    | test     | Testes                                   |
| 📦    | build    | Build, empacotamento, dependências       |
| 🚧    | ci       | Integração contínua / pipelines          |
| 🛠️    | chore    | Manutenção, tarefas gerais               |
| ⏪    | revert   | Reverte um commit anterior               |

> Esse mapeamento é validado pelo commitlint (`commitlint.config.mjs`, regra
> `type-emoji`): cada tipo exige exatamente o seu emoji.

## Procedimento

1. Execute `git diff --staged` para ver o que está staged; se vazio, use `git diff HEAD`
2. Identifique o tipo pelo conteúdo das mudanças
3. Determine o scope pelo módulo/feature afetado (ex: `auth`, `db`, `ui`) — omita se as mudanças forem amplas
4. Escreva a descrição no imperativo em português, sem ponto final
5. Monte: `<emoji> <type>(scope): descrição`
6. Execute: `git commit -m "<mensagem>"`

## Exemplos

```
✨ feat(auth): adiciona login social
🐛 fix(auth): corrige redirecionamento após login
♻️ refactor(db): extrai lógica de conexão para provider
🛠️ chore: atualiza dependências do projeto
🚀 perf: melhora carregamento do dashboard
🧪 test(schema): adiciona testes para validação de usuário
```

## Validação Automática

O padrão é checado em duas camadas — não dependa só desta skill:

- **commitlint** (`commitlint.config.mjs`) roda no hook `commit-msg` do husky
  (`.husky/commit-msg`) a cada `git commit`. Valida tipo, emoji por tipo
  (regra `type-emoji`), assunto não vazio e `header-max-length: 100`.
- **VSCode / Copilot** (`.vscode/settings.json`) ensina o gerador de mensagens
  de commit do Copilot a seguir este mesmo padrão via
  `github.copilot.chat.commitMessageGeneration.instructions` (formato, tabela de
  emojis e limite de 100 caracteres no header).

Ao gerar a mensagem, respeite o limite de 100 caracteres no header.
