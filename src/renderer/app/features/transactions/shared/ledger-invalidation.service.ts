import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { inject, Injectable } from '@angular/core';
import { RecurringService } from './recurring.service';
import { TransactionsService } from './transactions.service';

/**
 * Coordena o reload dos recursos do extrato após uma mutação. `rules` e o
 * par `transactions`+`accounts` variam juntos de forma independente entre os
 * pontos de mutação — pausar uma regra só recarrega `rules`; apagar uma
 * transação só recarrega `transactions`+`accounts` (o saldo mudou, mas
 * nenhuma regra); materializar/retomar mudam as três.
 */
@Injectable({ providedIn: 'root' })
export class LedgerInvalidationService {
  readonly #transactions = inject(TransactionsService);
  readonly #accounts = inject(AccountsService);
  readonly #recurring = inject(RecurringService);

  reloadRules(): void {
    this.#recurring.rules.reload();
  }

  /** Transações e saldo das contas sempre mudam juntos. */
  reloadBalanceAffectingData(): void {
    this.#transactions.transactions.reload();
    this.#accounts.accounts.reload();
  }
}
