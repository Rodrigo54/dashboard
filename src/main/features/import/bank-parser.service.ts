import type { AccountProvider } from '@shared/enums';
import type { ImportDocumentKind, ImportReconciliation, ParsedStatementLine } from '@shared/types';
import { Service } from '../../core/service.decorator';
import { inject } from '../../core/services.providers';
import { PdfExtractionService } from './pdf-extraction.service';
import { detectParser } from './parsers';

export interface StatementParseOutput {
  readonly bank: AccountProvider | 'unknown';
  readonly kind: ImportDocumentKind;
  readonly lines: ParsedStatementLine[];
  readonly reconciliation: ImportReconciliation;
}

/**
 * Orquestra a extração de um PDF de extrato: extrai as linhas posicionadas,
 * detecta o banco e delega ao parser correspondente. Lança se nenhum parser
 * reconhecer o documento.
 */
@Service('bank-parser')
export class BankParserService {
  private readonly extraction = inject(PdfExtractionService);

  async parse(data: Uint8Array, fileName?: string): Promise<StatementParseOutput> {
    const lines = await this.extraction.extractLines(data);
    const parser = detectParser(lines, fileName);
    if (!parser) {
      throw new Error('Banco não reconhecido neste PDF. Bancos suportados: Banco do Brasil, Itaú.');
    }
    const result = parser.parse(lines);
    return {
      bank: parser.bank,
      kind: parser.kind,
      lines: result.lines,
      reconciliation: result.reconciliation,
    };
  }
}
