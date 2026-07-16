import { negateDecimal } from '@shared/decimal';
import {
  enumOptions,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPES,
} from '@shared/enums';
import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
  uuidSchema,
} from '@shared/schemas';
import type { CreateTransaction, UpdateTransaction, UUID } from '@shared/types';
import { and, desc, eq, gte, lt, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '../../database/database.module';
import { inject } from '../../core/services.providers';
import { AccountBalanceService } from '../accounts/account-balance.service';
import { TransactionRulesService } from './transaction-rules.service';
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

@Controller('transactions')
export class TransactionsController {
  private readonly balance = inject(AccountBalanceService);
  private readonly rules = inject(TransactionRulesService);

  @action('types')
  async getTypes() {
    return enumOptions(TRANSACTION_TYPES).filter((option) => option.value !== 'transfer');
  }

  @action('categories')
  async getCategories() {
    return {
      income: enumOptions(INCOME_CATEGORIES),
      expense: enumOptions(EXPENSE_CATEGORIES),
    };
  }

  /** Transações reais de uma recorrência, mais recentes primeiro — a transactions-view usa
   * para o histórico e para não sugerir como previsão uma ocorrência futura já materializada
   * manualmente. */
  @action('byRecurring')
  async byRecurring(payload: {
    recurringId: unknown;
    limit?: unknown;
  }): Promise<schema.Transaction[]> {
    const recurringId = uuidSchema.parse(payload.recurringId) as UUID;
    const limit = payload.limit
      ? z.coerce.number().int().positive().max(200).parse(payload.limit)
      : 100;
    const user = requireCurrentUser();
    const db = getDb();
    return db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.recurringId, recurringId),
        ),
      )
      .orderBy(desc(schema.transactions.date))
      .limit(limit)
      .all();
  }

  @list
  async findAll(rawFilter: unknown): Promise<schema.Transaction[]> {
    const filter = listTransactionsSchema.parse(rawFilter);
    const user = requireCurrentUser();
    const db = getDb();
    const monthStart = new Date(filter.year, filter.month - 1, 1);
    const monthEnd = new Date(filter.year, filter.month, 1);

    const conditions: SQL[] = [
      eq(schema.transactions.userId, user.id),
      gte(schema.transactions.date, monthStart),
      lt(schema.transactions.date, monthEnd),
    ];
    if (filter.accountId) conditions.push(eq(schema.transactions.accountId, filter.accountId));
    if (filter.type) conditions.push(eq(schema.transactions.type, filter.type));

    return db
      .select()
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.date), desc(schema.transactions.createdAt))
      .all();
  }

  @read
  async findOne(rawId: unknown): Promise<schema.Transaction> {
    const id = uuidSchema.parse(rawId) as UUID;
    const user = requireCurrentUser();
    const db = getDb();
    const transaction = db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, user.id)))
      .get();
    if (!transaction) throw new Error('Transação não encontrada');
    return transaction;
  }

  @create
  async create(rawData: unknown): Promise<schema.Transaction> {
    const data: CreateTransaction = createTransactionSchema.parse(rawData);
    this.rules.assertSupported(data.type, data.category);
    const user = requireCurrentUser();
    const db = getDb();
    return db.transaction((tx) => {
      const inserted = tx
        .insert(schema.transactions)
        .values({ ...data, userId: user.id })
        .returning()
        .get();
      this.balance.applyBalanceDelta(
        tx,
        user.id,
        data.accountId,
        this.balance.signedAmount(data.type, data.amount),
      );
      return inserted;
    });
  }

  @update
  async update(payload: { id: unknown; data: unknown }): Promise<schema.Transaction> {
    const id = uuidSchema.parse(payload.id) as UUID;
    const data: UpdateTransaction = updateTransactionSchema.parse(payload.data);
    const user = requireCurrentUser();
    const db = getDb();
    return db.transaction((tx) => {
      const existing = tx
        .select()
        .from(schema.transactions)
        .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, user.id)))
        .get();
      if (!existing) throw new Error('Transação não encontrada');

      const merged = { ...existing, ...data };
      this.rules.assertSupported(merged.type, merged.category);

      // Reverte o efeito antigo e aplica o novo (cobre troca de conta/tipo/valor).
      this.balance.applyBalanceDelta(
        tx,
        user.id,
        existing.accountId,
        negateDecimal(this.balance.signedAmount(existing.type, existing.amount)),
      );
      this.balance.applyBalanceDelta(
        tx,
        user.id,
        merged.accountId,
        this.balance.signedAmount(merged.type, merged.amount),
      );

      return tx
        .update(schema.transactions)
        .set(data)
        .where(eq(schema.transactions.id, id))
        .returning()
        .get();
    });
  }

  @save
  async save(payload: { id?: unknown; data: unknown }): Promise<schema.Transaction> {
    return payload.id === undefined || payload.id === null
      ? this.create(payload.data)
      : this.update({ id: payload.id, data: payload.data });
  }

  @remove
  async delete(rawId: unknown): Promise<{ id: UUID }> {
    const id = uuidSchema.parse(rawId) as UUID;
    const user = requireCurrentUser();
    const db = getDb();
    return db.transaction((tx) => {
      const existing = tx
        .select()
        .from(schema.transactions)
        .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, user.id)))
        .get();
      if (!existing) throw new Error('Transação não encontrada');

      this.balance.applyBalanceDelta(
        tx,
        user.id,
        existing.accountId,
        negateDecimal(this.balance.signedAmount(existing.type, existing.amount)),
      );
      tx.delete(schema.transactions).where(eq(schema.transactions.id, id)).run();
      return { id: existing.id as UUID };
    });
  }
}
