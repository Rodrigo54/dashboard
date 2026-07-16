import type { TextLine } from '../pdf-extraction.service';
import { parseStatement } from './statement-engine';
import type { BankParser } from './statement-parser';

/** Ano de referência para linhas `dd/mm`: a partir do cabeçalho ou do ano atual. */
function referenceYear(lines: readonly TextLine[]): number {
  for (const line of lines) {
    const match = /\/(\d{4})\b/.exec(line.text);
    if (match) return Number(match[1]);
  }
  return new Date().getFullYear();
}

/**
 * Parser do extrato de conta corrente do Banco do Brasil. Débito/crédito é
 * marcado pelo sufixo `(-)`/`(+)` após o valor; as colunas Lote+Documento
 * precedem o histórico. A detecção usa o cabeçalho de colunas do BB.
 */
export const bbParser: BankParser = {
  bank: 'bb',
  kind: 'statement',
  detectFileName: (fileName) => /bb|banco\s*do\s*brasil/i.test(fileName),
  detect: (fullText) => /banco\s+do\s+brasil|bb\.com\.br|lote\s+documento/i.test(fullText),
  parse: (lines) =>
    parseStatement(lines, { fallbackYear: referenceYear(lines), debitStrategy: 'parenthesis' }),
};
