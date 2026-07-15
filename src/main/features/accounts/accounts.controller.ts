import { ACCOUNT_PROVIDERS, ACCOUNT_TYPES, CURRENCIES, enumOptions } from '@shared/enums';
import {
  accountPurgeOptionsSchema,
  createAccountSchema,
  updateAccountSchema,
  uuidSchema,
} from '@shared/schemas';
import type { AccountPurgeOptions, CreateAccount, UpdateAccount, UUID } from '@shared/types';
import { negateDecimal } from '@shared/decimal';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import {
  action,
  Controller,
  create,
  list,
  read,
  remove,
  save,
  update,
} from '../../core/controller.decorator';
import { requireCurrentUser } from '../../core/session';
import { inject } from '../../core/services.providers';
import { AccountBalanceService } from './account-balance.service';

/** Resultado de `AccountsController.delete` — reflete o que foi de fato executado. */
export interface AccountPurgeResult {
  id: UUID;
  deletedTransactions: number;
  deletedRecurring: number;
  zeroedBalance: boolean;
  deletedAccount: boolean;
}

@Controller('accounts')
export class AccountsController {
  private readonly balance = inject(AccountBalanceService);

  @action('types')
  async getTypes() {
    return enumOptions(ACCOUNT_TYPES);
  }

  @action('providers')
  async getProviders() {
    return enumOptions(ACCOUNT_PROVIDERS);
  }

  @action('currencies')
  async getCurrencies() {
    return enumOptions(CURRENCIES);
  }

  @list
  async findAll(): Promise<schema.Account[]> {
    const user = requireCurrentUser();
    const db = getDb();
    return db.select().from(schema.accounts).where(eq(schema.accounts.userId, user.id)).all();
  }

  @read
  async findOne(rawId: unknown): Promise<schema.Account> {
    const id = uuidSchema.parse(rawId) as UUID;
    const user = requireCurrentUser();
    const db = getDb();
    const account = db
      .select()
      .from(schema.accounts)
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, user.id)))
      .get();
    if (!account) throw new Error('Conta não encontrada');
    return account;
  }

  @create
  async create(rawData: unknown): Promise<schema.Account> {
    const accountData: CreateAccount = createAccountSchema.parse(rawData);
    const user = requireCurrentUser();
    const db = getDb();
    return db
      .insert(schema.accounts)
      .values({ ...accountData, userId: user.id })
      .returning()
      .get();
  }

  @update
  async update(payload: { id: unknown; data: unknown }): Promise<schema.Account> {
    const id = uuidSchema.parse(payload.id) as UUID;
    const accountData: UpdateAccount = updateAccountSchema.parse(payload.data);
    const user = requireCurrentUser();
    const db = getDb();
    const updated = db
      .update(schema.accounts)
      .set(accountData)
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, user.id)))
      .returning()
      .get();
    if (!updated) throw new Error('Conta não encontrada');
    return updated;
  }

  @save
  async save(payload: { id?: unknown; data: unknown }): Promise<schema.Account> {
    return payload.id === undefined || payload.id === null
      ? this.create(payload.data)
      : this.update({ id: payload.id, data: payload.data });
  }

  /** Prévia de impacto para o modal de limpeza/exclusão — contagens reais antes de confirmar. */
  @action('purge-preview')
  async purgePreview(
    rawId: unknown,
  ): Promise<{ transactionsCount: number; recurringCount: number }> {
    const id = uuidSchema.parse(rawId) as UUID;
    const user = requireCurrentUser();
    const db = getDb();

    const transactionsCount = db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.accountId, id), eq(schema.transactions.userId, user.id)))
      .all().length;

    const recurringCount = db
      .select()
      .from(schema.recurring)
      .where(this.#recurringForAccount(user.id, id))
      .all().length;

    return { transactionsCount, recurringCount };
  }

  /**
   * Limpeza/exclusão de conta. Cada flag é uma ação independente, exceto
   * `deleteAccount`, que força as demais (uma transação não pode existir sem
   * conta, e deixar uma recorrência apontando pra uma conta apagada é o bug de
   * `template.accountId` órfão que este fluxo fecha de vez). O backend não
   * confia no que o client mandou para essa combinação — recalcula sempre.
   */
  @remove
  async delete(payload: { id: unknown; options: unknown }): Promise<AccountPurgeResult> {
    const id = uuidSchema.parse(payload.id) as UUID;
    const requested: AccountPurgeOptions = accountPurgeOptionsSchema.parse(payload.options);
    const user = requireCurrentUser();
    const db = getDb();

    const options: AccountPurgeOptions = {
      deleteTransactions: requested.deleteTransactions || requested.deleteAccount,
      deleteRecurring: requested.deleteRecurring || requested.deleteAccount,
      zeroBalance: requested.zeroBalance || requested.deleteAccount,
      deleteAccount: requested.deleteAccount,
    };

    return db.transaction((tx) => {
      const account = tx
        .select()
        .from(schema.accounts)
        .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, user.id)))
        .get();
      if (!account) throw new Error('Conta não encontrada');

      let deletedTransactions = 0;
      if (options.deleteTransactions) {
        const rows = tx
          .select({ type: schema.transactions.type, amount: schema.transactions.amount })
          .from(schema.transactions)
          .where(
            and(eq(schema.transactions.accountId, id), eq(schema.transactions.userId, user.id)),
          )
          .all();
        for (const row of rows) {
          this.balance.applyBalanceDelta(
            tx,
            user.id,
            id,
            negateDecimal(this.balance.signedAmount(row.type, row.amount)),
          );
        }
        tx.delete(schema.transactions)
          .where(
            and(eq(schema.transactions.accountId, id), eq(schema.transactions.userId, user.id)),
          )
          .run();
        deletedTransactions = rows.length;
      }

      let deletedRecurring = 0;
      if (options.deleteRecurring) {
        deletedRecurring = tx
          .delete(schema.recurring)
          .where(this.#recurringForAccount(user.id, id))
          .returning({ id: schema.recurring.id })
          .all().length;
      }

      if (options.zeroBalance) {
        tx.update(schema.accounts).set({ balance: '0.00' }).where(eq(schema.accounts.id, id)).run();
      }

      if (options.deleteAccount) {
        tx.delete(schema.accounts)
          .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, user.id)))
          .run();
      }

      return {
        id,
        deletedTransactions,
        deletedRecurring,
        zeroedBalance: options.zeroBalance,
        deletedAccount: options.deleteAccount,
      };
    });
  }

  /** Regras de recorrência de transação vinculadas à conta via `template.accountId` (JSON, sem FK). */
  #recurringForAccount(userId: string, accountId: UUID) {
    return and(
      eq(schema.recurring.userId, userId),
      eq(schema.recurring.type, 'transaction'),
      sql`json_extract(${schema.recurring.template}, '$.accountId') = ${accountId}`,
    );
  }
}
