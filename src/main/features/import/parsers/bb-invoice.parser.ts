import type { TextLine } from '../pdf-extraction.service';
import { parseInvoice, referenceDateFrom } from './invoice-engine';
import type { BankParser } from './statement-parser';

/** Ano/mês de fechamento: "Fatura fechada em dd/mm/aaaa" ou o vencimento. */
function reference(lines: readonly TextLine[]): { year: number; month: number } {
  const fullText = lines.map((l) => l.text).join('\n');
  return referenceDateFrom(fullText, [
    /fatura fechada em\s+\d{2}\/(\d{2})\/(\d{4})/i,
    /vencimento\D+\d{2}\/(\d{2})\/(\d{4})/i,
  ]);
}

/**
 * Parser da fatura do cartão Ourocard (Banco do Brasil). Os lançamentos vivem na
 * seção "Lançamentos nesta fatura" (com sub-rótulos de categoria) e terminam em
 * "Total da Fatura"; compras são positivas (→ despesa) e pagamentos negativos
 * (→ receita). A detecção usa marcadores estruturais da fatura, não do extrato.
 */
export const bbInvoiceParser: BankParser = {
  bank: 'bb',
  kind: 'invoice',
  detectFileName: (fileName) =>
    /fatura/i.test(fileName) && /bb|banco\s*do\s*brasil|ourocard/i.test(fileName),
  detect: (fullText) =>
    /ourocard/i.test(fullText) ||
    (/saldo\s+fatura\s+anterior/i.test(fullText) &&
      /lan[çc]amentos\s+nesta\s+fatura/i.test(fullText)),
  parse: (lines) => {
    const { year, month } = reference(lines);
    return parseInvoice(lines, {
      referenceYear: year,
      referenceMonth: month,
      sectionOpenRe: /lan[çc]amentos\s+nesta\s+fatura/i,
      sectionCloseRe: /total\s+da\s+fatura\b/i,
      previousTotalRe: /saldo\s+fatura\s+anterior/i,
      currentTotalRe: /total\s+da\s+fatura\b/i,
    });
  },
};
