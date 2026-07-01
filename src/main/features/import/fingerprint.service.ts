import { createHash } from 'node:crypto';
import type { TransactionType } from '@shared/enums';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { Service } from '../../core/service.decorator';
import { normalizeText } from './normalize';

/** Campos que determinam a identidade de uma linha de extrato. */
export interface FingerprintInput {
  readonly accountId: string;
  readonly date: Date;
  readonly description: string;
  readonly amount: string;
  readonly type: TransactionType;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * Impressão digital determinística das linhas importadas. A base é o hash de
 * data+descrição+valor+tipo (sem a conta — o escopo por conta vem da coluna). O
 * índice de ocorrência (`base#n`) distingue linhas legitimamente repetidas no
 * mesmo lote, e é o que permite reimportar sem duplicar.
 */
@Service('import-fingerprint')
export class FingerprintService {
  /** Hash-base de uma linha (sem índice de ocorrência). */
  base(input: FingerprintInput): string {
    const material = `${dateKey(input.date)}|${normalizeText(input.description)}|${input.amount}|${input.type}`;
    return createHash('sha1').update(material).digest('hex');
  }

  /**
   * Atribui a cada item o fingerprint completo `base#n`, contando ocorrências
   * por (conta, base) na ordem do lote. Preserva a ordem de entrada.
   */
  assign(items: readonly FingerprintInput[]): string[] {
    const counters = new Map<string, number>();
    return items.map((item) => {
      const base = this.base(item);
      const key = `${item.accountId}::${base}`;
      const index = counters.get(key) ?? 0;
      counters.set(key, index + 1);
      return `${base}#${index}`;
    });
  }

  /**
   * Retorna o conjunto de chaves `accountId::fingerprint` que já existem no
   * banco do usuário — usado para marcar duplicados no staging e no commit.
   */
  findExisting(
    userId: string,
    pairs: readonly { accountId: string; fingerprint: string }[],
  ): Set<string> {
    const fingerprints = [...new Set(pairs.map((p) => p.fingerprint))];
    if (fingerprints.length === 0) return new Set();

    const db = getDb();
    const rows = db
      .select({
        accountId: schema.transactions.accountId,
        fingerprint: schema.transactions.importFingerprint,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          inArray(schema.transactions.importFingerprint, fingerprints),
        ),
      )
      .all();

    return new Set(rows.map((r) => `${r.accountId}::${r.fingerprint}`));
  }
}
