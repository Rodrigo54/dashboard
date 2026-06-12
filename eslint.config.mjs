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
      // 'app' para a aplicação, 'z' para a design system zard (componentes portados).
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['app', 'z'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['app', 'z'], style: 'kebab-case' },
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
    rules: {},
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

  // -------- Design system zard (componentes portados) --------
  // Anexa-se a elementos HTML nativos (table[z-table], input[z-input]...) e usa
  // utilitários genéricos — relaxa regras de seletor/`any` para a lib vendorizada.
  {
    files: ['src/renderer/app/shared/ui/zard/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // -------- Desativa regras que conflitam com o Prettier (sempre por último) --------
  prettier,
);
