import type { ImportPreview, StagedTransaction } from '@shared/types';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { Service } from '../../core/service.decorator';
import { inject } from '../../core/services.providers';
import type { StatementParseOutput } from './bank-parser.service';
import { CategorizationService } from './categorization.service';
import { FingerprintService } from './fingerprint.service';
import { RecurrenceMatcherService } from './recurrence-matcher.service';

const DAY_MS = 86_400_000;
/** Janela (dias) para parear crédito+débito de mesmo valor como estorno. */
const REVERSAL_WINDOW_DAYS = 3;

/** Monta o staging (StagedTransaction[]) a partir do parse de um extrato. */
@Service('import-preview')
export class ImportPreviewService {
  private readonly fingerprint = inject(FingerprintService);
  private readonly categorization = inject(CategorizationService);
  private readonly matcher = inject(RecurrenceMatcherService);

  build(userId: string, parsed: StatementParseOutput, accountHintId?: string): ImportPreview {
    const accountId = this.resolveAccount(userId, parsed.bank, accountHintId);
    const fingerprints = this.fingerprint.assign(
      parsed.lines.map((line) => ({ accountId: accountId ?? '', ...line })),
    );
    const duplicates = this.duplicateFlags(userId, accountId, fingerprints);
    const reversals = detectReversals(parsed.lines);
    const rules = accountId ? this.activeRules(userId) : [];

    const rows = parsed.lines.map((line, index): StagedTransaction => {
      const fingerprint = fingerprints[index];
      const duplicate = duplicates.has(fingerprint);
      const reversal = reversals.has(index);
      const match =
        accountId && !duplicate
          ? this.matcher.match(userId, { accountId, ...line }, rules)
          : undefined;
      return {
        key: fingerprint,
        date: line.date,
        description: line.description,
        amount: line.amount,
        type: line.type,
        suggestedAccountId: accountId,
        suggestedCategory: this.categorization.suggest(line.type, line.description),
        fingerprint,
        duplicate,
        reversal,
        include: !duplicate && !reversal,
        match,
      };
    });

    return { bank: parsed.bank, fileName: '', rows, reconciliation: parsed.reconciliation };
  }

  private duplicateFlags(
    userId: string,
    accountId: string | undefined,
    fingerprints: string[],
  ): Set<string> {
    if (!accountId) return new Set();
    const existing = this.fingerprint.findExisting(
      userId,
      fingerprints.map((fingerprint) => ({ accountId, fingerprint })),
    );
    return new Set(fingerprints.filter((fp) => existing.has(`${accountId}::${fp}`)));
  }

  /** Contas ativas do usuário. */
  private accounts(userId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.accounts)
      .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.isActive, true)))
      .all();
  }

  /**
   * Conta sugerida: a dica do usuário, senão a conta cujo provedor casa com o
   * banco do extrato, senão a primeira conta ativa.
   */
  private resolveAccount(userId: string, bank: string, hintId?: string): string | undefined {
    const accounts = this.accounts(userId);
    if (hintId && accounts.some((a) => a.id === hintId)) return hintId;
    const byProvider = accounts.find((a) => a.accountProvider === bank);
    if (byProvider) return byProvider.id;
    return accounts[0]?.id;
  }

  private activeRules(userId: string) {
    const db = getDb();
    return db
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

function withinDays(a: Date, b: Date, days: number): boolean {
  return Math.abs(a.getTime() - b.getTime()) / DAY_MS <= days;
}

/** Índices de linhas que formam pares de estorno (mesmo valor, tipos opostos). */
function detectReversals(
  lines: readonly { date: Date; amount: string; type: string }[],
): Set<number> {
  const flagged = new Set<number>();
  for (let i = 0; i < lines.length; i += 1) {
    if (flagged.has(i)) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (flagged.has(j)) continue;
      const pair =
        lines[i].amount === lines[j].amount &&
        lines[i].type !== lines[j].type &&
        withinDays(lines[i].date, lines[j].date, REVERSAL_WINDOW_DAYS);
      if (pair) {
        flagged.add(i);
        flagged.add(j);
        break;
      }
    }
  }
  return flagged;
}
