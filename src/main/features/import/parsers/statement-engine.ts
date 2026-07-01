import type { TransactionType } from '@shared/enums';
import type { ImportReconciliation, ParsedStatementLine } from '@shared/types';
import { addDecimal, negateDecimal, subtractDecimal } from '@shared/decimal';
import type { TextLine } from '../pdf-extraction.service';
import {
  moneyTokens,
  parseStatementDate,
  stripLeadingDate,
  stripMoney,
} from './statement-parse.utils';

export interface EngineOptions {
  /** Ano assumido quando a linha traz só `dd/mm`. */
  readonly fallbackYear: number;
  /**
   * Como inferir débito x crédito:
   * - `parenthesis`: sufixo `(-)`/`(+)` após o valor (padrão BB).
   * - `sign`: valor negativo é débito (padrão Itaú).
   */
  readonly debitStrategy: 'parenthesis' | 'sign';
}

// Linhas de saldo (não são movimento): saldo anterior, saldo do dia, saldo final.
const BALANCE_RE =
  /saldo\s+(?:anterior|do\s+dia|final|em|atual|dispon)|^s\s*a\s*l\s*d\s*o\b|^saldo\b/i;

/** Interpreta as linhas posicionadas em movimentos + reconciliação de saldo. */
export function parseStatement(
  lines: readonly TextLine[],
  options: EngineOptions,
): { lines: ParsedStatementLine[]; reconciliation: ImportReconciliation } {
  const movements: ParsedStatementLine[] = [];
  // Saldos informados (com sinal), na ordem em que aparecem no extrato.
  const balances: string[] = [];
  // Histórico que o BB às vezes coloca numa linha própria (sem data) logo antes
  // do movimento — usado como descrição quando a linha do movimento não a traz.
  let pendingHistorico: string | undefined;

  for (const line of lines) {
    const date = parseStatementDate(line.text, options.fallbackYear);
    const rest = date ? stripLeadingDate(line.text) : line.text;
    const tokens = moneyTokens(rest);

    if (!date) {
      // Linha órfã de histórico: sem data e sem valor.
      if (tokens.length === 0 && rest.trim().length > 0) pendingHistorico = rest.trim();
      continue;
    }
    if (tokens.length === 0) continue;

    if (BALANCE_RE.test(rest)) {
      balances.push(tokens.at(-1)!);
      pendingHistorico = undefined;
      continue;
    }

    const movement = toMovement(date, rest, tokens, options, pendingHistorico);
    pendingHistorico = undefined;
    if (movement) movements.push(movement);
  }

  return { lines: movements, reconciliation: reconcile(movements, balances) };
}

/** Converte uma linha de movimento (com data e valores) num lançamento. */
function toMovement(
  date: Date,
  rest: string,
  tokens: string[],
  options: EngineOptions,
  pendingHistorico: string | undefined,
): ParsedStatementLine | null {
  const value = tokens[0];
  const type = inferType(rest, value, options.debitStrategy);
  const amount = absolute(value);
  if (amount === '0.00') return null;

  const description = cleanDescription(rest, options.debitStrategy, pendingHistorico);
  if (description.length === 0) return null;

  return { date, description, amount, type };
}

/**
 * Isola a descrição (histórico) da linha. Remove valores e marcadores de sinal;
 * no layout BB (parenthesis) descarta as colunas iniciais Lote+Documento (dois
 * números) e, se isso esvaziar a descrição, usa o histórico da linha órfã
 * anterior (`pendingHistorico`) antes de cair no texto com as colunas.
 */
function cleanDescription(
  rest: string,
  strategy: 'parenthesis' | 'sign',
  pendingHistorico: string | undefined,
): string {
  const withoutMarkers = stripMoney(rest)
    .replace(/\([+\-=]\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (strategy !== 'parenthesis') return withoutMarkers;

  const withoutColumns = withoutMarkers.replace(/^\d+\s+\d+\s*/, '').trim();
  if (withoutColumns.length > 0) return withoutColumns;
  return pendingHistorico ?? withoutMarkers;
}

function inferType(rest: string, value: string, strategy: 'parenthesis' | 'sign'): TransactionType {
  if (strategy === 'parenthesis') {
    const marked = /\(\s*([+-])\s*\)/.exec(rest);
    if (marked) return marked[1] === '-' ? 'expense' : 'income';
  }
  return value.startsWith('-') ? 'expense' : 'income';
}

function absolute(value: string): string {
  return value.startsWith('-') ? negateDecimal(value) : value;
}

/** Variação líquida (com sinal) do conjunto de movimentos. */
function signedNet(movements: readonly ParsedStatementLine[]): string {
  return movements.reduce(
    (acc, m) => (m.type === 'income' ? addDecimal(acc, m.amount) : subtractDecimal(acc, m.amount)),
    '0.00',
  );
}

/**
 * Confere se os saldos informados batem com a soma dos movimentos. Agnóstico à
 * ordem do extrato: usa o primeiro e o último saldo como extremos e testa as
 * duas direções (ascendente = BB, descendente/mais-recente-primeiro = Itaú).
 * Também serve de checagem de completude — só fecha se nenhum movimento faltou.
 */
function reconcile(
  movements: readonly ParsedStatementLine[],
  balances: readonly string[],
): ImportReconciliation {
  if (balances.length < 2) return { balanced: false };

  const first = balances[0];
  const last = balances.at(-1)!;
  const net = signedNet(movements);

  // Ascendente: saldo final = saldo inicial + variação (inicial vem primeiro).
  if (addDecimal(first, net) === last) {
    return { openingBalance: first, closingBalance: last, computedClosing: last, balanced: true };
  }
  // Descendente: saldo mais recente (primeiro) = saldo inicial (último) + variação.
  if (addDecimal(last, net) === first) {
    return { openingBalance: last, closingBalance: first, computedClosing: first, balanced: true };
  }
  // Não fechou: mostra os extremos e o total computado a partir do mais antigo.
  return {
    openingBalance: last,
    closingBalance: first,
    computedClosing: addDecimal(last, net),
    balanced: false,
  };
}
