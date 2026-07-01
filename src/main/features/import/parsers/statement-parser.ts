import type { ImportReconciliation, ParsedStatementLine } from '@shared/types';
import type { AccountProvider } from '@shared/enums';
import type { TextLine } from '../pdf-extraction.service';

export interface BankParseResult {
  readonly lines: ParsedStatementLine[];
  readonly reconciliation: ImportReconciliation;
}

/**
 * Contrato de um parser de extrato por banco. `detectFileName` roteia pelo nome
 * do arquivo (sinal mais forte, quando presente); `detect` roteia pelo texto
 * completo do PDF (fallback); `parse` recorre às linhas posicionadas.
 */
export interface BankParser {
  readonly bank: AccountProvider;
  detectFileName(fileName: string): boolean;
  detect(fullText: string): boolean;
  parse(lines: readonly TextLine[]): BankParseResult;
}
