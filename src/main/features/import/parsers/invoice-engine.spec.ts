import { describe, expect, it } from 'vitest';
import type { TextLine } from '../pdf-extraction.service';
import { parseInvoice, referenceDateFrom, type InvoiceEngineOptions } from './invoice-engine';

/** Cria uma linha sintética — o engine só lê `text`. */
function line(text: string): TextLine {
  return { page: 1, y: 0, chunks: [], text };
}

const BB_OPTIONS: InvoiceEngineOptions = {
  referenceYear: 2026,
  referenceMonth: 7,
  sectionOpenRe: /lan[çc]amentos\s+nesta\s+fatura/i,
  sectionCloseRe: /total\s+da\s+fatura\b/i,
  previousTotalRe: /saldo\s+fatura\s+anterior/i,
  currentTotalRe: /total\s+da\s+fatura\b/i,
};

const ITAU_OPTIONS: InvoiceEngineOptions = {
  referenceYear: 2026,
  referenceMonth: 7,
  sectionOpenRe: /pagamentos\s+efetuados|lan[çc]amentos:\s*compras\s+e\s+saques/i,
  sectionCloseRe: /total\s+dos\s+pagamentos|total\s+dos\s+lan[çc]amentos|compras\s+parceladas/i,
  previousTotalRe: /total\s+da\s+fatura\s+anterior/i,
  currentTotalRe: /total\s+desta\s+fatura/i,
};

describe('parseInvoice (BB — seccionada, sub-rótulos de categoria)', () => {
  // Espelha o layout real: resumo, seção "Lançamentos nesta fatura" com o saldo
  // anterior sem data, rótulos de categoria, pagamento negativo e compras
  // positivas, fechando em "Total da Fatura". A linha após o total é excluída.
  const lines = [
    line('Saldo fatura anterior R$ 1.942,72'),
    line('Lançamentos nesta fatura'),
    line('Data Descrição País Valor'),
    line('SALDO FATURA ANTERIOR BR R$ 1.942,72'),
    line('Pagamentos/Créditos'),
    line('08/06 PGTO. QR CODE PIX 4700 000000000 200 BR R$ -1.942,72'),
    line('Transporte'),
    line('19/06 UBER *TRIP HELP.UBER.COSAO PAULO BR R$ 11,98'),
    line('16/05 GRUPO CASAS B PARC 02/10 SAO LUIS BR R$ 294,59'),
    line('Total da Fatura R$ 306,57'),
    line('19/06 Reconecte PARC 01/03 SAO LUIS BR R$ 140,00'),
  ];

  it('inverte os sinais e ignora tudo fora da seção de lançamentos', () => {
    const { lines: movements } = parseInvoice(lines, BB_OPTIONS);
    expect(movements).toEqual([
      {
        date: new Date(2026, 5, 8, 12),
        description: 'PGTO. QR CODE PIX 4700 000000000 200',
        amount: '1942.72',
        type: 'income',
      },
      {
        date: new Date(2026, 5, 19, 12),
        description: 'UBER *TRIP HELP.UBER.COSAO PAULO',
        amount: '11.98',
        type: 'expense',
      },
      {
        date: new Date(2026, 4, 16, 12),
        description: 'GRUPO CASAS B PARC 02/10 SAO LUIS',
        amount: '294.59',
        type: 'expense',
      },
    ]);
  });

  it('exclui a linha após "Total da Fatura" (fora da seção)', () => {
    const { lines: movements } = parseInvoice(lines, BB_OPTIONS);
    expect(movements.some((m) => m.amount === '140.00')).toBe(false);
  });

  it('reconcilia: anterior + compras − pagamentos = total desta fatura', () => {
    const { reconciliation } = parseInvoice(lines, BB_OPTIONS);
    expect(reconciliation).toEqual({
      openingBalance: '1942.72',
      closingBalance: '306.57',
      computedClosing: '306.57',
      balanced: true,
    });
  });
});

describe('parseInvoice (Itaú — duas seções, colunas coladas, parcelas futuras)', () => {
  // Página 2 do Itaú tem duas colunas na mesma linha visual: o movimento à
  // esquerda e os encargos à direita. O engine usa o primeiro valor (esquerda) e
  // ignora o resto. A seção "Compras parceladas - próximas faturas" fica de fora.
  const lines = [
    line('Total da fatura anterior 487,50'),
    line('Vencimento: 10/07/2026 = Total desta fatura 487,50'),
    line('Pagamentos efetuados Encargos cobrados nesta fatura'),
    line('DATA VALOR EM R$ Juros do rotativo 15,10 % 0,00'),
    line('10/06 PAGAMENTO -487,50 Juros de mora 1,00 % am 0,00'),
    line('P Total dos pagamentos -487,50'),
    line('Lançamentos: compras e saques'),
    line('DATA ESTABELECIMENTO VALOR EM R$'),
    line('02/06 EC *TICKETMAST 02/08 487,50'),
    line('L Total dos lançamentos atuais 487,50'),
    line('Compras parceladas - próximas faturas'),
    line('02/06 EC *TICKETMAST 03/08 487,50'),
  ];

  it('usa o primeiro valor da linha (coluna esquerda), ignorando os encargos', () => {
    const { lines: movements } = parseInvoice(lines, ITAU_OPTIONS);
    expect(movements).toEqual([
      {
        date: new Date(2026, 5, 10, 12),
        description: 'PAGAMENTO',
        amount: '487.50',
        type: 'income',
      },
      {
        date: new Date(2026, 5, 2, 12),
        description: 'EC *TICKETMAST 02/08',
        amount: '487.50',
        type: 'expense',
      },
    ]);
  });

  it('exclui a projeção de compras parceladas (só 2 movimentos)', () => {
    const { lines: movements } = parseInvoice(lines, ITAU_OPTIONS);
    expect(movements).toHaveLength(2);
  });

  it('reconcilia a fatura', () => {
    const { reconciliation } = parseInvoice(lines, ITAU_OPTIONS);
    expect(reconciliation).toEqual({
      openingBalance: '487.50',
      closingBalance: '487.50',
      computedClosing: '487.50',
      balanced: true,
    });
  });
});

describe('parseInvoice (casos de borda)', () => {
  it('não fecha a reconciliação sem os dois totais', () => {
    const lines = [
      line('Lançamentos nesta fatura'),
      line('19/06 UBER BR R$ 11,98'),
      line('Total da Fatura R$ 11,98'),
    ];
    const { reconciliation } = parseInvoice(lines, {
      ...BB_OPTIONS,
      previousTotalRe: /nunca-casa/i,
    });
    expect(reconciliation.balanced).toBe(false);
  });

  it('joga movimento de mês maior que o fechamento para o ano anterior', () => {
    // Fatura fechada em janeiro (mês 1): uma compra de dezembro é do ano anterior.
    const lines = [
      line('Total da fatura anterior 0,00'),
      line('Total desta fatura 50,00'),
      line('Lançamentos: compras e saques'),
      line('20/12 COMPRA DEZEMBRO 50,00'),
      line('L Total dos lançamentos atuais 50,00'),
    ];
    const { lines: movements } = parseInvoice(lines, { ...ITAU_OPTIONS, referenceMonth: 1 });
    expect(movements[0].date).toEqual(new Date(2025, 11, 20, 12));
  });
});

describe('referenceDateFrom', () => {
  it('extrai mês e ano do primeiro rótulo que casa', () => {
    expect(
      referenceDateFrom('Fatura fechada em 01/07/2026', [/fechada em\s+\d{2}\/(\d{2})\/(\d{4})/i]),
    ).toEqual({ month: 7, year: 2026 });
  });

  it('cai na data atual quando nenhum rótulo casa', () => {
    const now = new Date();
    expect(referenceDateFrom('sem data', [/xyz\/(\d{2})\/(\d{4})/])).toEqual({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
  });
});
