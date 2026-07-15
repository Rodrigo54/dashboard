// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Pastas geradas/empacotadas — não lintar.
    ignores: [
      'out/**',
      'out-tsc/**',
      'dist/**',
      'release/**',
      'drizzle/**',
      '.data/**',
      'node_modules/**',
      'coverage/**',
    ],
  },

  // -------- Renderer (Angular, TypeScript) --------
  {
    files: ['src/renderer/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['app'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['app'], style: 'kebab-case' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // -------- Templates Angular (HTML) --------
  {
    files: ['src/renderer/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // hlmSidebarTrigger é um Component sem <ng-content> — o ícone e o
      // texto sr-only já vêm do próprio template dele. hlmSidebarRail seta
      // aria-label via host binding (não aparece como atributo estático no
      // template do chamador). Em ambos os casos o <button> do chamador
      // fica legitimamente sem conteúdo próprio.
      '@angular-eslint/template/elements-content': [
        'error',
        { allowList: ['hlmSidebarTrigger', 'hlmSidebarRail'] },
      ],
    },
  },

  // -------- Main + Preload + Shared (Electron/Node, TypeScript) --------
  {
    files: ['src/main/**/*.ts', 'src/shared/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    rules: {
      // Permite console no processo main (logging legítimo de runtime).
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // -------- Limites de tamanho (todo o código-fonte) --------
  // Muitos arquivos pequenos em vez de poucos grandes (ver CLAUDE.md).
  {
    files: ['src/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 75, skipBlankLines: true, skipComments: true }],
    },
  },

  // -------- Design system spartan (helm gerado pelo CLI) --------
  // Código gerado por `ng g @spartan-ng/cli:ui` — seletores hlm*/brn* e
  // utilitários próprios; relaxa as mesmas regras da lib vendorizada.
  {
    files: ['src/renderer/app/shared/spartan/**/*.ts'],
    // O código gerado traz eslint-disable inline que fica redundante com as
    // isenções abaixo; não reportar para manter o helm 100% regenerável.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/no-input-rename': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // -------- Componentes de linha de tabela (precisam renderizar como <tr>) --------
  // Um seletor de elemento viraria um <app-transaction-row> envolvendo os
  // <td>, quebrando a semântica/layout nativo de <table> — mesmo motivo pelo
  // qual HlmTr/HlmTd (spartan) usam seletor de atributo; a diferença é que
  // este é um Component com template próprio, não um Directive.
  {
    files: ['src/renderer/app/features/transactions/pages/transactions-list/transaction-row.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
    },
  },

  // -------- Desativa regras que conflitam com o Prettier (sempre por último) --------
  prettier,
);
