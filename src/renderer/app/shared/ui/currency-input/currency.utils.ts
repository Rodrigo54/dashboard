/**
 * Utilitários puros de conversão entre o texto mascarado (pt-BR, separador de
 * milhar `.` e marcador decimal `,`) e a string decimal canônica usada no
 * modelo do formulário (ponto como separador decimal, sem milhar — ex.:
 * `"1234.56"`), compatível com schemas Zod `z.string()` / colunas `numeric`.
 *
 * Mantidos sem dependências de Angular/ngx-mask para serem facilmente testáveis.
 */

/** Texto exibido enquanto o campo está vazio / com valor inválido. */
const EMPTY = '';

/**
 * Converte o texto mascarado pt-BR em string decimal canônica.
 * Ignora prefixos/símbolos (ex.: `"R$ 1.234,56"` -> `"1234.56"`).
 * Preserva exatamente os dígitos informados (sem round-trip de float).
 * Retorna `""` para entradas vazias ou inválidas.
 */
export function maskedToDecimalString(raw: string): string {
  if (!raw) {
    return EMPTY;
  }

  const normalized = raw
    .replace(/[^\d,.-]/g, '') // mantém apenas dígitos, separadores e sinal
    .replace(/\./g, '') // remove separadores de milhar
    .replace(/,/g, '.'); // marcador decimal -> ponto

  if (normalized === EMPTY || normalized === '-' || normalized === '.') {
    return EMPTY;
  }

  return Number.isNaN(Number(normalized)) ? EMPTY : normalized;
}

/**
 * Converte a string decimal canônica do modelo no texto mascarado pt-BR.
 * (ex.: `"1234.5"` -> `"1.234,50"`). Retorna `""` para valores vazios/inválidos.
 */
export function decimalStringToMasked(value: string, decimals = 2): string {
  if (!value) {
    return EMPTY;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return EMPTY;
  }

  return parsed.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
