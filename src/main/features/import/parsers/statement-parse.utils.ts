// Utilitários puros de recorte do texto de extratos brasileiros, compartilhados
// pelos parsers por banco. Sem dependências de runtime — testáveis isoladamente.

/** Casa um valor monetário no formato brasileiro (ex.: `1.234,56`, `-45,90`). */
export const MONEY_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}/g;

/** Casa uma data `dd/mm/aaaa` ou `dd/mm` no início da linha. */
const DATE_RE = /^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/;

/**
 * Converte um valor monetário brasileiro na string decimal canônica do app
 * (ponto decimal, sem milhar). Preserva o sinal. `"1.234,56"` -> `"1234.56"`.
 */
export function brMoneyToCanonical(token: string): string {
  const negative = token.trim().startsWith('-');
  const digits = token
    .replace(/[^\d,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return negative ? `-${digits}` : digits;
}

/** Todos os valores monetários de uma linha, em ordem, já canonizados. */
export function moneyTokens(text: string): string[] {
  return (text.match(MONEY_RE) ?? []).map(brMoneyToCanonical);
}

/**
 * Interpreta a data no início da linha. Quando o ano está ausente (`dd/mm`),
 * usa `fallbackYear`. Retorna `null` se a linha não começa com data.
 */
export function parseStatementDate(text: string, fallbackYear: number): Date | null {
  const match = DATE_RE.exec(text.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = yyyy ? normalizeYear(yyyy) : fallbackYear;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Meio-dia evita saltos de fuso ao serializar/parsear a data.
  return new Date(year, month - 1, day, 12);
}

/** `24` -> `2024`; `2024` -> `2024`. */
function normalizeYear(raw: string): number {
  const n = Number(raw);
  return raw.length === 2 ? 2000 + n : n;
}

/** Remove a data inicial e espaços, devolvendo o histórico da linha. */
export function stripLeadingDate(text: string): string {
  return text.replace(DATE_RE, '').trim();
}

/** Remove todos os valores monetários do texto (para isolar a descrição). */
export function stripMoney(text: string): string {
  return text.replace(MONEY_RE, ' ').replace(/\s+/g, ' ').trim();
}
