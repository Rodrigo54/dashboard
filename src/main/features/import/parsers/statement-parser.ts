import type { ImportDocumentKind, ImportReconciliation, ParsedStatementLine } from '@shared/types';
import type { AccountProvider } from '@shared/enums';
import type { TextLine } from '../pdf-extraction.service';

export interface BankParseResult {
  readonly lines: ParsedStatementLine[];
  readonly reconciliation: ImportReconciliation;
}

/**
 * Contrato de um parser por banco. `detectFileName` roteia pelo nome do arquivo
 * (sinal mais forte, quando presente); `detect` roteia pelo texto completo do
 * PDF; `parse` recorre às linhas posicionadas. `kind` separa extrato (saldo
 * corrido) de fatura de cartão (seccionada, sinais invertidos) — o roteamento
 * testa faturas por conteúdo antes dos extratos.
 */
export interface BankParser {
  readonly bank: AccountProvider;
  readonly kind: ImportDocumentKind;
  detectFileName(fileName: string): boolean;
  detect(fullText: string): boolean;
  parse(lines: readonly TextLine[]): BankParseResult;
}
