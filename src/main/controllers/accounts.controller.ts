import { ACCOUNT_PROVIDERS, ACCOUNT_TYPES, CURRENCIES, enumOptions } from '@shared/enums';
import { createAccountSchema, updateAccountSchema, uuidSchema } from '@shared/schemas';
import type { CreateAccount, UpdateAccount, UUID } from '@shared/types';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../database/database.module';
import { action, Controller, create, list, read, remove, update } from './controller.decorator';
import { requireCurrentUser } from './session';

@Controller('accounts')
export class AccountsController {
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
  async update(rawId: unknown, rawData: unknown): Promise<schema.Account> {
    const id = uuidSchema.parse(rawId) as UUID;
    const accountData: UpdateAccount = updateAccountSchema.parse(rawData);
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

  @remove
  async delete(rawId: unknown): Promise<{ id: UUID }> {
    const id = uuidSchema.parse(rawId) as UUID;
    const user = requireCurrentUser();
    const db = getDb();
    const deleted = db
      .delete(schema.accounts)
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, user.id)))
      .returning({ id: schema.accounts.id })
      .get();
    if (!deleted) throw new Error('Conta não encontrada');
    return { id: deleted.id as UUID };
  }
}
