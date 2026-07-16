/**
 * Aritmética sobre a string decimal canônica do app (ponto decimal, sem
 * milhar, até 2 casas — o formato do `decimalSchema` e das colunas TEXT de
 * dinheiro). Opera em centavos com `bigint` para nunca passar por float;
 * o resultado é sempre normalizado com 2 casas (ex.: `"15.50"`).
 *
 * Puro e sem dependências — usado tanto no processo main (saldo de contas)
 * quanto no renderer.
 */

const DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Converte a string decimal canônica em centavos (`"10.5"` -> `1050n`). */
export function toCents(value: string): bigint {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new Error(`Valor decimal inválido: "${value}" (use o formato "1234.56")`);
  }
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const cents = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -cents : cents;
}

/** Converte centavos de volta à string canônica com 2 casas (`1050n` -> `"10.50"`). */
function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integer = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${integer}.${fraction}`;
}

/** Soma duas strings decimais canônicas sem perda de precisão. */
export function addDecimal(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b));
}

/** Subtrai `b` de `a` (`a - b`) sem perda de precisão. */
export function subtractDecimal(a: string, b: string): string {
  return fromCents(toCents(a) - toCents(b));
}

/** Inverte o sinal de uma string decimal canônica (zero permanece sem sinal). */
export function negateDecimal(value: string): string {
  return fromCents(-toCents(value));
}
