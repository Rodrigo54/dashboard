import { addDecimal, negateDecimal } from '@shared/decimal';
import type { TransactionType } from '@shared/enums';
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../database/database.module';
import { schema } from '../../database/database.module';
import { Service } from '../../core/service.decorator';

/** Aceita tanto o `DB` quanto o objeto `tx` de `db.transaction(...)`. */
type DbLike = Pick<DB, 'select' | 'insert' | 'update' | 'delete'>;

/**
 * Mutação de saldo das contas. Toda escrita de transação (CRUD ou
 * materialização de recorrência) passa por aqui, sempre dentro de uma
 * transação SQL — o saldo nunca é atualizado fora do mesmo commit que
 * grava/remove a linha de `transactions`.
 */
@Service('account-balance')
export class AccountBalanceService {
  /**
   * Efeito com sinal que uma transação exerce sobre o saldo da conta:
   * receita soma, despesa subtrai. `transfer` (fora do escopo atual) é neutro.
   */
  signedAmount(type: TransactionType, amount: string): string {
    if (type === 'income') return amount;
    if (type === 'expense') return negateDecimal(amount);
    return '0.00';
  }

  /**
   * Soma `delta` ao balance da conta do usuário. Lança se a conta não existir
   * (ou não pertencer ao usuário) — dentro de `db.transaction`, isso desfaz a
   * escrita da transação junto.
   */
  applyBalanceDelta(db: DbLike, userId: string, accountId: string, delta: string): void {
    const account = db
      .select({ balance: schema.accounts.balance })
      .from(schema.accounts)
      .where(and(eq(schema.accounts.id, accountId), eq(schema.accounts.userId, userId)))
      .get();
    if (!account) throw new Error('Conta não encontrada');

    db.update(schema.accounts)
      .set({ balance: addDecimal(account.balance, delta) })
      .where(eq(schema.accounts.id, accountId))
      .run();
  }
}
