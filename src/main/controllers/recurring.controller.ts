import { enumOptions, RECURRING_FREQUENCIES } from '@shared/enums';
import { nextOccurrenceOnOrAfter } from '@shared/recurrence';
import {
  createRecurringSchema,
  transactionTemplateSchema,
  updateRecurringSchema,
  uuidSchema,
} from '@shared/schemas';
import type { CreateRecurring, TransactionTemplate, UpdateRecurring, UUID } from '@shared/types';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '../database/database.module';
import {
  materializeRecurringTransactions,
  materializeRuleUntil,
} from '../services/recurring-materializer';
import { assertSupported } from '../services/transaction-rules';
import { action, Controller, create, list, read, remove, update } from './controller.decorator';
import { requireCurrentUser } from './session';

/** Narra o template como o de transação e valida o escopo atual. */
function parseTransactionTemplate(template: unknown): TransactionTemplate {
  const parsed = transactionTemplateSchema.parse(template);
  assertSupported(parsed.type, parsed.category);
  return parsed;
}

/**
 * CRUD das regras de recorrência de transações. Esta feature gerencia apenas
 * `type: 'transaction'`; recorrências de tarefa ficam para a feature de tasks.
 * Toda mutação dispara o materializador para refletir ocorrências vencidas.
 */
@Controller('recurring')
export class RecurringController {
  @action('frequencies')
  async getFrequencies() {
    return enumOptions(RECURRING_FREQUENCIES);
  }

  @list
  async findAll(): Promise<schema.Recurring[]> {
    const user = requireCurrentUser();
    const db = getDb();
    return db
      .select()
      .from(schema.recurring)
      .where(and(eq(schema.recurring.userId, user.id), eq(schema.recurring.type, 'transaction')))
      .orderBy(desc(schema.recurring.createdAt))
      .all();
  }

  @read
  async findOne(rawId: unknown): Promise<schema.Recurring> {
    const id = uuidSchema.parse(rawId) as UUID;
    const user = requireCurrentUser();
    const db = getDb();
    const rule = db
      .select()
      .from(schema.recurring)
      .where(and(eq(schema.recurring.id, id), eq(schema.recurring.userId, user.id)))
      .get();
    if (!rule) throw new Error('Recorrência não encontrada');
    return rule;
  }

  @create
  async create(rawData: unknown): Promise<schema.Recurring> {
    const data: CreateRecurring = createRecurringSchema.parse(rawData);
    if (data.type !== 'transaction') {
      throw new Error('Apenas recorrências de transação são suportadas');
    }
    const template = parseTransactionTemplate(data.template);
    const user = requireCurrentUser();
    const db = getDb();

    const rule = db
      .insert(schema.recurring)
      .values({ ...data, template, userId: user.id, nextDate: data.startDate, status: 'active' })
      .returning()
      .get();

    // Ocorrências já vencidas (startDate <= hoje) viram transações na hora.
    materializeRecurringTransactions(user.id);
    return this.findOne(rule.id);
  }

  @update
  async update(payload: { id: unknown; data: unknown }): Promise<schema.Recurring> {
    const id = uuidSchema.parse(payload.id) as UUID;
    const data: UpdateRecurring = updateRecurringSchema.parse(payload.data);
    if (data.type !== undefined && data.type !== 'transaction') {
      throw new Error('Apenas recorrências de transação são suportadas');
    }
    const template =
      data.template === undefined ? undefined : parseTransactionTemplate(data.template);
    const user = requireCurrentUser();
    const db = getDb();
    const existing = await this.findOne(id);

    // Mudança na janela/pattern reposiciona o nextDate na próxima ocorrência
    // futura — o período passado não é re-materializado.
    const windowChanged =
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.recurringPattern !== undefined;
    let nextDate = existing.nextDate;
    let status = existing.status;
    if (windowChanged) {
      nextDate = nextOccurrenceOnOrAfter(
        {
          startDate: data.startDate ?? existing.startDate,
          // `null` limpa o endDate; `undefined` preserva o existente.
          endDate: data.endDate === undefined ? existing.endDate : data.endDate,
          nextDate: null,
          pattern: data.recurringPattern ?? existing.recurringPattern,
        },
        new Date(),
      );
      if (nextDate === null) status = 'completed';
      else if (status === 'completed') status = 'active';
    }

    db.update(schema.recurring)
      .set({ ...data, ...(template ? { template } : {}), nextDate, status })
      .where(eq(schema.recurring.id, id))
      .run();

    materializeRecurringTransactions(user.id);
    return this.findOne(id);
  }

  @action('pause')
  async pause(rawId: unknown): Promise<schema.Recurring> {
    const existing = await this.findOne(rawId);
    if (existing.status !== 'active') {
      throw new Error('Apenas recorrências ativas podem ser pausadas');
    }
    const db = getDb();
    db.update(schema.recurring)
      .set({ status: 'paused' })
      .where(eq(schema.recurring.id, existing.id))
      .run();
    return this.findOne(existing.id);
  }

  @action('resume')
  async resume(rawId: unknown): Promise<schema.Recurring> {
    const existing = await this.findOne(rawId);
    if (existing.status !== 'paused') {
      throw new Error('Apenas recorrências pausadas podem ser retomadas');
    }
    const user = requireCurrentUser();
    const db = getDb();

    // Retomada pula as ocorrências do período pausado: nada retroativo.
    const nextDate = nextOccurrenceOnOrAfter(
      {
        startDate: existing.startDate,
        endDate: existing.endDate,
        nextDate: existing.nextDate,
        pattern: existing.recurringPattern,
      },
      new Date(),
    );

    db.update(schema.recurring)
      .set({ nextDate, status: nextDate === null ? 'completed' : 'active' })
      .where(eq(schema.recurring.id, existing.id))
      .run();

    materializeRecurringTransactions(user.id);
    return this.findOne(existing.id);
  }

  /** Antecipa uma ocorrência prevista: materializa a regra até a data informada. */
  @action('materialize')
  async materialize(payload: {
    id: unknown;
    date: unknown;
  }): Promise<{ id: UUID; created: number }> {
    const id = uuidSchema.parse(payload.id) as UUID;
    const date = z.coerce.date().parse(payload.date);
    const user = requireCurrentUser();

    // Fim do dia para incluir a ocorrência selecionada, qualquer que seja a hora.
    const until = new Date(date);
    until.setHours(23, 59, 59, 999);

    const created = materializeRuleUntil(user.id, id, until);
    return { id, created };
  }

  @remove
  async delete(rawId: unknown): Promise<{ id: UUID }> {
    const existing = await this.findOne(rawId);
    const db = getDb();
    // As transações já materializadas permanecem (FK recurringId -> set null).
    db.delete(schema.recurring).where(eq(schema.recurring.id, existing.id)).run();
    return { id: existing.id as UUID };
  }
}
