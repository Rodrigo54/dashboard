/**
 * Utilitários puros do input de moeda estilo "app bancário": o estado interno
 * é uma sequência de dígitos (centavos) preenchida da direita para a esquerda
 * (`"1"` -> `0,01`, `"12"` -> `0,12`, `"123"` -> `1,23`), convertida de/para a
 * string decimal canônica usada no modelo do formulário (ponto decimal, sem
 * milhar — ex.: `"1234.56"` ou `"-1234.56"`), compatível com schemas Zod `z.string()`.
 *
 * Mantidos sem dependências de Angular para serem facilmente testáveis.
 */

const EMPTY = '';

/** Limite de dígitos aceitos (evita estourar a precisão ao formatar/persistir). */
const MAX_DIGITS = 15;

/**
 * Extrai os dígitos significativos de um texto: remove tudo que não é dígito,
 * zeros à esquerda e limita a `MAX_DIGITS`.
 */
export function sanitizeDigits(raw: string): string {
  return raw.replace(/\D/g, EMPTY).replace(/^0+/, EMPTY).slice(0, MAX_DIGITS);
}

/** Retorna `true` se a string decimal canônica representa um valor negativo. */
export function isNegativeDecimal(value: string): boolean {
  return value.startsWith('-');
}

/**
 * Converte a sequência de dígitos (centavos) na string decimal canônica.
 * Ex.: `"5"` -> `"0.05"`, `"123456"` -> `"1234.56"`, `""` -> `"0.00"`.
 * O sinal negativo é omitido quando o resultado é zero.
 */
export function digitsToDecimalString(digits: string, decimals = 2, negative = false): string {
  const significant = digits.replace(/^0+/, EMPTY);

  let result: string;
  if (decimals === 0) {
    result = significant === EMPTY ? '0' : significant;
  } else {
    const padded = significant.padStart(decimals + 1, '0');
    result = `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
  }

  return negative && Number(result) !== 0 ? `-${result}` : result;
}

/**
 * Formata a sequência de dígitos (centavos) no padrão pt-BR, preenchendo da
 * direita para a esquerda. Ex.: `""` -> `"0,00"`, `"123456"` -> `"1.234,56"`.
 * O sinal negativo é omitido quando o resultado é zero.
 */
export function digitsToMasked(digits: string, decimals = 2, negative = false): string {
  const decimal = digitsToDecimalString(digits, decimals);
  const [integer, fraction] = decimal.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formatted = fraction ? `${grouped},${fraction}` : grouped;

  return negative && Number(decimal) !== 0 ? `-${formatted}` : formatted;
}

/**
 * Converte a string decimal canônica do modelo (ex.: `"10.5"` ou `"-10.5"`) de
 * volta para a sequência de dígitos interna. Ex.: `"-10.5"` -> `"1050"`. Valores
 * vazios ou inválidos retornam `""` (exibidos como `0,00`).
 */
export function decimalStringToDigits(value: string, decimals = 2): string {
  if (!value || Number.isNaN(Number(value))) {
    return EMPTY;
  }

  const [integer = EMPTY, fraction = EMPTY] = value.replace(/[^\d.]/g, EMPTY).split('.');
  const digits = `${integer}${fraction.padEnd(decimals, '0').slice(0, decimals)}`;

  return digits.replace(/^0+/, EMPTY);
}
