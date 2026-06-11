import { parse } from 'yaml';
import { environmentSchema } from '../../shared/schemas/environment.schema';
import type { Environment } from '../../shared/types';

// Parser puro dos environments/*.yml: sem imports de Electron e com imports
// relativos, para que o drizzle.config.ts (CLI em Node puro, que ignora os
// paths do tsconfig) possa reutilizá-lo e resolver o mesmo banco do runtime.

/**
 * Interpola referências `${VAR}` e `${VAR:-fallback}` com variáveis de
 * ambiente. Variável ausente sem fallback vira string vazia — a validação do
 * schema acusa o campo em seguida.
 */
export function interpolateEnvVars(
  raw: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return raw.replace(
    /\$\{(\w+)(?::-([^}]*))?\}/g,
    (_match, name: string, fallback: string | undefined) => env[name] ?? fallback ?? '',
  );
}

/** Faz parse + interpolação + validação Zod de um environments/*.yml. */
export function parseEnvironment(
  rawYaml: string,
  env: Record<string, string | undefined> = process.env,
): Environment {
  const parsed: unknown = parse(interpolateEnvVars(rawYaml, env));
  const result = environmentSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment YAML inválido:\n${issues}`);
  }
  return result.data;
}
