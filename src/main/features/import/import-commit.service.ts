import { negateDecimal } from '@shared/decimal';
import type { ImportCommitItem, ImportCommitResult } from '@shared/types';
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../database/database.module';
import { getDb, schema } from '../../database/database.module';

/** Aceita tanto o `DB` quanto o `tx` de `db.transaction(...)`. */
type Tx = Pick<DB, 'select' | 'insert' | 'update' | 'delete'>;
import { Service } from '../../core/service.decorator';
import { inject } from '../../core/services.providers';
import { AccountBalanceService } from '../accounts/account-balance.service';
import { TransactionRulesService } from '../transactions/transaction-rules.service';
import { FingerprintService } from './fingerprint.service';

/** Um item já resolvido com seu fingerprint autoritativo (recalculado no main). */
interface ResolvedItem extends ImportCommitItem {
  readonly resolvedFingerprint: string;
}

/**
 * Grava os itens confirmados no staging: insere linhas novas ou reconcilia
 * (update in-place) a ocorrência já materializada indicada. Todo o lote roda
 * numa única transação SQL, com os deltas de saldo no mesmo commit.
 */
@Service('import-commit')
export class ImportCommitService {
  private readonly balance = inject(AccountBalanceService);
  private readonly rules = inject(TransactionRulesService);
  private readonly fingerprint = inject(FingerprintService);

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
      for (const item of resolved) {
        if (item.reconcileTransactionId) {
          this.reconcile(tx, userId, item);
          result.reconciled += 1;
        } else if (existing.has(`${item.accountId}::${item.resolvedFingerprint}`)) {
          result.skipped += 1;
        } else {
          this.insert(tx, userId, item);
          result.inserted += 1;
        }
      }
    });
    return result;
  }

  private insert(tx: Tx, userId: string, item: ResolvedItem): void {
    tx.insert(schema.transactions)
      .values({
        userId,
        accountId: item.accountId,
        type: item.type,
        category: item.category,
        amount: item.amount,
        description: item.description,
        date: item.date,
        recurringId: item.recurringId ?? null,
        importFingerprint: item.resolvedFingerprint,
      })
      .run();
    this.balance.applyBalanceDelta(
      tx,
      userId,
      item.accountId,
      this.balance.signedAmount(item.type, item.amount),
    );
  }

  /** Atualiza a linha já materializada, ajustando o saldo pela diferença. */
  private reconcile(tx: Tx, userId: string, item: ResolvedItem): void {
    const existing = tx
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, item.reconcileTransactionId!),
          eq(schema.transactions.userId, userId),
        ),
      )
      .get();
    if (!existing) throw new Error('Transação a reconciliar não encontrada');

    this.balance.applyBalanceDelta(
      tx,
      userId,
      existing.accountId,
      negateDecimal(this.balance.signedAmount(existing.type, existing.amount)),
    );
    this.balance.applyBalanceDelta(
      tx,
      userId,
      item.accountId,
      this.balance.signedAmount(item.type, item.amount),
    );

    tx.update(schema.transactions)
      .set({
        accountId: item.accountId,
        type: item.type,
        category: item.category,
        amount: item.amount,
        description: item.description,
        date: item.date,
        recurringId: item.recurringId ?? existing.recurringId,
        importFingerprint: item.resolvedFingerprint,
      })
      .where(eq(schema.transactions.id, existing.id))
      .run();
  }
}
