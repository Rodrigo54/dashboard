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
 * Parser do extrato do Itaú (Uniclass). As linhas trazem `dd/mm` sem ano e o
 * débito é sinalizado pelo valor negativo.
 */
export const itauParser: BankParser = {
  bank: 'itau',
  kind: 'statement',
  detectFileName: (fileName) => /ita[uú]/i.test(fileName),
  detect: (fullText) => /ita[uú]|uniclass/i.test(fullText),
  parse: (lines) =>
    parseStatement(lines, { fallbackYear: referenceYear(lines), debitStrategy: 'sign' }),
};
