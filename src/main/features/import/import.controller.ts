import { nextOccurrenceOnOrAfter } from '@shared/recurrence';
import {
  confirmDetectedRecurrenceSchema,
  importCommitSchema,
  importPreviewSchema,
} from '@shared/schemas';
import type {
  DetectedRecurrence,
  ImportCommitResult,
  ImportPreview,
  Recurring,
} from '@shared/types';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { action, Controller } from '../../core/controller.decorator';
import { inject } from '../../core/services.providers';
import { requireCurrentUser } from '../../core/session';
import { TransactionRulesService } from '../transactions/transaction-rules.service';
import { BankParserService } from './bank-parser.service';
import { ImportCommitService } from './import-commit.service';
import { ImportPreviewService } from './import-preview.service';
import { RecurrenceDetectionService } from './recurrence-detection.service';

/**
 * Importação de extratos em PDF. `preview` extrai/parseia/enriquece o staging
 * para revisão; `commit` grava os itens confirmados; `detect` sugere
 * recorrências sobre o histórico e `confirm` cria a regra (source `imported`)
 * vinculando as transações que a originaram.
 */
@Controller('import')
export class ImportController {
  private readonly parser = inject(BankParserService);
  private readonly preview = inject(ImportPreviewService);
  private readonly commitService = inject(ImportCommitService);
  private readonly detection = inject(RecurrenceDetectionService);
  private readonly rules = inject(TransactionRulesService);

  @action('preview')
  async previewStatement(rawData: unknown): Promise<ImportPreview> {
    const { fileName, data, accountHintId } = importPreviewSchema.parse(rawData);
    const user = requireCurrentUser();
    const parsed = await this.parser.parse(data, fileName);
    const preview = this.preview.build(user.id, parsed, accountHintId);
    return { ...preview, fileName };
  }

  @action('commit')
  async commit(rawData: unknown): Promise<ImportCommitResult> {
    const { items } = importCommitSchema.parse(rawData);
    const user = requireCurrentUser();
    return this.commitService.commit(user.id, items);
  }

  @action('detect')
  async detect(): Promise<DetectedRecurrence[]> {
    const user = requireCurrentUser();
    return this.detection.detect(user.id);
  }

  @action('confirm')
  async confirm(rawData: unknown): Promise<Recurring> {
    const data = confirmDetectedRecurrenceSchema.parse(rawData);
    this.rules.assertSupported(data.template.type, data.template.category);
    const user = requireCurrentUser();
    const db = getDb();

    const nextDate = nextOccurrenceOnOrAfter(
      { startDate: data.startDate, endDate: null, nextDate: null, pattern: data.recurringPattern },
      new Date(),
    );

    return db.transaction((tx) => {
      const rule = tx
        .insert(schema.recurring)
        .values({
          userId: user.id,
          type: 'transaction',
          name: data.name,
          template: data.template,
          recurringPattern: data.recurringPattern,
          startDate: data.startDate,
          nextDate,
          status: 'active',
          source: 'imported',
          autoMaterialize: false,
        })
        .returning()
        .get();

      if (data.transactionIds.length > 0) {
        tx.update(schema.transactions)
          .set({ recurringId: rule.id })
          .where(
            and(
              eq(schema.transactions.userId, user.id),
              inArray(schema.transactions.id, data.transactionIds),
            ),
          )
          .run();
      }
      return rule;
    });
  }
}
