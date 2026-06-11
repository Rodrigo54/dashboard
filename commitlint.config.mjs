// Conventional commits com emoji obrigatório no início
// (ex.: "✨ feat(escopo): descrição").
//
// O parser padrão não entende o prefixo de emoji, então sobrescrevemos o
// headerPattern para capturá-lo antes do <type>(<scope>): <subject>. A regra
// customizada `type-emoji` garante que o emoji corresponde ao tipo, usando o
// mesmo mapeamento do skill /commit (.agents/skills/commit/SKILL.md).

/** Emoji obrigatório por tipo de commit. Fonte da verdade: skill /commit. */
const TYPE_EMOJI = {
  feat: '✨',
  fix: '🐛',
  docs: '📚',
  style: '💄',
  refactor: '♻️',
  perf: '🚀',
  test: '🧪',
  build: '📦',
  ci: '🚧',
  chore: '🛠️',
  revert: '⏪',
};

/** Remove variation selectors/ZWJ para comparar emojis de forma estável. */
const normalizeEmoji = (value) => (value ?? '').replace(/[︎️‍]/gu, '').trim();

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern:
        /^(?:(:\w+:|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F}|\u{200D}\p{Extended_Pictographic})*)\s+)?(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/u,
      headerCorrespondence: ['emoji', 'type', 'scope', 'breaking', 'subject'],
    },
  },
  plugins: [
    {
      rules: {
        'type-emoji': ({ type, emoji }) => {
          // Tipo inválido/ausente é responsabilidade do type-enum/type-empty.
          if (!type || !(type in TYPE_EMOJI)) {
            return [true];
          }
          const expected = TYPE_EMOJI[type];
          if (!emoji) {
            return [false, `commit do tipo "${type}" deve começar com o emoji ${expected}`];
          }
          if (normalizeEmoji(emoji) !== normalizeEmoji(expected)) {
            return [false, `emoji "${emoji}" não corresponde ao tipo "${type}" — use ${expected}`];
          }
          return [true];
        },
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', Object.keys(TYPE_EMOJI)],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'type-emoji': [2, 'always'],
  },
};
