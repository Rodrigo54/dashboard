import type { TransactionCategory, TransactionType } from '@shared/enums';
import type { DetectedRecurrence } from '@shared/types';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { Service } from '../../core/service.decorator';
import { inferCadence } from './cadence';
import { normalizeText, similarityText } from './normalize';

/** Transação candidata à detecção (subconjunto usado no agrupamento). */
interface Txn {
  id: string;
  accountId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: string;
  description: string;
  date: Date;
}

interface Cluster {
  accountId: string;
  type: TransactionType;
  representative: string;
  items: Txn[];
}

/** Similaridade mínima para agrupar duas descrições no mesmo cluster. */
const CLUSTER_THRESHOLD = 0.72;
/** Ocorrências mínimas para uma recorrência ser sugerida. */
const MIN_OCCURRENCES = 3;

/**
 * Detecta recorrências candidatas sobre o histórico acumulado: agrupa
 * transações não vinculadas por conta/tipo e similaridade de descrição
 * (`fastest-levenshtein`), infere a cadência pelos intervalos de data
 * (`date-fns`) e resume cada grupo numa sugestão para o usuário confirmar.
 */
@Service('recurrence-detection')
export class RecurrenceDetectionService {
  detect(userId: string): DetectedRecurrence[] {
    const transactions = this.loadCandidates(userId);
    return clusterize(transactions)
      .filter((cluster) => cluster.items.length >= MIN_OCCURRENCES)
      .map(buildSuggestion)
      .filter((suggestion): suggestion is DetectedRecurrence => suggestion !== null)
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  private loadCandidates(userId: string): Txn[] {
    const db = getDb();
    return db
      .select({
        id: schema.transactions.id,
        accountId: schema.transactions.accountId,
        type: schema.transactions.type,
        category: schema.transactions.category,
        amount: schema.transactions.amount,
        description: schema.transactions.description,
        date: schema.transactions.date,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          isNull(schema.transactions.recurringId),
          ne(schema.transactions.type, 'transfer'),
        ),
      )
      .all();
  }
}

/** Agrupamento guloso por conta+tipo e similaridade de descrição. */
function clusterize(transactions: readonly Txn[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const txn of transactions) {
    const norm = normalizeText(txn.description);
    const cluster = clusters.find(
      (c) =>
        c.accountId === txn.accountId &&
        c.type === txn.type &&
        similarityText(c.representative, norm) >= CLUSTER_THRESHOLD,
    );
    if (cluster) cluster.items.push(txn);
    else
      clusters.push({
        accountId: txn.accountId,
        type: txn.type,
        representative: norm,
        items: [txn],
      });
  }
  return clusters;
}

/** Resume um cluster consistente numa recorrência sugerida (ou `null`). */
function buildSuggestion(cluster: Cluster): DetectedRecurrence | null {
  const items = [...cluster.items].sort((a, b) => a.date.getTime() - b.date.getTime());
  const cadence = inferCadence(items.map((i) => i.date));
  if (!cadence) return null;

  const amounts = items.map((i) => Number(i.amount));
  const description = mode(items.map((i) => i.description));
  return {
    key: `${cluster.accountId}:${cluster.representative}`,
    description,
    accountId: cluster.accountId,
    type: cluster.type,
    category: mode(items.map((i) => i.category)) as TransactionCategory,
    frequency: cadence.frequency,
    interval: cadence.interval,
    ...(cadence.frequency === 'monthly'
      ? { dayOfMonth: mode(items.map((i) => i.date.getDate())) }
      : {}),
    ...(cadence.frequency === 'weekly'
      ? { dayOfWeek: mode(items.map((i) => i.date.getDay())) }
      : {}),
    averageAmount: (amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(2),
    minAmount: Math.min(...amounts).toFixed(2),
    maxAmount: Math.max(...amounts).toFixed(2),
    occurrences: items.length,
    startDate: items[0].date,
    transactionIds: items.map((i) => i.id),
  };
}

/** Valor mais frequente de uma lista (empate resolvido pela primeira ocorrência). */
function mode<T>(values: readonly T[]): T {
  const counts = new Map<T, number>();
  let best = values[0];
  let bestCount = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
