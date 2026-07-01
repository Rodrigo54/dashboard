import type { ImportCommitItem, StagedTransaction } from '@shared/types';

/** Linha do staging com os campos editáveis pelo usuário na revisão. */
export interface StagingRow {
  readonly staged: StagedTransaction;
  readonly include: boolean;
  readonly category: string;
}

/** Deriva a linha editável a partir da sugestão vinda do main. */
export function toStagingRow(staged: StagedTransaction): StagingRow {
  return {
    staged,
    include: staged.include,
    category: staged.suggestedCategory,
  };
}

/** Converte a linha marcada no payload de `import:commit`, na conta escolhida. */
export function toCommitItem(row: StagingRow, accountId: string): ImportCommitItem {
  const { staged } = row;
  return {
    accountId,
    type: staged.type,
    category: row.category as ImportCommitItem['category'],
    amount: staged.amount,
    description: staged.description,
    date: staged.date,
    fingerprint: staged.fingerprint,
    recurringId: staged.match?.recurringId ?? null,
    reconcileTransactionId: staged.match?.materializedTransactionId ?? null,
  };
}
