import type { ImportCommitItem, ImportCommitResult } from '@shared/types';
import { and, eq, inArray } from 'drizzle-orm';
import type { DB } from '../../database/database.module';
import { getDb, schema } from '../../database/database.module';

/** Aceita tanto o `DB` quanto o `tx` de `db.transaction(...)`. */
type Tx = Pick<DB, 'select' | 'insert' | 'update' | 'delete'>;
import { Service } from '../../core/service.decorator';
import { inject } from '../../core/services.providers';
import { AccountBalanceService } from '../accounts/account-balance.service';
import { RecurrenceMatchingService } from '../recurring/recurrence-matching.service';
import { TransactionRulesService } from '../transactions/transaction-rules.service';
import { FingerprintService } from './fingerprint.service';
import { bestSameAccountRule } from './recurrence-auto-link.utils';

/** Um item já resolvido com seu fingerprint autoritativo (recalculado no main). */
interface ResolvedItem extends ImportCommitItem {
  readonly resolvedFingerprint: string;
}

/**
 * Grava os itens confirmados no staging: insere linhas novas e, para cada
 * uma, recalcula (não confia no cliente) o auto-link com recorrências —
 * `bestSameAccountRule` na mesma conta; quando encontrado, vincula pelo
 * mesmo caminho de `RecurrenceMatchingService.applyLink` (merge completo: some
 * duplicata materializada é removida e o saldo revertido). Todo o lote roda
 * numa única transação SQL, com os deltas de saldo no mesmo commit.
 */
@Service('import-commit')
export class ImportCommitService {
  private readonly balance = inject(AccountBalanceService);
  private readonly rules = inject(TransactionRulesService);
  private readonly fingerprint = inject(FingerprintService);
  private readonly matching = inject(RecurrenceMatchingService);

  commit(userId: string, items: readonly ImportCommitItem[]): ImportCommitResult {
    const fingerprints = this.fingerprint.assign(items);
    const resolved = items.map<ResolvedItem>((item, i) => ({
      ...item,
      resolvedFingerprint: fingerprints[i],
    }));
    for (const item of resolved) this.rules.assertSupported(item.type, item.category);

    const existing = this.fingerprint.findExisting(
      userId,
      resolved.map((item) => ({
        accountId: item.accountId,
        fingerprint: item.resolvedFingerprint,
      })),
    );

    const result = { inserted: 0, reconciled: 0, skipped: 0 };
    const db = getDb();
    db.transaction((tx) => {
      const activeRules = this.activeRules(tx, userId);
      for (const item of resolved) {
        if (existing.has(`${item.accountId}::${item.resolvedFingerprint}`)) {
          result.skipped += 1;
          continue;
        }

        const inserted = this.insert(tx, userId, item);
        const rule = bestSameAccountRule(item, activeRules);
        if (rule && this.matching.applyLink(tx, userId, inserted, rule.id)) {
          result.reconciled += 1;
        } else {
          result.inserted += 1;
        }
      }
    });
    return result;
  }

  private insert(tx: Tx, userId: string, item: ResolvedItem): schema.Transaction {
    const inserted = tx
      .insert(schema.transactions)
      .values({
        userId,
        accountId: item.accountId,
        type: item.type,
        category: item.category,
        amount: item.amount,
        description: item.description,
        date: item.date,
        importFingerprint: item.resolvedFingerprint,
      })
      .returning()
      .get();
    this.balance.applyBalanceDelta(
      tx,
      userId,
      item.accountId,
      this.balance.signedAmount(item.type, item.amount),
    );
    return inserted;
  }

  /** Regras de transação ativas/pausadas do usuário — mesmo escopo do preview. */
  private activeRules(tx: Tx, userId: string): schema.Recurring[] {
    return tx
      .select()
      .from(schema.recurring)
      .where(
        and(
          eq(schema.recurring.userId, userId),
          eq(schema.recurring.type, 'transaction'),
          inArray(schema.recurring.status, ['active', 'paused']),
        ),
      )
      .all();
  }
}
