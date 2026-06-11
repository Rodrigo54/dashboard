import { z } from 'zod';

// Schema dos arquivos environments/*.yml. Mantido em arquivo próprio (sem
// dependência dos enums do app) para que o drizzle.config.ts — que roda em Node
// puro, fora do Vite — possa importá-lo por caminho relativo sem puxar o resto
// da árvore de shared.

// ============================================================
// Environment (environments/*.yml)
// ============================================================

export const environmentNameSchema = z.enum(['development', 'production']);

export const environmentSchema = z.object({
  app: z.object({
    /** Identificador técnico — define a pasta de userData (`app.setName`). */
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'app.id deve ser kebab-case (a-z, 0-9, hífen)'),
    /** Nome de exibição do app. */
    name: z.string().min(1).max(100),
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/, 'app.version deve ser um semver (ex.: 1.2.3)'),
    environment: environmentNameSchema,
  }),
  database: z.object({
    /** 'userData' (pasta padrão do Electron) ou um caminho de diretório. */
    directory: z.string().min(1).default('userData'),
    fileName: z
      .string()
      .min(1)
      .regex(/^[\w.-]+$/, 'database.fileName deve ser apenas um nome de arquivo'),
  }),
  security: z.object({
    /** Segredo de encriptação — nunca exposto ao renderer. */
    encryptionSecret: z
      .string()
      .min(32, 'security.encryptionSecret deve ter pelo menos 32 caracteres'),
  }),
  window: z.object({
    width: z.number().int().min(640).default(1280),
    height: z.number().int().min(480).default(800),
    devTools: z.boolean().default(false),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

/**
 * Subconjunto seguro para atravessar a ponte de IPC até o renderer — omite o
 * bloco `security`. Como objetos Zod descartam chaves desconhecidas no parse,
 * `publicEnvironmentSchema.parse(env)` remove o segredo.
 */
export const publicEnvironmentSchema = environmentSchema.omit({ security: true });
