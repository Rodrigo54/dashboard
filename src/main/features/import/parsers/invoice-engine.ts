import type { TransactionType } from '@shared/enums';
import type { ImportReconciliation, ParsedStatementLine } from '@shared/types';
import { addDecimal, negateDecimal, subtractDecimal } from '@shared/decimal';
import type { TextLine } from '../pdf-extraction.service';
import { moneyTokens, parseStatementDate } from './statement-parse.utils';

/** Valor absoluto de um decimal em string (remove sinal negativo). */
function absolute(value: string): string {
  return value.startsWith('-') ? negateDecimal(value) : value;
}

/** Valor monetário BR usado para localizar a posição do primeiro valor na linha. */
const MONEY_TOKEN = /-?\d{1,3}(?:\.\d{3})*,\d{2}/;
/** Data `dd/mm` no início da linha, usada para decidir o ano com rollover. */
const LEADING_MONTH = /^(\d{2})\/(\d{2})/;

export interface InvoiceEngineOptions {
  /** Ano de fechamento da fatura, base das datas `dd/mm`. */
  readonly referenceYear: number;
  /** Mês de fechamento (1-12): movimentos de mês maior caem no ano anterior. */
  readonly referenceMonth: number;
  /** Abre uma seção de movimento (compras/pagamentos). */
  readonly sectionOpenRe: RegExp;
  /** Fecha a seção corrente (subtotal ou início de bloco não-movimento). */
  readonly sectionCloseRe: RegExp;
  /** Linha do total da fatura anterior. */
  readonly previousTotalRe: RegExp;
  /** Linha do total desta fatura. */
  readonly currentTotalRe: RegExp;
}

/**
 * Interpreta uma fatura de cartão de crédito. Ao contrário do extrato, a fatura
 * é seccionada: só as linhas dentro dos blocos de movimento viram lançamentos, e
 * os sinais são invertidos (compra positiva → `expense`; pagamento negativo →
 * `income`), porque conta de crédito tem saldo negativo ou zero. Fora das seções
 * ficam resumos, limites e projeções de próximas faturas — ignorados.
 */
export function parseInvoice(
  lines: readonly TextLine[],
  options: InvoiceEngineOptions,
): { lines: ParsedStatementLine[]; reconciliation: ImportReconciliation } {
  const movements: ParsedStatementLine[] = [];
  let previousTotal: string | undefined;
  let currentTotal: string | undefined;
  let active = false;

  for (const line of lines) {
    const text = line.text;
    previousTotal ??= totalOnLine(text, options.previousTotalRe);
    currentTotal ??= totalOnLine(text, options.currentTotalRe);

    if (options.sectionCloseRe.test(text)) {
      active = false;
      continue;
    }
    if (options.sectionOpenRe.test(text)) {
      active = true;
      continue;
    }
    if (!active) continue;

    const movement = toMovement(text, options);
    if (movement) movements.push(movement);
  }

  return {
    lines: movements,
    reconciliation: reconcile(movements, previousTotal, currentTotal),
  };
}

/** Converte uma linha da seção de movimento num lançamento, ou `null`. */
function toMovement(text: string, options: InvoiceEngineOptions): ParsedStatementLine | null {
  const money = MONEY_TOKEN.exec(text);
  if (!money) return null;
  const date = statementDate(text, options);
  if (!date) return null;

  // O valor real é o primeiro token (coluna esquerda); o que vem depois é ruído
  // da coluna da direita (encargos), que o agrupamento por y cola nesta linha.
  const [value] = moneyTokens(text);
  const amount = absolute(value);
  if (amount === '0.00') return null;

  const description = cleanDescription(text.slice(0, money.index));
  if (description.length === 0) return null;

  return { date, description, amount, type: invertedType(value) };
}

/** Data da linha, com rollback de ano para movimentos após o mês de fechamento. */
function statementDate(text: string, options: InvoiceEngineOptions): Date | null {
  const match = LEADING_MONTH.exec(text.trim());
  const month = match ? Number(match[2]) : 0;
  const year = month > options.referenceMonth ? options.referenceYear - 1 : options.referenceYear;
  return parseStatementDate(text, year);
}

/** Descrição = trecho antes do valor, sem data inicial nem marcadores de moeda. */
function cleanDescription(beforeAmount: string): string {
  return beforeAmount
    .replace(LEADING_MONTH, '')
    .replace(/\bR\$|\bUS\$|\bBR\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fatura inverte o sinal: negativo (pagamento) é receita; positivo (gasto) é despesa. */
function invertedType(value: string): TransactionType {
  return value.startsWith('-') ? 'income' : 'expense';
}

/** Último valor monetário de uma linha de total, se ela casa o rótulo. */
function totalOnLine(text: string, labelRe: RegExp): string | undefined {
  if (!labelRe.test(text)) return undefined;
  const tokens = moneyTokens(text);
  const last = tokens.at(-1);
  return last ? absolute(last) : undefined;
}

/**
 * Confere a completude da fatura: total anterior + compras − pagamentos deve
 * igualar o total desta fatura. Só fecha se ambos os totais foram encontrados.
 */
function reconcile(
  movements: readonly ParsedStatementLine[],
  previousTotal: string | undefined,
  currentTotal: string | undefined,
): ImportReconciliation {
  if (previousTotal === undefined || currentTotal === undefined) return { balanced: false };

  const purchases = sumOf(movements, 'expense');
  const payments = sumOf(movements, 'income');
  const computedClosing = addDecimal(previousTotal, subtractDecimal(purchases, payments));

  return {
    openingBalance: previousTotal,
    closingBalance: currentTotal,
    computedClosing,
    balanced: computedClosing === currentTotal,
  };
}

/** Soma dos valores de um tipo de movimento. */
function sumOf(movements: readonly ParsedStatementLine[], type: TransactionType): string {
  return movements.reduce((acc, m) => (m.type === type ? addDecimal(acc, m.amount) : acc), '0.00');
}

/**
 * Ano e mês de fechamento da fatura, extraídos da primeira data que casa um dos
 * rótulos (cada regex captura mês no grupo 1 e ano no grupo 2). Cai na data atual
 * quando nenhum rótulo é encontrado — usado só para desempatar o ano de `dd/mm`.
 */
export function referenceDateFrom(
  fullText: string,
  labelRes: readonly RegExp[],
): { year: number; month: number } {
  for (const re of labelRes) {
    const match = re.exec(fullText);
    if (match) return { month: Number(match[1]), year: Number(match[2]) };
  }
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
