import type { TextLine } from '../pdf-extraction.service';
import { bbParser } from './bb.parser';
import { bbInvoiceParser } from './bb-invoice.parser';
import { itauParser } from './itau.parser';
import { itauInvoiceParser } from './itau-invoice.parser';
import type { BankParser } from './statement-parser';

export type { BankParser, BankParseResult } from './statement-parser';

/** Parsers registrados. Faturas primeiro: a detecção testa fatura antes de extrato. */
export const BANK_PARSERS: readonly BankParser[] = [
  bbInvoiceParser,
  itauInvoiceParser,
  bbParser,
  itauParser,
];

/**
 * Escolhe o parser do documento. Faturas de cartão têm prioridade e são
 * reconhecidas pelo conteúdo (marcadores estruturais), porque o nome do arquivo
 * não separa fatura de extrato do mesmo banco (`fatura-itau.pdf` casaria com o
 * extrato do Itaú). Só depois o extrato roteia por nome de arquivo (sinal forte)
 * e, por fim, por conteúdo.
 */
export function detectParser(lines: readonly TextLine[], fileName?: string): BankParser | null {
  const fullText = lines.map((l) => l.text).join('\n');
  const invoices = BANK_PARSERS.filter((parser) => parser.kind === 'invoice');
  const statements = BANK_PARSERS.filter((parser) => parser.kind === 'statement');

  const invoice = invoices.find((parser) => parser.detect(fullText));
  if (invoice) return invoice;

  if (fileName) {
    const byName = statements.find((parser) => parser.detectFileName(fileName));
    if (byName) return byName;
  }
  return statements.find((parser) => parser.detect(fullText)) ?? null;
}
