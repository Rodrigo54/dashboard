import type { TextLine } from '../pdf-extraction.service';
import { parseInvoice, referenceDateFrom } from './invoice-engine';
import type { BankParser } from './statement-parser';

/** Ano/mês de fechamento: vencimento, postagem ou emissão da fatura. */
function reference(lines: readonly TextLine[]): { year: number; month: number } {
  const fullText = lines.map((l) => l.text).join('\n');
  return referenceDateFrom(fullText, [
    /vencimento\D+\d{2}\/(\d{2})\/(\d{4})/i,
    /postagem\D+\d{2}\/(\d{2})\/(\d{4})/i,
    /emiss[ãa]o\D+\d{2}\/(\d{2})\/(\d{4})/i,
  ]);
}

/**
 * Parser da fatura do cartão Itaú. Os movimentos vivem em duas seções
 * ("Pagamentos efetuados" e "Lançamentos: compras e saques"), cada uma fechada
 * pelo próprio subtotal; a seção "Compras parceladas - próximas faturas" é
 * projeção futura e fica de fora. Compras positivas (→ despesa), pagamentos
 * negativos (→ receita). A página 2 tem duas colunas na mesma linha — o engine
 * usa o primeiro valor (coluna esquerda) e ignora os encargos à direita.
 */
export const itauInvoiceParser: BankParser = {
  bank: 'itau',
  kind: 'invoice',
  detectFileName: (fileName) => /fatura/i.test(fileName) && /ita[uú]/i.test(fileName),
  detect: (fullText) =>
    /ita[uú]/i.test(fullText) &&
    (/total\s+desta\s+fatura/i.test(fullText) ||
      /lan[çc]amentos:\s*compras\s+e\s+saques/i.test(fullText)),
  parse: (lines) => {
    const { year, month } = reference(lines);
    return parseInvoice(lines, {
      referenceYear: year,
      referenceMonth: month,
      sectionOpenRe: /pagamentos\s+efetuados|lan[çc]amentos:\s*compras\s+e\s+saques/i,
      sectionCloseRe: /total\s+dos\s+pagamentos|total\s+dos\s+lan[çc]amentos|compras\s+parceladas/i,
      previousTotalRe: /total\s+da\s+fatura\s+anterior/i,
      currentTotalRe: /total\s+desta\s+fatura/i,
    });
  },
};
