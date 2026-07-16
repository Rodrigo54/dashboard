import type { TransactionType } from '../enums';
import { toCents } from '../decimal';
import { similarityText } from './normalize';
import { nextOccurrence, nextOccurrenceOnOrAfter, type RecurrenceWindow } from './index';
import type { RecurringPattern } from '../types';

/**
 * Motor de probabilidade do matching de recorrências: usado tanto pela tela
 * geral de detecção (`recurring/pages/recurring-matches`) quanto pelo commit
 * de importação de extratos (auto-link). Fonte única de verdade dos pesos e
 * thresholds — nunca duplicar esta lógica em outro lugar.
 */

export interface RecurrenceMatchInput {
  readonly transactionDescription: string;
  readonly transactionAmount: string;
  readonly transactionDate: Date;
  readonly transactionType: TransactionType;
  readonly transactionAccountId: string;
  readonly recurring: {
    readonly name: string;
    readonly templateDescription: string;
    readonly templateAmount: string;
    readonly templateType: TransactionType;
    readonly templateAccountId: string;
    readonly startDate: Date;
    readonly endDate: Date | null;
    readonly nextDate: Date | null;
    readonly recurringPattern: RecurringPattern;
  };
}

/** Probabilidade mínima para uma regra aparecer como candidata na tela de detecção. */
export const CANDIDATE_MIN_THRESHOLD = 0.4;
/** Probabilidade mínima para o commit do import vincular a linha sozinho. */
export const AUTO_LINK_THRESHOLD = 0.85;
/**
 * Vantagem mínima do melhor candidato sobre o segundo para o auto-link
 * prosseguir. Sem essa margem, duas regras "irmãs" (ex.: parcelas de um
 * mesmo salário) com a mesma descrição podem empatar acima do threshold
 * quando o pagamento atrasa — nesse caso o vínculo automático é bloqueado e
 * a linha cai para confirmação manual na tela de detecção.
 */
export const AUTO_LINK_MARGIN = 0.1;

const TEXT_WEIGHT = 0.5;
const DATE_WEIGHT = 0.3;
const VALUE_WEIGHT = 0.2;

/** Conta diferente da esperada não descarta o match, só penaliza o total. */
const ACCOUNT_MISMATCH_PENALTY = 0.8;

/** Além desta distância (em dias) da ocorrência mais próxima, a data não contribui. */
const DATE_DECAY_LIMIT_DAYS = 10;

/** Diferença percentual de valor a partir da qual a contribuição de valor zera. */
const AMOUNT_TOLERANCE_RATIO = 0.15;

/** Trava contra padrões degenerados ao varrer a janela de datas. */
const MAX_WINDOW_STEPS = 60;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Ocorrência do padrão mais próxima de `target`, dentro de uma janela de
 * busca de `DATE_DECAY_LIMIT_DAYS` para cada lado. Reconstrói a cadência a
 * partir do `startDate` (ignora `nextDate`): tanto o scorer quanto o link
 * manual (`recurrence-matching.service.ts`, main) querem saber a ocorrência
 * mais próxima do *padrão*, não o estado de materialização já avançado da
 * regra. `undefined` quando nenhuma ocorrência cai dentro da janela.
 */
export function nearestRuleOccurrence(
  pattern: RecurringPattern,
  startDate: Date,
  endDate: Date | null,
  target: Date,
): Date | undefined {
  const window: RecurrenceWindow = { startDate, endDate, nextDate: null, pattern };
  const windowStart = addDays(target, -DATE_DECAY_LIMIT_DAYS);
  const windowEnd = addDays(target, DATE_DECAY_LIMIT_DAYS);

  let cursor = nextOccurrenceOnOrAfter(window, windowStart);
  if (cursor === null) return undefined;

  let best = cursor;
  let bestDelta = daysBetween(cursor, target);
  let steps = 0;
  while (cursor <= windowEnd && steps < MAX_WINDOW_STEPS) {
    const delta = daysBetween(cursor, target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = cursor;
    }
    cursor = nextOccurrence(cursor, pattern);
    steps += 1;
  }

  return bestDelta <= DATE_DECAY_LIMIT_DAYS ? best : undefined;
}

/** 1 na ocorrência exata, decaindo linearmente até 0 em `DATE_DECAY_LIMIT_DAYS`. */
function dateProximityScore(input: RecurrenceMatchInput): number {
  const occurrence = nearestRuleOccurrence(
    input.recurring.recurringPattern,
    input.recurring.startDate,
    input.recurring.endDate,
    input.transactionDate,
  );
  if (occurrence === undefined) return 0;
  const distance = daysBetween(occurrence, input.transactionDate);
  return Math.max(0, 1 - distance / DATE_DECAY_LIMIT_DAYS);
}

/** 1 no valor idêntico, decaindo linearmente até 0 em `AMOUNT_TOLERANCE_RATIO`. */
function valueProximityScore(transactionAmount: string, templateAmount: string): number {
  const txCents = toCents(transactionAmount);
  const templateCents = toCents(templateAmount);
  const diffCents = txCents > templateCents ? txCents - templateCents : templateCents - txCents;
  if (templateCents === 0n) return diffCents === 0n ? 1 : 0;
  const ratio = Number(diffCents) / Number(templateCents);
  return Math.max(0, 1 - ratio / AMOUNT_TOLERANCE_RATIO);
}

/**
 * Similaridade 0..1 entre a descrição da transação e a regra: o maior valor
 * entre comparar com o nome da regra e com a descrição do template.
 */
function textProximityScore(input: RecurrenceMatchInput): number {
  const description = input.transactionDescription;
  return Math.max(
    similarityText(description, input.recurring.name),
    similarityText(description, input.recurring.templateDescription),
  );
}

/**
 * Probabilidade 0..1 de uma transação pertencer a uma regra de recorrência.
 * Tipo divergente é filtro duro (retorna 0); conta divergente só penaliza o
 * total (`×0.8`) — a mesma conta de luz pode ser paga ora de um banco, ora
 * de outro.
 */
export function computeRecurrenceProbability(input: RecurrenceMatchInput): number {
  if (input.transactionType !== input.recurring.templateType) return 0;

  const raw =
    textProximityScore(input) * TEXT_WEIGHT +
    dateProximityScore(input) * DATE_WEIGHT +
    valueProximityScore(input.transactionAmount, input.recurring.templateAmount) * VALUE_WEIGHT;

  const accountFactor =
    input.transactionAccountId === input.recurring.templateAccountId ? 1 : ACCOUNT_MISMATCH_PENALTY;

  return raw * accountFactor;
}

/**
 * Decide se o melhor candidato pode ser vinculado automaticamente: precisa
 * bater o threshold e, quando há disputa com um segundo candidato, abrir
 * vantagem de pelo menos `AUTO_LINK_MARGIN` sobre ele. Usado exclusivamente
 * pelo auto-link do commit de importação — a tela de detecção sempre pede
 * confirmação manual, independente da pontuação.
 */
export function isAutoLinkCandidate(
  bestScore: number,
  secondBestScore: number | undefined,
): boolean {
  // Epsilon absorve erro de ponto flutuante (ex.: 0.95 - 0.85 = 0.09999999999999998).
  const EPSILON = 1e-9;
  if (bestScore < AUTO_LINK_THRESHOLD - EPSILON) return false;
  if (secondBestScore === undefined) return true;
  return bestScore - secondBestScore >= AUTO_LINK_MARGIN - EPSILON;
}

export interface ScoredCandidate<T> {
  readonly value: T;
  readonly score: number;
}

/**
 * Melhor candidato elegível para auto-link dentre uma lista já pontuada, ou
 * `undefined` se nenhum passa em `isAutoLinkCandidate` (abaixo do threshold,
 * ou empatado com o segundo colocado). Genérico em `T` para servir tanto o
 * commit de importação (`schema.Recurring` inteiro) quanto qualquer outro
 * consumidor que precise só do id.
 */
export function bestAutoLinkCandidate<T>(scored: readonly ScoredCandidate<T>[]): T | undefined {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const [best, second] = sorted;
  if (!best) return undefined;
  return isAutoLinkCandidate(best.score, second?.score) ? best.value : undefined;
}
